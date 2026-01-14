/**
 * AudioManager - Noir-themed audio system
 * Handles music, SFX, and volume controls
 */

export class AudioManager {
    constructor(scene) {
        this.scene = scene;
        this.musicTracks = new Map();
        this.sfxTracks = new Map();
        
        // Volume settings (0.0 to 1.0)
        this.volumes = {
            master: 1.0,
            music: 0.6,
            sfx: 0.8
        };
        
        this.muted = false;
        this.currentMusic = null;
        
        // Footstep cooldown
        this.lastFootstepTime = 0;
        this.footstepCooldown = 300; // ms between footsteps
    }
    
    /**
     * Load audio assets in Boot scene
     */
    static preload(scene) {
        // Music tracks (looping)
        // Note: These will need to be added to Boot.js preload
        // For now, we'll use Web Audio API fallback if files don't exist
        
        // SFX tracks
        // Note: These will need to be added to Boot.js preload
    }
    
    /**
     * Set volumes
     * @param {Object} volumes - {master, music, sfx}
     */
    setVolumes(volumes) {
        if (volumes.master !== undefined) this.volumes.master = Math.max(0, Math.min(1, volumes.master));
        if (volumes.music !== undefined) this.volumes.music = Math.max(0, Math.min(1, volumes.music));
        if (volumes.sfx !== undefined) this.volumes.sfx = Math.max(0, Math.min(1, volumes.sfx));
        this.updateVolumes();
    }
    
    /**
     * Update all audio volumes
     */
    updateVolumes() {
        const masterVol = this.muted ? 0 : this.volumes.master;
        
        // Update music
        this.musicTracks.forEach(sound => {
            if (sound && sound.setVolume) {
                sound.setVolume(masterVol * this.volumes.music);
            }
        });
        
        // Update SFX
        this.sfxTracks.forEach(sound => {
            if (sound && sound.setVolume) {
                sound.setVolume(masterVol * this.volumes.sfx);
            }
        });
    }
    
    /**
     * Play music track (looping)
     * @param {string} key - Sound key
     */
    playMusic(key) {
        // Stop current music
        this.stopMusic();
        
        // Try to get sound from cache
        let sound = this.scene.sound.get(key);
        
        if (!sound) {
            // Fallback: Create silent placeholder if sound doesn't exist
            console.warn(`AudioManager: Music "${key}" not found, using placeholder`);
            return;
        }
        
        // Configure for looping
        sound.setLoop(true);
        sound.setVolume(this.muted ? 0 : this.volumes.master * this.volumes.music);
        
        // Play
        sound.play();
        this.currentMusic = sound;
        this.musicTracks.set(key, sound);
    }
    
    /**
     * Stop current music
     */
    stopMusic() {
        if (this.currentMusic && this.currentMusic.isPlaying) {
            this.currentMusic.stop();
        }
        this.currentMusic = null;
    }
    
    /**
     * Play SFX (one-shot)
     * @param {string} key - Sound key
     * @param {Object} options - {volume, rate}
     */
    playSfx(key, options = {}) {
        if (this.muted) return;
        
        // Try to get sound from cache
        let sound = this.scene.sound.get(key);
        
        if (!sound) {
            // Fallback: Use Web Audio API for simple beep if sound doesn't exist
            console.warn(`AudioManager: SFX "${key}" not found, using fallback`);
            this.playFallbackSfx(key);
            return;
        }
        
        // Configure volume
        const volume = options.volume !== undefined ? options.volume : 1.0;
        sound.setVolume(this.volumes.master * this.volumes.sfx * volume);
        
        // Configure rate if specified
        if (options.rate !== undefined && sound.setRate) {
            sound.setRate(options.rate);
        }
        
        // Play (one-shot)
        sound.play();
        this.sfxTracks.set(key, sound);
    }
    
    /**
     * Play footstep sound (with cooldown)
     */
    playFootstep() {
        const now = Date.now();
        if (now - this.lastFootstepTime < this.footstepCooldown) {
            return; // Too soon
        }
        
        this.lastFootstepTime = now;
        this.playSfx('footstep', { volume: 0.5 });
    }
    
    /**
     * Play interact sound
     */
    playInteract() {
        this.playSfx('interact', { volume: 0.7 });
    }
    
    /**
     * Toggle mute
     */
    toggleMute() {
        this.muted = !this.muted;
        this.updateVolumes();
        return this.muted;
    }
    
    /**
     * Fallback SFX using Web Audio API (for missing sounds)
     */
    playFallbackSfx(key) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Different frequencies for different SFX
            if (key === 'footstep') {
                oscillator.frequency.value = 200;
                oscillator.type = 'sine';
            } else if (key === 'interact') {
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
            } else {
                oscillator.frequency.value = 400;
                oscillator.type = 'sine';
            }
            
            gainNode.gain.setValueAtTime(this.volumes.master * this.volumes.sfx * 0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            // Ignore audio errors
            console.warn('AudioManager: Fallback SFX failed', e);
        }
    }
    
    /**
     * Cleanup
     */
    destroy() {
        this.stopMusic();
        this.musicTracks.clear();
        this.sfxTracks.clear();
    }
}
