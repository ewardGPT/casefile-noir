/**
 * SaveLoadUI - 3-slot manual save/load system
 * Allows players to save progress at any time and continue later
 */

export class SaveLoadUI {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.saveSlots = [null, null, null];
        this.isVisible = false;
    }

    showSaveMenu() {
        if (this.isVisible) return;
        this.isVisible = true;

        this.createContainer();
        this.loadExistingSaves();
        this.createSlotButtons();
    }

    showLoadMenu() {
        if (this.isVisible) return;
        this.isVisible = true;

        this.createContainer();
        this.loadExistingSaves();
        this.createSlotButtons();
    }

    createContainer() {
        const width = 600;
        const height = 450;
        const x = (this.scene.scale.width - width) / 2;
        const y = (this.scene.scale.height - height) / 2;

        this.container = this.scene.add.container(x, y);
        this.container.setDepth(5000);

        // Background
        const bg = this.scene.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            0x1a1a1a, 0.95
        );
        bg.setStrokeStyle(4, 0x8b7355);
        this.container.add(bg);

        // Title
        const title = this.scene.add.text(
            width / 2,
            30,
            'SAVE GAME',
            {
                fontFamily: 'Courier New',
                fontSize: '32px',
                color: '#e4cf9b',
                fontStyle: 'bold'
            }
        );
        title.setOrigin(0.5);
        this.container.add(title);

        // Close button
        const closeBtn = this.createButton(width / 2 - 120, 415, '✕', () => this.close());
        this.container.add(closeBtn);

        this.scene.add.existing(this.container);
    }

    createButton(x, y, text, onClick) {
        const bg = this.scene.add.rectangle(x, y, 100, 32, 0x2a2a2a, 0.9);
        bg.setStrokeStyle(2, 0x8b7355);
        bg.setInteractive({ useHandCursor: true });

        const btnText = this.scene.add.text(x, y, text, {
            fontFamily: 'Courier New',
            fontSize: '18px',
            color: '#f5f1e5',
            backgroundColor: '#000000',
            padding: { x: 12, y: 8 }
        });
        btnText.setOrigin(0.5);
        btnText.setInteractive({ useHandCursor: true });

        bg.on('pointerover', () => bg.setFillStyle(0x3d3d3d, 0.9));
        bg.on('pointerout', () => bg.setFillStyle(0x2a2a2a, 0.9));

        btnText.on('pointerdown', onClick);

        return this.scene.add.container(x, y, [bg, btnText]);
    }

    loadExistingSaves() {
        for (let i = 0; i < 3; i++) {
            const savedData = localStorage.getItem(`casefile_noir_save_${i}`);
            if (savedData) {
                try {
                    this.saveSlots[i] = JSON.parse(savedData);
                } catch (e) {
                    this.saveSlots[i] = null;
                }
            }
        }
    }

    createSlotButtons() {
        const startY = 80;
        this.saveSlots.forEach((slotData, index) => {
            const slotY = startY + (index * 100);
            this.createSlotButton(slotData, index, slotY);
        });
    }

    createSlotButton(slotData, index, y) {
        const width = 560;
        const height = 70;

        const bg = this.scene.add.rectangle(0, y, width, height, 
            slotData ? 0x3d3d3d : 0x2a2a2a, 0.9);
        bg.setStrokeStyle(2, slotData ? 0x6b5b4b : 0x4a4a4a);
        bg.setInteractive({ useHandCursor: true });

        const slotText = this.scene.add.text(15, y, 
            slotData ? `SLOT ${index + 1}: ${slotData.timestamp}` : `SLOT ${index + 1}: EMPTY`, {
                fontFamily: 'Courier New',
                fontSize: '16px',
                color: slotData ? '#f5f1e5' : '#888888'
            });
        slotText.setOrigin(0.5);

        const saveBtnText = this.scene.add.text(0, y, 
            slotData ? '[S] to overwrite' : '[S] to save', {
                fontFamily: 'Courier New',
                fontSize: '14px',
                color: '#b4945a',
                backgroundColor: '#000000',
                padding: { x: 10, y: 5 }
        });
        saveBtnText.setOrigin(0.5);

        bg.on('pointerover', () => bg.setFillStyle(slotData ? 0x4d4d4d : 0x3a3a3a));
        bg.on('pointerout', () => bg.setFillStyle(slotData ? 0x3d3d3d : 0x2a2a2a));

        const slotContainer = this.scene.add.container(0, y, [bg, slotText, saveBtnText]);
        slotContainer.setInteractive({ useHandCursor: true });

        bg.on('pointerdown', () => {
            if (slotData) {
                this.loadGame(index);
            } else {
                this.saveGame(index);
            }
        });

        saveBtnText.on('pointerdown', () => {
            if (slotData) {
                this.loadGame(index);
            } else {
                this.saveGame(index);
            }
        });

        this.container.add(slotContainer);
    }

    saveGame(slotIndex) {
        const saveData = {
            timestamp: new Date().toLocaleString(),
            gameState: window.gameState?.getState(),
            playerPos: { x: this.scene.player.x, y: this.scene.player.y },
            questProgress: this.scene.questSystem?.getProgress()
        };

        localStorage.setItem(`casefile_noir_save_${slotIndex}`, JSON.stringify(saveData));
        this.showSaveFeedback(slotIndex);
    }

    loadGame(slotIndex) {
        const savedData = localStorage.getItem(`casefile_noir_save_${slotIndex}`);
        if (savedData) {
            const parsed = JSON.parse(savedData);
            window.gameState.loadState(parsed.gameState);
            
            // Restore player position
            if (parsed.playerPos && this.scene.player) {
                this.scene.player.setPosition(parsed.playerPos.x, parsed.playerPos.y);
            }
            
            this.scene.scene.restart();
        }
    }

    showSaveFeedback(slotIndex) {
        // Flash effect to confirm save
        const flash = this.scene.add.rectangle(
            this.scene.scale.width / 2,
            this.scene.scale.height / 2,
            this.scene.scale.width,
            this.scene.scale.height,
            0x00ff00, 0.5
        );
        flash.setDepth(6000);

        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 500,
            onComplete: () => flash.destroy()
        });

        // Show "SAVED" text
        const text = this.scene.add.text(
            this.scene.scale.width / 2,
            this.scene.scale.height / 2,
            'GAME SAVED',
            {
                fontFamily: 'Courier New',
                fontSize: '48px',
                color: '#00ff00',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 8
            }
        );
        text.setOrigin(0.5);

        this.scene.time.delayedCall(1500, () => text.destroy());
    }

    close() {
        if (!this.isVisible) return;

        const duration = 300;
        this.scene.tweens.add({
            targets: this.container,
            alpha: 0,
            duration: duration,
            onComplete: () => {
                this.container.destroy();
                this.isVisible = false;
                this.container = null;
            }
        });
    }
}

export default SaveLoadUI;
