export class HUD {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private objectiveText: Phaser.GameObjects.Text;
  private notificationText: Phaser.GameObjects.Text | null = null;
  private notificationTimer: Phaser.Time.TimerEvent | null = null;
  private notificationQueue: Array<{ text: string; duration: number }> = [];
  private progressText: Phaser.GameObjects.Text;
  private progressBar: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createUI();
  }

  private createUI(): void {
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(2300);
    this.container.setScrollFactor(0, 0);

    const objectiveLabel = this.scene.add.text(
      20,
      20,
      'OBJECTIVE:',
      {
        fontFamily: 'Courier New',
        fontSize: '14px',
        color: '#b4945a',
        fontStyle: 'bold',
      }
    );
    this.container.add(objectiveLabel);

    this.objectiveText = this.scene.add.text(
      20,
      45,
      '',
      {
        fontFamily: 'Courier New',
        fontSize: '16px',
        color: '#e4cf9b',
        wordWrap: { width: 300, useAdvancedWrap: true },
      }
    );
    this.container.add(this.objectiveText);

    const locationLabel = this.scene.add.text(
      20,
      100,
      'LOCATION:',
      {
        fontFamily: 'Courier New',
        fontSize: '14px',
        color: '#b4945a',
        fontStyle: 'bold',
      }
    );
    this.container.add(locationLabel);

    const locationText = this.scene.add.text(
      20,
      125,
      'Harrowford',
      {
        fontFamily: 'Courier New',
        fontSize: '16px',
        color: '#f5f1e5',
      }
    );
    this.container.add(locationText);

    const dayLabel = this.scene.add.text(
      20,
      150,
      'DAY:',
      {
        fontFamily: 'Courier New',
        fontSize: '14px',
        color: '#b4945a',
        fontStyle: 'bold',
      }
    );
    this.container.add(dayLabel);

    const dayText = this.scene.add.text(
      80,
      150,
      '1',
      {
        fontFamily: 'Courier New',
        fontSize: '16px',
        color: '#f5f1e5',
      }
    );
    this.container.add(dayText);

    const progressLabel = this.scene.add.text(
      20,
      180,
      'CASE PROGRESS:',
      {
        fontFamily: 'Courier New',
        fontSize: '14px',
        color: '#b4945a',
        fontStyle: 'bold',
      }
    );
    this.container.add(progressLabel);

    this.progressText = this.scene.add.text(
      20,
      205,
      '0%',
      {
        fontFamily: 'Courier New',
        fontSize: '18px',
        color: '#e4cf9b',
        fontStyle: 'bold',
      }
    );
    this.container.add(this.progressText);

    this.progressBar = this.scene.add.graphics();
    this.container.add(this.progressBar);

    this.updateProgressBar();

    const controlsHint = this.scene.add.text(
      20,
      this.scene.scale.height - 60,
      'Controls:\n[WASD] Move\n[E] Interact\n[Q] Detective Sense\n[I] Inventory\n[TAB] Suspect Board',
      {
        fontFamily: 'Courier New',
        fontSize: '11px',
        color: '#666666',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: { x: 8, y: 8 },
      }
    );
    controlsHint.setScrollFactor(0, 0);
    controlsHint.setDepth(2299);
    this.container.add(controlsHint);

    this.updateObjective();
    this.setupStateListener();
  }

  private setupStateListener(): void {
    if (window.gameState) {
      window.gameState.subscribe(() => this.updateObjective());
      window.gameState.subscribe(() => this.updateDay());
      window.gameState.subscribe(() => this.updateLocation());
    }
  }

  public updateObjective(): void {
    const QuestManager = (window as any).QuestManager;
    if (!QuestManager) return;

    const objective = QuestManager.getCurrentObjective();
    if (objective) {
      this.objectiveText.setText(objective.description);
    } else {
      this.objectiveText.setText('No active objective');
    }
  }

  private updateDay(): void {
    const day = window.gameState?.getDay() || 1;

    const dayText = this.container.list.find(obj =>
      obj instanceof Phaser.GameObjects.Text &&
      obj.y === 150 &&
      obj.x === 80
    ) as Phaser.GameObjects.Text;

    if (dayText) {
      dayText.setText(day.toString());
    }
  }

  private updateLocation(): void {
    const location = window.gameState?.getLocation() || 'Harrowford';
    const locationMap: Record<string, string> = {
      'police_station': 'Police Station',
      'school': 'Harrowford High',
      'pennyworth_lane': 'Pennyworth Lane',
      'harrow_residence': 'Harrow Residence',
      'risky_passage': 'Risky Passage',
      'lions_den': 'Lion\'s Den',
      'woods': 'The Woods',
    };

    const locationName = locationMap[location] || location;

    const locationText = this.container.list.find(obj =>
      obj instanceof Phaser.GameObjects.Text &&
      obj.y === 125 &&
      obj.x === 20
    ) as Phaser.GameObjects.Text;

    if (locationText) {
      locationText.setText(locationName);
    }
  }

  public updateLocationText(): void {
    this.updateLocation();
  }

  private calculateCaseProgress(): number {
    const gameState = window.gameState?.getState();
    if (!gameState) return 0;

    const totalClues = 8;
    const cluesFound = gameState.clues.length;

    const totalInterrogations = 4;
    const interrogationsCompleted = gameState.dialogueHistory.filter(
      (d: any) => d.npcId !== 'edwin_clarke' && d.npcId !== 'arthur_kosminski'
    ).length;

    const clueProgress = (cluesFound / totalClues) * 70;
    const interrogationProgress = (interrogationsCompleted / totalInterrogations) * 30;

    return Math.min(100, Math.floor(clueProgress + interrogationProgress));
  }

  private updateProgressBar(): void {
    this.progressBar.clear();

    const progress = this.calculateCaseProgress();
    this.progressText.setText(`${progress}%`);

    const barWidth = 300;
    const barHeight = 12;
    const barX = 20;
    const barY = 230;

    this.progressBar.fillStyle(0x2d2618, 1);
    this.progressBar.fillRect(barX, barY, barWidth, barHeight);

    const fillWidth = (progress / 100) * barWidth;

    let fillColor = 0xff4444;
    if (progress >= 33) fillColor = 0xffaa00;
    if (progress >= 66) fillColor = 0x00ff00;

    this.progressBar.fillStyle(fillColor, 1);
    this.progressBar.fillRect(barX, barY, fillWidth, barHeight);

    this.progressBar.lineStyle(1, 0x6f5a34, 1);
    this.progressBar.strokeRect(barX, barY, barWidth, barHeight);
  }

  public showNotification(text: string, duration: number = 3000): void {
    this.notificationQueue.push({ text, duration });

    if (!this.notificationTimer) {
      this.displayNextNotification();
    }
  }

  private displayNextNotification(): void {
    if (this.notificationQueue.length === 0) {
      this.notificationTimer = null;
      return;
    }

    const notification = this.notificationQueue.shift()!;

    if (this.notificationText) {
      this.notificationText.destroy();
    }

    this.notificationText = this.scene.add.text(
      this.scene.scale.width / 2,
      80,
      notification.text,
      {
        fontFamily: 'Courier New',
        fontSize: '18px',
        color: '#e4cf9b',
        fontStyle: 'bold',
        backgroundColor: 'rgba(26, 31, 20, 0.95)',
        stroke: '#b4945a',
        strokeThickness: 2,
        padding: { x: 15, y: 10 },
      }
    );
    this.notificationText.setOrigin(0.5);
    this.notificationText.setDepth(2800);
    this.notificationText.setScrollFactor(0, 0);

    this.scene.tweens.add({
      targets: this.notificationText,
      y: 60,
      alpha: 0,
      duration: notification.duration,
      ease: 'Quad.easeOut',
      delay: 1000,
      onComplete: () => {
        if (this.notificationText) {
          this.notificationText.destroy();
          this.notificationText = null;
        }
        this.displayNextNotification();
      },
    });

    this.scene.tweens.add({
      targets: this.notificationText,
      y: 100,
      alpha: 1,
      duration: 300,
      ease: 'Quad.easeOut',
    });
  }

  public update(): void {
    this.updateObjective();
    this.updateProgressBar();
  }

  public destroy(): void {
    if (this.notificationTimer) {
      this.notificationTimer.destroy();
    }

    if (this.notificationText) {
      this.notificationText.destroy();
    }

    this.container.destroy();
  }
}
