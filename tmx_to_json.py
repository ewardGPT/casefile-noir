#!/usr/bin/env python3
import json
import os
import xml.etree.ElementTree as ET
from pathlib import Path
import base64
import zlib
import struct

def parse_properties(node):
    props = []
    properties_node = node.find('properties')
    if properties_node is not None:
        for p in properties_node.findall('property'):
            prop = p.attrib.copy()
            # Handle key rename
            if 'name' in prop:
                prop['name'] = prop['name']
            
            # Handle types
            if 'value' in prop:
                val = prop['value']
                ptype = prop.get('type', 'string')
                if ptype == 'int':
                    try:
                        prop['value'] = int(val)
                    except:
                        prop['value'] = 0
                elif ptype == 'float':
                    try:
                        prop['value'] = float(val)
                    except:
                        prop['value'] = 0.0
                elif ptype == 'bool':
                    prop['value'] = (val.lower() == 'true')
            props.append(prop)
    return props

def parse_tileset(tileset_node, current_dir):
    data = tileset_node.attrib.copy()
    
    # Int conversions
    for k in ['firstgid', 'tilewidth', 'tileheight', 'spacing', 'margin', 'tilecount', 'columns']:
        if k in data:
            data[k] = int(data[k])

    # Handle external source
    if 'source' in data:
        source_path = current_dir / data['source']
        if source_path.exists():
            print(f"  Embedding external tileset: {data['source']}")
            try:
                tsx_root = ET.parse(source_path).getroot()
                
                # We rename the 'source' to '_source' so Phaser treats it as embedded
                # Phaser looks for 'source' to load external JSON/TSX. If it's missing, it uses the embedded data.
                data['_source'] = data['source']
                del data['source'] # CRITICAL: Removing 'source' makes it embedded
                
                # Merge TSX attributes (keeping firstgid from TMX node)
                for k, v in tsx_root.attrib.items():
                    if k not in ['firstgid', 'source', 'name']: 
                        if k in ['tilewidth', 'tileheight', 'spacing', 'margin', 'tilecount', 'columns']:
                             data[k] = int(v)
                        else:
                             data[k] = v
                
                # If name is missing in TMX node, use TSX name
                if 'name' not in data and 'name' in tsx_root.attrib:
                    data['name'] = tsx_root.attrib['name']

                # Process children of TSX (image, tile, etc)
                img = tsx_root.find('image')
                if img is not None:
                    data['image'] = img.attrib.get('source')
                    data['imagewidth'] = int(img.attrib.get('width', 0))
                    data['imageheight'] = int(img.attrib.get('height', 0))
                    if 'trans' in img.attrib:
                        data['transparentcolor'] = "#" + img.attrib['trans']
                
                # Tiles (animations, properties)
                tiles_map = {}
                for tile in tsx_root.findall('tile'):
                    tid = tile.attrib['id']
                    tdata = {'id': int(tid)}
                    
                    # Animation
                    anim = tile.find('animation')
                    if anim is not None:
                        frames = []
                        for f in anim.findall('frame'):
                            frames.append({
                                'tileid': int(f.attrib['tileid']),
                                'duration': int(f.attrib['duration'])
                            })
                        tdata['animation'] = frames
                    
                    # Properties
                    props = parse_properties(tile)
                    if props:
                        tdata['properties'] = props
                        
                    tiles_map[tid] = tdata
                
                if tiles_map:
                    data['tiles'] = tiles_map

            except Exception as e:
                print(f"Error parsing TSX {source_path}: {e}")
        else:
            print(f"Warning: Tileset source not found: {source_path}")
    
    else:
        # Inline tileset
        img = tileset_node.find('image')
        if img is not None:
            data['image'] = img.attrib.get('source')
            data['imagewidth'] = int(img.attrib.get('width', 0))
            data['imageheight'] = int(img.attrib.get('height', 0))
            if 'trans' in img.attrib:
                data['transparentcolor'] = "#" + img.attrib['trans']

    return data

def decode_layer_data(data_node):
    """
    Decodes base64 + zlib/gzip data into a flat list of GIDs (integers).
    Returns list of ints.
    """
    encoding = data_node.attrib.get('encoding')
    compression = data_node.attrib.get('compression')
    text = data_node.text.strip()
    
    if encoding == 'base64':
        decoded = base64.b64decode(text)
        if compression == 'zlib':
            decoded = zlib.decompress(decoded)
        elif compression == 'gzip':
            decoded = zlib.decompress(decoded, 16+zlib.MAX_WBITS)
        elif compression is None:
            pass
        else:
            print(f"Warning: Unknown compression '{compression}'")
            return []
        
        # Unpack as little-endian unsigned ints (4 bytes per tile)
        # Format string: '<' = little-endian, 'I' = unsigned int
        # Count = len / 4
        count = len(decoded) // 4
        gids = struct.unpack(f'<{count}I', decoded)
        return list(gids)
    
    elif encoding == 'csv':
        return [int(x) for x in text.replace('\n','').split(',') if x]
        
    return []

def tmx_to_json(tmx_path, out_path):
    print(f"Converting {tmx_path}...")
    tree = ET.parse(tmx_path)
    root = tree.getroot()
    
    map_data = root.attrib.copy()
    
    # Convert map string attrs to matching JSON types
    for k in ['width', 'height', 'tilewidth', 'tileheight', 'nextlayerid', 'nextobjectid']:
        if k in map_data:
            map_data[k] = int(map_data[k])
    
    map_data['infinite'] = (map_data.get('infinite') == '1')
    
    # Force orientation if missing (common in some TMX)
    if 'orientation' not in map_data:
         map_data['orientation'] = 'orthogonal'
         
    map_data['type'] = 'map'
    map_data['version'] = 1.0 # JSON format version
    map_data['tiledversion'] = map_data.get('tiledversion', '1.0')
    
    # Parse layers and tilesets
    layers = []
    tilesets = []
    
    base_dir = Path(tmx_path).parent

    for child in root:
        if child.tag == 'tileset':
            tilesets.append(parse_tileset(child, base_dir))
        
        elif child.tag in ['layer', 'objectgroup', 'imagelayer']:
            layer = child.attrib.copy()
            
            # Common layer attrs
            for k in ['id', 'width', 'height', 'x', 'y']:
                if k in layer:
                    val = float(layer[k])
                    layer[k] = int(val) if val.is_integer() else val
            
            if 'opacity' in layer:
                 layer['opacity'] = float(layer['opacity'])
            else:
                 layer['opacity'] = 1.0
            
            layer['visible'] = (layer.get('visible', '1') == '1')
            
            if child.tag == 'layer':
                layer['type'] = 'tilelayer'
                data_node = child.find('data')
                if data_node is not None:
                    # Phaser JSON Loader prefers flat data arrays if no compression
                    # So we decode it ourselves into a regular list of ints
                    gids = decode_layer_data(data_node)
                    layer['data'] = gids
                    # Remove encoding/compression tags since we are raw now
                    if 'encoding' in layer: del layer['encoding']
                    if 'compression' in layer: del layer['compression']
            
            elif child.tag == 'objectgroup':
                layer['type'] = 'objectgroup'
                objects = []
                for obj in child.findall('object'):
                    o = obj.attrib.copy()
                    for k in ['id', 'x', 'y', 'width', 'height', 'gid']:
                        if k in o:
                            o[k] = float(o[k])
                    
                    # Properties
                    o['properties'] = parse_properties(obj)
                    objects.append(o)
                layer['objects'] = objects
                
            layers.append(layer)

    map_data['layers'] = layers
    map_data['tilesets'] = tilesets
    
    with open(out_path, 'w') as f:
        json.dump(map_data, f, indent=None, separators=(',', ':')) # Minimal size
    
    print(f"Saved {out_path}")

if __name__ == "__main__":
    tmx = Path("client/public/assets/maps/victorian/victorian-preview.tmx")
    jsn = Path("client/public/assets/maps/victorian/city_map.json")
    try:
        tmx_to_json(tmx, jsn)
    except Exception as e:
        print(f"Error: {e}")
        exit(1)
