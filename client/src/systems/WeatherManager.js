/**
 * WeatherManager - Dynamic environmental effects system
 * Manages rain, fog, and snow effects based on player location
 */

export class WeatherManager {
    constructor(scene) {
        this.scene = scene;
        this.activeWeather = null;
        this.weatherEmitters = new Map();
        this.weatherOverlays = new Map();
        this.currentLocation = 'default';
    }

    /**
     * Set weather type for current location
     * @param {string} weatherType - 'rain', 'fog', 'snow', or 'clear'
     */
    setWeather(weatherType) {
        // Clear existing weather
        this.clearWeather();
        this.activeWeather = weatherType;

        switch (weatherType) {
            case 'rain':
                this.startRain();
                break;
            case 'fog':
                this.startFog();
                break;
            case 'snow':
                this.startSnow();
                break;
            case 'clear':
            default:
                break;
        }
    }

    /**
     * Update weather based on player position
     * @param {number} playerX - Player world X coordinate
     * @param {number} playerY - Player world Y coordinate
     */
    update(playerX, playerY) {
        // Determine location based on coordinates
        const location = this.determineLocation(playerX, playerY);
        this.currentLocation = location;

        // Check if weather should change
        const desiredWeather = this.getWeatherForLocation(location);
        if (desiredWeather !== this.activeWeather) {
            this.setWeather(desiredWeather);
        }
    }

    /**
     * Determine current location
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     */
    determineLocation(x, y) {
        // Staircase Zone [1900-2050, 1000-1250] - default (clear)
        if (x >= 1900 && x <= 2050 && y >= 1000 && y <= 1250) {
            return 'staircase';
        }
        // Pennyworth Lane [2000-2400, 2200-2800] - fog
        if (x >= 2000 && x <= 2400 && y >= 2200 && y <= 2800) {
            return 'pennyworth_lane';
        }
        // Lions Den [2800-3200, 2000-2400] - clear but tense
        if (x >= 2800 && x <= 3200 && y >= 2000 && y <= 2400) {
            return 'lions_den';
        }
        // School Zone [1400-1800, 1400-1800] - balanced
        if (x >= 1400 && x <= 1800 && y >= 1400 && y <= 1800) {
            return 'school';
        }
        // Harrow Residence [2000-2400, 2400-2800] - slightly darker
        if (x >= 2000 && x <= 2400 && y >= 2400 && y <= 2800) {
            return 'harrow_residence';
        }
        // Woods [1800, 2600+] - fog
        if (x >= 1800 && x <= 2400 && y >= 2600) {
            return 'woods';
        }

        return 'default';
    }

    /**
     * Get weather for specific location
     * @param {string} location - Location identifier
     */
    getWeatherForLocation(location) {
        const weatherMap = {
            staircase: 'clear',
            pennyworth_lane: 'fog',
            lions_den: 'clear',
            school: 'clear',
            harrow_residence: 'clear',
            woods: 'fog',
            default: 'clear'
        };
        return weatherMap[location] || 'clear';
    }

    startRain() {
        // Create rain drops
        for (let i = 0; i < 100; i++) {
            const drop = this.scene.add.rectangle(
                Math.random() * this.scene.scale.width,
                Math.random() * this.scene.scale.height,
                2, 8,
                0x6688cc
            );
            drop.setDepth(4000);
            drop.setScrollFactor(0);

            // Animate falling
            const duration = 500 + Math.random() * 500;
            this.scene.tweens.add({
                targets: drop,
                y: drop.y + this.scene.scale.height + 50,
                duration: duration,
                repeat: -1,
                onRepeat: () => {
                    drop.y = -50;
                }
            });
        }

        startFog() {
        // Create rolling fog particles
        if (!this.weatherEmitters.has('fog')) {
            const emitter = this.scene.add.particles('fog', 0, 0, {
                x: { min: 0, max: this.scene.scale.width },
                y: { min: 0, max: this.scene.scale.height },
                speedX: { min: 20, max: 40 },
                speedY: { min: -10, max: 10 },
                scale: { start: 0.5, end: 2 },
                alpha: { start: 0.1, end: 0.3 },
                lifespan: 8000,
                quantity: 100,
                tint: 0xcccccc
            });
            this.weatherEmitters.set('fog', emitter);
        }
    }

    startSnow() {
        // Create snowflakes
        for (let i = 0; i < 80; i++) {
            const flake = this.scene.add.rectangle(
                Math.random() * this.scene.scale.width,
                Math.random() * this.scene.scale.height,
                3, 3,
                0xffffff
            );
            flake.setDepth(3500);
            flake.setScrollFactor(0);

            // Animate falling
            const duration = 600 + Math.random() * 400;
            this.scene.tweens.add({
                targets: flake,
                y: flake.y + this.scene.scale.height + 50,
                duration: duration,
                repeat: -1,
                onRepeat: () => {
                    flake.y = -50;
                }
            });
        }
    }

    clearWeather() {
        // Stop all weather effects
        this.weatherEmitters.forEach((emitter, key) => {
            if (emitter) {
                emitter.stop();
                emitter.destroy();
            }
        });
        this.weatherEmitters.clear();

        // Clear weather overlay
        this.weatherOverlays.forEach((overlay, key) => {
            if (overlay) {
                overlay.destroy();
            }
        });
        this.weatherOverlays.clear();

        this.activeWeather = 'clear';
    }

    destroy() {
        this.clearWeather();
    }
}

export default WeatherManager;
