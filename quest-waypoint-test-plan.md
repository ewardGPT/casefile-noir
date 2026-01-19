# Manual Test Plan: Minimap Quest Waypoint Integration

## Objective:
To verify the integration of the active quest target system (from `QuestSystem`) with the minimap. This ensures the minimap dynamically updates the waypoint marker (`questDot`) based on active quest progression, with proper handling of map boundaries.

---

## Test Cases:

### 1. **Initialization:**
- **Purpose:** Ensure minimap and quest waypoint (questDot) initialize correctly.
- **Steps:**
  1. Start the game.
  2. Verify minimap initializes in the correct position (top-right corner).
  3. Verify the `questDot` marker is not visible until a quest is active.

**Expected Result:**
- Minimap UI is properly displayed.
- The `questDot` marker is hidden when no quest is active.

---

### 2. **Quest Target Updates:**
- **Purpose:** Verify that the `questDot` marker dynamically updates based on the active quest's target.
- **Steps:**
  1. Start the game and progress to the first quest objective.
  2. Confirm that the `questDot` appears at the correct position relative to the active quest's target.
  3. Complete the current quest and progress to the next quest.
  4. Verify that the `questDot` updates to reflect the new quest's target position.
  5. Complete all available quests.
  6. Verify that the `questDot` is hidden when there are no active quests.

**Expected Result:**
- The quest waypoint marker (`questDot`) appears at the correct position for every active quest target.
- The `questDot` updates correctly when progressing between quests.
- When no active quests are available, the `questDot` is hidden.

---

### 3. **Boundary Clamping:**
- **Purpose:** Ensure the `questDot` correctly clamps to the minimap's visible bounds when the target is off-screen.
- **Steps:**
  1. Start the game and verify the `questDot` behavior for various quest objective targets, ensuring that:
     - Targets outside the minimap are correctly clamped to the visible edge, pointing to the direction of the target.
     - Targets inside the minimap's visible region remain within the minimap, displayed at the appropriate position.
     - Switching to full map mode keeps the `questDot` within bounds at its actual target position.

**Expected Result:**
- When a quest target is outside the minimap, the `questDot` is clamped to the edge and points towards the target.
- When the quest target is within the minimap's bounds, the `questDot` appears in the correct position.

---

### 4. **Clamping Comparison with Player Dot:**
- **Purpose:** Verify consistent clamping behavior between `questDot` and `playerDot`.
- **Steps:**
  1. Move the player to the edge of the minimap.
  2. Observe the clamped `playerDot` position.
  3. Compare the `questDot` clamping behavior for off-screen quest targets.

**Expected Result:**
- The `questDot` and `playerDot` exhibit consistent clamping behavior at the minimap bounds.

---

### Notes:
1. In the absence of automated tests in the current codebase (e.g., via Playwright/Jest), these manual testing instructions serve to verify functionality and performance systematically.
2. Additional exploratory testing can focus on edge cases, such as handling overlapping quest markers with NPC/player markers.