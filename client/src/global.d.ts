export {};

declare global {
  interface Window {
    gameState?: import('./systems/GameState.js').default;
    QuestManager?: import('./systems/QuestManager.js').QuestManager;
    ClueManager?: import('./systems/ClueManager.js').ClueManager;
    DialogueUI?: import('./ui/DialogueUI.js').DialogueUI;
    HUD?: import('./ui/HUD.js').HUD;
    InventoryUI?: import('./ui/InventoryUI.js').InventoryUI;
    SuspectBoardUI?: import('./ui/SuspectBoardUI.js').SuspectBoardUI;
    DetectiveSenseUI?: import('./ui/DetectiveSenseUI.js').DetectiveSenseUI;
    AccusationSystem?: import('./systems/AccusationSystem.js').AccusationSystem;
    NPC_DATA?: Record<string, import('./data/npcs.js').NPCData>;
    game?: Phaser.Game;
  }
}
