import json

INPUT = 'client/public/assets/maps/victorian/city_map_fixed.json'
OUTPUT = 'client/public/assets/maps/victorian/city_map_sanitized.json'

def sanitize():
    with open(INPUT, 'r') as f:
        data = json.load(f)
        
    print(f"Original: {len(data['layers'])} layers, {len(data['tilesets'])} tilesets")
    
    # Create minimal copy
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
    
    # Keep only the FIRST tileset (terrain-map-v8)
    ts0 = data['tilesets'][0]
    # Ensure it has basic props
    ts0['imageheight'] = 1024 # Force safe size matching the placeholder if needed
    ts0['imagewidth'] = 1024
    clean['tilesets'].append(ts0)
    
    # Keep only FIRST layer (Trn_1) but clear data to 0
    l0 = data['layers'][0].copy()
    # Reset data to all zeros (empty)
    l0['data'] = [0] * (data['width'] * data['height'])
    clean['layers'].append(l0)
    
    with open(OUTPUT, 'w') as f:
        json.dump(clean, f)
        
    print(f"Sanitized saved to {OUTPUT}")

if __name__ == '__main__':
    sanitize()
