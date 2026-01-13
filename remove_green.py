from PIL import Image

FILE = "client/public/assets/detective_big.png"
INPUT = "C:/Users/warde/.gemini/antigravity/brain/ef011ad0-b8c4-4199-9e25-69e86d55dd30/detective_green_screen_1768338670133.png"

img = Image.open(INPUT).convert("RGBA")
datas = img.getdata()

newData = []
# Standard Green Screen: (0, 255, 0)
# We use tolerance just in case compression added noise, but prompt asked for solid.
for item in datas:
    # Check for Green-ish
    # R < 50, G > 200, B < 50 is a safe bet for #00FF00
    if item[0] < 50 and item[1] > 200 and item[2] < 50:
        newData.append((255, 255, 255, 0))
    else:
        newData.append(item)

# Save to the detective_big location directly
img.putdata(newData)
img.save(FILE, "PNG")
print("Green screen removed.")
