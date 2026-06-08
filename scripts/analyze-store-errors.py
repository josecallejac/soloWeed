import sqlite3
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def analyze_stores():
    db_path = "prisma/dev_recovered.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Query metrics per store
    query = """
        SELECT s.id, s.name, COUNT(o.id) as total_offers,
               SUM(CASE WHEN o.productId IS NOT NULL THEN 1 ELSE 0 END) as curated_offers,
               ROUND(CAST(SUM(CASE WHEN o.productId IS NOT NULL THEN 1 ELSE 0 END) as FLOAT) / COUNT(o.id) * 100, 2) as match_rate
        FROM Store s
        LEFT JOIN Offer o ON o.storeId = s.id
        GROUP BY s.id, s.name
    """
    cursor.execute(query)
    stores = cursor.fetchall()

    print("=== PERFORMANCE METRICS PER STORE ===")
    print(f"{'Store ID':<8} | {'Store Name':<25} | {'Total Offers':<12} | {'Curated Offers':<14} | {'Match Rate %'}")
    print("-" * 75)
    for s in stores:
        print(f"{s[0]:<8} | {s[1]:<25} | {s[2]:<12} | {s[3]:<14} | {s[4]}%")

    # Show count of duplicate mappings as a total number per store to keep it clean
    print("\n=== DUPLICATE OFFERS PER STORE ===")
    cursor.execute("""
        SELECT s.name, COUNT(dup_cnt) FROM (
            SELECT o.storeId, o.productId, COUNT(o.id) as dup_cnt
            FROM Offer o
            JOIN Store s ON o.storeId = s.id
            WHERE o.productId IS NOT NULL
            GROUP BY o.productId, o.storeId
            HAVING dup_cnt > 1
        ) d
        JOIN Store s ON d.storeId = s.id
        GROUP BY s.name
    """)
    dups = cursor.fetchall()
    for d in dups:
         print(f"Store: {d[0]:<25} | Duplicate groups count: {d[1]}")

    conn.close()

if __name__ == "__main__":
    analyze_stores()
