import sqlite3
import os

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
    # We want to pull products that had >= 2 stores to ensure we don't miss anything that was comparative
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

        # Get all offer IDs associated with this product in the checkpoint
        cur_cp.execute("SELECT id FROM Offer WHERE productId = ?", (cp_prod_id,))
        cp_offer_ids = [row[0] for row in cur_cp.fetchall()]

        if not cp_offer_ids:
            continue

        # Find where these offers are currently mapped in the active database
        placeholders = ",".join("?" for _ in cp_offer_ids)
        cur_cur.execute(f"SELECT DISTINCT productId FROM Offer WHERE id IN ({placeholders}) AND productId IS NOT NULL", cp_offer_ids)
        current_product_ids = [row[0] for row in cur_cur.fetchall()]

        target_product_id = None

        if len(current_product_ids) == 1:
            # Simple case: all currently mapped offers point to a single product
            target_product_id = current_product_ids[0]
        elif len(current_product_ids) > 1:
            # Ambiguity: offers are split. Pick the one that has the most matching offers
            # or just pick the first one. Let's find which one has more offers in the set.
            max_count = -1
            for pid in current_product_ids:
                cur_cur.execute(f"SELECT COUNT(*) FROM Offer WHERE productId = ? AND id IN ({placeholders})", [pid] + cp_offer_ids)
                count = cur_cur.fetchone()[0]
                if count > max_count:
                    max_count = count
                    target_product_id = pid
        else:
            # None of the offers are currently mapped. Search by name & brandKey
            cur_cur.execute("""
                SELECT id FROM Product 
                WHERE brandKey = ? AND category = ? AND name = ?
                LIMIT 1
            """, (brand_key, category, name))
            prod_row = cur_cur.fetchone()
            if prod_row:
                target_product_id = prod_row[0]
            else:
                # Product doesn't exist at all in current DB. Let's create it to preserve the curation!
                cur_cur.execute("""
                    INSERT INTO Product (name, normalizedName, brand, brandKey, modelKey, modelSlug, category, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                """, (name, normalized_name, brand, brand_key, model_key, model_slug, category))
                target_product_id = cur_cur.lastrowid
                restored_count += 1

        if target_product_id:
            # Map all checkpoint offers of this group to the target product in the active DB
            for o_id in cp_offer_ids:
                cur_cur.execute("UPDATE Offer SET productId = ? WHERE id = ?", (target_product_id, o_id))
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
