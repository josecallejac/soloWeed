"""Repair encoding in soloweed SQLite database.

Scans Offer and Product tables for text columns that contain invalid
UTF-8 byte sequences (commonly caused by lone surrogates from
mischarset web scraping) and replaces invalid bytes with U+FFFD.
"""

import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "prisma" / "dev.db"

BYTES_FIXED = 0
ROWS_FIXED = 0


def sanitize_bytes(value):
    """Convert raw bytes to valid UTF-8 string, replacing invalid sequences
    with the Unicode replacement character U+FFFD.

    Returns (cleaned_str, was_fixed) tuple.
    """
    if value is None:
        return None, False
    if isinstance(value, str):
        # Already decoded properly by sqlite3
        return value, False
    if not isinstance(value, bytes):
        return str(value), False

    try:
        decoded = value.decode("utf-8")
        # Double-check: re-encode and compare to rule out non-fatal
        # inconsistencies (lone surrogates stored as valid-ish bytes)
        re_encoded = decoded.encode("utf-8")
        if re_encoded == value:
            return decoded, False
        # Bytes differ after round-trip, sanitize
        decoded = value.decode("utf-8", errors="replace")
        return decoded, True
    except UnicodeDecodeError:
        decoded = value.decode("utf-8", errors="replace")
        return decoded, True


def sanitize_str(value):
    """Sanitize a string that's already decoded but may contain lone surrogates."""
    if value is None:
        return None, False
    if not isinstance(value, str):
        return str(value), False
    # Round-trip through UTF-8 to strip lone surrogates
    cleaned = value.encode("utf-8", errors="replace").decode("utf-8")
    return cleaned, (cleaned != value)


def repair_table(conn, table, text_columns):
    """Scan and repair all text columns in a table."""
    global BYTES_FIXED, ROWS_FIXED

    # Use bytes mode to get raw data without decoding
    old_factory = conn.text_factory
    conn.text_factory = bytes

    cursor = conn.cursor()

    # Get all rows with their rowid
    cursor.execute(f"SELECT rowid, {', '.join(text_columns)} FROM \"{table}\"")
    rows = cursor.fetchall()

    fixes = []

    for row in rows:
        rowid = row[0]
        needs_fix = False
        fixed_values = {}

        for i, col in enumerate(text_columns):
            raw_value = row[i + 1]  # +1 because row[0] is rowid
            cleaned, was_fixed = sanitize_bytes(raw_value)

            if was_fixed:
                needs_fix = True
                fixed_values[col] = cleaned
                BYTES_FIXED += 1

        # Also check for lone surrogates in the decoded text
        if not needs_fix:
            # Switch to string mode for surrogate check
            conn.text_factory = str
            cursor2 = conn.cursor()
            cursor2.execute(
                f"SELECT {', '.join(text_columns)} FROM \"{table}\" WHERE rowid = ?",
                (rowid,),
            )
            str_row = cursor2.fetchone()
            conn.text_factory = bytes  # restore

            if str_row:
                for i, col in enumerate(text_columns):
                    cleaned, was_fixed = sanitize_str(str_row[i])
                    if was_fixed:
                        needs_fix = True
                        fixed_values[col] = cleaned
                        BYTES_FIXED += 1

        if needs_fix:
            set_clause = ", ".join(
                f'"{col}" = ?' for col in fixed_values
            )
            values = list(fixed_values.values())
            cursor.execute(
                f'UPDATE "{table}" SET {set_clause} WHERE rowid = ?',
                [*values, rowid],
            )
            ROWS_FIXED += 1

    conn.text_factory = old_factory
    conn.commit()
    return fixes


def main():
    if not DB_PATH.exists():
        print(f"Error: database not found at {DB_PATH}")
        sys.exit(1)

    # Make a backup first
    backup_path = DB_PATH.with_suffix(".db.bak")
    print(f"Backing up {DB_PATH} to {backup_path}")
    backup_path.write_bytes(DB_PATH.read_bytes())

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode = WAL")

    try:
        # Repair Offer table
        print("Scanning Offer table...")
        offer_cols = [
            "url", "sourceId", "title", "normalizedTitle",
            "brand", "brandKey", "modelKey", "category",
            "sourceCategory", "description", "imageUrl",
            "currency", "availability",
        ]
        repair_table(conn, "Offer", offer_cols)
        print(f"  Offer: {ROWS_FIXED} rows fixed")

        # Repair Product table
        print("Scanning Product table...")
        prod_rows_before = ROWS_FIXED
        prod_cols = [
            "name", "normalizedName", "brand", "brandKey",
            "modelKey", "modelSlug", "category", "imageUrl",
        ]
        repair_table(conn, "Product", prod_cols)
        print(f"  Product: {ROWS_FIXED - prod_rows_before} rows fixed")

    finally:
        conn.close()

    print(f"\nTotal: {ROWS_FIXED} rows fixed ({BYTES_FIXED} column values)")
    if ROWS_FIXED == 0:
        print("No encoding issues found.")
    else:
        print(f"Backup saved at {backup_path}")


if __name__ == "__main__":
    main()
