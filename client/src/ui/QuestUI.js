export class QuestUI {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.textObj = null;
        this.background = null;

        this.createUI();
    }

    createUI() {
        const { width } = this.scene.scale;

        // Container in top-left or below minimap?
        // Minimap is Top-Right. Let's put Quest UI Top-Left.
        this.container = this.scene.add.container(20, 20).setScrollFactor(0).setDepth(1001);

        // Background Panel
        this.background = this.scene.add.rectangle(0, 0, 300, 80, 0x000000, 0.7);
        this.background.setOrigin(0, 0);
        this.background.setStrokeStyle(2, 0xffd700); // Gold border

        // Header "CURRENT OBJECTIVE"
        const header = this.scene.add.text(10, 10, "CURRENT OBJECTIVE", {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '14px',
            color: '#888888',
            fontWeight: 'bold'
        });

        // Objective Text
        this.textObj = this.scene.add.text(10, 35, "No active quest.", {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '16px',
            color: '#ffffff',
            wordWrap: { width: 280 }
        });

        this.container.add([this.background, header, this.textObj]);
    }

    updateQuest(quest) {
        if (!quest) {
            this.textObj.setText("No active quest.");
            this.container.setAlpha(0.5);
            return;
        }

        this.container.setAlpha(1);
        this.textObj.setText(quest.objective);

        // Flash effect to notify update
        this.scene.tweens.add({
            targets: this.container,
            alpha: { from: 0.2, to: 1 },
            duration: 300,
            yoyo: true,
            repeat: 2
        });
    }
}
