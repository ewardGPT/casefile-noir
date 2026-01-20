/**
 * CutsceneManager - Cinematic moments system
 * Handles evidence discovery zoom, suspect confrontations, and victory celebrations
 */

export class CutsceneManager {
    constructor(scene) {
        this.scene = scene;
        this.isPlaying = false;
        this.currentCutscene = null;
    }

    /**
     * Play evidence discovery cutscene
     * @param {Object} itemData - Quest item data
     */
    playEvidenceDiscovery(itemData) {
        this.isPlaying = true;
        this.currentCutscene = 'evidence_discovery';

        // Dramatic camera zoom in
        this.scene.cameras.main.zoomTo(1.5, 2000, 'Power2');

        // Slow motion effect for dramatic reveal
        const originalTimeScale = this.scene.timeScale;
        this.scene.timeScale = 0.3;

        // Spotlight effect
        const spotlight = this.scene.add.graphics();
        spotlight.setDepth(5000);
        spotlight.setScrollFactor(0);

        // Animate spotlight reveal
        const revealTimeline = this.scene.tweens.createTimeline();
        revealTimeline.add({
            targets: { radius: 0 },
            radius: 200,
            duration: 1000,
            onUpdate: (targets) => {
                spotlight.clear();
                // Outer glow
                spotlight.fillStyle(0xffffcc, 0.1);
                spotlight.fillCircle(
                    itemData.x,
                    itemData.y,
                    targets.radius
                );
                // Inner bright circle
                spotlight.fillStyle(0xffffff, 0.4);
                spotlight.fillCircle(
                    itemData.x,
                    itemData.y,
                    targets.radius * 0.7
                );
            }
        });

        revealTimeline.play();

        // Play tension build-up sound
        try {
            this.scene.sound.play('tension_buildup', { volume: 0.8 });
        } catch (e) {
            console.warn('Cutscene: tension_buildup sound not found');
        }

        // Restore game speed after cutscene
        this.scene.time.delayedCall(3000, () => {
            this.scene.timeScale = originalTimeScale || 1.0;
            this.scene.cameras.main.zoomTo(1.0, 1000);
            spotlight.destroy();
            this.isPlaying = false;
        });
    }

    /**
     * Play suspect confrontation cutscene
     * @param {Object} suspectData - Suspect information
     */
    playConfrontation(suspectData) {
        this.isPlaying = true;
        this.currentCutscene = 'confrontation';

        // Split-screen effect (detective vs suspect)
        const viewportWidth = this.scene.scale.width / 2;
        this.scene.cameras.main.setViewport(0, 0, viewportWidth, this.scene.scale.height);

        const suspectCam = this.scene.cameras.add(0, 0, viewportWidth, this.scene.scale.height);
        suspectCam.setName('suspect_cam');

        // Dramatic lighting changes
        this.scene.cameras.main.setTint(0xff0000, 0.5);
        suspectCam.setTint(0x4444ff, 0.5);

        // Portrait reveal animation
        const suspectPortrait = this.scene.add.image(
            this.scene.scale.width * 0.75,
            this.scene.scale.height / 2,
            `portraits/${suspectData.id}.png`
        );
        suspectPortrait.setScale(0);
        suspectPortrait.setOrigin(0.5);
        suspectPortrait.setDepth(6000);

        this.scene.tweens.add({
            targets: suspectPortrait,
            scale: 1.5,
            duration: 1500,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.isPlaying = false;
                suspectCam.destroy();
            }
        });

        // Dramatic chord plays
        try {
            this.scene.sound.play('confrontation_chord', { volume: 1.0 });
        } catch (e) {
            console.warn('Cutscene: confrontation_chord sound not found');
        }
    }

    /**
     * Play victory/case solved cutscene
     */
    playCaseSolved() {
        this.isPlaying = true;
        this.currentCutscene = 'case_solved';

        // Confetti celebration using ParticleManager
        const particleManager = this.scene.sys?.values?.particleManager;
        if (particleManager) {
            particleManager.createConfetti(
                this.scene.scale.width / 2,
                this.scene.scale.height / 2
            );
        }

        // Victory screen zoom
        this.scene.tweens.add({
            targets: this.scene.cameras.main,
            zoom: 1.2,
            duration: 2000,
            ease: 'Back.easeOut',
            yoyo: true
        });

        // Triumphant music plays
        try {
            this.scene.sound.play('victory_theme', { volume: 0.9 });
        } catch (e) {
            console.warn('Cutscene: victory_theme sound not found');
        }

        // Clear after celebration
        this.scene.time.delayedCall(5000, () => {
            this.isPlaying = false;
        });
    }

    /**
     * Check if a cutscene is currently playing
     */
    isPlaying() {
        return this.isPlaying;
    }

    /**
     * Get current cutscene
     */
    getCurrentCutscene() {
        return this.currentCutscene;
    }

    /**
     * Cancel current cutscene
     */
    cancel() {
        this.isPlaying = false;
        this.currentCutscene = null;

        // Restore camera
        this.scene.cameras.main.resetFX();
        this.scene.timeScale = 1.0;
        this.scene.cameras.main.setViewport(0, 0, this.scene.scale.width, this.scene.scale.height);
    }

    /**
     * Destroy cutscene system
     */
    destroy() {
        this.cancel();
    }
}

export default CutsceneManager;
