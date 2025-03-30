/**
 * Input control system for Nokia Cricket Cup game
 */

class Controls {
    constructor(game) {
        this.game = game;
        this.keysPressed = {};
        this.touchActive = false;
        
        // DOM elements
        this.hitButton = document.getElementById('hit-button');
        this.mobileControls = document.getElementById('mobile-controls');
        
        // Initialize controls based on device
        this.initControls();
    }
    
    initControls() {
        // Set up keyboard controls for desktop
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // Set up touch controls for mobile
        if (isMobile) {
            this.showMobileControls();
        }
        
        // Add event listeners to mobile controls
        this.hitButton.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.hitButton.addEventListener('touchend', (e) => this.onTouchEnd(e));
        
        // Also support mouse clicks for testing on desktop
        this.hitButton.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.hitButton.addEventListener('mouseup', (e) => this.onMouseUp(e));
    }
    
    showMobileControls() {
        this.mobileControls.classList.remove('hidden');
    }
    
    hideMobileControls() {
        this.mobileControls.classList.add('hidden');
    }
    
    onKeyDown(event) {
        // Store key state
        this.keysPressed[event.code] = true;
        
        // Handle space bar press for batting
        if (event.code === 'Space' && !event.repeat) {
            this.game.hitBall(); 
        }
        
        // Handle arrow keys for direction 
        if (event.code === 'ArrowLeft' && !event.repeat) {
            this.game.hitBall(-1); 
        } else if (event.code === 'ArrowRight' && !event.repeat) {
            this.game.hitBall(1); 
        }
    }
    
    onKeyUp(event) {
        // Clear key state
        this.keysPressed[event.code] = false;
    }
    
    onTouchStart(event) {
        event.preventDefault();
        if (!this.touchActive) {
            this.touchActive = true;
            this.game.hitBall();
        }
    }
    
    onTouchEnd(event) {
        event.preventDefault();
        this.touchActive = false;
    }
    
    onMouseDown(event) {
        if (!this.touchActive) {
            this.touchActive = true;
            this.game.hitBall();
        }
    }
    
    onMouseUp(event) {
        this.touchActive = false;
    }
    
    // Method to add directional swipe support (can be implemented for advanced control)
    addSwipeControls() {
        let touchStartX = 0;
        let touchStartY = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, false);
        
        document.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;
            
            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;
            
            // Check if it's a horizontal swipe
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 30) {
                // Determine direction: negative = left, positive = right
                const direction = diffX > 0 ? 1 : -1;
                this.game.hitBall(direction);
            } else if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 30) {
                // Vertical swipe - could be used for different shot types
                const direction = diffY > 0 ? -0.5 : 0.5; // Down = defensive, Up = aggressive
                this.game.hitBall(0, direction);
            } else {
                // Simple tap - normal shot
                this.game.hitBall(0);
            }
        }, false);
    }
    
    update() {
        // This method can be used for continuous input handling if needed
    }
}
