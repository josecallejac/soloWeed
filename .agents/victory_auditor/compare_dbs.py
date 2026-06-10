import sqlite3
import json

def get_db_summary(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Counts
    cursor.execute("SELECT COUNT(*) FROM Product")
    product_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM Offer")
    offer_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM Offer WHERE productId IS NOT NULL")
    linked_offers_count = cursor.fetchone()[0]
    
    # Get all products (sorted)
    cursor.execute("SELECT id, name, brandKey, modelKey, modelSlug, category FROM Product ORDER BY id")
    products = [
        {"id": r[0], "name": r[1], "brandKey": r[2], "modelKey": r[3], "modelSlug": r[4], "category": r[5]}
        for r in cursor.fetchall()
    ]
    
    # Get all offer mappings
    cursor.execute("SELECT id, productId, url, title FROM Offer ORDER BY id")
    offers = [
        {"id": r[0], "productId": r[1], "url": r[2], "title": r[3]}
        for r in cursor.fetchall()
    ]
    
    conn.close()
    return {
        "product_count": product_count,
        "offer_count": offer_count,
        "linked_offers_count": linked_offers_count,
        "products": products,
        "offers": offers
    }

# Read dev_recovered.db via a temp file to avoid lock issues
import shutil
shutil.copy("E:/soloWeed/prisma/dev_recovered.db", "E:/soloWeed/prisma/temp_compare.db")

recovered = get_db_summary("E:/soloWeed/prisma/temp_compare.db")
baseline = get_db_summary("E:/soloWeed/prisma/baseline.db")
test = get_db_summary("E:/soloWeed/prisma/test.db")

import os
os.remove("E:/soloWeed/prisma/temp_compare.db")

print("=== DB Summary ===")
print(f"dev_recovered.db: {recovered['product_count']} products, {recovered['offer_count']} offers, {recovered['linked_offers_count']} linked offers")
print(f"baseline.db (0.86): {baseline['product_count']} products, {baseline['offer_count']} offers, {baseline['linked_offers_count']} linked offers")
print(f"test.db (0.80): {test['product_count']} products, {test['offer_count']} offers, {test['linked_offers_count']} linked offers")

print("\n=== Comparing baseline.db vs test.db ===")
# Check products
p_diff = []
for p1, p2 in zip(baseline['products'], test['products']):
    if p1 != p2:
        p_diff.append((p1, p2))
if len(baseline['products']) != len(test['products']):
    print(f"Product counts differ! {len(baseline['products'])} vs {len(test['products'])}")
elif p_diff:
    print(f"Found {len(p_diff)} product differences!")
    for d in p_diff[:5]:
        print("  Baseline:", d[0])
        print("  Test    :", d[1])
else:
    print("Products are identical.")

# Check offer linkages
o_diff = []
for o1, o2 in zip(baseline['offers'], test['offers']):
    if o1 != o2:
        o_diff.append((o1, o2))
if len(baseline['offers']) != len(test['offers']):
    print(f"Offer counts differ! {len(baseline['offers'])} vs {len(test['offers'])}")
elif o_diff:
    print(f"Found {len(o_diff)} offer differences!")
    for d in o_diff[:5]:
        print("  Baseline:", d[0])
        print("  Test    :", d[1])
else:
    print("Offer mappings are identical.")
