import xml.etree.ElementTree as ET
import json
import os
import base64
import zlib
import struct

TMX_FILE = 'client/public/assets/maps/victorian/victorian-preview.tmx'
OUTPUT_FILE = 'client/public/assets/maps/victorian/city_map_fixed.json'
BASE_DIR = os.path.dirname(TMX_FILE)

def parse_tileset(node, firstgid):
    info = {
        'firstgid': firstgid,
        'name': node.get('name', ''),
        'tilewidth': int(node.get('tilewidth', 32)),
        'tileheight': int(node.get('tileheight', 32)),
        'spacing': int(node.get('spacing', 0)),
        'margin': int(node.get('margin', 0)),
        'image': '',
        'imagewidth': 0,
        'imageheight': 0
    }
    
    # Handle source (external TSX)
    source = node.get('source')
    if source:
        tsx_path = os.path.join(BASE_DIR, source)
        try:
            tree = ET.parse(tsx_path)
            root = tree.getroot()
            info['name'] = root.get('name')
            info['tilewidth'] = int(root.get('tilewidth'))
            info['tileheight'] = int(root.get('tileheight'))
            info['spacing'] = int(root.get('spacing', 0))
            info['margin'] = int(root.get('margin', 0))
            
            # Find image
            img_node = root.find('image')
            if img_node is not None:
                info['image'] = os.path.basename(img_node.get('source'))
                info['imagewidth'] = int(img_node.get('width'))
                info['imageheight'] = int(img_node.get('height'))
                
                # HOTFIX: Mismatch between TMX expectation (31488) and TSX (31104)
                if 'terrain-map-v8' in info['image']:
                    print(f"  HOTFIX: Overriding {info['name']} height from {info['imageheight']} to 31488")
                    info['imageheight'] = 31488
        except Exception as e:
            print(f"Error parsing TSX {source}: {e}")
            return None
    else:
        # Embedded
        img_node = node.find('image')
        if img_node is not None:
            info['image'] = os.path.basename(img_node.get('source'))
            info['imagewidth'] = int(img_node.get('width'))
            info['imageheight'] = int(img_node.get('height'))
            
    return info

def convert():
    print(f"Parsing {TMX_FILE}...")
    tree = ET.parse(TMX_FILE)
    root = tree.getroot()
    
    map_data = {
        'version': 1.0,
        'tiledversion': root.get('tiledversion'),
        'orientation': root.get('orientation'),
        'renderorder': root.get('renderorder'),
        'width': int(root.get('width')),
        'height': int(root.get('height')),
        'tilewidth': int(root.get('tilewidth')),
        'tileheight': int(root.get('tileheight')),
        'infinite': (root.get('infinite') == '1'),
        'layers': [],
        'tilesets': []
    }
    
    # Process Tilesets
    for ts in root.findall('tileset'):
        firstgid = int(ts.get('firstgid'))
        ts_data = parse_tileset(ts, firstgid)
        if ts_data:
            map_data['tilesets'].append(ts_data)
            print(f"  Loaded tileset: {ts_data['name']} (GID: {firstgid})")
            
    # Process Layers
    for layer in root.findall('layer'):
        l_data = {
            'type': 'tilelayer',
            'id': int(layer.get('id', 0)),
            'name': layer.get('name'),
            'width': int(layer.get('width')),
            'height': int(layer.get('height')),
            'opacity': float(layer.get('opacity', 1)),
            'visible': (layer.get('visible', '1') == '1'),
            'x': int(layer.get('offsetx', 0)),
            'y': int(layer.get('offsety', 0)),
            'data': []
        }
        
        data_node = layer.find('data')
        encoding = data_node.get('encoding')
        compression = data_node.get('compression')
        
        if encoding == 'base64' and compression == 'zlib':
            raw_data = base64.b64decode(data_node.text.strip())
            decompressed = zlib.decompress(raw_data)
            # 4 bytes per tile (little endian unsigned int)
            fmt = '<' + 'I' * (len(decompressed) // 4)
            l_data['data'] = list(struct.unpack(fmt, decompressed))
        elif encoding == 'csv':
             l_data['data'] = [int(x) for x in data_node.text.strip().split(',')]
        else:
            print(f"  WARNING: Unsupported layer encoding: {encoding}/{compression}")
            
        map_data['layers'].append(l_data)
        print(f"  Processed layer: {l_data['name']}")
        
    # Process Object Groups
    for og in root.findall('objectgroup'):
        o_data = {
            'type': 'objectgroup',
            'id': int(og.get('id', 0)),
            'name': og.get('name'),
            'opacity': float(og.get('opacity', 1)),
            'visible': (og.get('visible', '1') == '1'),
            'objects': []
        }
        
        for obj in og.findall('object'):
            obj_d = {
                'id': int(obj.get('id')),
                'name': obj.get('name', ''),
                'type': obj.get('type', ''),
                'x': float(obj.get('x', 0)),
                'y': float(obj.get('y', 0)),
                'width': float(obj.get('width', 0)),
                'height': float(obj.get('height', 0)),
                'rotation': float(obj.get('rotation', 0)),
                'visible': (obj.get('visible', '1') == '1'),
                'properties': []
            }
            # Properties
            props = obj.find('properties')
            if props:
                for p in props.findall('property'):
                    obj_d['properties'].append({
                        'name': p.get('name'),
                        'type': p.get('type', 'string'),
                        'value': p.get('value')
                    })
            
            o_data['objects'].append(obj_d)
            
        map_data['layers'].append(o_data)
        print(f"  Processed object group: {o_data['name']}")

    with open(OUTPUT_FILE, 'w') as f:
        json.dump(map_data, f)
        
    print(f"Done! Saved to {OUTPUT_FILE}")

if __name__ == '__main__':
    convert()
