import sqlite3
import os
import glob

def check_db(db_path):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        
        has_product = "Product" in tables
        has_offer = "Offer" in tables
        has_store = "Store" in tables
        
        product_count = 0
        offer_count = 0
        store_count = 0
        dist_4 = 0
        
        if has_product:
            cursor.execute("SELECT COUNT(*) FROM Product")
            product_count = cursor.fetchone()[0]
            
        if has_offer:
            cursor.execute("SELECT COUNT(*) FROM Offer")
            offer_count = cursor.fetchone()[0]
            
        if has_store:
            cursor.execute("SELECT COUNT(*) FROM Store")
            store_count = cursor.fetchone()[0]
            
        if has_product and has_offer:
            # Count products with offers in exactly 4 stores
            query = """
                SELECT COUNT(*) FROM (
                    SELECT p.id, COUNT(DISTINCT o.storeId) as s_count
                    FROM Product p
                    JOIN Offer o ON o.productId = p.id
                    GROUP BY p.id
                    HAVING s_count = 4
                )
            """
            cursor.execute(query)
            dist_4 = cursor.fetchone()[0]
            
        conn.close()
        return {
            "success": True,
            "tables": tables,
            "products": product_count,
            "offers": offer_count,
            "stores": store_count,
            "dist_4": dist_4
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def main():
    db_files = []
    
    # Add prisma files
    for f in ["dev.db", "dev.db.bak", "dev.db.before-docs", "dev.db.checkpoint"]:
        path = os.path.join("prisma", f)
        if os.path.exists(path):
            db_files.append(path)
            
    # Add backup files
    backups = glob.glob(os.path.join("backups", "*.db"))
    db_files.extend(backups)
    
    print("Direct SQLite Analysis (No Prisma Client dependency):")
    print("=" * 100)
    print(f"{'Database File':<50} | {'Prod':<6} | {'Offr':<6} | {'Stor':<4} | {'4-St':<4} | {'Status/Tables'}")
    print("=" * 100)
    
    for db_file in db_files:
        res = check_db(db_file)
        if res["success"]:
            print(f"{db_file:<50} | {res['products']:<6} | {res['offers']:<6} | {res['stores']:<4} | {res['dist_4']:<4} | OK ({len(res['tables'])} tables)")
        else:
            print(f"{db_file:<50} | {'-'*6} | {'-'*6} | {'-'*4} | {'-'*4} | Error: {res['error']}")

if __name__ == "__main__":
    main()
