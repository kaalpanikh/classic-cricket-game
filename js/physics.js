/**
 * Physics implementation using Cannon.js for Nokia Cricket Cup game
 */

class Physics {
    constructor(models) {
        try {
            this.models = models;
            this.bodies = {};
            
            console.log("Initializing Cannon.js physics...");
            
            // Initialize the physics world with modified settings
            this.world = new CANNON.World();
            this.world.gravity.set(0, -7.5, 0); // Reduced gravity for better ball movement
            this.world.broadphase = new CANNON.SAPBroadphase(this.world);
            this.world.solver.iterations = 10; // Increase solver iterations for better stability
            this.world.defaultContactMaterial.friction = 0.1; // Lower default friction
            this.world.defaultContactMaterial.restitution = 0.7; // Higher default bounce
            this.world.allowSleep = false; // Don't allow objects to sleep to prevent ball stopping
            
            // Ball physics properties - increased mass slightly for momentum
            this.ballRadius = 0.12;
            this.ballMass = 0.2; // Increased from 0.15 for better momentum
            
            // Bat physics properties
            this.batMass = 1.2;
            
            // Material properties
            this.createMaterials();
            
            console.log("Physics world initialized successfully with modified settings");
        } catch (error) {
            console.error("Error initializing physics:", error);
            throw new Error("Failed to initialize physics engine: " + error.message);
        }
    }
    
    createMaterials() {
        try {
            // Create materials for different objects
            this.groundMaterial = new CANNON.Material('groundMaterial');
            this.ballMaterial = new CANNON.Material('ballMaterial');
            this.batMaterial = new CANNON.Material('batMaterial');
            this.stumpsMaterial = new CANNON.Material('stumpsMaterial');
            
            // Define contact behaviors between materials - ADJUSTED for proper bounce
            const ballGroundContact = new CANNON.ContactMaterial(
                this.ballMaterial,
                this.groundMaterial,
                {
                    friction: 0.1,  // Lower friction
                    restitution: 0.8 // Higher bounciness to match simple version
                }
            );
            
            const ballBatContact = new CANNON.ContactMaterial(
                this.ballMaterial,
                this.batMaterial,
                {
                    friction: 0.1,
                    restitution: 0.9 // Higher restitution for more responsive batting
                }
            );
            
            const ballStumpsContact = new CANNON.ContactMaterial(
                this.ballMaterial,
                this.stumpsMaterial,
                {
                    friction: 0.1,
                    restitution: 0.5
                }
            );
            
            // Add contact materials to the world
            this.world.addContactMaterial(ballGroundContact);
            this.world.addContactMaterial(ballBatContact);
            this.world.addContactMaterial(ballStumpsContact);
            
            console.log("Physics materials created successfully");
        } catch (error) {
            console.error("Error creating physics materials:", error);
            throw new Error("Failed to create physics materials: " + error.message);
        }
    }
    
    setupPhysics() {
        this.createGround();
        this.createBall();
        this.createBat();
        this.createStumps();
    }
    
    createGround() {
        // Create a static ground plane
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({
            mass: 0, // Static body
            material: this.groundMaterial
        });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.addBody(groundBody);
        this.bodies.ground = groundBody;
    }
    
    createBall() {
        // Create a dynamic ball with optimized properties for cricket physics
        const ballShape = new CANNON.Sphere(this.ballRadius);
        const ballBody = new CANNON.Body({
            mass: this.ballMass,
            material: this.ballMaterial,
            linearDamping: 0.01, // Minimal air resistance to maintain momentum
            angularDamping: 0.01  // Allow the ball to spin naturally
        });
        ballBody.addShape(ballShape);
        ballBody.position.set(0, 0.5, -7);
        
        // Add ball body to the world
        this.world.addBody(ballBody);
        this.bodies.ball = ballBody;
        
        // Set up collision detection with the ball
        ballBody.addEventListener('collide', (e) => {
            const contact = e.contact;
            
            // Determine what the ball collided with
            if (e.body === this.bodies.bat) {
                // Ball hit the bat
                EventBus.emit('ballHit', contact.getImpactVelocityAlongNormal());
            } else if (e.body === this.bodies.stumps) {
                // Ball hit the stumps
                EventBus.emit('stumpsHit');
            } else if (e.body === this.bodies.ground) {
                // Ball hit the ground
                const position = new THREE.Vector3(
                    ballBody.position.x,
                    ballBody.position.y,
                    ballBody.position.z
                );
                EventBus.emit('ballGrounded', position);
            }
        });
    }
    
    createBat() {
        // Create a kinematic bat body (controlled by the player, not affected by physics)
        const batShape = new CANNON.Box(new CANNON.Vec3(0.1, 0.025, 0.4));
        const batBody = new CANNON.Body({
            mass: this.batMass,
            material: this.batMaterial,
            type: CANNON.Body.KINEMATIC
        });
        batBody.addShape(batShape);
        batBody.position.set(0, 0.5, 6.5);
        
        // Add bat body to the world
        this.world.addBody(batBody);
        this.bodies.bat = batBody;
    }
    
    createStumps() {
        // Create a static stumps body
        const stumpsShape = new CANNON.Box(new CANNON.Vec3(0.3, 0.35, 0.05));
        const stumpsBody = new CANNON.Body({
            mass: 0, // Static body
            material: this.stumpsMaterial
        });
        stumpsBody.addShape(stumpsShape);
        stumpsBody.position.set(0, 0.35, 7);
        
        // Add stumps body to the world
        this.world.addBody(stumpsBody);
        this.bodies.stumps = stumpsBody;
    }
    
    // Update physics world and sync with visual models
    update(deltaTime) {
        try {
            // Step the physics world
            this.world.step(1/60, deltaTime, 3);
            
            // Sync ball position
            if (this.bodies.ball && this.models.getModel('ball')) {
                const ballPosition = this.bodies.ball.position;
                const ballModel = this.models.getModel('ball');
                
                ballModel.position.set(
                    ballPosition.x,
                    ballPosition.y,
                    ballPosition.z
                );
                
                // Also update ball rotation
                const ballQuaternion = this.bodies.ball.quaternion;
                ballModel.quaternion.set(
                    ballQuaternion.x,
                    ballQuaternion.y,
                    ballQuaternion.z,
                    ballQuaternion.w
                );
            }
        } catch (error) {
            console.error("Error updating physics:", error);
            throw new Error("Failed to update physics engine: " + error.message);
        }
    }
    
    // Method to reset the ball position for a new delivery
    resetBallPosition() {
        try {
            if (this.bodies.ball) {
                this.bodies.ball.position.set(0, 0.5, -7);
                this.bodies.ball.velocity.set(0, 0, 0);
                this.bodies.ball.angularVelocity.set(0, 0, 0);
                this.bodies.ball.force.set(0, 0, 0);
                this.bodies.ball.torque.set(0, 0, 0);
            }
        } catch (error) {
            console.error("Error resetting ball position:", error);
            throw new Error("Failed to reset ball position: " + error.message);
        }
    }
    
    // Method to bowl the ball with simplified and reliable physics
    bowlBall(difficulty = 1) {
        try {
            if (this.bodies.ball) {
                console.log("Bowling ball with simplified and reliable physics");
                
                // Reset the ball to a consistent starting position
                this.bodies.ball.position.set(0, 1, -5); // Exact same starting position as simple.html
                
                // Clear all existing movement/forces
                this.bodies.ball.velocity.setZero();
                this.bodies.ball.angularVelocity.setZero();
                this.bodies.ball.force.setZero();
                this.bodies.ball.torque.setZero();
                
                // CRITICAL FIX: Apply the exact same velocity values from the working simple.html
                // These values are known to work reliably
                this.bodies.ball.velocity.set(0, 2, 8);
                
                // Enable motion
                this.bodies.ball.wakeUp();
                
                // Log the launch parameters for debugging
                console.log("Ball position:", this.bodies.ball.position);
                console.log("Ball velocity:", this.bodies.ball.velocity);
                
                // Schedule a check to verify the ball is moving properly
                setTimeout(() => {
                    console.log("Ball position after 0.5s:", this.bodies.ball.position);
                    console.log("Ball velocity after 0.5s:", this.bodies.ball.velocity);
                }, 500);
            }
        } catch (error) {
            console.error("Error bowling ball:", error);
            throw new Error("Failed to bowl ball: " + error.message);
        }
    }
    
    // Method to hit the ball with the bat
    swingBat(power = 1, timing = 0, direction = 0) {
        try {
            // Get the ball's current velocity
            const ballVelocity = this.bodies.ball.velocity.clone();
            
            // Calculate power factor (0-1 range)
            const powerFactor = clamp(power, 0.5, 1.5);
            
            // Calculate timing factor (-1 to 1 range, 0 is perfect)
            // Negative timing means early, positive means late
            const timingFactor = clamp(timing, -1, 1);
            
            // Calculate direction factor (-1 to 1 range, 0 is straight)
            // Negative direction means left, positive means right
            const directionFactor = clamp(direction, -1, 1);
            
            // Calculate new velocity components
            const speedZ = -ballVelocity.z * powerFactor * (1 - Math.abs(timingFactor) * 0.5);
            const speedY = 5 * powerFactor; // Upward component
            const speedX = 10 * directionFactor * powerFactor + (timingFactor * 5);
            
            // Apply the new velocity to the ball
            this.bodies.ball.velocity.set(speedX, speedY, speedZ);
            
            // Apply some spin based on timing and direction
            this.bodies.ball.angularVelocity.set(
                timingFactor * 5,
                directionFactor * 3,
                powerFactor * 2
            );
            
            return {
                power: powerFactor,
                timing: timingFactor,
                direction: directionFactor
            };
        } catch (error) {
            console.error("Error swinging bat:", error);
            throw new Error("Failed to swing bat: " + error.message);
        }
    }
    
    // Method to check if the ball is in hitting range
    isBallInHittingRange() {
        try {
            if (this.bodies.ball) {
                const ballZ = this.bodies.ball.position.z;
                return ballZ > 5 && ballZ < 6.5;
            }
            return false;
        } catch (error) {
            console.error("Error checking ball hitting range:", error);
            throw new Error("Failed to check ball hitting range: " + error.message);
        }
    }
}
