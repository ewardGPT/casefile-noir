export class DetectiveSenseUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private overlay: Phaser.GameObjects.Rectangle;
  private arrow: Phaser.GameObjects.Triangle;
  private distanceText: Phaser.GameObjects.Text;
  private hintText: Phaser.GameObjects.Text;
  private highlightGraphics: Phaser.GameObjects.Graphics;
  private senseMeterText: Phaser.GameObjects.Text;
  private senseMeterBar: Phaser.GameObjects.Graphics;
  private visible: boolean = false;
  private targetPosition: Phaser.Math.Vector2 | null = null;
  private targetId: string | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createUI();
    this.setupInputs();
  }

  private createUI(): void {
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(2400);

    this.overlay = this.scene.add.rectangle(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      this.scene.scale.width,
      this.scene.scale.height,
      0x1a4d2e,
      0.3
    );
    this.overlay.setVisible(false);
    this.container.add(this.overlay);

    this.arrow = this.scene.add.triangle(
      0,
      0,
      0, -30,
      -15, 20,
      15, 20,
      0x00ff00
    );
    this.arrow.setVisible(false);
    this.arrow.setDepth(2401);
    this.container.add(this.arrow);

    this.distanceText = this.scene.add.text(
      0,
      0,
      '',
      {
        fontFamily: 'Courier New',
        fontSize: '16px',
        color: '#00ff00',
        fontStyle: 'bold',
        backgroundColor: '#000000',
        padding: { x: 8, y: 4 },
      }
    );
    this.distanceText.setVisible(false);
    this.distanceText.setDepth(2402);
    this.container.add(this.distanceText);

    this.hintText = this.scene.add.text(
      this.scene.scale.width / 2,
      50,
      '',
      {
        fontFamily: 'Courier New',
        fontSize: '14px',
        color: '#e4cf9b',
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: { x: 12, y: 8 },
        wordWrap: { width: 600, useAdvancedWrap: true },
      }
    );
    this.hintText.setOrigin(0.5);
    this.hintText.setVisible(false);
    this.hintText.setDepth(2403);
    this.container.add(this.hintText);

    this.highlightGraphics = this.scene.add.graphics();
    this.highlightGraphics.setDepth(1900);
    this.highlightGraphics.setVisible(false);
    this.container.add(this.highlightGraphics);

    this.senseMeterBar = this.scene.add.graphics();
    this.senseMeterBar.setDepth(2405);
    this.senseMeterBar.setVisible(false);
    this.container.add(this.senseMeterBar);

    this.senseMeterText = this.scene.add.text(
      this.scene.scale.width / 2,
      90,
      'AI SENSE: 0%',
      {
        fontFamily: 'Courier New',
        fontSize: '24px',
        color: '#00ff00',
        fontStyle: 'bold',
        backgroundColor: '#000000',
        padding: { x: 15, y: 8 },
      }
    );
    this.senseMeterText.setOrigin(0.5);
    this.senseMeterText.setVisible(false);
    this.senseMeterText.setDepth(2406);
    this.container.add(this.senseMeterText);

    this.container.setVisible(false);
  }

  private setupInputs(): void {
    const toggleHandler = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'q') {
        event.preventDefault();
        this.toggle();
      }
    };

    window.addEventListener('keydown', toggleHandler);
    (this.container as any).toggleHandler = toggleHandler;
  }

  public toggle(): void {
    const isActive = window.gameState?.isDetectiveSenseActive() || false;

    if (isActive) {
      this.hide();
      window.gameState?.setDetectiveSense(false);
    } else {
      this.show();
      window.gameState?.setDetectiveSense(true);
    }
  }

  public show(): void {
    this.container.setVisible(true);
    this.overlay.setVisible(true);
    this.senseMeterBar.setVisible(true);
    this.senseMeterText.setVisible(true);
    this.visible = true;

    const QuestManager = (window as any).QuestManager;
    if (QuestManager) {
      const target = QuestManager.getCurrentQuestTarget();
      if (target) {
        this.setTarget(target.type, target.targetId);
      }
    }
    this.updateSenseMeter();
  }

  public hide(): void {
    this.container.setVisible(false);
    this.overlay.setVisible(false);
    this.arrow.setVisible(false);
    this.distanceText.setVisible(false);
    this.hintText.setVisible(false);
    this.senseMeterBar.setVisible(false);
    this.senseMeterText.setVisible(false);
    this.highlightGraphics.clear();
    this.highlightGraphics.setVisible(false);
    this.visible = false;
    this.targetPosition = null;
    this.targetId = null;
  }

  public setTarget(objectiveType: string, targetId?: string): void {
    this.targetId = targetId || null;

    const player = (this.scene as any).player;
    if (!player) return;

    this.targetPosition = this.findTargetPosition(objectiveType, targetId);

    if (this.targetPosition) {
      this.updateHint(objectiveType, targetId);
    }
  }

  private findTargetPosition(objectiveType: string, targetId?: string): Phaser.Math.Vector2 | null {
    const NPCs = (this.scene as any).npcs || [];
    const spawnPoints = (this.scene as any).spawnPoints || {};

    switch (objectiveType) {
      case 'TALK_TO_NPC':
        const npc = NPCs.find(n => n.id === targetId);
        return npc ? new Phaser.Math.Vector2(npc.x, npc.y) : null;

      case 'GO_TO_LOCATION':
        const spawnPoint = spawnPoints[targetId || ''];
        return spawnPoint ? new Phaser.Math.Vector2(spawnPoint.x, spawnPoint.y) : null;

      case 'COLLECT_CLUE':
        const interactables = (this.scene as any).interactables;
        if (interactables) {
          for (const zone of interactables.children.entries) {
            if (zone.getData('id') === targetId) {
              return new Phaser.Math.Vector2(zone.x, zone.y);
            }
          }
        }
        return null;

      default:
        return null;
    }
  }

  private updateHint(objectiveType: string, targetId?: string): void {
    let hint = '';
    const currentQuest = (window as any).QuestManager?.getCurrentQuest();

    switch (objectiveType) {
      case 'TALK_TO_NPC':
        const NPC_DATA = (window as any).NPC_DATA;
        const npc = NPC_DATA?.[targetId || ''];
        hint = npc
          ? `Locate ${npc.name}. They may have vital information about the case.`
          : 'Find the target NPC for questioning.';
        break;

      case 'GO_TO_LOCATION':
        const locationNames: Record<string, string> = {
          'school': 'Harrowford High School',
          'police_station': 'Police Station',
          'pennyworth_lane': 'Pennyworth Lane',
          'harrow_residence': 'Harrow Residence',
          'risky_passage': 'Risky Passage',
          'lions_den': 'Lion\'s Den',
        };
        const locationName = locationNames[targetId || ''] || 'the target location';
        hint = `Travel to ${locationName}. Important evidence or suspects may be there.`;
        break;

      case 'COLLECT_CLUE':
        hint = 'Search the area carefully for evidence. Use your observation skills to find clues.';
        break;

      case 'ACCUSE_SUSPECT':
        hint = 'Review your evidence and make a final accusation. Choose carefully.';
        break;

      default:
        hint = currentQuest?.title || 'Follow the current objective.';
    }

    this.hintText.setText(hint);
    this.hintText.setVisible(true);
  }

  public update(): void {
    if (!this.visible || !this.targetPosition) return;

    const player = (this.scene as any).player;
    if (!player) return;

    const playerPos = new Phaser.Math.Vector2(player.x, player.y);
    const targetPos = this.targetPosition;
    const distance = Phaser.Math.Distance.BetweenPoints(playerPos, targetPos);

    const camera = this.scene.cameras.main;
    const cameraX = camera.scrollX + camera.width / 2;
    const cameraY = camera.scrollY + camera.height / 2;

    const direction = new Phaser.Math.Vector2()
      .copy(targetPos)
      .subtract(playerPos)
      .normalize();

    const arrowDistance = 100;
    const arrowX = cameraX + direction.x * arrowDistance;
    const arrowY = cameraY + direction.y * arrowDistance;

    const angle = Math.atan2(direction.y, direction.x) * (180 / Math.PI);

    this.arrow.setPosition(arrowX, arrowY);
    this.arrow.setRotation(Phaser.Math.DegToRad(angle - 90));
    this.arrow.setVisible(true);

    const distanceMeters = Math.floor(distance / 32);
    this.distanceText.setText(`${distanceMeters}m`);
    this.distanceText.setPosition(arrowX + 50, arrowY);
    this.distanceText.setVisible(true);

    this.updateSenseMeter();
    this.highlightInteractables();
  }

  private highlightInteractables(): void {
    this.highlightGraphics.clear();

    const QuestManager = (window as any).QuestManager;
    const target = QuestManager?.getCurrentQuestTarget();

    if (target?.targetId) {
      switch (target.type) {
        case 'TALK_TO_NPC':
          this.highlightNPCs(target.targetId);
          break;
        case 'COLLECT_CLUE':
          this.highlightInteractable(target.targetId);
          break;
      }
    }
  }

  private calculateSensePercentage(): number {
    const gameState = window.gameState?.getState();
    if (!gameState) return 50;

    const perception = gameState.playerStats.observation;
    const logic = gameState.playerStats.logic;
    const questProgressBonus = this.getQuestProgressBonus();

    const sense = 35 + (perception * 4) + (logic * 2) + questProgressBonus;
    return Math.max(0, Math.min(100, sense));
  }

  private getQuestProgressBonus(): number {
    const QuestManager = (window as any).QuestManager;
    if (!QuestManager) return 0;

    const currentQuest = QuestManager.getCurrentQuest();
    if (!currentQuest || !currentQuest.objectives) return 0;

    const totalObjectives = currentQuest.objectives.length;
    const completedObjectives = currentQuest.objectives.filter((obj: any) => obj.completed).length;

    if (totalObjectives === 0) return 0;
    return (completedObjectives / totalObjectives) * 15;
  }

  private updateSenseMeter(): void {
    const percentage = this.calculateSensePercentage();

    const barWidth = 300;
    const barHeight = 20;
    const barX = this.scene.scale.width / 2 - barWidth / 2;
    const barY = 120;

    this.senseMeterBar.clear();

    this.senseMeterBar.fillStyle(0x2d2618, 1);
    this.senseMeterBar.fillRect(barX, barY, barWidth, barHeight);

    const fillWidth = (percentage / 100) * barWidth;

    let fillColor = 0xff4444;
    if (percentage >= 50) fillColor = 0xffaa00;
    if (percentage >= 75) fillColor = 0x00ff00;

    this.senseMeterBar.fillStyle(fillColor, 1);
    this.senseMeterBar.fillRect(barX, barY, fillWidth, barHeight);

    this.senseMeterBar.lineStyle(2, 0x6f5a34, 1);
    this.senseMeterBar.strokeRect(barX, barY, barWidth, barHeight);

    this.senseMeterText.setText(`AI SENSE: ${Math.round(percentage)}%`);
  }

  private highlightNPCs(targetId: string): void {
    const NPCs = (this.scene as any).npcs || [];

    NPCs.forEach((npc: any) => {
      if (npc.id === targetId) {
        this.highlightGraphics.lineStyle(3, 0x00ff00, 1);
        this.highlightGraphics.strokeCircle(npc.x, npc.y, 40);

        this.highlightGraphics.lineStyle(1, 0x00ff00, 0.5);
        for (let i = 0; i < 360; i += 20) {
          const angle = Phaser.Math.DegToRad(i);
          const x = npc.x + Math.cos(angle) * 50;
          const y = npc.y + Math.sin(angle) * 50;
          this.highlightGraphics.lineBetween(npc.x, npc.y, x, y);
        }
      }
    });
  }

  private highlightInteractable(targetId: string): void {
    const interactables = (this.scene as any).interactables;

    if (interactables) {
      for (const zone of interactables.children.entries) {
        if (zone.getData('id') === targetId) {
          this.highlightGraphics.lineStyle(2, 0xffff00, 1);
          this.highlightGraphics.strokeRect(
            zone.x - zone.width / 2,
            zone.y - zone.height / 2,
            zone.width,
            zone.height
          );

          this.highlightGraphics.lineStyle(1, 0xffff00, 0.5);
          const pulseSize = 10;
          this.highlightGraphics.strokeRect(
            zone.x - zone.width / 2 - pulseSize,
            zone.y - zone.height / 2 - pulseSize,
            zone.width + pulseSize * 2,
            zone.height + pulseSize * 2
          );
        }
      }
    }
  }

  public isVisible(): boolean {
    return this.visible;
  }

  public destroy(): void {
    if ((this.container as any)?.toggleHandler) {
      window.removeEventListener('keydown', (this.container as any).toggleHandler);
    }
    this.container.destroy();
  }
}
