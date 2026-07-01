import sqlite3
import os
import sys

# Force output to use utf-8 to prevent windows encoding errors
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def get_4store_products(db_path):
    if not os.path.exists(db_path):
        return []
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        query = """
            SELECT p.id, p.name, p.category, p.brandKey, COUNT(DISTINCT o.storeId) as storeCount
            FROM Product p
            JOIN Offer o ON o.productId = p.id
            GROUP BY p.id, p.name, p.category, p.brandKey
            HAVING storeCount >= 4
            ORDER BY p.category, p.name
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        conn.close()
        return rows
    except Exception as e:
        print(f"Error querying {db_path}: {e}")
        return []

def main():
    checkpoint_path = "backups/max-4store-25.db"
    current_path = "prisma/dev_recovered.db"

    checkpoint_prods = get_4store_products(checkpoint_path)
    current_prods = get_4store_products(current_path)

    print(f"=== CHECKPOINT 4-STORE PRODUCTS ({len(checkpoint_prods)}) ===")
    for p in checkpoint_prods:
        try:
            print(f"[{p[2]}] {p[3]} - {p[1]} (ID: {p[0]})")
        except Exception:
            # Fallback to ascii representation if printing still fails
            print(f"[{p[2]}] {p[3]} - {p[1].encode('ascii', 'ignore').decode('ascii')} (ID: {p[0]})")

    print(f"\n=== CURRENT 4-STORE PRODUCTS ({len(current_prods)}) ===")
    for p in current_prods:
        try:
            print(f"[{p[2]}] {p[3]} - {p[1]} (ID: {p[0]})")
        except Exception:
            print(f"[{p[2]}] {p[3]} - {p[1].encode('ascii', 'ignore').decode('ascii')} (ID: {p[0]})")

    checkpoint_keys = {f"{p[3]}:{p[1]}" for p in checkpoint_prods}
    current_keys = {f"{p[3]}:{p[1]}" for p in current_prods}

    print("\n=== MISSING IN CURRENT (DROPPED OUT OF 4-STORES) ===")
    for p in checkpoint_prods:
        key = f"{p[3]}:{p[1]}"
        if key not in current_keys:
            try:
                print(f"❌ [{p[2]}] {p[3]} - {p[1]} (Was ID: {p[0]})")
            except Exception:
                print(f"❌ [{p[2]}] {p[3]} - {p[1].encode('ascii', 'ignore').decode('ascii')} (Was ID: {p[0]})")

    print("\n=== NEW IN CURRENT (ADDED TO 4-STORES) ===")
    for p in current_prods:
        key = f"{p[3]}:{p[1]}"
        if key not in checkpoint_keys:
            try:
                print(f"✅ [{p[2]}] {p[3]} - {p[1]} (New ID: {p[0]})")
            except Exception:
                print(f"✅ [{p[2]}] {p[3]} - {p[1].encode('ascii', 'ignore').decode('ascii')} (New ID: {p[0]})")

if __name__ == "__main__":
    main()
