from PIL import Image
import os

INPUT = r"C:/Users/warde/.gemini/antigravity/brain/ef011ad0-b8c4-4199-9e25-69e86d55dd30/detective_noir_final_1768339548303.png"
OUTPUT_DIR = "client/public/assets/sprites/characters"
OUTPUT = os.path.join(OUTPUT_DIR, "detective.png")

# Ensure dir exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

print(f"Processing {INPUT}...")
img = Image.open(INPUT).convert("RGBA")

# 1. Resize to base 128x128 (4 rows x 4 cols of 32px)
base_size = (128, 128)
img = img.resize(base_size, Image.NEAREST)

# 2. Create new canvas 128x160 (5 rows)
new_img = Image.new("RGBA", (128, 160))
new_img.paste(img, (0, 0))

# 3. Generate Row 5 (Idle) from first frame of each walking row
FRAME = 32
# Idle Down (From Walk Down Frame 1)
idle_down = img.crop((0, 0, 32, 32)) 
new_img.paste(idle_down, (0, 4 * FRAME))

# Idle Left (From Walk Left Frame 1)
idle_left = img.crop((0, 1 * FRAME, 32, 2 * FRAME))
new_img.paste(idle_left, (32, 4 * FRAME))

# Idle Right (From Walk Right Frame 1)
idle_right = img.crop((0, 2 * FRAME, 32, 3 * FRAME))
new_img.paste(idle_right, (64, 4 * FRAME))

# Idle Up (From Walk Up Frame 1)
idle_up = img.crop((0, 3 * FRAME, 32, 4 * FRAME))
new_img.paste(idle_up, (96, 4 * FRAME))


# 4. Remove Background (Magenta Chroma Key)
datas = new_img.getdata()
newData = []
for item in datas:
    # Check for Magenta (R=255, G=0, B=255)
    # Using small tolerance for compression artifacts
    if item[0] > 200 and item[1] < 100 and item[2] > 200:
        newData.append((0, 0, 0, 0))
    else:
        newData.append(item)
new_img.putdata(newData)

# 5. Clean Grid (1px border) to remove any anti-aliased edges
pixels = new_img.load()
for row in range(5):
    for col in range(4):
        start_x = col * FRAME
        start_y = row * FRAME
        end_x = start_x + FRAME
        end_y = start_y + FRAME
        
        for x in range(start_x, end_x):
            pixels[x, start_y] = (0, 0, 0, 0)
            pixels[x, end_y - 1] = (0, 0, 0, 0)
        for y in range(start_y, end_y):
            pixels[start_x, y] = (0, 0, 0, 0)
            pixels[end_x - 1, y] = (0, 0, 0, 0)

new_img.save(OUTPUT)
print(f"Saved final {OUTPUT} (128x160)")

# 6. MANDATORY VALIDATION
print("Running validation check...")
img_test = Image.open(OUTPUT)
assert img_test.mode == "RGBA"
w, h = img_test.size
px = img_test.load()
corners = [px[0,0][3], px[w-1,0][3], px[0,h-1][3], px[w-1,h-1][3]]
assert all(a == 0 for a in corners), f"Validation Failed! Corners: {corners}"
print("PASS transparency")

