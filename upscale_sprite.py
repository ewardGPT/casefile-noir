from PIL import Image

INPUT = "client/public/assets/detective.png"
OUTPUT = "client/public/assets/detective_big.png"

img = Image.open(INPUT)
print(f"Original size: {img.size}")

# Upscale by 2x (128 -> 256)
# Frame size becomes 64x64
img_resized = img.resize((256, 256), Image.NEAREST)
img_resized.save(OUTPUT)

print(f"Resized to target: {img_resized.size}")
