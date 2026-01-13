const STYLE_ID = 'demo-panel-styles';

export default class DemoPanel {
    constructor(options = {}) {
        this.onJump = options.onJump;
        this.onAddEvidence = options.onAddEvidence;
        this.onCheckContradictions = options.onCheckContradictions;
        this.onAutoWin = options.onAutoWin;
        this.container = this.createLayout();
        this.bindEvents();
    }

    createLayout() {
        this.ensureStyles();
        const container = document.createElement('div');
        container.className = 'demo-panel hidden';

        const title = document.createElement('div');
        title.className = 'demo-title';
        title.textContent = 'Demo Panel';
        container.appendChild(title);

        this.suspectSelect = document.createElement('select');
        this.suspectSelect.className = 'demo-select';
        container.appendChild(this.suspectSelect);

        const jumpButton = document.createElement('button');
        jumpButton.textContent = 'Jump to suspect';
        jumpButton.addEventListener('click', () => {
            if (this.onJump) {
                this.onJump(this.suspectSelect.value);
            }
        });
        container.appendChild(jumpButton);

        const evidenceButton = document.createElement('button');
        evidenceButton.textContent = 'Add all evidence';
        evidenceButton.addEventListener('click', () => {
            if (this.onAddEvidence) {
                this.onAddEvidence();
            }
        });
        container.appendChild(evidenceButton);

        const contradictionsButton = document.createElement('button');
        contradictionsButton.textContent = 'Trigger contradictions';
        contradictionsButton.addEventListener('click', () => {
            if (this.onCheckContradictions) {
                this.onCheckContradictions();
            }
        });
        container.appendChild(contradictionsButton);

        const winButton = document.createElement('button');
        winButton.textContent = 'Auto-win';
        winButton.addEventListener('click', () => {
            if (this.onAutoWin) {
                this.onAutoWin();
            }
        });
        container.appendChild(winButton);

        document.body.appendChild(container);
        return container;
    }

    ensureStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .demo-panel {
                position: fixed;
                top: 12px;
                right: 12px;
                background: rgba(20, 20, 20, 0.9);
                border: 1px solid #5e5e5e;
                padding: 10px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                z-index: 2300;
                font-family: "Courier New", Courier, monospace;
                color: #f0f0f0;
                width: 170px;
            }
            .demo-panel.hidden { display: none; }
            .demo-panel button, .demo-panel select {
                background: #2a2a2a;
                color: #f0f0f0;
                border: 1px solid #5e5e5e;
                padding: 6px;
                font-size: 12px;
                cursor: pointer;
            }
            .demo-title {
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
        this.onKeyDown = (event) => {
            if (event.key === 'F1') {
                event.preventDefault();
                this.toggle();
            }
        };
        window.addEventListener('keydown', this.onKeyDown);
    }

    toggle() {
        if (this.container.classList.contains('hidden')) {
            this.show();
        } else {
            this.hide();
        }
    }

    show() {
        this.container.classList.remove('hidden');
    }

    hide() {
        this.container.classList.add('hidden');
    }

    setSuspects(suspects) {
        this.suspectSelect.innerHTML = '';
        if (!suspects || !suspects.length) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No suspects';
            this.suspectSelect.appendChild(option);
            return;
        }
        suspects.forEach((suspect) => {
            const option = document.createElement('option');
            option.value = suspect.id;
            option.textContent = suspect.name || suspect.id;
            this.suspectSelect.appendChild(option);
        });
    }
}
