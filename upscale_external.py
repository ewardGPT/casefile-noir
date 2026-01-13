from PIL import Image

FILE = "client/public/assets/sprites/characters/detective.png"

img = Image.open(FILE)
if img.size != (256, 256):
    print(f"Upscaling from {img.size} to (256, 256) (Nearest Neighbor)...")
    img = img.resize((256, 256), Image.NEAREST)
    img.save(FILE)
    print("Saved.")
else:
    print("Already 256x256.")
