import json
import os
import math
from PIL import Image

MAP_JSON = 'client/public/assets/maps/victorian/city_map_fixed.json'
OUTPUT_JSON = 'client/public/assets/maps/victorian/city_map_split.json'
IMG_PATH = 'client/public/assets/maps/victorian/terrain-map-v8.png'
CHUNK_HEIGHT = 4096

def split_and_update():
    print(f"Loading map {MAP_JSON}...")
    with open(MAP_JSON, 'r') as f:
        map_data = json.load(f)

    # Find the corrupted tileset
    target_ts_index = -1
    target_ts = None
    for i, ts in enumerate(map_data['tilesets']):
        if 'terrain-map-v8' in ts['image']:
            target_ts_index = i
            target_ts = ts
            break
            
    if target_ts is None:
        print("Target tileset not found!")
        return

    print(f"splitting tileset: {target_ts['name']}")
    
    # Open Image
    print(f"Opening image {IMG_PATH}...")
    try:
        img = Image.open(IMG_PATH)
    except Exception as e:
        print(f"Failed to open image: {e}")
        return

    width, height = img.size
    print(f"Original Size: {width}x{height}")
    
    num_chunks = math.ceil(height / CHUNK_HEIGHT)
    print(f"Splitting into {num_chunks} chunks of height {CHUNK_HEIGHT}...")

    new_tilesets = []
    current_gid = target_ts['firstgid']
    tile_width = target_ts['tilewidth']
    tile_height = target_ts['tileheight']
    cols = width // tile_width

    for i in range(num_chunks):
        # Crop
        y1 = i * CHUNK_HEIGHT
        y2 = min((i + 1) * CHUNK_HEIGHT, height)
        chunk_h = y2 - y1
        
        chunk_name = f"terrain-map-v8_{i}.png"
        chunk_path = os.path.join(os.path.dirname(IMG_PATH), chunk_name)
        
        chunk_img = img.crop((0, y1, width, y2))
        chunk_img.save(chunk_path)
        print(f"  Saved {chunk_name} ({width}x{chunk_h})")
        
        # Create Tileset Entry
        rows = chunk_h // tile_height
        tile_count = cols * rows
        
        ts_entry = target_ts.copy()
        ts_entry['name'] = f"terrain-map-v8_{i}"
        ts_entry['image'] = chunk_name
        ts_entry['imageheight'] = chunk_h
        ts_entry['imagewidth'] = width
        ts_entry['firstgid'] = current_gid
        ts_entry['tilecount'] = tile_count # Important for Phaser
        
        # Phaser/Tiled needs 'margin' and 'spacing' correctly if they exist
        
        new_tilesets.append(ts_entry)
        
        current_gid += tile_count

    # Replace the old tileset with the new list
    # We slice the list to replace the single entry with multiple
    map_data['tilesets'][target_ts_index:target_ts_index+1] = new_tilesets
    
    print(f"Warning: Next tileset starts at GID {map_data['tilesets'][target_ts_index+num_chunks]['firstgid']}. My calc ended at {current_gid}.")
    
    with open(OUTPUT_JSON, 'w') as f:
        json.dump(map_data, f)
    print(f"Saved optimized map to {OUTPUT_JSON}")

if __name__ == '__main__':
    split_and_update()
