import { loadGameState } from './gameState.js';

const STYLE_ID = 'notebook-ui-styles';

export default class NotebookUI {
    constructor() {
        this.state = loadGameState();
        this.activeTab = 'evidence';
        this.onAccuse = null;
        this.container = this.createLayout();
        this.bindEvents();
        this.render();
    }

    createLayout() {
        this.ensureStyles();

        const container = document.createElement('div');
        container.className = 'notebook-ui hidden';

        const header = document.createElement('div');
        header.className = 'notebook-header';

        const title = document.createElement('div');
        title.className = 'notebook-title';
        title.textContent = 'Case Notebook';
        header.appendChild(title);

        const tabs = document.createElement('div');
        tabs.className = 'notebook-tabs';

        this.tabButtons = {
            evidence: this.createTabButton('Evidence'),
            suspects: this.createTabButton('Suspects'),
            timeline: this.createTabButton('Timeline'),
            contradictions: this.createTabButton('Contradictions')
        };

        Object.entries(this.tabButtons).forEach(([key, button]) => {
            button.dataset.tab = key;
            tabs.appendChild(button);
        });

        header.appendChild(tabs);

        const body = document.createElement('div');
        body.className = 'notebook-body';

        this.sections = {
            evidence: document.createElement('div'),
            suspects: document.createElement('div'),
            timeline: document.createElement('div'),
            contradictions: document.createElement('div')
        };

        Object.values(this.sections).forEach((section) => {
            section.className = 'notebook-section';
            body.appendChild(section);
        });

        container.appendChild(header);
        container.appendChild(body);
        document.body.appendChild(container);
        return container;
    }

    createTabButton(label) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        return button;
    }

    ensureStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .notebook-ui {
                position: fixed;
                inset: 5% 8%;
                background: #1f1b14;
                color: #f5f1e5;
                border: 2px solid #b4945a;
                box-shadow: 0 0 30px rgba(0,0,0,0.6);
                font-family: "Courier New", Courier, monospace;
                display: flex;
                flex-direction: column;
                z-index: 2000;
            }
            .notebook-ui.hidden { display: none; }
            .notebook-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid #6f5a34;
                background: linear-gradient(90deg, #2b2418, #1f1b14);
            }
            .notebook-title {
                font-size: 20px;
                letter-spacing: 1px;
                text-transform: uppercase;
            }
            .notebook-tabs {
                display: flex;
                gap: 8px;
            }
            .notebook-tabs button {
                background: transparent;
                border: 1px solid #6f5a34;
                color: #f5f1e5;
                padding: 6px 10px;
                cursor: pointer;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.8px;
            }
            .notebook-tabs button.active {
                background: #b4945a;
                color: #1f1b14;
            }
            .notebook-body {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
            }
            .notebook-card {
                border: 1px solid #6f5a34;
                padding: 12px;
                margin-bottom: 12px;
                background: #262014;
            }
            .notebook-card-title {
                font-size: 14px;
                text-transform: uppercase;
                margin-bottom: 8px;
                color: #e4cf9b;
            }
            .notebook-list {
                margin: 0;
                padding-left: 16px;
            }
            .notebook-tag {
                display: inline-block;
                padding: 2px 6px;
                border: 1px solid #6f5a34;
                margin-left: 6px;
                font-size: 10px;
            }
            .notebook-accuse {
                margin-top: 8px;
                background: #b44242;
                color: #fff;
                border: none;
                padding: 6px 10px;
                cursor: pointer;
                text-transform: uppercase;
                letter-spacing: 0.8px;
            }
            .notebook-empty {
                opacity: 0.7;
                font-style: italic;
            }
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
        Object.values(this.tabButtons).forEach((button) => {
            button.addEventListener('click', () => {
                this.activeTab = button.dataset.tab;
                this.render();
            });
        });

        this.onKeyDown = (event) => {
            if (event.key !== 'Tab') {
                return;
            }
            const target = event.target;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }
            event.preventDefault();
            this.toggle();
        };
        window.addEventListener('keydown', this.onKeyDown);

        window.addEventListener('gameStateUpdated', () => {
            if (!this.container.classList.contains('hidden')) {
                this.render();
            }
        });
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
        this.render();
    }

    hide() {
        this.container.classList.add('hidden');
    }

    setAccuseHandler(handler) {
        this.onAccuse = handler;
    }

    render() {
        this.state = loadGameState();
        Object.values(this.tabButtons).forEach((button) => {
            button.classList.toggle('active', button.dataset.tab === this.activeTab);
        });
        Object.entries(this.sections).forEach(([key, section]) => {
            section.style.display = key === this.activeTab ? 'block' : 'none';
        });
        this.renderEvidence();
        this.renderSuspects();
        this.renderTimeline();
        this.renderContradictions();
    }

    renderEvidence() {
        const section = this.sections.evidence;
        section.innerHTML = '';
        if (!this.state.evidence.length) {
            section.innerHTML = '<div class="notebook-empty">No evidence logged yet.</div>';
            return;
        }
        this.state.evidence.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'notebook-card';
            const title = document.createElement('div');
            title.className = 'notebook-card-title';
            title.textContent = item.title || item.id || 'Evidence';
            card.appendChild(title);

            if (item.analysis) {
                const observations = this.createList('Observations', item.analysis.observations);
                const leads = this.createList('Leads', item.analysis.leads);
                const questions = this.createList('Questions', item.analysis.questionsToAsk);
                card.appendChild(observations);
                card.appendChild(leads);
                card.appendChild(questions);
            } else {
                const text = document.createElement('div');
                text.textContent = item.summary || 'Awaiting analysis.';
                card.appendChild(text);
            }

            section.appendChild(card);
        });
    }

    renderSuspects() {
        const section = this.sections.suspects;
        section.innerHTML = '';
        const suspects = Object.values(this.state.suspects || {});
        if (!suspects.length) {
            section.innerHTML = '<div class="notebook-empty">No suspects logged yet.</div>';
            return;
        }
        suspects.forEach((suspect) => {
            const card = document.createElement('div');
            card.className = 'notebook-card';
            const title = document.createElement('div');
            title.className = 'notebook-card-title';
            title.textContent = suspect.name || suspect.id;
            card.appendChild(title);

            const list = document.createElement('ul');
            list.className = 'notebook-list';
            (suspect.statements || []).slice(-6).forEach((statement) => {
                const li = document.createElement('li');
                li.textContent = `${statement.from}: ${statement.text}`;
                list.appendChild(li);
            });
            card.appendChild(list);

            const accuseButton = document.createElement('button');
            accuseButton.className = 'notebook-accuse';
            accuseButton.textContent = 'Accuse';
            accuseButton.addEventListener('click', () => {
                if (this.onAccuse) {
                    this.onAccuse(suspect.id);
                }
            });
            card.appendChild(accuseButton);

            section.appendChild(card);
        });
    }

    renderTimeline() {
        const section = this.sections.timeline;
        section.innerHTML = '';
        if (!this.state.timeline.length) {
            section.innerHTML = '<div class="notebook-empty">No timeline events recorded.</div>';
            return;
        }
        const list = document.createElement('ul');
        list.className = 'notebook-list';
        this.state.timeline.forEach((event) => {
            const li = document.createElement('li');
            li.textContent = `${event.timestamp}: ${event.text}`;
            list.appendChild(li);
        });
        section.appendChild(list);
    }

    renderContradictions() {
        const section = this.sections.contradictions;
        section.innerHTML = '';
        if (!this.state.contradictions.length) {
            section.innerHTML = '<div class="notebook-empty">No contradictions detected.</div>';
            return;
        }
        this.state.contradictions.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'notebook-card';
            const text = document.createElement('div');
            text.textContent = item.text || 'Contradiction';
            const confidence = document.createElement('span');
            confidence.className = 'notebook-tag';
            confidence.textContent = `Confidence: ${item.confidence || 'n/a'}`;
            text.appendChild(confidence);
            card.appendChild(text);
            section.appendChild(card);
        });
    }

    createList(label, items) {
        const wrapper = document.createElement('div');
        const title = document.createElement('div');
        title.className = 'notebook-card-title';
        title.textContent = label;
        wrapper.appendChild(title);
        if (!items || !items.length) {
            const empty = document.createElement('div');
            empty.className = 'notebook-empty';
            empty.textContent = 'None';
            wrapper.appendChild(empty);
            return wrapper;
        }
        const list = document.createElement('ul');
        list.className = 'notebook-list';
        items.forEach((item) => {
            const li = document.createElement('li');
            li.textContent = item;
            list.appendChild(li);
        });
        wrapper.appendChild(list);
        return wrapper;
    }
}
