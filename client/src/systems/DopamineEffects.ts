export class DopamineEffects {
  private scene: Phaser.Scene;
  private activeEffects: Map<string, Phaser.GameObjects.Container> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public showQuestComplete(questTitle: string): void {
    const effectKey = `quest_complete_${Date.now()}`;
    const container = this.createQuestCompletePopup(questTitle);
    this.activeEffects.set(effectKey, container);
    this.playQuestCompleteSound();
  }

  public showClueFound(clueTitle: string): void {
    const effectKey = `clue_found_${Date.now()}`;
    const container = this.createClueFoundPopup(clueTitle);
    this.activeEffects.set(effectKey, container);
    this.playClueFoundSound();
  }

  public showObjectiveComplete(objectiveText: string): void {
    const effectKey = `objective_complete_${Date.now()}`;
    const container = this.createObjectiveCompleteBanner(objectiveText);
    this.activeEffects.set(effectKey, container);
  }

  private createQuestCompletePopup(questTitle: string): Phaser.GameObjects.Container {
    const width = 600;
    const height = 200;
    const x = (this.scene.scale.width - width) / 2;
    const y = this.scene.scale.height / 2 - 200;

    const container = this.scene.add.container(x, y);
    container.setDepth(4000);
    container.setAlpha(0);

    const bg = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x1a2e1a
    );
    bg.setStrokeStyle(4, 0x00ff00);
    container.add(bg);

    const title = this.scene.add.text(
      width / 2,
      40,
      'QUEST COMPLETE',
      {
        fontFamily: 'Courier New',
        fontSize: '28px',
        color: '#00ff00',
        fontStyle: 'bold',
      }
    );
    title.setOrigin(0.5);
    container.add(title);

    const questText = this.scene.add.text(
      width / 2,
      90,
      questTitle,
      {
        fontFamily: 'Courier New',
        fontSize: '18px',
        color: '#f5f1e5',
      }
    );
    questText.setOrigin(0.5);
    container.add(questText);

    const sparkle = this.scene.add.text(
      width / 2,
      140,
      '✨',
      {
        fontFamily: 'Courier New',
        fontSize: '32px',
      }
    );
    sparkle.setOrigin(0.5);
    container.add(sparkle);

    this.scene.add.existing(container);

    this.animatePopup(container, 4000);
    return container;
  }

  private createClueFoundPopup(clueTitle: string): Phaser.GameObjects.Container {
    const width = 500;
    const height = 150;
    const x = (this.scene.scale.width - width) / 2;
    const y = 100;

    const container = this.scene.add.container(x, y);
    container.setDepth(3500);
    container.setAlpha(0);

    const bg = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x1a1a1a
    );
    bg.setStrokeStyle(3, 0xffd700);
    container.add(bg);

    const icon = this.scene.add.text(
      50,
      height / 2,
      '🔍',
      {
        fontFamily: 'Courier New',
        fontSize: '48px',
      }
    );
    icon.setOrigin(0.5);
    container.add(icon);

    const title = this.scene.add.text(
      width / 2,
      50,
      'NEW CLUE DISCOVERED',
      {
        fontFamily: 'Courier New',
        fontSize: '18px',
        color: '#ffd700',
        fontStyle: 'bold',
      }
    );
    title.setOrigin(0.5);
    container.add(title);

    const clueText = this.scene.add.text(
      width / 2,
      100,
      clueTitle,
      {
        fontFamily: 'Courier New',
        fontSize: '16px',
        color: '#f5f1e5',
      }
    );
    clueText.setOrigin(0.5);
    container.add(clueText);

    this.scene.add.existing(container);

    this.animatePopup(container, 3500);
    return container;
  }

  private createObjectiveCompleteBanner(objectiveText: string): Phaser.GameObjects.Container {
    const width = 800;
    const height = 100;
    const x = (this.scene.scale.width - width) / 2;
    const y = 80;

    const container = this.scene.add.container(x, y);
    container.setDepth(3800);
    container.setAlpha(0);

    const bg = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x2e4a1a
    );
    bg.setStrokeStyle(3, 0xffa500);
    container.add(bg);

    const title = this.scene.add.text(
      width / 2,
      35,
      'OBJECTIVE COMPLETE',
      {
        fontFamily: 'Courier New',
        fontSize: '22px',
        color: '#ff9800',
        fontStyle: 'bold',
      }
    );
    title.setOrigin(0.5);
    container.add(title);

    const text = this.scene.add.text(
      width / 2,
      70,
      objectiveText,
      {
        fontFamily: 'Courier New',
        fontSize: '14px',
        color: '#f5f1e5',
      }
    );
    text.setOrigin(0.5);
    container.add(text);

    this.scene.add.existing(container);

    this.animatePopup(container, 3000);
    return container;
  }

  private animatePopup(container: Phaser.GameObjects.Container, duration: number): void {
    this.scene.tweens.add({
      targets: container,
      alpha: 1,
      y: container.y - 30,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: container,
          alpha: 0,
          y: container.y - 30,
          duration: 500,
          delay: duration - 800,
          ease: 'Power2',
          onComplete: () => {
            container.destroy();
            const keys = Array.from(this.activeEffects.entries());
            const entry = keys.find(([key]) => container === this.activeEffects.get(key));
            if (entry) {
              this.activeEffects.delete(entry[0]);
            }
          },
        });
      },
    });
  }

  private playQuestCompleteSound(): void {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAAAAAAAA');
      audio.play().catch(() => {});
    } catch (e) {}
  }

  private playClueFoundSound(): void {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAAAAAAAA');
      audio.play().catch(() => {});
    } catch (e) {}
  }

  public destroy(): void {
    this.activeEffects.forEach((container) => {
      container.destroy();
    });
    this.activeEffects.clear();
  }
}
