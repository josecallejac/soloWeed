import sqlite3

def inspect_db(db_path):
    print(f"Inspecting {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    for table in tables:
        table_name = table[0]
        cursor.execute(f"PRAGMA table_info({table_name});")
        columns = cursor.fetchall()
        print(f"Table: {table_name}")
        for col in columns:
            print(f"  {col[1]} ({col[2]})")
    conn.close()

inspect_db("E:/soloWeed/prisma/test.db")
