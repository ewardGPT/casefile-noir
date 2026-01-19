# Casefile Noir - Game State Pathfinding Analysis

<div align="center">

![Casefile Noir Start Menu](./start_menu.png)

**A noir detective RPG powered by Gemini AI**

</div>

---

## 🎯 GAME ENVIRONMENT SCAN COMPLETE

**Game:** Casefile Noir - A noir detective RPG (Phaser 3 + Gemini AI)
**Map Dimensions:** 128x128 tiles (4096x4096 pixels at 32px tiles)
**Tile Size:** 32x32 pixels
**Start Point [S]:** Player spawns at [1100, 1100] (Police Station)

---

## 📍 KEY ENVIRONMENT DATA EXTRACTED

### Location Tags & Coordinates

| Location | NPCs | Key Features |
|----------|------|--------------|
| **police_station** | Edwin Clarke, Arthur Kosminski, Mr. Ashcombe | Starting zone, [1100, 1100] |
| **school** | Finch, Whitcombe, Evie, Samuel, Lillian | 8 suspects/witnesses |
| **pennyworth_lane** | Mr. Cobb, Mary Henshaw, Old Willy | Clue: witness testimony |
| **woods** | Aaron Kosminski | Hidden suspect location |
| **harrow_residence** | Mr. Harrow, Mrs. Harrow, Peter | Diary clue location |
| **risky_passage** | Ada Merriweather | Samuel investigation path |
| **lions_den** | — | Whitcombe blackmail ledger |

### Entity Spawn Points

| Entity | Location | Coordinates |
|--------|----------|-------------|
| Player [S] | Police Station | [1100, 1100] |
| Desk Evidence | Police Station | [1152, 1120] (96x64) |
| Old Willy | Pennyworth Lane | Quest-critical witness |

### Movement Physics

- **Base Speed:** 160 px/s
- **Sprint Speed:** 208 px/s (1.3x multiplier)
- **Hitbox Size:** 30x20 pixels
- **Interaction Radius:** 80px for NPCs

---

## 🗺️ 3 OPTIMAL ROUTES (Day 1 Investigation)

### Route 1: ⚡ THE SPEEDRUN

**Strategic Intent:** Complete Day 1 objectives in minimum time by prioritizing direct NPC paths.

**Path Mapping:**
```
[S] Police Station [1100, 1100]
  ↓ (travel east/south)
→ School [target: mr_finch, headmaster_whitcombe, evie_moreland]
  ↓ (travel south)
→ Pennyworth Lane [talk_to_willy]
  ↓ (immediate return)
→ [E] Police Station [return]
```

**Milestone Coordinates:**

1. [1100, 1100] → Police Station start
2. [1400-1800, 1400-1800] → School zone
3. [2000-2400, 2000-2400] → Pennyworth Lane
4. [1100, 1100] → Return

**Efficiency Score:** 92/100

- Estimated Time: 8-10 minutes (sprint + optimal pathing)
- Stops: 6 NPCs + 1 return trip
- Backtracking: None

**Risk Assessment:**

| Risk Level | Hazard | Mitigation |
|------------|--------|------------|
| ⚠️ Medium | School zone may have 8+ NPCs causing collision delays | Sprint through crowds, use interaction zones |
| ⚠️ Medium | Route Memory: Pennyworth Lane requires remembering Old Willy's location | Mark location on minimap (press M) |
| ✅ Safe | No combat, only dialogue interactions | Use E to interact, follow dialogue trees |

---

### Route 2: ⚖️ THE BALANCED

**Strategic Intent:** Systematic investigation with evidence collection, balancing speed and information gathering.

**Path Mapping:**
```
[S] Police Station [1100, 1100]
  ↓ INTERACT: desk_evidence [1152, 1120]
  ↓ (travel to school via main road)
→ School Zone [interview 3 key suspects]
  ↓ (document findings in notebook)
→ Pennyworth Lane [investigate witness]
  ↓ (collect evidence from Mary Henshaw)
→ Woods Edge [optional: glimpse Aaron Kosminski]
  ↓ (return via scenic route for ambient clues)
→ [E] Police Station [submit initial report]
```

**Milestone Coordinates:**

1. [1100, 1100] → Start + desk evidence
2. [1152, 1120] → Evidence collection
3. [1400-1800, 1400-1800] → School interviews
4. [2000-2400, 2000-2400] → Pennyworth Lane
5. [1800, 2600] → Woods edge (optional)
6. [1100, 1100] → Return

**Efficiency Score:** 78/100

- Estimated Time: 15-18 minutes
- Stops: 6 NPCs + 1 evidence + 1 optional
- Backtracking: None (circular route)

**Risk Assessment:**

| Risk Level | Hazard | Mitigation |
|------------|--------|------------|
| ⚠️ Medium | Time Cost: Notebook documentation adds 2-3 minutes | Use hotkey (N) for quick notes |
| ⚠️ Low | Optional Objective: Woods edge may waste time if skipped | Skip if pressed for time |
| ✅ Safe | Information Rich: Collects maximum evidence for Day 2 decisions | Optimal for decision making |
| ✅ Safe | Narrative Flow: Follows natural detective progression | Better story immersion |

---

### Route 3: 🛡️ THE SAFE/RESOURCE-HEAVY

**Strategic Intent:** Maximize evidence collection, unlock dialogue options, and prepare for all Day 2 branching paths.

**Path Mapping:**
```
[S] Police Station [1100, 1100]
  ↓ COMPLETE: All 3 Edwin Clarke dialogues
  ↓ INTERACT: desk_evidence
  ↓ (optimal route through school)
→ School [full 8 NPC interviews + dialogue trees]
  ↓ (track stat requirements: charisma 3-4, intimidation 2-3)
→ Pennyworth Lane [2+ witnesses, complete Willy's quest chain]
  ↓ (optional: Harrow Residence for diary)
→ Risky Passage [investigate Samuel's connection]
  ↓ ( Lions Den reconnaissance)
→ [E] Police Station [prepare Day 2 accusation]
```

**Milestone Coordinates:**

1. [1100, 1100] → Police Station ( Edwin + Arthur + Ashcombe)
2. [1152, 1120] → Desk evidence
3. [1400-1800, 1400-1800] → School (8 NPCs)
4. [2000-2400, 2400-2800] → Pennyworth Lane + Harrow Residence
5. [2800-3200, 2000-2400] → Risky Passage + Lions Den
6. [1100, 1100] → Return

**Efficiency Score:** 55/100

- Estimated Time: 25-35 minutes
- Stops: 15+ NPCs, 4+ locations
- Backtracking: None (comprehensive exploration)

**Risk Assessment:**

| Risk Level | Hazard | Mitigation |
|------------|--------|------------|
| ⚠️ Medium | Time Cost: Highest, but unlocks all dialogue branches | Set aside dedicated play session |
| ⚠️ Medium | Dialogue Requirements: Some options need stats (charisma 3-4, intimidation 2-3) | Plan stat allocation before replay |
| ⚠️ Low | Stat Preparation: May need to replay for optimal dialogue choices | Accept non-optimal paths on first run |
| ✅ Safe | Max Evidence: Complete case file for final accusation | Best chance of correct accusation |
| ✅ Safe | Branch Coverage: Prepares for all 4 Day 2 suspect paths | No missed content |
| ✅ Safe | Achievement Unlocks: Full completion bonus | 100% achievement progress |

---

## 🎯 RECOMMENDED ROUTE FOR CURRENT SESSION

| Playthrough Type | Recommended Route | Justification |
|------------------|-------------------|---------------|
| **QA Testing** | Route 2 (The Balanced) | Optimal time-to-content ratio while ensuring all Day 1 objectives |
| **Speedrun** | Route 1 (The Speedrun) | Sprint modifier and direct NPC paths |
| **Completionist** | Route 3 (The Safe/Resource-Heavy) | 100% case file completion |

---

## 📋 NPC DIALOGUE REQUIREMENTS

### Required Stats for Special Dialogue Options

| NPC | Dialogue Option | Required Stat | Value |
|-----|-----------------|---------------|-------|
| Arthur Kosminski | "What do you know about Whitcombe?" | charisma | 3 |
| Headmaster Whitcombe | "Why were you tutoring her?" | intimidation | 2 |
| Mr. Finch | "Did Lillian have feelings for you?" | charisma | 4 |
| Evie Moreland | "I understand this is difficult" | empathy | 3 |
| Samuel Atwell | "Where were you the night she died?" | intimidation | 2 |
| Old Willy | "You're under arrest for vagrancy" | intimidation | 3 |

---

## 🗺️ QUEST FLOW DIAGRAM

```
Day 1: Initial Investigation
├── Talk to Mr. Finch (school)
├── Talk to Headmaster Whitcombe (school)
├── Talk to Evelyn Moreland (school)
├── Travel to Pennyworth Lane
├── Talk to Old Willy (pennyworth_lane)
└── Return to Police Station
        │
        ↓
Day 2: Deep Investigation (CHOOSE ONE PATH)
├── Path: Finch → Search school → Find letter → Confront
├── Path: Evie → Search residence → Find diary → Confront
├── Path: Samuel → Risky Passage → Find weapon → Interrogate
└── Path: Whitcombe → Lion's Den → Find ledger → Confront
        │
        ↓
Final Accusation
└── Accuse the true killer based on evidence
```

---

## 🎮 CONTROLS REFERENCE

| Key | Action |
|-----|--------|
| `WASD` / `Arrow Keys` | Move detective |
| `E` | Interact with evidence/NPCs |
| `M` | Toggle full-screen map |
| `F7` | Toggle minimap visibility |
| `K` | Mute/unmute audio |
| `F2` | Toggle debug overlay |
| `F3` | Toggle physics debug |
| `F4` | Toggle NPC debug markers |
| `N` | Open notebook |

---

## 📁 SOURCE FILES ANALYZED

| File | Purpose |
|------|---------|
| `client/src/data/npcs.ts` | NPC data with dialogue trees and spawn locations |
| `client/src/data/quests.ts` | Quest objectives and flow |
| `client/src/entities/Player.ts` | Player movement physics and controls |
| `client/src/entities/NPC.ts` | NPC behavior and interaction zones |
| `client/src/systems/GameState.ts` | Game state management |
| `client/public/assets/maps/world.json` | Map collision data |
| `client/public/assets/maps/victorian/city_map.json` | Full tile map (128x128) |

---

*Report generated from Casefile Noir game environment scan.*
*Tile Map: 128x128 | Coordinate System: Orthogonal | Player Hitbox: 30x20*
*Game Engine: Phaser 3 | AI: Google Gemini*
