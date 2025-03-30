/**
 * Utility functions for Nokia Cricket Cup game
 */

// Random number generator between min and max (inclusive)
function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Convert degrees to radians
function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}

// Lerp function for smooth animations
function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

// Clamp value between min and max
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Format overs (e.g., 1.3 for 1 over and 3 balls)
function formatOvers(balls) {
    const overs = Math.floor(balls / 6);
    const remainingBalls = balls % 6;
    return `${overs}.${remainingBalls}`;
}

// Show game message
function showGameMessage(message, duration = 2000) {
    const messageElement = document.getElementById('game-message');
    messageElement.textContent = message;
    messageElement.classList.remove('hidden');
    
    setTimeout(() => {
        messageElement.classList.add('hidden');
    }, duration);
}

// Asset loader with progress tracking
class AssetLoader {
    constructor() {
        try {
            this.loadingManager = new THREE.LoadingManager();
            this.textureLoader = new THREE.TextureLoader(this.loadingManager);
            
            // Only create audio loader if Audio exists in THREE
            if (THREE.AudioLoader) {
                this.audioLoader = new THREE.AudioLoader(this.loadingManager);
            } else {
                console.warn('THREE.AudioLoader not available');
            }
            
            this.progressElement = document.getElementById('loading-progress');
            this.loadingScreen = document.getElementById('loading-screen');
            
            if (this.loadingManager) {
                this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
                    const progress = Math.floor((itemsLoaded / itemsTotal) * 100);
                    if (this.progressElement) {
                        this.progressElement.textContent = `Loading: ${progress}%`;
                    }
                };
                
                this.loadingManager.onLoad = () => {
                    setTimeout(() => {
                        if (this.loadingScreen) {
                            this.loadingScreen.classList.add('hidden');
                        }
                    }, 1000);
                };
                
                // Add error handler
                this.loadingManager.onError = (url) => {
                    console.error('Error loading asset:', url);
                    // Continue anyway
                    if (this.loadingScreen) {
                        this.loadingScreen.classList.add('hidden');
                    }
                };
            }
        } catch (error) {
            console.error('Error initializing AssetLoader:', error);
            // Make sure loading screen is hidden even if there's an error
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
            }
        }
    }
    
    loadTexture(path) {
        try {
            if (this.textureLoader && path) {
                return this.textureLoader.load(path);
            }
            return null;
        } catch (error) {
            console.error('Error loading texture:', error);
            return null;
        }
    }
    
    loadAudio(path, listener, callback) {
        try {
            if (this.audioLoader && path) {
                this.audioLoader.load(path, (buffer) => {
                    try {
                        if (THREE.Audio && listener) {
                            const sound = new THREE.Audio(listener);
                            sound.setBuffer(buffer);
                            if (callback) callback(sound);
                            return sound;
                        }
                    } catch (error) {
                        console.error('Error setting up audio:', error);
                    }
                    if (callback) callback(null);
                    return null;
                });
            } else if (callback) {
                callback(null);
            }
        } catch (error) {
            console.error('Error loading audio:', error);
            if (callback) callback(null);
        }
    }
}

// Device detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Handle visibility change to pause/resume game
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.gameInstance) {
        window.gameInstance.pauseGame();
    } else if (!document.hidden && window.gameInstance) {
        window.gameInstance.resumeGame();
    }
});

// Simple event system
class EventEmitter {
    constructor() {
        this.events = {};
    }
    
    on(event, listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }
    
    off(event, listener) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(l => l !== listener);
    }
    
    emit(event, ...args) {
        if (!this.events[event]) return;
        this.events[event].forEach(listener => listener(...args));
    }
}

// Global event bus
const EventBus = new EventEmitter();
