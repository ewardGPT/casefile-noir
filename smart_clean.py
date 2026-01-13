from PIL import Image
import sys

# Increase recursion depth for flood fill just in case, though we use iterative stack
sys.setrecursionlimit(100000)

FILE = "client/public/assets/detective_big.png"
TOLERANCE = 10 # Tolerance for color matching

def is_bg_color(pixel):
    # Check for Grey (205) or White (255) with tolerance
    # Alpha must be checked? Input is likely RGB or RGBA with full alpha
    r, g, b = pixel[:3]
    
    # Target 1: 205, 205, 205
    if abs(r - 205) < TOLERANCE and abs(g - 205) < TOLERANCE and abs(b - 205) < TOLERANCE:
        return True
    
    # Target 2: 255, 255, 255
    if abs(r - 255) < TOLERANCE and abs(g - 255) < TOLERANCE and abs(b - 255) < TOLERANCE:
        return True
        
    return False

def smart_clean():
    print(f"Opening {FILE}...")
    img = Image.open(FILE).convert("RGBA")
    width, height = img.size
    pixels = img.load()
    
    # Stack for flood fill ((x, y))
    # Start with all border pixels if they match BG color
    stack = []
    visited = set()
    
    # Check borders to initialize flood
    for x in range(width):
        if is_bg_color(pixels[x, 0]):
            stack.append((x, 0))
        if is_bg_color(pixels[x, height-1]):
            stack.append((x, height-1))
            
    for y in range(height):
        if is_bg_color(pixels[0, y]):
            stack.append((0, y))
        if is_bg_color(pixels[width-1, y]):
            stack.append((width-1, y))
            
    print(f"Starting flood fill with {len(stack)} seed points...")
    
    count = 0
    while stack:
        x, y = stack.pop()
        
        if (x, y) in visited:
            continue
        visited.add((x, y))
        
        # Turn transparent
        pixels[x, y] = (0, 0, 0, 0)
        count += 1
        
        # Check neighbors
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = x + dx, y + dy
            
            if 0 <= nx < width and 0 <= ny < height:
                if (nx, ny) not in visited:
                    if is_bg_color(pixels[nx, ny]):
                        stack.append((nx, ny))

    print(f"Removed {count} background pixels.")
    img.save(FILE)
    print("Done.")

if __name__ == '__main__':
    smart_clean()
