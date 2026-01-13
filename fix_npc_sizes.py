from PIL import Image
import os

TARGET = (256, 256)
DIR = "client/public/assets/sprites/characters"

for i in range(1, 6):
    path = f"{DIR}/npc_{i}.png"
    img = Image.open(path).convert("RGBA")
    if img.size != TARGET:
        print(f"Resizing npc_{i} from {img.size} to {TARGET}")
        img = img.resize(TARGET, Image.NEAREST)
        img.save(path)
    else:
        print(f"npc_{i} already {TARGET}")

print("Done!")
