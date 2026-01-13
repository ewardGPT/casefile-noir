import json
import os

path = 'client/public/assets/maps/victorian/city_map.json'

try:
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    print(f"Total Tilesets: {len(data.get('tilesets', []))}")
    for ts in data.get('tilesets', []):
        print(f"Name: {ts.get('name')}")
        print(f"Source: {ts.get('source', 'EMBEDDED')}")
        print(f"Image: {ts.get('image', 'N/A')}")
        print("-" * 20)

except Exception as e:
    print(f"Error: {e}")
