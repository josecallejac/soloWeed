import sqlite3
import os
import re

def normalize_fractions(text: str) -> str:
    return text.replace("¼", "1/4").replace("½", "1/2").replace("¾", "3/4")

def get_paper_size(title: str) -> str:
    title_lower = normalize_fractions(title.lower())
    if re.search(r'(?<!\d)(?:rolls|roll|rollo|rollos)(?!\d)', title_lower):
        return "rolls"
    if re.search(r'(?<!\d)(?:1-1/4|1\s*1/4|1-14|114|1[-_.\s/]1[-_.\s/]4|78\s*mm)(?!\d)', title_lower):
        return "1-1-4"
    if re.search(r'(?<!\d)(?:king\s*size\s*slim|ks\s*slim|king\s*slim|slim)(?!\d)', title_lower):
        return "king-size-slim"
    if re.search(r'(?<!\d)(?:king\s*size|ks)(?!\d)', title_lower):
        return "king-size"
    return "unknown"

def get_offer_profile(title: str, category: str, brand_key: str):
    title_lower = normalize_fractions(title.lower())
    category_lower = category.lower()
    
    # 1. Tips detection for papers/cones
    has_tips = False
    if "papel" in category_lower or "cono" in category_lower:
        has_tips = bool(re.search(r'\b(?:boquilla|boquillas|filtro|filtros|tips?|connoisseur|pre[- ]?enrolados?)\b', title_lower))
        
    # 2. Rolls detection for papers
    is_rolls = False
    if "papel" in category_lower:
        is_rolls = bool(re.search(r'\b(?:rolls|roll|rollo|rollos)\b', title_lower))
        
    # 3. Starter box detection for RAW cases
    is_starter = False
    if "contenedor" in category_lower and brand_key == "raw":
        is_starter = bool(re.search(r'\b(?:starter|kit|set)\b', title_lower)) and bool(re.search(r'\bcaja|cajita|box\b', title_lower))
        
    # 4. Volcano model detection
    volcano_model = None
    if "vaporizador" in category_lower and brand_key == "storz-bickel":
        if "hybrid" in title_lower:
            volcano_model = "hybrid"
        elif "classic" in title_lower:
            volcano_model = "classic"

    # 5. Dynavap model detection
    dynavap_model = None
    if "vaporizador" in category_lower and brand_key == "dynavap":
        title_norm = title_lower.replace("m 7", "m7")
        if "xl" in title_norm:
            dynavap_model = "m7-xl"
        elif "m7" in title_norm:
            dynavap_model = "m7"
            
    # 6. Size detection for papers/cones
    paper_size = None
    if "papel" in category_lower or "cono" in category_lower:
        paper_size = get_paper_size(title_lower)
        if brand_key == "blazy-susan" and paper_size == "king-size":
            paper_size = "king-size-slim"
            
    return (has_tips, is_rolls, is_starter, volcano_model, dynavap_model, paper_size)

def is_product_compatible(cur, product_id, profile, category, brand_key):
    # Fetch all offers currently mapped to this product in the active DB
    cur.execute("SELECT title FROM Offer WHERE productId = ?", (product_id,))
    offers = cur.fetchall()
    if not offers:
        return True # If no offers are currently mapped, it's compatible
        
    for (title,) in offers:
        o_profile = get_offer_profile(title, category, brand_key)
        if o_profile != profile:
            return False
            
    return True

def restore_links():
    cp_db = "backups/max-4store-25.db"
    cur_db = "prisma/dev_recovered.db"

    if not os.path.exists(cp_db):
        print(f"Error: Checkpoint database {cp_db} not found.")
        return

    # 1. Connect to both databases
    conn_cp = sqlite3.connect(cp_db)
    cur_cp = conn_cp.cursor()

    conn_cur = sqlite3.connect(cur_db)
    cur_cur = conn_cur.cursor()

    # Enable foreign keys on current db
    cur_cur.execute("PRAGMA foreign_keys = ON;")

    # 2. Get all products with their associated offers from the checkpoint
    cur_cp.execute("""
        SELECT p.id, p.name, p.normalizedName, p.brand, p.brandKey, p.modelKey, p.modelSlug, p.category
        FROM Product p
    """)
    cp_products = cur_cp.fetchall()

    print(f"Read {len(cp_products)} products from checkpoint.")

    restored_count = 0
    updated_offers = 0

    for cp_prod in cp_products:
        cp_prod_id, name, normalized_name, brand, brand_key, model_key, model_slug, category = cp_prod

        # Get all offer IDs and titles associated with this product in the checkpoint
        cur_cp.execute("SELECT id, title FROM Offer WHERE productId = ?", (cp_prod_id,))
        cp_offers = cur_cp.fetchall()

        if not cp_offers:
            continue

        # Group checkpoint offers by profile to avoid mismatch blending
        sub_groups = {}
        for o_id, o_title in cp_offers:
            profile = get_offer_profile(o_title, category, brand_key)
            if profile not in sub_groups:
                sub_groups[profile] = []
            sub_groups[profile].append((o_id, o_title))

        # Restore each subgroup independently
        for profile, offers_list in sub_groups.items():
            o_ids = [item[0] for item in offers_list]
            
            # Find where these offers are currently mapped in the active database
            placeholders = ",".join("?" for _ in o_ids)
            cur_cur.execute(f"SELECT DISTINCT productId FROM Offer WHERE id IN ({placeholders}) AND productId IS NOT NULL", o_ids)
            current_product_ids = [row[0] for row in cur_cur.fetchall()]

            # Keep only product IDs whose existing offers are compatible with this sub-group's profile
            compatible_product_ids = [pid for pid in current_product_ids if is_product_compatible(cur_cur, pid, profile, category, brand_key)]

            target_product_id = None

            if len(compatible_product_ids) == 1:
                target_product_id = compatible_product_ids[0]
            elif len(compatible_product_ids) > 1:
                # Ambiguity: pick the one that has the most matching offers in the sub-group
                max_count = -1
                for pid in compatible_product_ids:
                    cur_cur.execute(f"SELECT COUNT(*) FROM Offer WHERE productId = ? AND id IN ({placeholders})", [pid] + o_ids)
                    count = cur_cur.fetchone()[0]
                    if count > max_count:
                        max_count = count
                        target_product_id = pid
            else:
                # None of the offers in this subgroup are currently mapped to a compatible product.
                # Adjust name, model key, model slug for this sub-group profile if needed
                sub_name = name
                sub_model_key = model_key
                sub_model_slug = model_slug
                
                has_tips_val, is_rolls_val, is_starter_val, volcano_val, dynavap_val, paper_size_val = profile
                if is_starter_val and "starter" not in sub_model_key:
                    sub_name = f"Set Cajita Metálica {brand.upper()} Starter Box 1 1/4"
                    sub_model_key = "starter-box-1-1-4"
                    sub_model_slug = "starter-box-1-1-4"
                elif is_rolls_val and "rolls" not in sub_model_key:
                    sub_name = f"Papelillos {brand.upper()} Ultimate Rolls"
                    sub_model_key = "rolls"
                    sub_model_slug = "rolls"

                # Check if a product with the same brandKey and modelSlug already exists and is compatible
                cur_cur.execute("""
                    SELECT id FROM Product 
                    WHERE brandKey = ? AND modelSlug = ?
                    LIMIT 1
                """, (brand_key, sub_model_slug))
                slug_row = cur_cur.fetchone()
                if slug_row and is_product_compatible(cur_cur, slug_row[0], profile, category, brand_key):
                    target_product_id = slug_row[0]
                else:
                    # Try searching by name and brandKey
                    cur_cur.execute("""
                        SELECT id FROM Product 
                        WHERE brandKey = ? AND category = ? AND name = ?
                        LIMIT 1
                    """, (brand_key, category, sub_name))
                    prod_row = cur_cur.fetchone()
                    if prod_row and is_product_compatible(cur_cur, prod_row[0], profile, category, brand_key):
                        target_product_id = prod_row[0]
                    else:
                        # Product doesn't exist or is incompatible. Let's create it!
                        if has_tips_val and "tips" not in sub_model_key and "boquilla" not in sub_model_key:
                            sub_name = sub_name + " + Tips"
                            sub_model_key = sub_model_key + "-with-tips"
                            sub_model_slug = sub_model_slug + "-with-tips"
                        if paper_size_val and paper_size_val != "unknown" and paper_size_val not in sub_model_key:
                            sub_model_key = f"{sub_model_key}-{paper_size_val}"
                            sub_model_slug = f"{sub_model_slug}-{paper_size_val}"

                        # Enforce UNIQUE constraint for brandKey + modelSlug
                        cur_cur.execute("SELECT id FROM Product WHERE brandKey = ? AND modelSlug = ?", (brand_key, sub_model_slug))
                        if cur_cur.fetchone():
                            sub_model_slug = f"{sub_model_slug}-variant"
                            sub_model_key = f"{sub_model_key}-variant"

                        cur_cur.execute("""
                            INSERT INTO Product (name, normalizedName, brand, brandKey, modelKey, modelSlug, category, createdAt, updatedAt)
                            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                        """, (sub_name, normalized_name, brand, brand_key, sub_model_key, sub_model_slug, category))
                        target_product_id = cur_cur.lastrowid
                        restored_count += 1

            if target_product_id:
                for o_id in o_ids:
                    cur_cur.execute("UPDATE Offer SET productId = ?, category = ? WHERE id = ?", (target_product_id, category, o_id))
                    if cur_cur.rowcount > 0:
                        updated_offers += 1

    # Commit changes
    conn_cur.commit()

    conn_cp.close()
    conn_cur.close()

    print(f"Restoration complete:")
    print(f"  - Re-created products: {restored_count}")
    print(f"  - Offers re-linked to correct products: {updated_offers}")

if __name__ == "__main__":
    restore_links()
