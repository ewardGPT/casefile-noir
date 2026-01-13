from PIL import Image
import os

INPUT = r"C:/Users/warde/.gemini/antigravity/brain/ef011ad0-b8c4-4199-9e25-69e86d55dd30/detective_wide_pixel_1768339196495.png"
OUTPUT = "client/public/assets/detective_big.png"
TARGET_SIZE = (256, 256)

print(f"Processing {INPUT}...")
img = Image.open(INPUT).convert("RGBA")

# 1. Resize if needed (Force 256x256)
if img.size != TARGET_SIZE:
    print(f"Resizing from {img.size} to {TARGET_SIZE}...")
    img = img.resize(TARGET_SIZE, Image.NEAREST)

# 2. Chroma Key Removal (Green Screen)
datas = img.getdata()
newData = []

for item in datas:
    # Check for Green (R < 50, G > 200, B < 50)
    # The generated green is usually roughly (0, 255, 0)
    if item[0] < 50 and item[1] > 200 and item[2] < 50:
        newData.append((0, 0, 0, 0)) # Transparent
    else:
        newData.append(item)

img.putdata(newData)

# 3. Clean Grid Lines (1px border of every 64x64 cell)
# Just in case model added them.
CELL_SIZE = 64
pixels = img.load()
for row in range(4):
    for col in range(4):
        start_x = col * CELL_SIZE
        start_y = row * CELL_SIZE
        end_x = start_x + CELL_SIZE
        end_y = start_y + CELL_SIZE
        
        # Clear 1px border inside each cell to kill grid lines
        for x in range(start_x, end_x):
            pixels[x, start_y] = (0, 0, 0, 0)
            pixels[x, end_y - 1] = (0, 0, 0, 0)
        for y in range(start_y, end_y):
            pixels[start_x, y] = (0, 0, 0, 0)
            pixels[end_x - 1, y] = (0, 0, 0, 0)

img.save(OUTPUT)
print(f"Saved transparent sprite to {OUTPUT}")
