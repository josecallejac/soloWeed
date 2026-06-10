import sqlite3

def check_product_offers(db_path, product_slug):
    print(f"\nChecking product slug '{product_slug}' in {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get the product
    cursor.execute("SELECT id, name, category FROM Product WHERE modelSlug = ? OR name LIKE ?", (product_slug, f"%{product_slug}%"))
    products = cursor.fetchall()
    if not products:
        # Try finding by brandKey + modelSlug
        parts = product_slug.split('/')
        if len(parts) == 2:
            cursor.execute("SELECT id, name, category FROM Product WHERE brandKey = ? AND modelSlug = ?", (parts[0], parts[1]))
            products = cursor.fetchall()
            
    if not products:
        print(f"Product not found.")
        conn.close()
        return
        
    for p in products:
        p_id, p_name, p_cat = p
        print(f"Product ID: {p_id} | Name: {p_name} | Category: {p_cat}")
        
        # Get associated offers
        cursor.execute("SELECT id, title, url, price, category FROM Offer WHERE productId = ?", (p_id,))
        offers = cursor.fetchall()
        print(f"Associated Offers ({len(offers)}):")
        for o in offers:
            o_id, o_title, o_url, o_price, o_cat = o
            print(f"  Offer ID: {o_id} | Title: {o_title} | Price: {o_price} | Cat: {o_cat}")
            
    conn.close()

db_path = "E:/soloWeed/prisma/test.db"
check_product_offers(db_path, "storz-bickel/volcano-classic")
check_product_offers(db_path, "focus-v/tip-saber-tip-1u")
check_product_offers(db_path, "calvo/banger-flat-bucket-macho-90-14mm")
check_product_offers(db_path, "the-bulldog/plastic-3-partes-63mm")
check_product_offers(db_path, "ocb/ultimate-king-size-slim")
