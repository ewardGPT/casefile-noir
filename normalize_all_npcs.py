from PIL import Image
import os

TARGET = (256, 256)
DIR = "client/public/assets/sprites/characters"

# Process all NPCs from 1-35
resized = 0
for i in range(1, 36):
    path = f"{DIR}/npc_{i}.png"
    if not os.path.exists(path):
        print(f"npc_{i} not found, skipping")
        continue
    
    img = Image.open(path).convert("RGBA")
    if img.size != TARGET:
        print(f"Resizing npc_{i} from {img.size} to {TARGET}")
        img = img.resize(TARGET, Image.NEAREST)
        img.save(path)
        resized += 1
    else:
        print(f"npc_{i} already {TARGET}")

print(f"Done! Resized {resized} NPCs. All 35 normalized to 256x256")
