/**
 * Main entry point for Nokia Cricket Cup game
 */

// Main game class that sets up and manages the game loop
class Main {
    constructor() {
        try {
            console.log("Initializing Nokia Cricket Cup game...");
            
            // Initial check for required dependencies
            if (typeof THREE === 'undefined') {
                throw new Error("THREE.js library not loaded");
            }
            if (typeof CANNON === 'undefined') {
                throw new Error("CANNON.js library not loaded");
            }
            
            // Set up Three.js scene, renderer, and camera
            this.setupThree();
            console.log("Three.js setup complete");
            
            // Initialize asset loader with delayed execution to ensure DOM is ready
            setTimeout(() => {
                try {
                    // Initialize asset loader
                    this.assetLoader = new AssetLoader();
                    console.log("Asset loader initialized");
                    
                    // Create models
                    this.models = new Models(this.scene, this.assetLoader);
                    this.models.loadAll();
                    console.log("3D models created");
                    
                    // Set up physics
                    this.physics = new Physics(this.models);
                    this.physics.setupPhysics();
                    console.log("Physics engine initialized");
                    
                    // Initialize the game
                    this.game = new CricketGame(this.scene, this.camera, this.models, this.physics);
                    console.log("Game logic initialized");
                    
                    // Set up controls
                    this.controls = new Controls(this.game);
                    console.log("Controls initialized");
                    
                    // Store game instance in window for access by other modules
                    window.gameInstance = this.game;
                    
                    // Start the game loop
                    this.lastTime = 0;
                    this.animate();
                    console.log("Game loop started");
                    
                    // Handle window resize
                    window.addEventListener('resize', () => this.onWindowResize(), false);
                    
                    // Hide loading screen
                    const loadingScreen = document.getElementById('loading-screen');
                    if (loadingScreen) {
                        loadingScreen.classList.add('hidden');
                    }
                    
                    console.log("Game initialization complete!");
                } catch (error) {
                    console.error("Error during delayed initialization:", error);
                    this.displayErrorMessage("Failed during game setup: " + (error.message || "Unknown error"));
                }
            }, 500); // Short delay to ensure DOM is ready
            
        } catch (error) {
            console.error("Critical error during game initialization:", error);
            this.displayErrorMessage("Critical error: " + (error.message || "Unknown error"));
        }
    }
    
    displayErrorMessage(message) {
        // Create an error overlay for user
        const errorDiv = document.createElement('div');
        errorDiv.style.position = 'fixed';
        errorDiv.style.top = '50%';
        errorDiv.style.left = '50%';
        errorDiv.style.transform = 'translate(-50%, -50%)';
        errorDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        errorDiv.style.color = 'white';
        errorDiv.style.padding = '20px';
        errorDiv.style.borderRadius = '10px';
        errorDiv.style.zIndex = '9999';
        errorDiv.style.textAlign = 'center';
        errorDiv.style.maxWidth = '80%';
        errorDiv.innerHTML = `
            <h2>Game Error</h2>
            <p>${message}</p>
            <p>Please try the <a href="simple.html" style="color: #4CAF50;">simplified version</a> or <a href="debug.html" style="color: #4CAF50;">debug mode</a>.</p>
            <button id="refresh-button" style="background: #4CAF50; border: none; color: white; padding: 10px 20px; margin-top: 15px; border-radius: 5px; cursor: pointer;">Refresh Page</button>
        `;
        document.body.appendChild(errorDiv);
        
        // Add event listener to refresh button
        const refreshButton = errorDiv.querySelector('#refresh-button');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                window.location.reload();
            });
        }
        
        // Hide loading screen if visible
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }
    
    setupThree() {
        try {
            // Create scene
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
            
            // Create camera
            this.camera = new THREE.PerspectiveCamera(
                75, // Field of view
                window.innerWidth / window.innerHeight, // Aspect ratio
                0.1, // Near clipping plane
                1000 // Far clipping plane
            );
            this.camera.position.set(0, 5, 15);
            this.camera.lookAt(0, 0, 0);
            
            // Create renderer
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            
            const container = document.getElementById('game-container');
            if (!container) {
                throw new Error("Game container element not found");
            }
            container.appendChild(this.renderer.domElement);
            
            // Set up lights
            this.setupLights();
            
        } catch (error) {
            console.error("Error in setupThree:", error);
            throw error; // Re-throw to be caught by the constructor
        }
    }
    
    setupLights() {
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        // Add directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        
        // Optimize shadow settings
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        
        this.scene.add(directionalLight);
        
        // Add hemisphere light for better ambient lighting
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x458B00, 0.4);
        this.scene.add(hemisphereLight);
    }
    
    onWindowResize() {
        // Update camera aspect ratio and projection matrix
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        
        // Update renderer size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate(currentTime = 0) {
        try {
            requestAnimationFrame((time) => this.animate(time));
            
            // Calculate delta time in seconds
            const deltaTime = (currentTime - this.lastTime) / 1000;
            this.lastTime = currentTime;
            
            // Skip first frame where deltaTime could be very large
            if (deltaTime > 0.1) return;
            
            // Update game logic
            if (this.game) {
                this.game.update(deltaTime);
            }
            
            // Update controls
            if (this.controls) {
                this.controls.update();
            }
            
            // Render the scene
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
        } catch (error) {
            console.error("Error in animation loop:", error);
            // Don't throw here to avoid crashing the animation loop
        }
    }
}

// Initialize the game when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log("DOM loaded, checking WebGL support...");
        // Check if WebGL is available
        if (!window.WEBGL.isWebGLAvailable()) {
            console.error("WebGL not available");
            const warning = window.WEBGL.getWebGLErrorMessage();
            document.getElementById('game-container').appendChild(warning);
            
            // Hide loading screen if visible
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
            }
        } else {
            console.log("WebGL is available, initializing game...");
            // Hide loading screen after 5 seconds regardless, as a fallback
            setTimeout(() => {
                const loadingScreen = document.getElementById('loading-screen');
                if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
                    console.warn("Forcing loading screen to hide after timeout");
                    loadingScreen.classList.add('hidden');
                }
            }, 5000);
            
            // Initialize the game
            new Main();
        }
    } catch (error) {
        console.error("Fatal error during initialization:", error);
        alert("An error occurred while starting the game: " + error.message);
        
        // Hide loading screen if visible
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }
});
