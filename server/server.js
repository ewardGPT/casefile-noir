import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

const PORT = 3000;
const API_KEY = process.env.GEMINI_API_KEY;

let model = null;

if (API_KEY) {
    const genAI = new GoogleGenerativeAI(API_KEY);
    // Using gemini-2.0-flash-exp or gemini-1.5-flash for responsiveness
    model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
} else {
    console.warn("⚠️  GEMINI_API_KEY is missing in .env");
}

// Helper to clean JSON output from LLM
function cleanJSON(text) {
    try {
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("JSON Parse Error:", e);
        return null;
    }
}

// 1. Analyze Evidence
app.post('/api/evidence/analyze', upload.single('image'), async (req, res) => {
    if (!model) return res.status(500).json({ error: "Gemini not configured" });

    const { context } = req.body;

    try {
        let imageData = null;
        if (req.file) {
            imageData = {
                inlineData: {
                    data: req.file.buffer.toString("base64"),
                    mimeType: req.file.mimetype,
                }
            };
        }

        const prompt = `Analyze this game evidence. Context: ${context}. Return strict JSON: { "observations": string[], "leads": string[], "questionsToAsk": string[] }`;

        const result = await model.generateContent([prompt, ...(imageData ? [imageData] : [])]);
        const response = await result.response;
        const json = cleanJSON(response.text());

        res.json(json || { error: "Failed to generate valid JSON" });
    } catch (error) {
        console.error("Evidence Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 2. Interrogate Suspect
app.post('/api/suspect/interrogate', async (req, res) => {
    if (!model) return res.status(500).json({ error: "Gemini not configured" });

    const { suspect, question, evidence, previousStatements, storyContext } = req.body;

    const prompt = `
    Roleplay as a suspect in a noir detective game (1912 London).
    
    # Character Profile
    Name: ${suspect.name}
    Persona: ${suspect.persona}
    Secret: ${suspect.secret || "None"}
    
    # Story Context & Knowledge
    ${storyContext ? JSON.stringify(storyContext) : "No specific story context provided."}
    
    # Context
    History: ${JSON.stringify(previousStatements || [])}
    Evidence Presented: ${JSON.stringify(evidence || [])}
    
    # Task
    The Detective asks: "${question}"
    
    Provide a response in character. 
    - If the story context provides a specific answer for this topic, USE IT, but rephrase it naturally in character.
    - If the story context is silent, use your persona to improvised a consistent answer (Creative Interpolation).
    - If the player mentions evidence you are afraid of, react appropriately.
    
    Return strict JSON: 
    { 
      "suspectReply": "Your in-character spoken response", 
      "audioCue": "Description of voice tone (e.g., 'Shaky', 'Angry', 'Calm')",
      "suspicionDelta": number (-10 to 10),
      "newInfo": "Any new fact revealed, or null if nothing new"
    }
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const json = cleanJSON(response.text());
        res.json(json || { error: "Failed to generate valid JSON" });
    } catch (error) {
        console.error("Interrogate Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 3. Contradictions Check
app.post('/api/contradictions/check', async (req, res) => {
    if (!model) return res.status(500).json({ error: "Gemini not configured" });

    const { timeline, statements, evidence } = req.body;

    const prompt = `
    Analyze for logical contradictions.
    Timeline: ${JSON.stringify(timeline)}
    Statements: ${JSON.stringify(statements)}
    Evidence: ${JSON.stringify(evidence)}
    
    Return strict JSON:
    { 
      "contradictions": [
        { "claim": "string", "conflictsWith": "string", "confidence": number, "explanation": "string" }
      ]
    }
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const json = cleanJSON(response.text());
        res.json(json || { contradictions: [] });
    } catch (error) {
        console.error("Contradiction Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 4. Detective's Intuition (Guide)
app.post('/api/guide/hint', async (req, res) => {
    if (!model) return res.status(500).json({ error: "Gemini not configured" });

    const { currentTask, location, inventory, visitedLocations } = req.body;

    const prompt = `
    You are the Detective's "Inner Voice" or "Intuition".
    Goal: Guide the player to the next logical step in the investigation without spoon-feeding the answer. Be cryptic but helpful. Noir Tone.
    
    Game State:
    - Current Objective: ${currentTask}
    - Location: ${location}
    - Inventory: ${JSON.stringify(inventory)}
    - Visited: ${JSON.stringify(visitedLocations)}
    
    Return strict JSON:
    {
        "hintText": "A noir-style internal monologue hint",
        "suggestedAction": "Go to X / Talk to Y / Inspect Z"
    }
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const json = cleanJSON(response.text());
        res.json(json || { error: "Failed to generate hint" });
    } catch (error) {
        console.error("Guide Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
