from PIL import Image

# Resize detective to 256x256 (64x64 frames) to match NPCs
INPUT = "client/public/assets/sprites/characters/detective.png"
OUTPUT = INPUT

img = Image.open(INPUT).convert("RGBA")
print(f"Current detective size: {img.size}")

if img.size != (256, 256):
    # Detective is 384x384 with 96x96 frames, resize to 256x256 (64x64 frames)
    img = img.resize((256, 256), Image.NEAREST)
    img.save(OUTPUT)
    print(f"Resized to (256, 256)")
else:
    print("Already 256x256")
