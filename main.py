import os
import pygame
import sys
from google import genai 

# --- 1. CONFIGURATION ---
# Use environment variable if available, otherwise fallback to placeholder
API_KEY = os.getenv("GEMINI_API_KEY", "PASTE_YOUR_API_KEY_HERE")

class Config:
    # Gameboy Palette
    COL_DARKEST = (15, 56, 15)
    COL_DARK    = (48, 98, 48)
    COL_LIGHT   = (139, 172, 15)
    COL_LIGHTEST= (155, 188, 15)
    
    COL_PLAYER  = (155, 188, 15)  # Lightest
    COL_SHERIFF = (48, 98, 200)   # Blue-ish
    COL_SUSPECT = (200, 98, 48)   # Red-ish
    COL_GROUND  = (30, 80, 30)    # Dark Green for ground
    
    TILE_SIZE = 64  # Bigger tiles for the Zelda look
    WIDTH = 1280
    HEIGHT = 720
    FPS = 60
    
    UI_BG_COLOR = (0, 0, 0)       # Black
    UI_TEXT_COLOR = (255, 255, 255) # White
    UI_BORDER_COLOR = (255, 255, 255)

# --- 2. GAME MANAGER ---
class GameManager:
    def __init__(self):
        self.current_mission = "Mission 1: Find the Golden Apple"
        self.inventory = ['Magnifying Glass']

# --- 3. THE AI BRAIN ---
class GeminiBrain:
    def __init__(self):
        self.client = None
        if "PASTE" in API_KEY or not API_KEY:
            print("⚠️ WARNING: API Key missing.")
        else:
            try:
                self.client = genai.Client(api_key=API_KEY)
                print("✅ Gemini Connected.")
            except Exception as e:
                print(f"❌ Error connecting to Gemini: {e}")

    def ask_npc(self, name, persona, query, game_manager):
        if not self.client: return "API Error: No Client"
        
        context = f"Current Mission: {game_manager.current_mission}. Inventory: {game_manager.inventory}."
        prompt = (f"RPG NPC Roleplay. Name: {name}. Persona: {persona}. "
                  f"Context: {context}. Player asks: {query}. "
                  f"Reply in <20 words. Keep it within the game world.")
        
        try:
            res = self.client.models.generate_content(model='gemini-1.5-flash', contents=prompt)
            return res.text.strip()
        except Exception as e:
            print(f"❌ API Call Failed: {e}")
            return "..."

# --- 4. CORE ZELDA MECHANICS ---

class Tile(pygame.sprite.Sprite):
    def __init__(self, pos, groups, sprite_type='wall'):
        super().__init__(groups)
        self.image = pygame.Surface((Config.TILE_SIZE, Config.TILE_SIZE))
        self.image.fill(Config.COL_DARK)
        if sprite_type == 'tree':
            self.image.fill(Config.COL_DARKEST)
            # Make tree taller
            self.image = pygame.transform.scale(self.image, (64, 128)) 
            self.rect = self.image.get_rect(topleft = (pos[0], pos[1] - 64))
        else:
            self.rect = self.image.get_rect(topleft = pos)
        
        # HITBOX: Smaller than image for depth perception
        self.hitbox = self.rect.inflate(0, -10) 

class Player(pygame.sprite.Sprite):
    def __init__(self, pos, groups, obstacle_sprites, brain):
        super().__init__(groups)
        self.image = pygame.Surface((Config.TILE_SIZE, Config.TILE_SIZE))
        self.image.fill(Config.COL_PLAYER)
        # Eyes
        pygame.draw.rect(self.image, Config.COL_DARKEST, (15, 15, 10, 10))
        pygame.draw.rect(self.image, Config.COL_DARKEST, (35, 15, 10, 10))
        
        self.rect = self.image.get_rect(topleft = pos)
        self.hitbox = self.rect.inflate(-10, -20) # Feet only collision
        
        self.direction = pygame.math.Vector2()
        self.speed = 5
        self.obstacle_sprites = obstacle_sprites
        self.brain = brain
        
        self.status = "idle"
        self.interacting = False
        self.last_interaction_time = 0
        self.interaction_cooldown = 2000 # 2 seconds

    def input(self):
        keys = pygame.key.get_pressed()
        if keys[pygame.K_UP]: self.direction.y = -1
        elif keys[pygame.K_DOWN]: self.direction.y = 1
        else: self.direction.y = 0

        if keys[pygame.K_RIGHT]: self.direction.x = 1
        elif keys[pygame.K_LEFT]: self.direction.x = -1
        else: self.direction.x = 0

    def move(self, speed):
        if self.direction.magnitude() != 0:
            self.direction = self.direction.normalize()

        self.hitbox.x += self.direction.x * speed
        self.collision('horizontal')
        self.hitbox.y += self.direction.y * speed
        self.collision('vertical')
        self.rect.center = self.hitbox.center

    def collision(self, direction):
        if direction == 'horizontal':
            for sprite in self.obstacle_sprites:
                if sprite.hitbox.colliderect(self.hitbox):
                    if self.direction.x > 0: self.hitbox.right = sprite.hitbox.left
                    if self.direction.x < 0: self.hitbox.left = sprite.hitbox.right
        
        if direction == 'vertical':
            for sprite in self.obstacle_sprites:
                if sprite.hitbox.colliderect(self.hitbox):
                    if self.direction.y > 0: self.hitbox.bottom = sprite.hitbox.top
                    if self.direction.y < 0: self.hitbox.top = sprite.hitbox.bottom

    def update(self):
        self.input()
        self.move(self.speed)

class NPC(pygame.sprite.Sprite):
    def __init__(self, pos, groups, name, persona, color):
        super().__init__(groups)
        self.image = pygame.Surface((Config.TILE_SIZE, Config.TILE_SIZE))
        self.image.fill(color) # Use specific color (Visual Polish)
        pygame.draw.circle(self.image, Config.COL_DARKEST, (32,32), 16)
        
        self.rect = self.image.get_rect(topleft = pos)
        self.hitbox = self.rect.inflate(0, -10)
        self.name = name
        self.persona = persona

# --- 5. THE ZELDA CAMERA SYSTEM ---

class YSortCameraGroup(pygame.sprite.Group):
    def __init__(self):
        super().__init__()
        self.display_surface = pygame.display.get_surface()
        self.half_width = self.display_surface.get_size()[0] // 2
        self.half_height = self.display_surface.get_size()[1] // 2
        self.offset = pygame.math.Vector2()
        
        # Ground Rect (Visual Polish)
        self.ground_rect = pygame.Rect(-2000, -2000, 4000, 4000)

    def custom_draw(self, player):
        # 1. Calculate Camera Offset
        self.offset.x = player.rect.centerx - self.half_width
        self.offset.y = player.rect.centery - self.half_height
        
        # 1.5 Draw Ground (Visual Polish)
        ground_offset = self.ground_rect.topleft - self.offset
        pygame.draw.rect(self.display_surface, Config.COL_GROUND, pygame.Rect(ground_offset, self.ground_rect.size))

        # 2. Draw Grid (Optional, keep for reference or remove for cleaner look)
        for x in range(-1000, 2000, 64):
            for y in range(-1000, 2000, 64):
                rect = pygame.Rect(x - self.offset.x, y - self.offset.y, 64, 64)
                pygame.draw.rect(self.display_surface, Config.COL_DARKEST, rect, 1)

        # 3. Sort Sprites by Y (Depth) and Draw
        for sprite in sorted(self.sprites(), key = lambda sprite: sprite.rect.centery):
            offset_pos = sprite.rect.topleft - self.offset
            self.display_surface.blit(sprite.image, offset_pos)

# --- 6. THE LEVEL MANAGER ---

class Level:
    def __init__(self):
        self.display_surface = pygame.display.get_surface()
        self.visible_sprites = YSortCameraGroup() # The Camera
        self.obstacle_sprites = pygame.sprite.Group()
        self.interactable_sprites = pygame.sprite.Group()
        
        self.game_manager = GameManager() # Game Manager
        self.brain = GeminiBrain()
        self.create_map()
        self.ui_font = pygame.font.SysFont("Arial", 24) # Slightly clearer font
        self.dialogue = None

    def create_map(self):
        # A much larger map than the grid version
        layout = [
            "TTTTTTTTTTTTTTTT",
            "T..............T",
            "T...P..........T",
            "T.......T......T",
            "T.......T......T",
            "T...S..........T",
            "T..............T",
            "T.......X......T",
            "TTTTTTTTTTTTTTTT",
        ]
        
        for row_index, row in enumerate(layout):
            for col_index, col in enumerate(row):
                x = col_index * Config.TILE_SIZE
                y = row_index * Config.TILE_SIZE
                
                if col == 'T':
                    Tile((x,y), [self.visible_sprites, self.obstacle_sprites], 'tree')
                if col == 'P':
                    self.player = Player((x,y), [self.visible_sprites], self.obstacle_sprites, self.brain)
                if col == 'S':
                    # Sheriff with Blue color
                    n = NPC((x,y), [self.visible_sprites, self.obstacle_sprites, self.interactable_sprites], 
                            "Sheriff", "Grumpy lawman", Config.COL_SHERIFF)
                if col == 'X':
                    # Suspect with Red color
                    n = NPC((x,y), [self.visible_sprites, self.obstacle_sprites, self.interactable_sprites], 
                            "Suspect", "Nervous thief", Config.COL_SUSPECT)

    def run(self):
        self.visible_sprites.custom_draw(self.player)
        self.visible_sprites.update()
        
        # Interaction Logic
        self.check_interaction()
        if self.dialogue:
            self.draw_ui()

    def check_interaction(self):
        keys = pygame.key.get_pressed()
        current_time = pygame.time.get_ticks()
        
        if keys[pygame.K_SPACE] and not self.player.interacting:
            # Check Cooldown
            if current_time - self.player.last_interaction_time < self.player.interaction_cooldown:
                return

            self.player.interacting = True
            self.player.last_interaction_time = current_time
            
            # Find closest NPC
            closest_npc = None
            min_dist = 100
            for npc in self.interactable_sprites:
                dist = (pygame.math.Vector2(npc.rect.center) - pygame.math.Vector2(self.player.rect.center)).magnitude()
                if dist < min_dist:
                    closest_npc = npc
                    min_dist = dist
            
            if closest_npc and min_dist < 100:
                self.dialogue = "Thinking..."
                self.draw_ui()
                pygame.display.flip()
                
                # Pass game_manager to brain
                response = self.brain.ask_npc(closest_npc.name, closest_npc.persona, 'Hello', self.game_manager)
                self.dialogue = f"{closest_npc.name}: {response}"
        
        if not keys[pygame.K_SPACE]:
            self.player.interacting = False

    def draw_ui(self):
        if self.dialogue:
            # Wider, centered, black background
            box_width = Config.WIDTH - 200
            box_height = 150
            rect = pygame.Rect((Config.WIDTH - box_width) // 2, Config.HEIGHT - box_height - 20, box_width, box_height)
            
            pygame.draw.rect(self.display_surface, Config.UI_BG_COLOR, rect)
            pygame.draw.rect(self.display_surface, Config.UI_BORDER_COLOR, rect, 4)
            
            # Render text (wrapping would be ideal, but for now just render)
            text_surf = self.ui_font.render(self.dialogue, True, Config.UI_TEXT_COLOR)
            
            # Center text in box
            text_rect = text_surf.get_rect(center=rect.center)
            self.display_surface.blit(text_surf, text_rect)

# --- ENTRY POINT ---
if __name__ == '__main__':
    pygame.init()
    screen = pygame.display.set_mode((Config.WIDTH, Config.HEIGHT))
    clock = pygame.time.Clock()
    level = Level()

    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()

        screen.fill(Config.COL_DARK)
        level.run()
        pygame.display.flip()
        clock.tick(Config.FPS)