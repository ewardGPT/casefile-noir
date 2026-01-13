from PIL import Image

INPUT = "client/public/assets/detective.png"
OUTPUT = "client/public/assets/detective.png"

img = Image.open(INPUT)
print(f"Original size: {img.size}")

# Resize to 128x128 (which gives 32x32 frames for a 4x4 grid)
# Use NEAREST to keep pixel art crisp if it was just upscaled.
# If it looks blocky, we might try LANCZOS, but for pixel art, NEAREST is usually best when downscaling an integer factor.
# 1024 / 128 = 8. Exact integer.
img_resized = img.resize((128, 128), Image.NEAREST)
img_resized.save(OUTPUT)

print(f"Resized to: {img_resized.size}")
