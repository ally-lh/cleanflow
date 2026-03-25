#!/usr/bin/env python3
"""
Generate JSON export for Prisma seeding
Run this and send the output.json to your teammate
"""

import json

CATEGORY_MAP = {
    41: "DRESS",
    42: "JUMPSUIT", 
    48: "ROMPER"
}

def main():
    anno_file = "DeepFashion/anno/list_category_img.txt"
    
    items = []
    
    with open(anno_file, 'r') as f:
        lines = f.readlines()[2:]
    
    for line in lines:
        parts = line.strip().split()
        if len(parts) >= 4:
            img_path = parts[0]
            if img_path.startswith("img/"):
                img_path = img_path[4:]
            
            cat_label = int(parts[1])
            brand = parts[2]
            price = float(parts[3])
            
            category = CATEGORY_MAP.get(cat_label, "DRESS")
            name = img_path.split("/")[0].replace("_", " ").title()
            
            # Generate size quantities (for now, random 1-3 each)
            import random
            random.seed(hash(img_path) % 1000)
            size_quantities = {
                "XS": random.randint(1, 3),
                "S": random.randint(2, 5),
                "M": random.randint(3, 6),
                "L": random.randint(2, 5),
                "XL": random.randint(1, 3)
            }
            
            items.append({
                "name": name,
                # TODO: Replace with Supabase Storage URL after uploading images
                "imageUrl": "REPLACE_WITH_SUPABASE_URL",
                "category": category,
                "brand": brand,
                "pricePerMonth": price,
                "sizes": ["XS", "S", "M", "L", "XL"],
                "sizeQuantities": size_quantities,
                "description": f"Beautiful {category.lower()} perfect for any occasion",
                "isAvailable": True,
                # Store local image path for embedding generation
                "localImagePath": img_path
            })
    
    # Output as JSON
    with open("clothing_catalog_export.json", "w") as f:
        json.dump(items, f, indent=2)
    
    print(f"Exported {len(items)} items to clothing_catalog_export.json")
    print("\n⚠️  IMPORTANT: Edit the JSON to replace 'REPLACE_WITH_SUPABASE_URL' with actual Supabase image URLs")
    print("\nFormat for each item:")
    print(json.dumps(items[0], indent=2))

if __name__ == "__main__":
    main()
