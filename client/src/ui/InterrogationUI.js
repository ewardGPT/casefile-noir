import { interrogateSuspect, checkContradictions } from '../api.js';
import {
    addSuspectStatement,
    setContradictions,
    addTimelineEvent,
    adjustScore,
    loadGameState
} from './gameState.js';

const STYLE_ID = 'interrogation-ui-styles';

export default class InterrogationUI {
    constructor(options = {}) {
        this.onClose = options.onClose;
        this.isOpen = false;
        this.currentSuspect = null;
        this.container = this.createLayout();
        this.bindEvents();
    }

    createLayout() {
        this.ensureStyles();
        const container = document.createElement('div');
        container.className = 'interrogation-ui hidden';

        const panel = document.createElement('div');
        panel.className = 'interrogation-panel';

        const header = document.createElement('div');
        header.className = 'interrogation-header';

        this.portraitEl = document.createElement('div');
        this.portraitEl.className = 'interrogation-portrait';
        header.appendChild(this.portraitEl);

        const meta = document.createElement('div');
        meta.className = 'interrogation-meta';
        this.nameEl = document.createElement('div');
        this.nameEl.className = 'interrogation-name';
        meta.appendChild(this.nameEl);

        const meter = document.createElement('div');
        meter.className = 'interrogation-meter';
        this.meterFill = document.createElement('div');
        this.meterFill.className = 'interrogation-meter-fill';
        meter.appendChild(this.meterFill);
        meta.appendChild(meter);
        header.appendChild(meta);

        const closeButton = document.createElement('button');
        closeButton.className = 'interrogation-close';
        closeButton.textContent = 'Exit';
        closeButton.addEventListener('click', () => this.close());
        header.appendChild(closeButton);

        this.logEl = document.createElement('div');
        this.logEl.className = 'interrogation-log';

        this.contradictionsEl = document.createElement('div');
        this.contradictionsEl.className = 'interrogation-contradictions';

        const inputWrap = document.createElement('div');
        inputWrap.className = 'interrogation-input';
        this.inputEl = document.createElement('input');
        this.inputEl.type = 'text';
        this.inputEl.placeholder = 'Type your question...';
        inputWrap.appendChild(this.inputEl);

        panel.appendChild(header);
        panel.appendChild(this.logEl);
        panel.appendChild(this.contradictionsEl);
        panel.appendChild(inputWrap);
        container.appendChild(panel);
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
            .interrogation-ui {
                position: fixed;
                inset: 0;
                background: radial-gradient(circle at top, #301a1a, #0c0b0b);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2200;
                color: #f4e9d4;
                font-family: "Courier New", Courier, monospace;
            }
            .interrogation-ui.hidden { display: none; }
            .interrogation-panel {
                width: min(900px, 94vw);
                height: min(560px, 90vh);
                border: 2px solid #7a4b4b;
                background: rgba(15, 10, 10, 0.95);
                display: grid;
                grid-template-rows: auto 1fr auto auto;
                gap: 10px;
                padding: 16px;
                box-shadow: 0 0 40px rgba(0,0,0,0.7);
            }
            .interrogation-header {
                display: grid;
                grid-template-columns: 120px 1fr auto;
                gap: 16px;
                align-items: center;
            }
            .interrogation-portrait {
                width: 120px;
                height: 120px;
                background: #2a2020;
                border: 1px solid #7a4b4b;
                background-size: cover;
                background-position: center;
            }
            .interrogation-name {
                font-size: 22px;
                text-transform: uppercase;
                letter-spacing: 1.5px;
            }
            .interrogation-meter {
                width: 100%;
                height: 8px;
                border: 1px solid #7a4b4b;
                margin-top: 8px;
            }
            .interrogation-meter-fill {
                height: 100%;
                background: linear-gradient(90deg, #2ecc71, #f1c40f, #e74c3c);
                width: 20%;
            }
            .interrogation-log {
                border: 1px solid #3a2a2a;
                padding: 10px;
                overflow-y: auto;
                background: rgba(20, 12, 12, 0.8);
            }
            .interrogation-log-entry {
                margin-bottom: 8px;
            }
            .interrogation-log-entry.player {
                color: #98d4ff;
            }
            .interrogation-log-entry.ai {
                color: #f4e9d4;
            }
            .interrogation-input input {
                width: 100%;
                padding: 10px;
                border: 1px solid #7a4b4b;
                background: #1b1313;
                color: #f4e9d4;
            }
            .interrogation-contradictions {
                border: 1px solid #4b2a2a;
                padding: 8px;
                min-height: 40px;
                background: rgba(35, 16, 16, 0.9);
                color: #ffb3b3;
                font-size: 12px;
            }
            .interrogation-close {
                background: transparent;
                border: 1px solid #7a4b4b;
                color: #f4e9d4;
                padding: 6px 12px;
                cursor: pointer;
                text-transform: uppercase;
                letter-spacing: 0.8px;
            }
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
        this.onKeyDown = (event) => {
            if (event.key === 'Escape') {
                this.close();
            }
        };
        this.inputEl.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                const value = this.inputEl.value.trim();
                if (value) {
                    this.sendQuestion(value);
                }
            }
        });
    }

    open(suspect) {
        this.currentSuspect = suspect;
        this.isOpen = true;
        this.nameEl.textContent = suspect.name || suspect.id;
        if (suspect.portrait) {
            this.portraitEl.style.backgroundImage = `url('${suspect.portrait}')`;
        } else {
            this.portraitEl.style.backgroundImage = 'none';
        }
        this.logEl.innerHTML = '';
        this.contradictionsEl.textContent = 'No contradictions detected.';
        this.container.classList.remove('hidden');
        window.addEventListener('keydown', this.onKeyDown);
        this.inputEl.focus();
    }

    close() {
        this.isOpen = false;
        this.container.classList.add('hidden');
        window.removeEventListener('keydown', this.onKeyDown);
        if (this.onClose) {
            this.onClose();
        }
    }

    appendLog(text, from) {
        const entry = document.createElement('div');
        entry.className = `interrogation-log-entry ${from}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
        this.logEl.appendChild(entry);
        this.logEl.scrollTop = this.logEl.scrollHeight;
    }

    async sendQuestion(question) {
        if (!this.currentSuspect) {
            return;
        }
        this.inputEl.value = '';
        adjustScore(-1);
        addSuspectStatement(this.currentSuspect.id, this.currentSuspect.name, question, 'Detective');
        this.appendLog(`You: ${question}`, 'player');
        addTimelineEvent({ text: `Questioned ${this.currentSuspect.name}: ${question}` });

        try {
            const response = await interrogateSuspect({
                suspectId: this.currentSuspect.id,
                question
            });
            const reply = response.reply || response.answer || '...';
            addSuspectStatement(this.currentSuspect.id, this.currentSuspect.name, reply, 'Suspect');
            this.appendLog(`${this.currentSuspect.name}: ${reply}`, 'ai');
            await this.refreshContradictions();
        } catch (error) {
            this.appendLog(`System: ${error.message}`, 'ai');
        }
    }

    async refreshContradictions() {
        try {
            const state = loadGameState();
            const statements = (state.suspects?.[this.currentSuspect.id]?.statements || []).map((statement) => ({
                speaker: statement.from,
                text: statement.text,
                timestamp: statement.timestamp
            }));
            const response = await checkContradictions({
                suspectId: this.currentSuspect.id,
                statements
            });
            const contradictions = response.contradictions || [];
            setContradictions(contradictions);
            if (!contradictions.length) {
                this.contradictionsEl.textContent = 'No contradictions detected.';
                return;
            }
            this.contradictionsEl.innerHTML = contradictions
                .map((item) => `<div>⚠ ${item.text || 'Contradiction'} (conf: ${item.confidence || 'n/a'})</div>`)
                .join('');
        } catch (error) {
            this.contradictionsEl.textContent = `Contradiction check failed: ${error.message}`;
        }
    }
}
