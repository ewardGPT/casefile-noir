
import { loadGameState, saveGameState, updateGameState, upsertEvidence, defaultState } from '../src/ui/gameState.js';

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = value.toString(); },
        clear: () => { store = {}; },
        removeItem: (key) => { delete store[key]; }
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

describe('gameState', () => {
    beforeEach(() => {
        localStorage.clear();
        // Reset stateCache if possible, or just rely on clear
        // Since stateCache is local to the module, we might need a reset method if we want true isolation
        // For now, loadGameState() will re-read if we didn't expose a reset. 
        // Actually, the module closure keeps stateCache. 
        // We'll trust that our updates propagate.
    });

    test('loadGameState returns default state when empty', () => {
        const state = loadGameState();
        expect(state.score).toBe(100);
        expect(state.evidence).toEqual([]);
    });

    test('upsertEvidence adds new evidence', () => {
        const item = { id: 'test1', title: 'Test Evidence' };
        upsertEvidence(item);
        const state = loadGameState();
        expect(state.evidence).toHaveLength(1);
        expect(state.evidence[0]).toEqual(item);
    });

    test('upsertEvidence updates existing evidence', () => {
        const item = { id: 'test1', title: 'Test Evidence' };
        upsertEvidence(item);

        const updated = { id: 'test1', title: 'Updated Title' };
        upsertEvidence(updated);

        const state = loadGameState();
        expect(state.evidence).toHaveLength(1);
        expect(state.evidence[0].title).toBe('Updated Title');
    });
});
