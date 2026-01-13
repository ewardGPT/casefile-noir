from PIL import Image

FILE = "client/public/assets/detective_big.png"
CELL_SIZE = 64
ROWS = 4
COLS = 4

img = Image.open(FILE).convert("RGBA")
pixels = img.load()

# Clear 1px border of each cell
for row in range(ROWS):
    for col in range(COLS):
        start_x = col * CELL_SIZE
        start_y = row * CELL_SIZE
        end_x = start_x + CELL_SIZE
        end_y = start_y + CELL_SIZE
        
        # Top and Bottom of cell
        for x in range(start_x, end_x):
            pixels[x, start_y] = (0, 0, 0, 0)
            pixels[x, end_y - 1] = (0, 0, 0, 0)
            
        # Left and Right of cell
        for y in range(start_y, end_y):
            pixels[start_x, y] = (0, 0, 0, 0)
            pixels[end_x - 1, y] = (0, 0, 0, 0)

img.save(FILE)
print("Grid lines cleaned.")
