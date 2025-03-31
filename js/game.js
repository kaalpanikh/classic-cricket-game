/**
 * Core game logic for Nokia Cricket Cup game
 */

class CricketGame {
    constructor(scene, camera, models, physics) {
        this.scene = scene;
        this.camera = camera;
        this.models = models;
        this.physics = physics;
        
        // Game state
        this.state = {
            playing: false,
            paused: false,
            gameOver: false,
            waitingForBowl: true,
            ballInPlay: false,
            hitRegistered: false,    // Track if we've hit this ball
            swungBat: false,         // Track if bat was swung
            
            // Match settings
            maxOvers: 20,
            difficulty: 1, // 1-easy, 2-medium, 3-hard
            
            // Match stats
            runs: 0,
            wickets: 0,
            balls: 0,
            target: 0,
            battingTeam: true, // true = player batting, false = player bowling
            
            // Ball counting protection
            currentBallCounted: false,  // Flag to ensure we only count each ball once
            
            // New flag to track if initial message has been shown
            initialMessageShown: false
        };
        
        // DOM elements
        this.scoreElement = document.getElementById('score');
        this.oversElement = document.getElementById('overs');
        this.targetElement = document.getElementById('target');
        this.startButton = document.getElementById('start-button');
        this.restartButton = document.getElementById('restart-button');
        this.gameMessage = document.getElementById('game-message');
        this.resultMessage = document.getElementById('result-message');
        this.finalScore = document.getElementById('final-score');
        this.startScreen = document.getElementById('start-screen');
        this.endScreen = document.getElementById('end-screen');
        
        // Camera settings
        this.cameraTargetPosition = new THREE.Vector3(0, 3, 12);
        this.cameraLookAt = new THREE.Vector3(0, 0, 0);
        
        // Timing related variables for batting - SIMPLIFIED
        this.lastBowlTime = 0;
        this.playerSwung = false;
        
        // Animations
        this.animations = {
            bat: {
                swinging: false,
                targetRotation: 0,
                initialRotation: 0,
                durationMs: 300,
                startTime: 0
            },
            bowler: {
                bowling: false,
                targetPosition: null,
                initialPosition: null,
                durationMs: 1500,
                startTime: 0
            }
        };
        
        // Add keyboard listeners for easier batting
        this.setupKeyboardControls();
        
        // Event listeners
        this.setupEventListeners();
        
        console.log("Game initialization complete!");
        
        this.ballCounter = 0;
        this.dotBallTimer = null;
        
        // For disabling dot ball computation during ball bounce
        this.allowDotBallCheck = false;
        
        // Store the last scored runs
        this.lastScoredRuns = 0;
        
        // Detect if device is mobile
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    setupKeyboardControls() {
        // Add spacebar event listener for batting
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Space') {
                this.hitBall();
            }
        });
        
        console.log("Keyboard controls set up - Press SPACE to hit the ball");
    }
    
    setupEventListeners() {
        // Game event listeners
        EventBus.on('ballHit', (impactVelocity) => this.onBallHit(impactVelocity));
        EventBus.on('stumpsHit', () => this.onStumpsHit());
        EventBus.on('ballGrounded', (position) => this.onBallGrounded(position));
        
        // UI event listeners
        this.startButton.addEventListener('click', () => this.startGame());
        this.restartButton.addEventListener('click', () => this.restartGame());
    }
    
    startGame() {
        if (this.state.playing) return;
        
        try {
            // Reset game state
            this.resetGameState();
            
            // Hide start screen
            if (this.startScreen) this.startScreen.classList.add('hidden');
            
            console.log("Game started!");
            
            // Set up camera
            this.setCameraForGameStart();
            
            // IMPORTANT: Set up direct keyboard controls - using addEventListener EXACTLY like in simple.html
            // Remove any previous event listeners to prevent duplicates
            document.removeEventListener('keydown', this.keydownHandler);
            
            // Create a keydown handler specifically for this game instance
            this.keydownHandler = (event) => {
                if (event.code === 'Space') {
                    console.log("Space pressed - calling hitBall");
                    // Call hitBall directly - just like simple.html
                    this.hitBall();
                }
            };
            
            // Add the event listener
            document.addEventListener('keydown', this.keydownHandler);
            
            // Only show initial message on desktop
            this.showInitialMessage();
            
            // Start the game and bowl the first ball
            this.state.playing = true;
            setTimeout(() => this.bowlNextBall(), 2000);
        } catch (error) {
            console.error("Error starting game:", error);
            showGameMessage("Error starting game. Please refresh.", 5000);
        }
    }
    
    bowlNextBall() {
        if (!this.state.playing || this.state.paused || this.state.gameOver) return;
        
        try {
            // CRITICAL FIX: Prevent rapid re-bowling that causes scorecard issues
            if (Date.now() - this.lastBowlTime < 2000) {
                console.log("Preventing rapid re-bowl - ball already in play");
                return; // Don't allow re-bowling too quickly
            }
            
            // Increase ball counter for debugging
            this.ballCounter++;
            console.log(`Bowling ball #${this.ballCounter}`);
            
            // Clear any existing timers
            if (this.dotBallTimer) {
                clearTimeout(this.dotBallTimer);
                this.dotBallTimer = null;
            }
            
            // Reset ball position and physics
            const ballBody = this.physics.bodies.ball;
            const ballModel = this.models.getModel('ball');
            
            if (ballBody && ballModel) {
                // Reset position EXACTLY as in simple.html
                ballBody.position.set(0, 1, -5);
                ballModel.position.copy(ballBody.position);
                
                // Reset velocities and forces
                ballBody.velocity.set(0, 0, 0);
                ballBody.angularVelocity.set(0, 0, 0);
                ballBody.force.set(0, 0, 0);
                ballBody.torque.set(0, 0, 0);
                
                // Apply the EXACT velocity from simple.html
                ballBody.velocity.set(0, 2, 8);
                
                // Make sure it's awake
                ballBody.wakeUp();
                
                console.log(`Ball #${this.ballCounter} bowled with velocity:`, ballBody.velocity);
            }
            
            // Update game state
            this.state.waitingForBowl = false;
            this.state.ballInPlay = true;
            this.state.hitRegistered = false;
            this.state.swungBat = false;
            this.state.currentBallCounted = true; // Mark this ball as counted
            this.lastBowlTime = Date.now();
            
            // Update the ball counter
            this.state.balls++;
            
            // Update score display
            this.updateScoreDisplay();
            
            // 3. Final safety timer: If ball somehow stays in play too long, force next ball
            setTimeout(() => {
                if (this.state.ballInPlay) {
                    console.log("Safety timer: forcing next ball");
                    this.state.ballInPlay = false;
                    this.prepareForNextBall(2000); // Use helper function instead
                }
            }, 10000); // 10 seconds max for any ball
            
        } catch (error) {
            console.error(`Error bowling ball #${this.ballCounter}:`, error);
            this.prepareForNextBall(2000); // Use helper function instead
        }
    }
    
    // Helper function to prepare for next ball without double-counting
    prepareForNextBall(delay) {
        // Reset ball counting flag to prevent multiple counts
        this.state.currentBallCounted = false;
        setTimeout(() => this.bowlNextBall(), delay);
    }
    
    hitBall() {
        if (!this.state.playing || this.state.paused || this.state.gameOver) return;
        
        console.log("Player attempting to hit ball");
        
        // Get ball position
        const ballBody = this.physics.bodies.ball;
        if (!ballBody) return;
        
        // Get current ball position
        const ballPos = ballBody.position;
        console.log("Ball position at hit attempt:", ballPos.x, ballPos.y, ballPos.z);
        
        // Animate the bat immediately for responsiveness regardless of hit outcome
        this.animateBatSwing();
        
        // Always mark that the player swung the bat
        this.state.swungBat = true;
        
        // Track if a boundary was hit for reporting
        let boundaryHit = false;
        let boundaryType = "";
        
        // IMPROVED: Widened hit detection window for easier batting with SKILL-BASED SCORING!
        if (ballPos.z > 2 && ballPos.z < 7) {
            console.log("SUCCESSFUL HIT!");
            
            // Mark as hit
            this.state.hitRegistered = true;
            
            // COMPLETELY FIXED SCORING SYSTEM:
            // 1. Determine hit quality based on timing
            let hitQuality = "regular";
            
            // Perfect timing gives more runs (Z position around 4-5 is ideal)
            if (ballPos.z >= 4 && ballPos.z <= 5) {
                // Perfect timing
                hitQuality = "perfect";
                console.log("Perfect timing!");
            } else if ((ballPos.z > 3 && ballPos.z < 4) || (ballPos.z > 5 && ballPos.z < 6)) {
                // Good timing
                hitQuality = "good";
                console.log("Good timing!");
            } else {
                // OK timing
                hitQuality = "regular";
                console.log("OK timing");
            }
            
            // 2. Apply force to ball based on hit quality
            let upwardVelocity = 0;
            let forwardVelocity = 0;
            
            switch (hitQuality) {
                case "perfect":
                    // Perfect hit - high and fast (likely SIX)
                    upwardVelocity = 10;
                    forwardVelocity = -20;
                    boundaryHit = true;
                    boundaryType = "SIX!";
                    break;
                    
                case "good":
                    // Good hit - medium height, good speed (likely FOUR)
                    upwardVelocity = 8;
                    forwardVelocity = -18;
                    boundaryHit = true;
                    boundaryType = "FOUR!";
                    break;
                    
                default:
                    // Regular hit - lower trajectory (ONE RUN)
                    upwardVelocity = 6;
                    forwardVelocity = -15;
                    boundaryHit = false;
                    boundaryType = "ONE RUN!";
            }
            
            // 3. Apply the appropriate physics based on hit quality (no randomness)
            ballBody.velocity.set(
                Math.random() * 6 - 3,  // Some random x direction variation
                upwardVelocity,         // Determined by hit quality
                forwardVelocity         // Determined by hit quality
            );
            
            // Ensure forces are applied
            ballBody.wakeUp();
            
            // 4. Score the run based on hit quality (GUARANTEED, not random)
            let runs = 0;
            let runMessage = "";
            
            if (hitQuality === "perfect") {
                runs = 6;
                runMessage = "SIX!";
            } else if (hitQuality === "good") {
                runs = 4;
                runMessage = "FOUR!";
            } else {
                runs = 1;
                runMessage = "ONE RUN!";
            }
            
            // Store the runs for this hit
            this.lastScoredRuns = runs;
            
            // TIMING IMPROVEMENT: Extended delay for run messages so they don't overlap
            setTimeout(() => {
                // Update game state with ACTUAL runs based on hit quality
                this.state.runs += runs;
                this.updateScoreDisplay();
                
                // Log the actual runs added
                console.log(`Added ${runs} runs to scorecard. New total: ${this.state.runs}`);
                
                // Show run message with REDUCED duration (1000ms instead of 2500ms)
                showGameMessage(runMessage, 1000);
            }, 1000); // Reduced from 1500ms to 1000ms
            
            // Set ball as no longer in play
            this.state.ballInPlay = false;
            
            // TIMING IMPROVEMENT: Longer delay before next ball for better pacing
            this.prepareForNextBall(3000); // Reduced from 4000ms to 3000ms
        } else {
            // Missed the ball
            console.log("Missed! Ball Z position:", ballPos.z);
            
            // CRITICAL FIX: Only register miss if within reasonable distance
            // This prevents "Missed" messages when clicking far from the ball
            if (ballPos.z > -2 && ballPos.z < 10) {
                // Set a timer to bowl the next ball after a miss
                setTimeout(() => {
                    // Only bowl next ball if still in play
                    if (this.state.ballInPlay) {
                        this.state.ballInPlay = false;
                        this.prepareForNextBall(3000);
                    }
                }, 3000);
            }
        }
    }
    
    animateBatSwing() {
        const bat = this.models.getModel('bat');
        if (!bat) return;
        
        // Store original rotation
        const originalRotation = bat.rotation.x;
        
        // Swing down immediately
        bat.rotation.x = -Math.PI / 2;
        
        // Return to original position after short delay
        setTimeout(() => {
            if (bat) bat.rotation.x = originalRotation;
        }, 300);
    }
    
    update(time) {
        if (!this.state.playing || this.state.paused) return;
        
        // Update physics world
        this.physics.update(time);
        
        if (this.state.ballInPlay) {
            // Get current ball position
            const ballModel = this.models.getModel('ball');
            const ballBody = this.physics.bodies.ball;
            
            if (ballModel && ballBody) {
                // Update ball model to match physics
                ballModel.position.copy(ballBody.position);
                
                // Check if ball is well out of bounds
                if (ballBody.position.z > 30 || ballBody.position.y < -10 || ballBody.position.z < -20) {
                    if (this.state.ballInPlay) {
                        console.log(`Ball #${this.ballCounter} out of bounds at position:`, ballBody.position);
                        this.state.ballInPlay = false;
                        
                        // If player didn't hit the ball, bowl next ball
                        if (!this.state.hitRegistered) {
                            // Ball went out without being hit
                            this.prepareForNextBall(3000);
                        }
                    }
                }
                
                // Update camera to follow the ball
                this.updateCamera(ballBody.position);
            }
        }
    }
    
    onBallHit(impactVelocity) {
        // Ball has been hit via physics collision
        if (!this.playerSwung) return;
        
        // Show hit message
        showGameMessage("Ball hit!", 1000);
        
        // Start camera follow for the ball
        this.setCameraToFollowBall();
    }
    
    onStumpsHit() {
        // Ball hit the stumps
        if (!this.state.ballInPlay) return;
        
        // Update wickets
        this.state.wickets++;
        this.state.ballInPlay = false;
        
        // Show message
        showGameMessage("OUT! BOWLED!", 2000);
        
        // Check if all wickets are out (10 wickets)
        if (this.state.wickets >= 10) {
            // End game
            this.endGame(this.state.runs >= this.state.target);
        } else {
            // Prepare for next delivery
            setTimeout(() => this.bowlNextBall(), 2000);
        }
        
        // Update score display
        this.updateScoreDisplay();
    }
    
    onBallGrounded(position) {
        if (!this.state.ballInPlay) return;
        
        // Check if it's a boundary
        const distanceFromCenter = Math.sqrt(position.x * position.x + position.z * position.z);
        
        if (distanceFromCenter > 60) {
            // It's a boundary
            const isSix = position.y > 1; // If the ball is still high enough, it's a six
            
            // Add runs
            this.state.runs += isSix ? 6 : 4;
            
            // Show message
            showGameMessage(isSix ? "SIX!" : "FOUR!", 2000);
            
            // End the ball
            this.state.ballInPlay = false;
            
            // Check if target achieved
            if (this.state.runs >= this.state.target) {
                this.endGame(true);
            } else {
                // Prepare for next delivery
                setTimeout(() => this.bowlNextBall(), 2000);
            }
        } else if (!this.playerSwung) {
            // Ball grounded without being hit
            this.state.ballInPlay = false;
            setTimeout(() => this.bowlNextBall(), 2000);
        } else {
            // Ball was hit and grounded inside the boundary
            
            // Calculate runs based on distance - SIMPLIFIED to always give at least 1 run
            const runDistance = Math.max(1, Math.min(Math.floor(distanceFromCenter / 15), 3));
            this.state.runs += runDistance;
            
            // Show message
            showGameMessage(runDistance > 1 ? `${runDistance} RUNS!` : "1 RUN!", 1000);
            
            // End the ball
            this.state.ballInPlay = false;
            
            // Check if target achieved
            if (this.state.runs >= this.state.target) {
                this.endGame(true);
            } else {
                // Prepare for next delivery
                setTimeout(() => this.bowlNextBall(), 2000);
            }
        }
        
        // Update score display
        this.updateScoreDisplay();
    }
    
    updateScoreDisplay() {
        // Only update the score element now
        this.scoreElement.textContent = `${this.state.runs}/${this.state.wickets}`;
    }
    
    setCameraToBattingView() {
        // Position camera behind and slightly to the side of the batsman for better visibility
        this.cameraTargetPosition = new THREE.Vector3(3, 2, 10);
        this.cameraLookAt = new THREE.Vector3(0, 1, 0);
    }
    
    setCameraToFollowBall() {
        // Camera will dynamically follow the ball in the update method
        this.cameraTargetPosition = null;
    }
    
    resetBatAndBowlerPositions() {
        // Reset bat position
        const bat = this.models.getModel('bat');
        if (bat) {
            bat.rotation.x = Math.PI / 4;
            bat.position.set(0, 0.5, 6.5);
        }
        
        // Reset bowler position
        const bowler = this.models.getModel('bowler');
        if (bowler) {
            bowler.position.set(0, 0, -7);
        }
        
        // Reset animations
        this.animations.bat.swinging = false;
        this.animations.bowler.bowling = false;
    }
    
    updateCamera(ballPosition) {
        // If we're following the ball
        if (this.cameraTargetPosition === null && this.state.ballInPlay) {
            const ball = this.models.getModel('ball');
            if (ball) {
                // Position camera behind and slightly above the ball
                const ballPos = ball.position;
                
                // Enhanced camera following - smoother and better angle
                const cameraOffset = new THREE.Vector3(-5, 3, -5);
                this.camera.position.lerp(new THREE.Vector3(
                    ballPos.x + cameraOffset.x,
                    ballPos.y + cameraOffset.y,
                    ballPos.z + cameraOffset.z
                ), 2 * 0.016); // 0.016 is the default deltaTime
                
                this.camera.lookAt(ballPos);
            }
        } 
        // If we have a fixed camera position target
        else if (this.cameraTargetPosition) {
            // Smoothly move camera to target position
            this.camera.position.lerp(this.cameraTargetPosition, 2 * 0.016); // 0.016 is the default deltaTime
            
            // Look at target
            const lookAtVector = new THREE.Vector3();
            lookAtVector.lerp(this.cameraLookAt, 2 * 0.016); // 0.016 is the default deltaTime
            this.camera.lookAt(lookAtVector);
        }
    }
    
    // Easing function for smoother animations
    easeOutQuad(t) {
        return t * (2 - t);
    }
    
    // Additional easing functions for animation variety
    easeInQuad(t) {
        return t * t;
    }
    
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
    
    resetGameState() {
        console.log("Resetting game state");
        
        // Hide screens
        if (this.startScreen) this.startScreen.classList.add('hidden');
        if (this.endScreen) this.endScreen.classList.add('hidden');
        
        // Reset game state
        this.state.playing = false;
        this.state.paused = false;
        this.state.gameOver = false;
        this.state.waitingForBowl = false;
        this.state.ballInPlay = false;
        this.state.runs = 0;
        this.state.wickets = 0;
        this.state.balls = 0;
        
        // Generate target score (random between 120-180)
        this.state.target = Math.floor(Math.random() * (180 - 120 + 1)) + 120;
        if (this.targetElement) this.targetElement.textContent = this.state.target;
        
        // Update UI
        this.updateScoreDisplay();
        
        // Reset ball and players
        this.resetBatAndBowlerPositions();
        
        // Reset timing variables
        this.lastBowlTime = 0;
        this.playerSwung = false;
        
        this.ballCounter = 0;
        this.dotBallTimer = null;
        
        // Reset initial message shown flag
        this.state.initialMessageShown = false;
    }
    
    setCameraForGameStart() {
        console.log("Setting up camera for game start");
        
        // Position the camera for a good batting view
        this.cameraTargetPosition = new THREE.Vector3(0, 3, 12);
        this.cameraLookAt = new THREE.Vector3(0, 0, 0);
        
        // Apply the position immediately
        this.camera.position.copy(this.cameraTargetPosition);
        this.camera.lookAt(this.cameraLookAt);
    }
    
    restartGame() {
        // Hide end screen
        this.endScreen.classList.add('hidden');
        
        // Reset game state and start again
        this.startGame();
    }
    
    pauseGame() {
        if (this.state.playing && !this.state.paused) {
            this.state.paused = true;
        }
    }
    
    resumeGame() {
        if (this.state.playing && this.state.paused) {
            this.state.paused = false;
        }
    }
    
    endGame(playerWon) {
        this.state.playing = false;
        this.state.gameOver = true;
        
        // Update UI with final results
        this.finalScore.textContent = `Final Score: ${this.state.runs}/${this.state.wickets} (${formatOvers(this.state.balls)})`;
        
        if (playerWon) {
            this.resultMessage.textContent = 'You Won!';
        } else {
            this.resultMessage.textContent = 'You Lost!';
        }
        
        // Show end screen
        this.endScreen.classList.remove('hidden');
    }
    
    // Show the initial message only on desktop and only once
    showInitialMessage() {
        // Only show on desktop and only if not shown before
        if (!this.isMobile && !this.state.initialMessageShown) {
            showGameMessage("Press SPACE when ball is close!", 2000);
            this.state.initialMessageShown = true;
            console.log("Showing initial desktop message");
        }
    }
}
