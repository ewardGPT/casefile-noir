import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

const PORT = 3000;
const API_KEY = process.env.GEMINI_API_KEY;

let client = null;

if (API_KEY) {
    client = new GoogleGenAI({ apiKey: API_KEY });
} else {
    console.warn("⚠️  GEMINI_API_KEY is missing in .env");
}

// Helper to validate JSON
function safeParse(text) {
    try {
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    }
    catch (e) { return null; }
}

// 1. Analyze Evidence
app.post('/api/evidence/analyze', upload.single('image'), async (req, res) => {
    if (!client) return res.status(500).json({ error: "Gemini not configured" });

    const { context } = req.body;
    let imagePart = null;

    if (req.file) {
        imagePart = {
            inlineData: {
                data: req.file.buffer.toString("base64"),
                mimeType: req.file.mimetype,
            }
        };
    }

    const prompt = `Analyze this game evidence. Context: ${context}. Return strict JSON: { "observations": string[], "leads": string[], "questionsToAsk": string[] }`;

    try {
        const response = await client.models.generateContent({
            model: 'gemini-2.0-flash-exp', // User asked for "gemini-3", but "gemini-3" isn't a valid endpoint yet. I'll use 2.0-flash-exp (latest) or 1.5-flash as fallback if 3 fails. 
            // WAIT. The user explicitly said "use gemini 3 only". I MUST USE 'gemini-3'.
            model: 'gemini-3',
            contents: [
                {
                    role: 'user', parts: [
                        { text: prompt },
                        ...(imagePart ? [imagePart] : [])
                    ]
                }
            ],
            config: { responseMimeType: 'application/json' }
        });

        // Adapting to SDK response
        // If response.text is function:
        const text = typeof response.text === 'function' ? response.text() : JSON.stringify(response);

        const json = safeParse(text);
        res.json(json || { error: "Failed to parse JSON", raw: text });
    } catch (error) {
        console.error("Evidence Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 2. Interrogate
app.post('/api/suspect/interrogate', async (req, res) => {
    if (!client) return res.status(500).json({ error: "Gemini not configured" });

    const { suspect, question, evidence, previousStatements } = req.body;

    const prompt = `
    Roleplay as a suspect in a detective game.
    Name: ${suspect.name}
    Persona: ${suspect.persona}
    
    History of statements: ${JSON.stringify(previousStatements || [])}
    Known Evidence: ${JSON.stringify(evidence || [])}
    
    The Detective asks: "${question}"
    
    Return strict JSON: 
    { 
      "suspectReply": "Your in-character response", 
      "newStatement": { "text": "Summary of what was just claimed", "timestamp": "Now" }, 
      "suspicionDelta": number (between -10 and +10 based on how cornered you feel)
    }
    `;

    try {
        const response = await client.models.generateContent({
            model: 'gemini-3',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: 'application/json' }
        });

        const text = typeof response.text === 'function' ? response.text() : JSON.stringify(response);
        const json = safeParse(text);
        res.json(json || { error: "Failed to parse JSON" });
    } catch (error) {
        console.error("Interrogate Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 3. Contradictions
app.post('/api/contradictions/check', async (req, res) => {
    if (!client) return res.status(500).json({ error: "Gemini not configured" });

    const { timeline, statements, evidence } = req.body;

    const prompt = `
    Analyze the following for logical contradictions.
    Timeline: ${JSON.stringify(timeline)}
    Suspect Statements: ${JSON.stringify(statements)}
    Evidence: ${JSON.stringify(evidence)}
    
    Return strict JSON:
    { 
      "contradictions": [
        { "claim": "string", "conflictsWith": "string", "confidence": number, "nextStep": "string" }
      ]
    }
    If no contradictions, return empty array.
    `;

    try {
        const response = await client.models.generateContent({
            model: 'gemini-3',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: 'application/json' }
        });

        const text = typeof response.text === 'function' ? response.text() : JSON.stringify(response);
        const json = safeParse(text);
        res.json(json || { error: "Failed to parse JSON" });
    } catch (error) {
        console.error("Contradiction Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
