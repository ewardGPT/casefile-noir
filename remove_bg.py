from PIL import Image

FILE = "client/public/assets/detective_big.png"

img = Image.open(FILE).convert("RGBA")
datas = img.getdata()

newData = []
# The checkerboard is usually 205 (grey) and 255 (white)
# We'll remove both.
for item in datas:
    # Check for Grey (205)
    if item[0] == 205 and item[1] == 205 and item[2] == 205:
        newData.append((255, 255, 255, 0))
    # Check for White (255) - WARNING: Might remove eyes, but necessary for box
    elif item[0] == 255 and item[1] == 255 and item[2] == 255:
        newData.append((255, 255, 255, 0))
    else:
        newData.append(item)

img.putdata(newData)
img.save(FILE, "PNG")
print("Background removed.")
