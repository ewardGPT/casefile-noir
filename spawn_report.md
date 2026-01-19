# Spawn Point Report - Casefile Noir

<div align="center">

**Game Systems Architecture Document**
**Generated:** 2026-01-19
**Source Analysis:** `PATHFINDING_ANALYSIS.md`
**Map Version:** 1.0 (128x128 tiles, 4096x4096 pixels)

</div>

---

## Executive Summary

This report documents the establishment of **3 persistent global spawn points** based on pathfinding analysis of optimal routes through the Casefile Noir game world. Each spawn point is strategically positioned to minimize travel time, maximize NPC interactions, and support specific gameplay objectives.

| Spawn Point | Route | Coordinates [X, Y, Z] | Location Tag | Efficiency |
|-------------|-------|----------------------|--------------|------------|
| Spawn_01 | Route 1 (Speedrun) | [2200, 2200, 0] | pennyworth_lane | 92/100 |
| Spawn_02 | Route 2 (Balanced) | [1600, 1600, 0] | school | 78/100 |
| Spawn_03 | Route 3 (Resource-Heavy) | [3000, 2200, 0] | risky_passage | 55/100 |
| Spawn_Default | Initial State | [1100, 1100, 0] | police_station | 100/100 |

---

## Spawn Point Specifications

### Spawn_01: Speedrun (Pennyworth Lane)

| Attribute | Value |
|-----------|-------|
| **ID** | `spawn_speedrun` |
| **Route** | Route 1 - The Speedrun |
| **Coordinates** | [X: 2200, Y: 2200, Z: 0] |
| **Location Tag** | `pennyworth_lane` |
| **Spawn Zone Radius** | 300 pixels |
| **Ground Type** | Paved street |

#### Strategic Intent

Pennyworth Lane serves as the critical turnaround point in Route 1. Starting here eliminates the return trip from Police Station, reducing total travel distance by approximately 40%.

#### Waypoint Sequence

| Order | Target | Action | Distance | Priority |
|-------|--------|--------|----------|----------|
| 1 | `old_willy` | TALK_TO_NPC | 100px | CRITICAL |
| 2 | `mary_henshaw` | TALK_TO_NPC | 150px | HIGH |
| 3 | `mr_cobb` | TALK_TO_NPC | 200px | LOW |

#### Collision Validation

```
✅ Safe Zone: TRUE
✅ Buffer Tiles: 2 (64px clearance)
✅ Ground Type: Paved (valid walkable surface)
✅ Nearest Obstacle: 150px (North direction)
```

#### Efficiency Metrics

| Metric | Value |
|--------|-------|
| Time to Complete | 8-10 minutes |
| NPC Interactions | 3 |
| Backtracking | 0 |
| **Efficiency Score** | **92/100** |

---

### Spawn_02: Balanced (School Zone)

| Attribute | Value |
|-----------|-------|
| **ID** | `spawn_balanced` |
| **Route** | Route 2 - The Balanced |
| **Coordinates** | [X: 1600, Y: 1600, Z: 0] |
| **Location Tag** | `school` |
| **Spawn Zone Radius** | 400 pixels |
| **Ground Type** | Courtyard |

#### Strategic Intent

The School Zone serves as the natural midpoint in Route 2, providing access to 4 key suspects while maintaining optimal access to both Pennyworth Lane and the Woods Edge.

#### Waypoint Sequence

| Order | Target | Action | Distance | Priority |
|-------|--------|--------|----------|----------|
| 1 | `mr_finch` | TALK_TO_NPC | 80px | CRITICAL |
| 2 | `headmaster_whitcombe` | TALK_TO_NPC | 100px | CRITICAL |
| 3 | `evie_moreland` | TALK_TO_NPC | 120px | HIGH |
| 4 | `samuel_atwell` | TALK_TO_NPC | 150px | MEDIUM |

#### Collision Validation

```
✅ Safe Zone: TRUE
✅ Buffer Tiles: 3 (96px clearance)
✅ Ground Type: Courtyard (valid walkable surface)
✅ Nearest Obstacle: 100px (West direction)
```

#### Efficiency Metrics

| Metric | Value |
|--------|-------|
| Time to Complete | 15-18 minutes |
| NPC Interactions | 4 |
| Backtracking | 0 |
| **Efficiency Score** | **78/100** |

---

### Spawn_03: Resource-Heavy (Risky Passage)

| Attribute | Value |
|-----------|-------|
| **ID** | `spawn_resource` |
| **Route** | Route 3 - The Safe/Resource-Heavy |
| **Coordinates** | [X: 3000, Y: 2200, Z: 0] |
| **Location Tag** | `risky_passage` |
| **Spawn Zone Radius** | 250 pixels |
| **Ground Type** | Cobblestone |

#### Strategic Intent

Risky Passage is the furthest point in Route 3's extended exploration. Starting here is essential for the Samuel Atwell investigation path and provides access to the Lions Den.

#### Waypoint Sequence

| Order | Target | Action | Distance | Priority |
|-------|--------|--------|----------|----------|
| 1 | `ada_merriweather` | TALK_TO_NPC | 60px | HIGH |
| 2 | `clue_bloody_cloth` | COLLECT_CLUE | 150px | CRITICAL |
| 3 | `samuel_atwell` | INTERROGATE | 200px | CRITICAL |
| 4 | `lions_den` | GO_TO_LOCATION | 300px | HIGH |

#### Collision Validation

```
✅ Safe Zone: TRUE
✅ Buffer Tiles: 2 (64px clearance)
✅ Ground Type: Cobblestone (valid walkable surface)
✅ Nearest Obstacle: 80px (South direction)
```

#### Efficiency Metrics

| Metric | Value |
|--------|-------|
| Time to Complete | 25-35 minutes |
| NPC Interactions | 2 |
| Clue Collections | 1 |
| Location Visits | 2 |
| Backtracking | 0 |
| **Efficiency Score** | **55/100** |

---

### Spawn_Default: Initial State (Police Station)

| Attribute | Value |
|-----------|-------|
| **ID** | `spawn_default` |
| **Route** | Initial Game State |
| **Coordinates** | [X: 1100, Y: 1100, Z: 0] |
| **Location Tag** | `police_station` |
| **Spawn Zone Radius** | 200 pixels |
| **Ground Type** | Wood floor |

#### Strategic Intent

The Police Station is the canonical starting location for the detective character, providing initial context and tutorial objectives.

#### Waypoint Sequence

| Order | Target | Action | Distance | Priority |
|-------|--------|--------|----------|----------|
| 1 | `edwin_clarke` | TALK_TO_NPC | 50px | CRITICAL |
| 2 | `desk_receipt` | COLLECT_CLUE | 60px | HIGH |

#### Collision Validation

```
✅ Safe Zone: TRUE
✅ Buffer Tiles: 2 (64px clearance)
✅ Ground Type: Wood floor (valid walkable surface)
✅ Nearest Obstacle: 80px (East direction)
```

#### Efficiency Metrics

| Metric | Value |
|--------|-------|
| Time to Complete | N/A - Starting point |
| NPC Interactions | 1 |
| Clue Collections | 1 |
| Backtracking | 0 |
| **Efficiency Score** | **100/100** |

---

## Spawn Zone Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CASEFILE NOIR - SPAWN ZONES                         │
│                         128x128 Tile Map (4096x4096px)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                                      N                                      │
│                                      ↑                                      │
│                         [3000,2200]                                         │
│                         ┌─────────────┐                                     │
│                         │  Spawn_03   │  Risky Passage                      │
│                         │  Resource   │  ⭐ Spawn Point                     │
│                         └─────────────┘                                     │
│                                    │                                        │
│                                    │                                        │
│  [1100,1100]          [1600,1600]          [2200,2200]                      │
│  ┌─────────┐          ┌─────────────┐     ┌─────────────┐                   │
│  │ Spawn_  │          │  Spawn_02   │     │  Spawn_01   │                   │
│  │ Default │          │  Balanced   │     │  Speedrun   │                   │
│  └─────────┘          └─────────────┘     └─────────────┘                   │
│  Police Station        School Zone         Pennyworth Lane                   │
│      ↓                    ↓                     ↓                            │
│  [EDWIN]              [FINCH]              [OLD WILLY]                       │
│  [ARTHUR]             [WHITCOMBE]          [MARY]                           │
│  [ASHCOMBE]           [EVIE]               [COBB]                           │
│                       [SAMUEL]                                              │
│                                                                             │
│ ──────────────────────────────── ←──────────────────────────────────→       │
│                              WEST → EAST                                    │
│                                                                             │
│  Coordinate System: Orthogonal (32px tiles)                                 │
│  Scale: 1 tile = 32 pixels                                                  │
│  Map Boundaries: 0-4096 (X), 0-4096 (Y)                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Persistence Implementation

### Storage Location

Spawn configuration is persisted in:

```
client/public/spawn_config.json
```

### State Management

The `GameState` singleton manages spawn point selection:

```typescript
// GameState.ts extension (pseudocode)
interface SpawnState {
  activeSpawnId: string;
  spawnHistory: SpawnRecord[];
  lastSpawnTimestamp: number;
}

class GameState {
  // ... existing code ...

  public setActiveSpawn(spawnId: string): void {
    this.state.spawnState.activeSpawnId = spawnId;
    this.state.spawnState.lastSpawnTimestamp = Date.now();
    this.saveState();
  }

  public getActiveSpawn(): SpawnPoint | undefined {
    return SPAWN_CONFIG.spawnPoints.find(
      p => p.id === this.state.spawnState.activeSpawnId
    );
  }

  public getSpawnHistory(): SpawnRecord[] {
    return [...this.state.spawnState.spawnHistory];
  }
}
```

### Save/Load Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SPAWN PERSISTENCE WORKFLOW                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Player selects spawn point (menu/console)                   │
│                      ↓                                          │
│  2. GameState.setActiveSpawn(spawnId)                           │
│                      ↓                                          │
│  3. Serialize to localStorage:                                  │
│     {                                                           │
│       "activeSpawnId": "spawn_speedrun",                        │
│       "spawnHistory": [...],                                    │
│       "lastSpawnTimestamp": 1705700000000                       │
│     }                                                           │
│                      ↓                                          │
│  4. On game load, check localStorage                            │
│                      ↓                                          │
│  5. If spawn exists, restore player to spawn coordinates        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Collision Map Validation

All spawn points have been validated against the collision data in `world.json`:

| Spawn Point | Collision Layer | Safe Zone | Validation Status |
|-------------|-----------------|-----------|-------------------|
| Spawn_01 | `Collisions` (layer 3) | ✅ | PASSED |
| Spawn_02 | `Collisions` (layer 3) | ✅ | PASSED |
| Spawn_03 | `Collisions` (layer 3) | ✅ | PASSED |
| Spawn_Default | `Collisions` (layer 3) | ✅ | PASSED |

### Clip-In Prevention

Each spawn point includes:

1. **Buffer Zone:** 2-3 tile clearance (64-96px) from nearest obstacle
2. **Ground Type Validation:** Confirmed walkable surface
3. **Spawn Zone Radius:** Safe spawn area with margin for initial movement
4. **Directional Check:** Nearest obstacle distance and direction mapped

---

## Integration Points

### Quest System Integration

Spawn points unlock based on quest progression:

| Spawn Point | Unlock Condition | Quest Stage |
|-------------|------------------|-------------|
| Spawn_01 | `quest_stage` | Day 1 Investigation (stage 0) |
| Spawn_02 | `quest_stage` | Day 1 Investigation (stage 0) |
| Spawn_03 | `quest_stage` | Day 1 Investigation (stage 0) |
| Spawn_Default | `always` | New game |

### NPC Proximity Detection

The spawn system integrates with NPC interaction zones:

```typescript
// NPC proximity check (pseudocode)
function checkSpawnNPCProximity(spawn: SpawnPoint): NPC[] {
  const nearbyNPCs = SPAWN_CONFIG.spawnZones
    .find(z => z.spawnIds.includes(spawn.id))
    ?.nearbyNPCs || [];

  return NPC_DATA.filter(npc =>
    nearbyNPCs.includes(npc.id) &&
    npc.locationTag === spawn.locationTag
  );
}
```

---

## Files Modified/Created

| File | Action | Purpose |
|------|--------|---------|
| `client/public/spawn_config.json` | Created | Persistent spawn configuration |
| `spawn_report.md` | Created | This documentation file |
| `PATHFINDING_ANALYSIS.md` | Referenced | Source analysis data |

---

## Validation Checklist

- [x] Coordinates validated against collision map
- [x] Ground type confirmed for all spawn points
- [x] Buffer zones calculated (minimum 2 tiles)
- [x] NPC proximity verified for each zone
- [x] Unlock conditions mapped to quest progression
- [x] Waypoint sequences optimized for route efficiency
- [x] Persistence logic designed for localStorage
- [x] Spawn zone radii cover safe landing areas

---

## Recommendations

### For Testing

Use `Spawn_02` (Balanced) for initial QA testing as it provides:
- Optimal time-to-content ratio
- Access to multiple NPC types
- Clear progression path
- No special unlock requirements

### For Speedrun Testing

Use `Spawn_01` (Speedrun) with:
- Sprint modifier enabled
- Minimap waypoints active
- Dialogue quick-select enabled

### For Completionist Testing

Use `Spawn_03` (Resource-Heavy) with:
- Full quest chain unlocked
- All Day 2 paths available
- Extended play session (30+ minutes)

---

*Report generated: 2026-01-19*
*Author: Game Systems Architect*
*Document Version: 1.0.0*
