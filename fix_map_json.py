import json
import os

path = 'client/public/assets/maps/victorian/city_map.json'

try:
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    fixed_count = 0
    for ts in data.get('tilesets', []):
        if 'source' in ts:
            old_source = ts['source']
            filename = os.path.basename(old_source)
            if old_source != filename:
                ts['source'] = filename
                print(f"Fixed source: {old_source} -> {filename}")
                fixed_count += 1

    if fixed_count > 0:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f) # Minified
        print(f"Successfully fixed {fixed_count} tileset paths.")
    else:
        print("No tileset source paths needed fixing.")

except Exception as e:
    print(f"Error: {e}")
