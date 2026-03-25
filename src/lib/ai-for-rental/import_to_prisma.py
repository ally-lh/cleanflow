#!/usr/bin/env python3
"""
Import JSON export into Prisma database
Run this AFTER pushing the schema to Supabase
"""

import os
import json
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def main():
    json_file = "clothing_catalog_export.json"
    
    if not os.path.exists(json_file):
        print(f"Error: {json_file} not found. Run export_for_prisma.py first.")
        return
    
    with open(json_file, 'r') as f:
        items = json.load(f)
    
    # Connect to Supabase database
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()
    
    print(f"Importing {len(items)} items into database...")
    
    for item in items:
        # Handle sizeQuantities (convert to JSON string for Postgres)
        size_quantities = json.dumps(item.get("sizeQuantities", {}))
        
        cur.execute("""
            INSERT INTO "ClothingItem" (
                name, "imageUrl", category, brand, "pricePerMonth",
                sizes, "sizeQuantities", description, "isAvailable"
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """, (
            item["name"],
            item["imageUrl"],
            item["category"],
            item["brand"],
            item["pricePerMonth"],
            item["sizes"],
            size_quantities,
            item["description"],
            item["isAvailable"]
        ))
    
    conn.commit()
    cur.close()
    conn.close()
    
    print(f"✓ Successfully imported {len(items)} items into Supabase!")

if __name__ == "__main__":
    main()