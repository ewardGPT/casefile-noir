const postJson = async (path, payload) => {
    try {
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
    } catch (error) {
        // Fallback: Return mock data if API is unavailable
        console.warn(`API request failed for ${path}, using fallback:`, error.message);
        return getMockResponse(path, payload);
    }
};

// Mock data fallback for offline/local development
function getMockResponse(path, payload) {
    if (path.includes('/guide/hint')) {
        return { hintText: "Look for clues near the school. Someone might have seen something." };
    }
    if (path.includes('/contradictions/check')) {
        return { contradictions: [] };
    }
    if (path.includes('/suspect/interrogate')) {
        return { suspectReply: "I don't know anything about that night. I was at home." };
    }
    if (path.includes('/evidence/analyze')) {
        return { analysis: "This evidence could be important to the case." };
    }
    return { success: true, message: "Mock response" };
}

export const analyzeEvidence = async (payload) => postJson('/api/evidence/analyze', payload);
export const interrogateSuspect = async (payload) => postJson('/api/suspect/interrogate', payload);
export const checkContradictions = async (payload) => postJson('/api/contradictions/check', payload);
export const getGuideHint = async (payload) => postJson('/api/guide/hint', payload);
