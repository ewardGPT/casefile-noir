from PIL import Image

FILE = "client/public/assets/detective_big.png"

img = Image.open(FILE)
print(f"Current size: {img.size}")

if img.size != (256, 256):
    # Resize to 256x256 (64x64 frames)
    # Use NEAREST to keep pixel art crisp
    img = img.resize((256, 256), Image.NEAREST)
    img.save(FILE)
    print(f"Resized to: {img.size}")
else:
    print("Size is already correct.")
