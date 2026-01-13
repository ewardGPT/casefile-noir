import json

INPUT = 'client/public/assets/maps/victorian/city_map_fixed.json'
OUTPUT = 'client/public/assets/maps/victorian/city_map_test_data.json'

def test_data():
    with open(INPUT, 'r') as f:
        data = json.load(f)
        
    clean = {
        'version': 1.0,
        'tiledversion': data.get('tiledversion', '1.0'),
        'orientation': 'orthogonal',
        'renderorder': 'right-down',
        'width': data['width'],
        'height': data['height'],
        'tilewidth': 32,
        'tileheight': 32,
        'infinite': False,
        'layers': [],
        'tilesets': []
    }
    
    # FIRST tileset (terrain-map-v8) with ORIGINAL dims
    ts0 = data['tilesets'][0]
    # Ensure it's the right one
    if 'terrain' not in ts0['name']:
        print("WARNING: First tileset is not terrain!")
    
    # ts0['imageheight'] should be 31488 from my converter if it worked
    print(f"Tileset 0 height: {ts0.get('imageheight')}")
    clean['tilesets'].append(ts0)
    
    # FIRST layer (Trn_1) with ORIGINAL data
    l0 = data['layers'][0]
    clean['layers'].append(l0)
    
    with open(OUTPUT, 'w') as f:
        json.dump(clean, f)
        
    print(f"saved {OUTPUT}")

if __name__ == '__main__':
    test_data()
