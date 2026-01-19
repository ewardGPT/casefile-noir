import { getGuideHint } from '../api.js';

export class GuideSystem {
    constructor(scene) {
        this.scene = scene;
        this.lastHint = null;
        this.cooldown = false;
    }

    async askForHint() {
        if (this.cooldown) return "Give me a moment to think...";

        this.cooldown = true;
        setTimeout(() => this.cooldown = false, 10000); // 10s cooldown

        // Collect State from Scene
        // Assuming Scene has registry or global state
        // This will need to be adapted to the actual Scene structure
        const player = this.scene.player || {};
        const inventory = this.scene.registry.get('inventory') || [];
        const visited = this.scene.registry.get('visited') || [];
        const currentTask = this.scene.registry.get('currentTask') || "Investigating the murder";
        const location = this.scene.scene.key; // Current Scene Name

        const payload = {
            location: location,
            inventory: inventory,
            visitedLocations: visited,
            currentTask: currentTask
        };

        try {
            const data = await getGuideHint(payload);
            if (data && data.hintText) {
                this.lastHint = data.hintText;
                return data.hintText;
            }
            return "I'm drawing a blank here.";
        } catch (e) {
            console.error(e);
            return "My intuition is clouded right now. (Connection Error)";
        }
    }
}
