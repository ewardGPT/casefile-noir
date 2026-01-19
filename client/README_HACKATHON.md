# Captive Horror - Detective Game

A noir detective game built with Phaser 3 and Vite.

## 🎮 Game Features

### Core Systems
- **Quest System** - Track objectives and progress through Day 1 and Day 2 investigations
- **Dialogue System** - Interactive conversations with NPCs, stat-based choices
- **Inventory System** - Manage clues, items, and view character stats
- **Detective Sense** - AI-powered guidance system with percentage meter
- **Notebook System** - Log all clues, dialogue history, and Kosminski's notes
- **Accusation System** - Final accusations with multiple endings
- **Clue Manager** - Track collected clues and analyze evidence

### Dopamine Features (Hackathon "Wow" Effects)
- **Quest Complete Popups** - Big "QUEST COMPLETE" banners with animations
- **Clue Found Popups** - "NEW CLUE DISCOVERED" notifications
- **Case Progress Meter** - 0-100% progress indicator on HUD
- **Suspect Board Highlighting** - Shows most suspicious suspect based on clue count

### Minigame
- **Risky Passage Lockpick Puzzle** - Enter "DIAMOND" to unlock the door (+1 Perception reward)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server (port 5173)
npm run dev

# Build for production
npm run build
```

## 🎯 Controls

| Key | Action |
|------|---------|
| WASD | Move character |
| E | Interact / Start Dialogue |
| Q | Toggle Detective Sense |
| I | Toggle Inventory |
| N | Toggle Notebook |
| TAB | Toggle Suspect Board |
| 1-4 | Select dialogue choices |
| SPACE | Continue dialogue |

## 📊 Character Stats

Your character has five stats that affect gameplay:

- **Observation** (1-10) - Reveals hidden details in clues
- **Logic** (1-10) - Improves clue analysis quality
- **Charisma** (1-10) - Unlocks special dialogue options
- **Intimidation** (1-10) - Forces suspects to reveal information
- **Empathy** (1-10) - Connects with emotionalNPCs for better responses

**Note:** Higher stats = better clues & faster case completion!

## 🔍 Detective Sense (AI SENSE)

When activated (Q key), shows:
- Screen overlay with green tint
- Arrow pointing to next objective
- Distance meter to target
- Percentage meter based on:
  - Base: 35%
  - Perception: +4% per point
  - Logic: +2% per point
  - Quest Progress: +0-15%

**Formula:** `clamp(35 + perception*4 + logic*2 + questProgressBonus, 0, 100)`

## 📔 Notebook System

Three tabs to track your investigation:

1. **Evidence** - All collected clues
2. **Dialogue History** - Timeline of conversations
3. **Kosminski Notes** - Inspector Kosminski's automatic notes after interrogations

## 🎯 Quest Flow (Day 1)

1. Start at Police Station
2. Visit Harrowford High School
3. Interview Mr. Finch → Headmaster Whitcombe → Evie Moreland
4. Talk to Beatrice, Clara, James for additional information
5. Travel to Pennyworth Lane
6. Talk to Mrs. Loxley and Old Willy
7. Old Willy gives clue about the kidnapping
8. Return to Police Station
9. End Day 1 - Choose investigation path for Day 2

## ⚔️ Suspect Board

Shows all suspects with:
- Clue count (0-3 needed to accuse)
- "MOST SUSPICIOUS" badge on suspect with most clues
- Accuse button (unlocks with 3+ clues)

**Main Suspects:**
- Headmaster Reginald Whitcombe
- Mr. Tobias Finch
- Evelyn "Evie" Moreland
- Samuel Atwell

**True Killer:** Aaron Kosminski (Arthur's brother)

## 🔐 Risky Passage Puzzle

When you reach the Risky Passage, you'll encounter a locked door.
- Enter the passcode: **DIAMOND**
- Correct: +1 Perception, unlocks door, finds bloody cloth clue
- Incorrect: Screen shakes, try again

## 🎨 Visual Style

Noir detective aesthetic with:
- Dark color palette (#1a1a1a, #b4945a, #e4cf9b)
- Retro pixel art characters
- Courier New monospace font for readability
- Green/yellow accents for detective elements
- Red for danger/accusation

## 🏗️ Technical Architecture

### Folder Structure
```
client/src/
├── game/
│   └── data/           # NPCs, quests, story canon
├── systems/            # Core game logic
│   ├── GameState.ts
│   ├── QuestManager.ts
│   ├── DialogueManager.ts
│   ├── InventorySystem.ts
│   ├── DetectiveSenseSystem.ts
│   ├── NotebookSystem.ts   # NEW
│   ├── ClueManager.ts
│   ├── DopamineEffects.ts   # NEW
│   ├── LockpickPuzzle.ts    # NEW
│   └── AccusationSystem.ts
├── ui/
│   ├── HUD.ts
│   ├── DialogueUI.ts
│   ├── InventoryUI.ts
│   ├── DetectiveSenseUI.ts
│   ├── SuspectBoardUI.ts
│   └── NotebookUI.js    # Legacy (DOM-based)
├── entities/
│   ├── Player.ts
│   └── NPC.ts
├── scenes/
│   ├── GameScene.ts
│   ├── Boot.ts
│   ├── StartMenu.ts
│   ├── HowToPlay.ts
│   └── Credits.ts
└── main.ts
```

### Deterministic Design
- No random elements in gameplay
- All dialogue authored and fixed
- Quest progression is linear (Day 1 → Day 2 → Accusation)
- Detective Sense uses fixed formula
- Stats and clue collection are the only variables

## 🐛 Bug Fixes

### Player Animation Fix
Player sprite animations now correctly:
- Show `idle` when velocity == 0
- Show `walk` when moving
- Support 4 directions (up, down, left, right)
- Prevent animation flickering by checking if same anim is playing

## 📜 Recent Changes

### Version 1.1.0 - Hackathon Release

**New Systems:**
- ✨ NotebookSystem with Kosminski Notes integration
- ✨ LockpickPuzzle minigame (DIAMOND code)
- ✨ DopamineEffects (quest complete, clue found, objective complete popups)
- ✨ Case Progress Meter on HUD
- ✨ Most Suspicious highlighting on Suspect Board
- ✨ AI Sense percentage meter with deterministic formula

**Enhancements:**
- 🔧 Updated Vite config to use port 5173
- 🔧 ClueManager now auto-adds to Notebook
- 🔧 QuestManager now triggers dopamine effects
- 🔧 Detective Sense now shows percentage
- 🔧 HUD now tracks case progress
- 🔧 Suspect Board highlights most suspicious suspect

**Story Canon:**
- All character names match specification
- All locations match specification
- All dialogue follows story beats
- Aaron Kosminski is the true killer

## 🎓 License

Hackathon Winner Submission - Captive Horror Detective Game
