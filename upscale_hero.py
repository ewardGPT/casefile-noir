from PIL import Image

FILE = "client/public/assets/sprites/characters/detective.png"

img = Image.open(FILE)
target_size = (384, 384) # 96x96 frames

if img.size != target_size:
    print(f"Upscaling from {img.size} to {target_size} (Nearest Neighbor)...")
    img = img.resize(target_size, Image.NEAREST)
    img.save(FILE)
    print("Saved.")
else:
    print("Already right size.")
