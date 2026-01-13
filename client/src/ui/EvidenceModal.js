import { analyzeEvidence } from '../api.js';
import { upsertEvidence, addTimelineEvent } from './gameState.js';

const STYLE_ID = 'evidence-modal-styles';

export default class EvidenceModal {
    constructor() {
        this.isOpen = false;
        this.currentEvidence = null;
        this.container = this.createLayout();
        this.bindEvents();
    }

    createLayout() {
        this.ensureStyles();
        const container = document.createElement('div');
        container.className = 'evidence-modal hidden';

        const panel = document.createElement('div');
        panel.className = 'evidence-panel';

        const header = document.createElement('div');
        header.className = 'evidence-header';
        this.titleEl = document.createElement('div');
        this.titleEl.className = 'evidence-title';
        header.appendChild(this.titleEl);

        const closeButton = document.createElement('button');
        closeButton.className = 'evidence-close';
        closeButton.textContent = 'Close';
        closeButton.addEventListener('click', () => this.close());
        header.appendChild(closeButton);

        const body = document.createElement('div');
        body.className = 'evidence-body';

        this.imageEl = document.createElement('img');
        this.imageEl.className = 'evidence-image';
        body.appendChild(this.imageEl);

        this.resultsEl = document.createElement('div');
        this.resultsEl.className = 'evidence-results';
        body.appendChild(this.resultsEl);

        const footer = document.createElement('div');
        footer.className = 'evidence-footer';
        this.analyzeButton = document.createElement('button');
        this.analyzeButton.className = 'evidence-analyze';
        this.analyzeButton.textContent = 'Analyze';
        footer.appendChild(this.analyzeButton);

        panel.appendChild(header);
        panel.appendChild(body);
        panel.appendChild(footer);
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
            .evidence-modal {
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2100;
            }
            .evidence-modal.hidden { display: none; }
            .evidence-panel {
                width: min(700px, 90vw);
                background: #161616;
                color: #f0f0f0;
                border: 2px solid #6a5c3c;
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                font-family: "Courier New", Courier, monospace;
            }
            .evidence-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .evidence-title {
                font-size: 18px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .evidence-close {
                background: transparent;
                border: 1px solid #6a5c3c;
                color: #f0f0f0;
                padding: 6px 10px;
                cursor: pointer;
            }
            .evidence-body {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
            }
            .evidence-image {
                width: 100%;
                height: 240px;
                object-fit: cover;
                border: 1px solid #3a3122;
                background: #0e0e0e;
            }
            .evidence-results {
                font-size: 13px;
                line-height: 1.4;
                max-height: 240px;
                overflow-y: auto;
                border: 1px solid #3a3122;
                padding: 8px;
                background: #1d1a14;
            }
            .evidence-footer {
                display: flex;
                justify-content: flex-end;
            }
            .evidence-analyze {
                background: #b4945a;
                color: #1a1a1a;
                border: none;
                padding: 8px 14px;
                text-transform: uppercase;
                letter-spacing: 0.8px;
                cursor: pointer;
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
        this.analyzeButton.addEventListener('click', () => this.runAnalysis());
    }

    open(evidence) {
        this.currentEvidence = evidence;
        this.isOpen = true;
        this.titleEl.textContent = evidence.title || evidence.id || 'Evidence';
        if (evidence.image) {
            this.imageEl.src = evidence.image;
            this.imageEl.style.display = 'block';
        } else {
            this.imageEl.style.display = 'none';
        }
        this.resultsEl.textContent = evidence.analysis
            ? this.formatAnalysis(evidence.analysis)
            : 'Awaiting analysis.';
        this.container.classList.remove('hidden');
        window.addEventListener('keydown', this.onKeyDown);
    }

    close() {
        this.isOpen = false;
        this.container.classList.add('hidden');
        window.removeEventListener('keydown', this.onKeyDown);
    }

    async runAnalysis() {
        if (!this.currentEvidence) {
            return;
        }
        this.analyzeButton.disabled = true;
        this.analyzeButton.textContent = 'Analyzing...';
        try {
            const response = await analyzeEvidence({
                id: this.currentEvidence.id,
                title: this.currentEvidence.title,
                metadata: this.currentEvidence.metadata || {},
                image: this.currentEvidence.image || null
            });
            const analysis = {
                observations: response.observations || [],
                leads: response.leads || [],
                questionsToAsk: response.questionsToAsk || []
            };
            const entry = {
                ...this.currentEvidence,
                analysis,
                summary: response.summary || 'Analysis complete.'
            };
            upsertEvidence(entry);
            addTimelineEvent({ text: `Evidence analyzed: ${entry.title || entry.id}` });
            this.resultsEl.textContent = this.formatAnalysis(analysis);
        } catch (error) {
            this.resultsEl.textContent = `Analysis failed: ${error.message}`;
        } finally {
            this.analyzeButton.disabled = false;
            this.analyzeButton.textContent = 'Analyze';
        }
    }

    formatAnalysis(analysis) {
        const lines = [];
        if (analysis.observations?.length) {
            lines.push(`Observations: ${analysis.observations.join(', ')}`);
        }
        if (analysis.leads?.length) {
            lines.push(`Leads: ${analysis.leads.join(', ')}`);
        }
        if (analysis.questionsToAsk?.length) {
            lines.push(`Questions: ${analysis.questionsToAsk.join(', ')}`);
        }
        if (!lines.length) {
            lines.push('No insights returned.');
        }
        return lines.join('\n');
    }
}
