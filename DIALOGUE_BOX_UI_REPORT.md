# Dialogue Box UI - Pokémon Style with Skip Mechanic

<div align="center">

**Pokémon GBA/3DS Style Dialogue System**
**Implementation Status:** ✅ COMPLETE
**Generated:** 2026-01-19

</div>

---

## Overview

Implemented a Pokémon-style Dialogue Box UI component with:
- Semi-transparent rounded rectangle with double-line border
- Animated flashing arrow indicator (▼)
- Skip/Fast-Forward mechanic (B key + UI button)
- Portrait frame with name box

---

## Files Created

| File | Path | Purpose |
|------|------|---------|
| `DialogueBoxUI.ts` | `client/src/ui/DialogueBoxUI.ts` | TypeScript source |
| `DialogueBoxUI.js` | `client/src/ui/DialogueBoxUI.js` | Compiled JavaScript |

---

## Visual Design

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│    ┌───────────────────────────────────────────────────────────────┐    │
│    │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│    │
│    │ ░░┌─────────────────────────────────────────────────────┐░░░│    │
│    │ ░░│┌─────┐                                              │░░░│    │
│    │ ░░││█████│  NARRATOR NAME                               │░░░│    │
│    │ ░░│└─────┘                                              │░░░│    │
│    │ ░░│                                                      │░░░│    │
│    │ ░░│  "Please deliver this parcel! (Press [A] to accept).│░░░│    │
│    │ ░░│   This is urgent - the recipient is waiting at the  │░░░│    │
│    │ ░░│   old town square. Don't let us down, detective!"   │░░░│    │
│    │ ░░│                                        ▼            │░░░│    │
│    │ ░░│                              [SKIP]                 │░░░│    │
│    │ ░░└─────────────────────────────────────────────────────┘░░░│    │
│    │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│    │
│    └───────────────────────────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Visual Elements

| Element | Style |
|---------|-------|
| **Outer Border** | Dark gray (#4a4a4a), 4px stroke |
| **Inner Border** | Brown (#6b5b4b), 2px stroke |
| **Background** | Semi-transparent black (#1a1a1a, 95% alpha) |
| **Name Box** | Dark gray (#3d3d3d), gold border (#8b7355) |
| **Portrait Frame** | Black with gold border |
| **Continue Arrow** | Gold triangle (▼), blinking animation |
| **Skip Button** | Brown (#4a3a2a), gold text "SKIP" |

---

## Skip Mechanic (ReAct Logic)

### `handleSkip()` Function

```javascript
/**
 * handleSkip() - GBA/3DS Style Skip Logic
 * 
 * ReAct Chain-of-Thought:
 * - THOUGHT: Check if currently typing or at end of text
 * - ACTION: 
 *   IF isTyping == true: Set charIndex to max (finish animation)
 *   IF isTyping == false: Trigger closeDialogue() or nextPage()
 */
handleSkip() {
  if (this.isTyping) {
    // === GBA STYLE: FAST-FORWARD ===
    // If typing, finish the animation immediately
    this.skipTypewriter();
  } else {
    // === 3DS STYLE: SKIP DIALOGUE ===
    // If not typing, check if we've seen this dialogue before
    if (this.currentNode && this.hasSeenDialogue.has(this.currentNode.id)) {
      // Seen before - close dialogue
      this.close();
    } else {
      // First time - advance to next
      this.advance();
    }
  }
}
```

### Decision Flow

```
                          [User Presses Skip]
                                    │
                                    ▼
                          ┌─────────────────┐
                          │ IsTyping == true │
                          └────────┬────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │ YES                          │ NO
                    ▼                              ▼
        ┌─────────────────────┐    ┌─────────────────────────┐
        │ GBA Style:          │    │ 3DS Style:              │
        │ skipTypewriter()    │    │ SeenBefore ?            │
        │ (Finish animation)  │    │   → Close()             │
        └─────────────────────┘    │   → Advance()           │
                                   └─────────────────────────┘
```

---

## Controls

| Input | Action |
|-------|--------|
| `B` key | Skip/Fast-forward dialogue |
| `Space` / `E` | Advance (skip if typing) |
| Click | Advance (skip if typing) |
| Skip Button (UI) | Skip dialogue |

---

## Typewriter Effect

### Configuration

```typescript
typewriterSpeed: number = 30;  // ms per character
```

### Animation

```typescript
playTypewriterEffect(text: string): void {
  // Clean up existing timer
  if (this.typewriterTimer) {
    this.typewriterTimer.destroy();
  }
  
  this.isTyping = true;
  this.fullText = text;
  this.charIndex = 0;
  
  // Start typewriter timer
  this.typewriterTimer = this.scene.time.addEvent({
    delay: this.typewriterSpeed,
    repeat: text.length - 1,
    callback: () => {
      this.charIndex++;
      this.displayedText = text.substring(0, this.charIndex);
      this.dialogueText.setText(this.displayedText);
      
      if (this.charIndex >= text.length) {
        this.isTyping = false;
        this.hasSeenDialogue.add(this.currentNode.id);
        this.onTextComplete();
      }
    }
  });
}
```

---

## State Tracking

| State | Type | Description |
|-------|------|-------------|
| `isTyping` | boolean | Currently displaying typewriter effect |
| `hasSeenDialogue` | Set<string> | Tracks seen dialogue nodes by ID |
| `currentNode` | DialogueNode | Current dialogue node being displayed |
| `displayedText` | string | Text currently shown (for typewriter) |
| `fullText` | string | Complete text to display |

---

## Usage Example

```typescript
// Initialize in game scene
this.dialogueUI = new DialogueBoxUI(this);

// Start dialogue with NPC
this.dialogueUI.startDialogue('mr_finch');

// Check if can skip
if (this.dialogueUI.isVisible() && this.dialogueUI.getIsTyping()) {
  // User can press B to skip
}

// Get current node info
const nodeId = this.dialogueUI.getCurrentNodeId();
const hasSeen = this.dialogueUI.hasSeenCurrentNode();
```

---

## Integration Points

### With Quest System

```typescript
// When quest dialogue starts
dialogueUI.startDialogue(npcId, startNodeId);

// Check if user has seen this before
if (dialogueUI.hasSeenCurrentNode()) {
  // Show "Seen" indicator or skip directly
}

// Skip to next or close
dialogueUI.handleSkip();
```

### With Quest-Aware Dialogue Controller

```typescript
// Process with quest injection
const enhancedText = dialogueController.processDialogue(
  baseText,
  npcId,
  questId,
  objectiveId
);

// Display with typewriter
dialogueUI.playTypewriterEffect(enhancedText);
```

---

## Visual Specifications

| Property | Value |
|----------|-------|
| Box Width | 85% of screen width |
| Box Height | 22% of screen height |
| Box X | 7.5% from left |
| Box Y | 75% from top |
| Portrait Size | Box Height - 20px |
| Text Font | Courier New, 16px |
| Name Font | Courier New, 18px, Bold |
| Typewriter Speed | 30ms per character |
| Arrow Blink | 400ms toggle |

---

## Verification Checklist

| Feature | Status | Implementation |
|---------|--------|----------------|
| Rounded rectangle box | ✅ | Phaser Rectangle with 95% alpha |
| Double-line border | ✅ | 4px outer + 2px inner stroke |
| Flashing arrow indicator | ✅ | Triangle with 400ms blink timer |
| GBA skip (B key) | ✅ | Keyboard listener on 'B' key |
| 3DS skip button | ✅ | Clickable SKIP button UI |
| Typewriter effect | ✅ | 30ms timer-based character display |
| Seen dialogue tracking | ✅ | Set<string> by node ID |
| Portrait frame | ✅ | Left-aligned frame with border |
| Name box | ✅ | Above dialogue text |

---

*Report generated: 2026-01-19*
*Status: All requirements implemented*
*Files: DialogueBoxUI.ts/js*
