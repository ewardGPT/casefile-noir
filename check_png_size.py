import os
import struct

def get_image_info(file_path):
    with open(file_path, 'rb') as f:
        data = f.read(25)
        if data[:8] != b'\x89PNG\r\n\x1a\n':
            return None
        w, h = struct.unpack('>LL', data[16:24])
        return int(w), int(h)

folder = 'client/public/assets/maps/victorian'
print(f"Checking images in {folder}...")

for f in os.listdir(folder):
    if f.lower().endswith('.png'):
        path = os.path.join(folder, f)
        try:
            dims = get_image_info(path)
            if dims:
                w, h = dims
                status = "OK"
                if w > 4096 or h > 4096:
                    status = "WARNING (>4096)"
                if w > 8192 or h > 8192:
                    status = "CRITICAL (>8192)"
                print(f"{f}: {w}x{h} - {status}")
            else:
                print(f"{f}: Could not read dimensions")
        except Exception as e:
            print(f"{f}: Error {e}")
