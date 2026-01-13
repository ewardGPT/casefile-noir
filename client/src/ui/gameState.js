const STORAGE_KEY = 'gameState';

const defaultState = {
    evidence: [],
    suspects: {},
    contradictions: [],
    timeline: [],
    score: 100,
    bestScore: 0
};

let stateCache = null;

const clone = (value) => JSON.parse(JSON.stringify(value));

const ensureWindowState = (state) => {
    if (typeof window !== 'undefined') {
        window.gameState = state;
        window.dispatchEvent(new Event('gameStateUpdated'));
    }
};

export const loadGameState = () => {
    if (stateCache) {
        return stateCache;
    }
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const parsed = raw ? JSON.parse(raw) : null;
    stateCache = parsed ? { ...defaultState, ...parsed } : clone(defaultState);
    ensureWindowState(stateCache);
    return stateCache;
};

export const saveGameState = () => {
    const state = loadGameState();
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    ensureWindowState(state);
};

export const updateGameState = (mutator) => {
    const state = loadGameState();
    mutator(state);
    saveGameState();
    return state;
};

export const upsertEvidence = (entry) => {
    updateGameState((state) => {
        const index = state.evidence.findIndex((item) => item.id === entry.id);
        if (index >= 0) {
            state.evidence[index] = { ...state.evidence[index], ...entry };
        } else {
            state.evidence.push(entry);
        }
    });
};

export const addSuspectStatement = (suspectId, name, text, from) => {
    updateGameState((state) => {
        if (!state.suspects[suspectId]) {
            state.suspects[suspectId] = { id: suspectId, name: name || suspectId, statements: [] };
        }
        state.suspects[suspectId].name = name || state.suspects[suspectId].name;
        state.suspects[suspectId].statements.push({
            text,
            from,
            timestamp: new Date().toISOString()
        });
    });
};

export const setSuspectMeta = (suspectId, meta) => {
    updateGameState((state) => {
        if (!state.suspects[suspectId]) {
            state.suspects[suspectId] = { id: suspectId, name: meta.name || suspectId, statements: [] };
        }
        state.suspects[suspectId] = { ...state.suspects[suspectId], ...meta };
    });
};

export const setContradictions = (contradictions) => {
    updateGameState((state) => {
        state.contradictions = Array.isArray(contradictions) ? contradictions : [];
    });
};

export const addTimelineEvent = (event) => {
    updateGameState((state) => {
        state.timeline.push({
            text: event.text,
            timestamp: event.timestamp || new Date().toISOString()
        });
    });
};

export const adjustScore = (delta) => {
    updateGameState((state) => {
        state.score = Math.max(0, state.score + delta);
    });
};

export const setBestScore = (score) => {
    updateGameState((state) => {
        if (score > state.bestScore) {
            state.bestScore = score;
        }
    });
};
