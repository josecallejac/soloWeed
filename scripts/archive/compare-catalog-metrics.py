import sys
import sqlite3
import os

# Force UTF-8 stdout to avoid Windows Unicode encoding issues
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        # Fallback for older python versions
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def get_products_data(db_path):
    if not os.path.exists(db_path):
        print(f"Error: Database file not found at {db_path}", file=sys.stderr)
        sys.exit(1)
        
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    # Query products and count distinct stores from their offers
    cur.execute("""
        SELECT p.id, p.name, p.category, p.brandKey, p.modelSlug
        FROM Product p
    """)
    products = cur.fetchall()
    
    data = {}
    for pid, name, category, brand_key, model_slug in products:
        # Get offer titles and store names for detail
        cur.execute("""
            SELECT o.title, s.name
            FROM Offer o
            JOIN Store s ON o.storeId = s.id
            WHERE o.productId = ?
        """, (pid,))
        offers = cur.fetchall()
        
        # Count distinct stores
        distinct_stores = set(store for _, store in offers)
        store_count = len(distinct_stores)
        
        # Use (category, brandKey, modelSlug) as unique conceptual key
        key = (category, brand_key or "unknown", model_slug or "unknown")
        data[key] = {
            "id": pid,
            "name": name,
            "store_count": store_count,
            "offers": [f"{title} ({store})" for title, store in offers]
        }
        
    conn.close()
    return data

def main():
    if len(sys.argv) < 3:
        print("Usage: python compare-catalog-metrics.py <db_before> <db_after>")
        sys.exit(1)
        
    db_before = sys.argv[1]
    db_after = sys.argv[2]
    
    before_data = get_products_data(db_before)
    after_data = get_products_data(db_after)
    
    # 1. Summary counts
    def get_counts(data):
        counts = {4: 0, 3: 0, 2: 0, 1: 0, 0: 0}
        for item in data.values():
            cnt = item["store_count"]
            if cnt in counts:
                counts[cnt] += 1
            else:
                counts[0] += 1
        return counts

    before_counts = get_counts(before_data)
    after_counts = get_counts(after_data)
    
    print("# Reporte de Cobertura y Comparación de Tiendas")
    print(f"\n* **Base de Origen (Antes):** `{db_before}`")
    print(f"* **Base de Destino (Después):** `{db_after}`")
    print("\n## 1. Resumen de Cobertura de Productos Curados")
    print("\n| Cobertura | Antes | Después | Variación |")
    print("| :--- | :---: | :---: | :---: |")
    
    for stores in [4, 3, 2]:
        diff = after_counts[stores] - before_counts[stores]
        diff_str = f"+{diff}" if diff > 0 else str(diff)
        print(f"| **{stores} Tiendas** | {before_counts[stores]} | {after_counts[stores]} | **{diff_str}** |")

    # Helper to find changes
    all_keys = set(before_data.keys()) | set(after_data.keys())
    
    gained_4 = []
    lost_4 = []
    gained_3 = []
    lost_3 = []
    gained_2 = []
    lost_2 = []
    
    for key in all_keys:
        category, brand_key, model_slug = key
        b_item = before_data.get(key)
        a_item = after_data.get(key)
        
        b_cnt = b_item["store_count"] if b_item else 0
        a_cnt = a_item["store_count"] if a_item else 0
        
        if b_cnt != a_cnt:
            info = {
                "key": key,
                "name": a_item["name"] if a_item else b_item["name"],
                "before_cnt": b_cnt,
                "after_cnt": a_cnt,
                "before_offers": b_item["offers"] if b_item else [],
                "after_offers": a_item["offers"] if a_item else []
            }
            
            # Gained/Lost logic
            if b_cnt < 4 and a_cnt == 4:
                gained_4.append(info)
            elif b_cnt == 4 and a_cnt < 4:
                lost_4.append(info)
                
            if b_cnt < 3 and a_cnt == 3:
                gained_3.append(info)
            elif b_cnt == 3 and a_cnt < 3:
                lost_3.append(info)
                
            if b_cnt < 2 and a_cnt == 2:
                gained_2.append(info)
            elif b_cnt == 2 and a_cnt < 2:
                lost_2.append(info)

    def print_section(title, items, is_lost=False):
        print(f"\n## {title} ({len(items)} productos)")
        if not items:
            print("*Ningún cambio registrado en esta sección.*")
            return
            
        for idx, item in enumerate(items, 1):
            category, brand_key, model_slug = item["key"]
            print(f"\n{idx}. **{item['name']}** ({category} | `{brand_key}` / `{model_slug}`)")
            print(f"   * **Antes:** {item['before_cnt']} tiendas")
            print(f"   * **Después:** {item['after_cnt']} tiendas")
            
            if is_lost and item["before_offers"]:
                print("   * **Ofertas originales:**")
                for off in item["before_offers"]:
                    print(f"     - {off}")
            if not is_lost and item["after_offers"]:
                print("   * **Ofertas actuales:**")
                for off in item["after_offers"]:
                    print(f"     - {off}")

    print_section("🟢 Ganaron Cobertura de 4 Tiendas", gained_4)
    print_section("🔴 Perdieron Cobertura de 4 Tiendas", lost_4, is_lost=True)
    print_section("🟢 Ganaron Cobertura de 3 Tiendas", gained_3)
    print_section("🔴 Perdieron Cobertura de 3 Tiendas", lost_3, is_lost=True)
    print_section("🟢 Ganaron Cobertura de 2 Tiendas", gained_2)
    print_section("🔴 Perdieron Cobertura de 2 Tiendas", lost_2, is_lost=True)

if __name__ == "__main__":
    main()
