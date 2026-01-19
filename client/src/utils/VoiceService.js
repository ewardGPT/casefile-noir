export class VoiceService {
    constructor() {
        this.synthesis = window.speechSynthesis;
        this.recognition = null;

        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.lang = 'en-US';
            this.recognition.interimResults = false;
        } else {
            console.warn("Speech Recognition not supported in this browser.");
        }
    }

    speak(text, characterName = 'default') {
        if (!this.synthesis) return;

        // Cancel previous speech to avoid overlapping
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        // Basic voice selection logic (can be expanded)
        const voices = this.synthesis.getVoices();

        // Try to find a British voice for the noir London setting
        const ukVoice = voices.find(v => v.lang.includes('en-GB'));
        if (ukVoice) utterance.voice = ukVoice;

        utterance.rate = 0.9; // Slightly slower for dramatic effect
        utterance.pitch = 1.0;

        // Custom tweaks based on character
        if (characterName === 'Kosminski') utterance.pitch = 0.8;
        if (characterName === 'Lillian') utterance.pitch = 1.2;

        this.synthesis.speak(utterance);
    }

    listen() {
        return new Promise((resolve, reject) => {
            if (!this.recognition) {
                reject("Speech Recognition not supported");
                return;
            }

            this.recognition.onresult = (event) => {
                const text = event.results[0][0].transcript;
                resolve(text);
            };

            this.recognition.onerror = (event) => {
                reject(event.error);
            };

            try {
                this.recognition.start();
            } catch (e) {
                // Already started?
                reject(e);
            }
        });
    }
}

export const voiceService = new VoiceService();
