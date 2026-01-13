from PIL import Image
import os

INPUT = r"C:/Users/warde/.gemini/antigravity/brain/ef011ad0-b8c4-4199-9e25-69e86d55dd30/npc_townspeople_1768342945993.png"
OUTPUT = "client/public/assets/sprites/characters/npcs.png"

os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

print(f"Processing {INPUT}...")
img = Image.open(INPUT).convert("RGBA")

# Resize to 256x256 if needed
if img.size != (256, 256):
    print(f"Resizing from {img.size} to (256, 256)...")
    img = img.resize((256, 256), Image.NEAREST)

# Remove Magenta background
datas = img.getdata()
newData = []
for item in datas:
    if item[0] > 200 and item[1] < 100 and item[2] > 200:
        newData.append((0, 0, 0, 0))
    else:
        newData.append(item)
img.putdata(newData)

img.save(OUTPUT)
print(f"Saved {OUTPUT}")

# Validate
img_test = Image.open(OUTPUT)
assert img_test.mode == "RGBA"
w, h = img_test.size
px = img_test.load()
corners = [px[0,0][3], px[w-1,0][3], px[0,h-1][3], px[w-1,h-1][3]]
assert all(a == 0 for a in corners), f"Corners not transparent: {corners}"
print("PASS transparency")
