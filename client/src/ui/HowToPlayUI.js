/**
 * HowToPlayUI - Pokemon-themed scrollable control guide
 * 
 * Cross-references keybinds from:
 * - DialogueBoxUI (A/Space for interact, B/Shift for skip)
 * - Game.js (WASD/Arrows for movement)
 * - Inventory, Quest, Notebook, Map systems
 */

export class HowToPlayUI {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.scrollContainer = null;
        
        this.createUI();
    }
    
    createUI() {
        const { width, height } = this.scene.scale;
        const boxWidth = Math.min(width * 0.7, 600);
        const boxHeight = height * 0.65;
        const boxX = (width - boxWidth) / 2;
        const boxY = (height - boxHeight) / 2 + 20;
        
        // Main container
        this.container = this.scene.add.container(width / 2, boxY);
        this.container.setDepth(10);
        this.container.setScrollFactor(0);
        
        // Outer border (darker, larger)
        const outerBg = this.scene.add.rectangle(
            boxWidth / 2, boxHeight / 2,
            boxWidth + 8, boxHeight + 8,
            0x2a2a2a, 1
        );
        outerBg.setStrokeStyle(4, 0x4a4a4a);
        this.container.add(outerBg);
        
        // Inner background
        const innerBg = this.scene.add.rectangle(
            boxWidth / 2, boxHeight / 2,
            boxWidth, boxHeight,
            0x1a2030, 0.98
        );
        innerBg.setStrokeStyle(2, 0x6b5b4b);
        this.container.add(innerBg);
        
        // --- Fixed Title ---
        const titleText = this.scene.add.text(boxWidth / 2, 25, "HOW TO PLAY", {
            fontFamily: "'Georgia', serif",
            fontSize: "28px",
            color: "#d4af37",
            stroke: "#0a0f14",
            strokeThickness: 4,
        });
        titleText.setOrigin(0.5);
        titleText.setScrollFactor(0);
        titleText.setDepth(20);
        this.container.add(titleText);
        
        // Close button (fixed at top right)
        const closeBtn = this.scene.add.rectangle(
            boxWidth - 30, 30, 36, 36,
            0x8b3a3a, 1
        );
        closeBtn.setStrokeStyle(3, 0xa05050);
        closeBtn.setInteractive({ useHandCursor: true });
        
        const closeX = this.scene.add.text(boxWidth - 30, 30, "×", {
            fontSize: "24px",
            color: "#ffd4a3",
        });
        closeX.setOrigin(0.5);
        closeX.setScrollFactor(0);
        closeX.setDepth(21);
        this.container.add(closeX);
        
        closeBtn.on("pointerover", () => {
            closeBtn.setFillStyle(0xa04545);
            this.scene.tweens.add({
                targets: closeBtn, scaleX: 1.1, scaleY: 1.1,
                duration: 100,
            });
        });
        
        closeBtn.on("pointerout", () => {
            closeBtn.setFillStyle(0x8b3a3a);
            this.scene.tweens.add({
                targets: closeBtn, scaleX: 1, scaleY: 1,
                duration: 100,
            });
        });
        
        closeBtn.on("pointerdown", () => {
            this.scene.scene.start("StartMenu");
        });
        
        this.container.add(closeBtn);
        
        // --- Scrollable Content Body ---
        // Create a masked area for scrolling
        const scrollY = 60;
        const scrollHeight = boxHeight - 90;
        const scrollX = 20;
        const scrollWidth = boxWidth - 40;
        
        // Mask rectangle (invisible, just for clipping)
        const maskShape = this.scene.add.rectangle(
            boxWidth / 2, scrollY + scrollHeight / 2,
            scrollWidth, scrollHeight
        );
        maskShape.setVisible(false);
        this.container.add(maskShape);
        
        // Scrollable container
        this.scrollContainer = this.scene.add.container(0, scrollY);
        this.scrollContainer.setMask(maskShape.createGeometryMask());
        this.container.add(this.scrollContainer);
        
        // --- Control Groups ---
        let currentY = 20;
        const rowHeight = 50;
        const leftColumn = 140;
        const rightColumn = 240;
        
        // Helper to create keybind box
        const createKeybindBox = (text, x, y, isWide = false, isArrow = false) => {
            const boxWidth = isWide ? 44 : 40;
            const box = this.scene.add.rectangle(x, y, boxWidth, 36, 0x2a3545, 1);
            box.setStrokeStyle(2, isArrow ? "#5a7080" : "#7a90a0");
            
            const label = this.scene.add.text(x, y, text, {
                fontFamily: "monospace",
                fontSize: isArrow ? "14px" : "12px",
                color: isArrow ? "#a0c0d0" : "#e0f0ff",
                fontStyle: "bold",
            });
            label.setOrigin(0.5);
            
            return { box, label };
        };
        
        // Section: MOVEMENT
        this.addSectionHeader("MOVEMENT", 0);
        currentY += 35;
        
        // Movement row
        const moveLabel = this.scene.add.text(15, currentY, "Move Around", {
            fontFamily: "'Georgia', serif",
            fontSize: "15px",
            color: "#c0d0e0",
        });
        this.scrollContainer.add(moveLabel);
        
        // WASD
        let kx = rightColumn;
        const wasdKeys = ["W", "A", "S", "D"];
        wasdKeys.forEach(key => {
            const keybind = createKeybindBox(key, kx, currentY, true);
            this.scrollContainer.add([keybind.box, keybind.label]);
            kx += 48;
        });
        
        const orText = this.scene.add.text(kx + 5, currentY, "or", {
            fontFamily: "monospace",
            fontSize: "11px",
            color: "#5a7080",
        });
        this.scrollContainer.add(orText);
        kx += 30;
        
        // Arrows
        const arrowKeys = ["↑", "←", "↓", "→"];
        arrowKeys.forEach(key => {
            const keybind = createKeybindBox(key, kx, currentY, false, true);
            this.scrollContainer.add([keybind.box, keybind.label]);
            kx += 42;
        });
        
        currentY += rowHeight + 15;
        
        // Section: ACTIONS
        this.addSectionHeader("ACTIONS", currentY);
        currentY += 35;
        
        // Interact / Accept
        const interactLabel = this.scene.add.text(15, currentY, "Interact / Accept", {
            fontFamily: "'Georgia', serif",
            fontSize: "15px",
            color: "#c0d0e0",
        });
        this.scrollContainer.add(interactLabel);
        
        let ax = rightColumn;
        const aKey = createKeybindBox("[ A ]", ax, currentY);
        this.scrollContainer.add([aKey.box, aKey.label]);
        ax += 70;
        
        const or2Text = this.scene.add.text(ax + 5, currentY, "or", {
            fontFamily: "monospace",
            fontSize: "11px",
            color: "#5a7080",
        });
        this.scrollContainer.add(or2Text);
        ax += 30;
        
        const spaceKey = createKeybindBox("SPACE", ax + 25, currentY, true);
        this.scrollContainer.add([spaceKey.box, spaceKey.label]);
        
        currentY += rowHeight + 10;
        
        // Skip Dialogue
        const skipLabel = this.scene.add.text(15, currentY, "Skip Dialogue", {
            fontFamily: "'Georgia', serif",
            fontSize: "15px",
            color: "#c0d0e0",
        });
        this.scrollContainer.add(skipLabel);
        
        let sx = rightColumn;
        const bKey = createKeybindBox("[ B ]", sx, currentY);
        this.scrollContainer.add([bKey.box, bKey.label]);
        sx += 70;
        
        const or3Text = this.scene.add.text(sx + 5, currentY, "or", {
            fontFamily: "monospace",
            fontSize: "11px",
            color: "#5a7080",
        });
        this.scrollContainer.add(or3Text);
        sx += 30;
        
        const shiftKey = createKeybindBox("SHIFT", sx + 30, currentY, true);
        this.scrollContainer.add([shiftKey.box, shiftKey.label]);
        
        currentY += rowHeight + 15;
        
        // Section: MENUS
        this.addSectionHeader("MENUS", currentY);
        currentY += 35;
        
        // Menu items
        const menuItems = [
            { label: "Inventory", key: "[ I ]" },
            { label: "Quest Log", key: "[ Q ]" },
            { label: "Notebook", key: "[ N ]" },
            { label: "Map", key: "[ M ]" },
            { label: "Pause / Close", key: "ESC" },
        ];
        
        menuItems.forEach(item => {
            const itemLabel = this.scene.add.text(15, currentY, item.label, {
                fontFamily: "'Georgia', serif",
                fontSize: "15px",
                color: "#c0d0e0",
            });
            this.scrollContainer.add(itemLabel);
            
            const keybind = createKeybindBox(item.key, rightColumn + 20, currentY, item.key === "ESC");
            this.scrollContainer.add([keybind.box, keybind.label]);
            
            currentY += rowHeight + 5;
        });
        
        currentY += 15;
        
        // Section: GAMEPLAY TIPS
        this.addSectionHeader("GAMEPLAY TIPS", currentY);
        currentY += 35;
        
        const tips = [
            "• Press E near NPCs to talk",
            "• Check your notebook for clues",
            "• Find contradictions in dialogue",
            "• Collect evidence before accusing",
            "• Use detective sense for hidden items",
        ];
        
        tips.forEach(tip => {
            const tipText = this.scene.add.text(15, currentY, tip, {
                fontFamily: "'Georgia', serif",
                fontSize: "14px",
                color: "#8aa0b0",
                fontStyle: "italic",
            });
            this.scrollContainer.add(tipText);
            currentY += 28;
        });
        
        // Set scrollable area height (before footer)
        const contentHeight = currentY + 20;
        this.scrollContainer.setSize(boxWidth, contentHeight);
        
        // --- Fixed Footer: DEVELOPER FUNCTIONS (F1-F12) ---
        const footerY = boxHeight - 80;
        const footerSeparator = this.scene.add.graphics();
        footerSeparator.lineStyle(2, 0x4a5a6a);
        footerSeparator.beginPath();
        footerSeparator.moveTo(20, footerY);
        footerSeparator.lineTo(boxWidth - 20, footerY);
        footerSeparator.strokePath();
        this.container.add(footerSeparator);
        
        const footerTitle = this.scene.add.text(boxWidth / 2, footerY + 15, "DEVELOPER FUNCTIONS", {
            fontFamily: "'Georgia', serif",
            fontSize: "14px",
            color: "#8ba0b0",
            fontStyle: "bold",
        });
        footerTitle.setOrigin(0.5);
        footerTitle.setScrollFactor(0);
        footerTitle.setDepth(20);
        this.container.add(footerTitle);
        
        // All F-keys in footer (2 columns)
        const developerFunctions = [
            { key: "F1", label: "Demo Panel" },
            { key: "F2", label: "Debug Overlay" },
            { key: "F3", label: "Physics Debug" },
            { key: "F4", label: "NPC Debug" },
            { key: "F5", label: "Path Debug" },
            { key: "F6", label: "Health Check" },
            { key: "F7", label: "Minimap" },
            { key: "F8", label: "Collision Audit" },
            { key: "F9", label: "Body Debug" },
            { key: "F10", label: "Reserved" },
            { key: "F11", label: "Developer Tool" },
            { key: "F12", label: "Developer Tool" },
        ];
        
        const footerCol1X = boxWidth * 0.25;
        const footerCol2X = boxWidth * 0.75;
        const footerStartY = footerY + 35;
        const footerRowHeight = 22;
        
        developerFunctions.forEach((func, index) => {
            const col = index < 6 ? 1 : 2;
            const row = index < 6 ? index : index - 6;
            const x = col === 1 ? footerCol1X : footerCol2X;
            const y = footerStartY + row * footerRowHeight;
            
            const funcLabel = this.scene.add.text(x - 30, y, func.label, {
                fontFamily: "'Georgia', serif",
                fontSize: "11px",
                color: "#7a8a9a",
            });
            funcLabel.setOrigin(1, 0.5);
            funcLabel.setScrollFactor(0);
            funcLabel.setDepth(20);
            this.container.add(funcLabel);
            
            const keybind = createKeybindBox(`[ ${func.key} ]`, x + 10, y);
            keybind.box.setScrollFactor(0);
            keybind.box.setDepth(20);
            keybind.label.setScrollFactor(0);
            keybind.label.setDepth(20);
            this.container.add([keybind.box, keybind.label]);
        });
        
        // --- Scrollbar ---
        this.createScrollbar(boxWidth, scrollHeight, contentHeight, scrollX, scrollY);
        
        // --- Enable Scrolling with Mouse Wheel ---
        this.scene.input.on("wheel", (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            const scrollBounds = {
                top: scrollY,
                bottom: scrollY + scrollHeight,
            };
            
            if (pointer.y >= scrollBounds.top && pointer.y <= scrollBounds.bottom) {
                const scrollAmount = 40;
                const maxScroll = Math.max(0, contentHeight - scrollHeight);
                const currentScroll = -this.scrollContainer.y;
                
                let newScroll = currentScroll + (deltaY > 0 ? scrollAmount : -scrollAmount);
                newScroll = Math.max(0, Math.min(maxScroll, newScroll));
                
                this.scrollContainer.y = scrollY - newScroll;
                this.updateScrollbar(newScroll, maxScroll);
            }
        });
        
        // --- Initial scroll position ---
        this.scrollContainer.y = scrollY;
    }
    
    addSectionHeader(title, y) {
        const header = this.scene.add.text(20, y, title, {
            fontFamily: "'Georgia', serif",
            fontSize: "16px",
            color: "#8ba0b0",
        });
        this.scrollContainer.add(header);
        
        const line = this.scene.add.graphics();
        line.lineStyle(1, 0x3a4a5a);
        line.beginPath();
        line.moveTo(20, y + 20);
        line.lineTo(450, y + 20);
        line.strokePath();
        this.scrollContainer.add(line);
    }
    
    createScrollbar(boxWidth, scrollHeight, contentHeight, scrollX, scrollY) {
        const trackWidth = 8;
        const trackX = boxWidth - 25;
        
        // Track background
        const track = this.scene.add.rectangle(
            trackX, scrollY + scrollHeight / 2,
            trackWidth, scrollHeight,
            0x1a2030, 1
        );
        track.setStrokeStyle(1, 0x3a4a5a);
        this.container.add(track);
        
        // Thumb
        const thumbHeight = Math.max(30, (scrollHeight / contentHeight) * scrollHeight);
        this.scrollThumb = this.scene.add.rectangle(
            trackX, scrollY + 10,
            trackWidth - 2, thumbHeight,
            0x5a7080, 1
        );
        this.container.add(this.scrollThumb);
        
        // Hover effects for scrollbar
        track.setInteractive();
        this.scrollThumb.setInteractive({ draggable: true });
        
        this.scrollThumb.on("pointerover", () => {
            this.scrollThumb.setFillStyle(0x6a8090);
        });
        
        this.scrollThumb.on("pointerout", () => {
            this.scrollThumb.setFillStyle(0x5a7080);
        });
        
        // Drag functionality
        this.scrollThumb.on("drag", (pointer, dragX, dragY) => {
            const maxScroll = Math.max(0, contentHeight - scrollHeight);
            const thumbMax = scrollHeight - thumbHeight;
            const relativeY = Math.max(0, dragY - scrollY);
            const scrollPos = (relativeY / thumbMax) * maxScroll;
            
            this.scrollContainer.y = scrollY - scrollPos;
            this.scrollThumb.y = scrollY + 10 + relativeY;
        });
    }
    
    updateScrollbar(scrollPosition, maxScroll) {
        const scrollHeight = 350;
        const thumbHeight = Math.max(30, (scrollHeight / (maxScroll + scrollHeight)) * scrollHeight);
        
        const thumbMax = scrollHeight - thumbHeight;
        const thumbY = 10 + (scrollPosition / maxScroll) * thumbMax;
        
        this.scrollThumb.y = thumbY;
        this.scrollThumb.height = thumbHeight;
    }
    
    destroy() {
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
        if (this.scrollContainer) {
            this.scrollContainer.destroy();
            this.scrollContainer = null;
        }
    }
}

export default HowToPlayUI;
