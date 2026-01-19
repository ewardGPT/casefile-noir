// using global fetch// Actually, standard fetch is available in Node 18+. If this fails, I'll use a simple http request.
// But better to write a script that runs in the environment I have (User's OS is linux).
// I will use standard 'http' module or assume 'fetch' is global.
// Let's rely on validation via the tool outputs.

async function testGuide() {
    console.log("--- Testing Guide System ---");
    const payload = {
        location: "Game",
        inventory: ["Badge", "Gun"],
        visitedLocations: ["Office"],
        currentTask: "Find the witness"
    };

    try {
        const res = await fetch('http://localhost:3000/api/guide/hint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        console.log("Guide Response:", json);
    } catch (e) {
        console.error("Guide Test Failed:", e);
    }
}

async function testInterrogation() {
    console.log("\n--- Testing Interrogation System ---");
    // Mock Story Context
    const storyContext = {
        profile: { role: "Suspect", description: "A nervous teacher." },
        knowledge: {
            default: "I don't know anything!",
            topics: { "victim": "She was a good student." }
        },
        globalMetadata: { setting: "London, 1912" }
    };

    const payload = {
        suspect: { name: "Tobias Finch", persona: "Nervous Teacher" },
        question: "Tell me about the victim.",
        evidence: [],
        previousStatements: [],
        storyContext: storyContext
    };

    try {
        const res = await fetch('http://localhost:3000/api/suspect/interrogate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        console.log("Interrogation Response:", json);
    } catch (e) {
        console.error("Interrogation Test Failed:", e);
    }
}

async function run() {
    await testGuide();
    await testInterrogation();
}

run();
