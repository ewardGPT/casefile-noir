from PIL import Image

FILE = "client/public/assets/sprites/characters/detective.png"

img = Image.open(FILE)
if img.size != (128, 128):
    print(f"Downscaling from {img.size} to (128, 128)...")
    img = img.resize((128, 128), Image.NEAREST)
    img.save(FILE)
    print("Saved.")
else:
    print("Already 128x128.")
