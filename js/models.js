/**
 * 3D Models for Nokia Cricket Cup game
 */

class Models {
    constructor(scene, assetLoader) {
        this.scene = scene;
        this.assetLoader = assetLoader;
        this.models = {};
        
        // Materials
        this.materials = {
            pitch: new THREE.MeshLambertMaterial({ color: 0x96B555 }),
            pitchStripe: new THREE.MeshLambertMaterial({ color: 0xFFFFFF }),
            ground: new THREE.MeshLambertMaterial({ color: 0x458B00 }),
            bat: new THREE.MeshPhongMaterial({ color: 0xC19A6B }),
            ball: new THREE.MeshPhongMaterial({ color: 0xD70000 }),
            stumps: new THREE.MeshLambertMaterial({ color: 0xF0E68C }),
            bails: new THREE.MeshLambertMaterial({ color: 0xF0E68C }),
            playerBody: new THREE.MeshLambertMaterial({ color: 0x1E90FF }),
            playerHead: new THREE.MeshLambertMaterial({ color: 0xFFE4C4 })
        };
    }

    loadAll() {
        this.createGround();
        this.createPitch();
        this.createStumps();
        this.createBat();
        this.createBall();
        this.createBatsman();
        this.createBowler();
    }
    
    createGround() {
        // Create a large plane for the cricket field
        const groundGeometry = new THREE.CircleGeometry(100, 32);
        const ground = new THREE.Mesh(groundGeometry, this.materials.ground);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        this.models.ground = ground;
        
        // Add boundary markers
        const boundaryGeometry = new THREE.TorusGeometry(60, 0.5, 8, 50);
        const boundaryMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        const boundary = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
        boundary.rotation.x = Math.PI / 2;
        boundary.position.y = 0.1;
        this.scene.add(boundary);
    }
    
    createPitch() {
        // Create the cricket pitch (center strip)
        const pitchGeometry = new THREE.BoxGeometry(3, 0.1, 20);
        const pitch = new THREE.Mesh(pitchGeometry, this.materials.pitch);
        pitch.position.y = 0.05;
        pitch.receiveShadow = true;
        this.scene.add(pitch);
        this.models.pitch = pitch;
        
        // Add crease lines
        this.addCrease(7, 0.05);
        this.addCrease(-7, 0.05);
    }
    
    addCrease(zPosition, yPosition) {
        // Create the bowling crease (white line)
        const creaseGeometry = new THREE.BoxGeometry(3.5, 0.02, 0.1);
        const crease = new THREE.Mesh(creaseGeometry, this.materials.pitchStripe);
        crease.position.set(0, yPosition, zPosition);
        crease.receiveShadow = true;
        this.scene.add(crease);
        
        // Create popping crease
        const poppingCreaseGeometry = new THREE.BoxGeometry(0.1, 0.02, 1.5);
        
        // Create two side popping creases
        for (let xOffset of [-1.7, 1.7]) {
            const poppingCrease = new THREE.Mesh(poppingCreaseGeometry, this.materials.pitchStripe);
            poppingCrease.position.set(xOffset, yPosition, zPosition + (zPosition > 0 ? -0.8 : 0.8));
            poppingCrease.receiveShadow = true;
            this.scene.add(poppingCrease);
        }
    }
    
    createStumps() {
        const stumpsGroup = new THREE.Group();
        
        // Create three stumps
        for (let i = -1; i <= 1; i++) {
            const stumpGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8);
            const stump = new THREE.Mesh(stumpGeometry, this.materials.stumps);
            stump.position.set(i * 0.2, 0.35, 7);
            stump.castShadow = true;
            stumpsGroup.add(stump);
        }
        
        // Create two bails
        for (let i = -0.5; i <= 0.5; i++) {
            const bailGeometry = new THREE.BoxGeometry(0.3, 0.05, 0.05);
            const bail = new THREE.Mesh(bailGeometry, this.materials.bails);
            bail.position.set(i * 0.4, 0.7, 7);
            bail.castShadow = true;
            stumpsGroup.add(bail);
        }
        
        // Create opposite stumps (bowler's end)
        const bowlerStumpsGroup = stumpsGroup.clone();
        bowlerStumpsGroup.position.z = -14; // Move to the other end of the pitch
        
        this.scene.add(stumpsGroup);
        this.scene.add(bowlerStumpsGroup);
        
        this.models.stumps = stumpsGroup;
        this.models.bowlerStumps = bowlerStumpsGroup;
    }
    
    createBat() {
        const batGroup = new THREE.Group();
        
        // Create bat handle
        const handleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
        const handle = new THREE.Mesh(handleGeometry, this.materials.bat);
        handle.position.y = 0.25;
        handle.castShadow = true;
        batGroup.add(handle);
        
        // Create bat blade
        const bladeGeometry = new THREE.BoxGeometry(0.2, 0.05, 0.8);
        const blade = new THREE.Mesh(bladeGeometry, this.materials.bat);
        blade.position.set(0, 0, -0.4);
        blade.castShadow = true;
        batGroup.add(blade);
        
        // Position the bat
        batGroup.rotation.x = Math.PI / 4;
        batGroup.position.set(0, 0.5, 6.5);
        
        this.scene.add(batGroup);
        this.models.bat = batGroup;
        
        return batGroup;
    }
    
    createBall() {
        const geometry = new THREE.SphereGeometry(0.12, 16, 16);
        const ball = new THREE.Mesh(geometry, this.materials.ball);
        ball.castShadow = true;
        ball.position.set(0, 0.5, -7);
        
        this.scene.add(ball);
        this.models.ball = ball;
        
        return ball;
    }
    
    createBatsman() {
        const batsmanGroup = new THREE.Group();
        
        // Create body - REPLACING CapsuleGeometry with a combination of cylinder and sphere
        const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.6, 8);
        const body = new THREE.Mesh(bodyGeometry, this.materials.playerBody);
        body.position.y = 0.5;
        body.castShadow = true;
        batsmanGroup.add(body);
        
        // Create head
        const headGeometry = new THREE.SphereGeometry(0.15, 16, 16);
        const head = new THREE.Mesh(headGeometry, this.materials.playerHead);
        head.position.y = 1.1;
        head.castShadow = true;
        batsmanGroup.add(head);
        
        // Position the batsman
        batsmanGroup.position.set(0, 0, 6);
        
        this.scene.add(batsmanGroup);
        this.models.batsman = batsmanGroup;
        
        return batsmanGroup;
    }
    
    createBowler() {
        const bowlerGroup = new THREE.Group();
        
        // Create body - REPLACING CapsuleGeometry with a combination of cylinder and sphere
        const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.6, 8);
        const body = new THREE.Mesh(bodyGeometry, this.materials.playerBody);
        body.position.y = 0.5;
        body.castShadow = true;
        bowlerGroup.add(body);
        
        // Create head
        const headGeometry = new THREE.SphereGeometry(0.15, 16, 16);
        const head = new THREE.Mesh(headGeometry, this.materials.playerHead);
        head.position.y = 1.1;
        head.castShadow = true;
        bowlerGroup.add(head);
        
        // Position the bowler
        bowlerGroup.position.set(0, 0, -7);
        
        this.scene.add(bowlerGroup);
        this.models.bowler = bowlerGroup;
        
        return bowlerGroup;
    }

    // Method to get a model by name
    getModel(name) {
        return this.models[name];
    }
}
