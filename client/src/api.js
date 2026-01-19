const postJson = async (path, payload) => {
    const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Request failed: ${response.status}`);
    }
    return response.json();
};

export const analyzeEvidence = async (payload) => postJson('/api/evidence/analyze', payload);
export const interrogateSuspect = async (payload) => postJson('/api/suspect/interrogate', payload);
export const checkContradictions = async (payload) => postJson('/api/contradictions/check', payload);
export const getGuideHint = async (payload) => postJson('/api/guide/hint', payload);
