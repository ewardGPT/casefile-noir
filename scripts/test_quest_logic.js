
import { QUEST_DEFINITIONS } from '../client/src/utils/QuestSystem.js';
import { loadGameState, setActiveQuest, completeActiveQuest } from '../client/src/ui/gameState.js';

// Mock localStorage
global.localStorage = {
    store: {},
    getItem: function (key) { return this.store[key] || null; },
    setItem: function (key, value) { this.store[key] = value.toString(); }
};

// Mock window
global.window = {
    dispatchEvent: () => { }
};

console.log("--- Testing Quest Logic ---");

// 1. Initial State
let state = loadGameState();
console.log("Initial State:", state.quests);

if (!state.quests) {
    console.error("FAIL: State.quests is undefined");
} else {
    console.log("PASS: State.quests initialized");
}

// 2. Start Quest
const questId = 'intro_01';
const questDef = QUEST_DEFINITIONS[questId];
setActiveQuest(questDef);

state = loadGameState();
console.log("After Start Quest:", state.quests.active);

if (state.quests.active && state.quests.active.id === questId) {
    console.log("PASS: Quest started correctly");
} else {
    console.error("FAIL: Quest start failed");
}

// 3. Complete Quest
completeActiveQuest();
state = loadGameState();
console.log("After Complete Quest:", state.quests);

if (state.quests.active === null && state.quests.completed.includes(questId)) {
    console.log("PASS: Quest completed correctly");
} else {
    console.error("FAIL: Quest completion failed");
}

console.log("--- Quest Logic Tests Complete ---");
