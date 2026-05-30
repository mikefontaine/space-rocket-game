// Space Rocket Game - Main Loop, Input Handling, Physics and Rendering

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        // Target setup
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.focalLength = 300; // Camera distance projection multiplier

        // Audio initialization helper
        this.audioStarted = false;

        // Player motion settings
        this.speed = 100; // current speed
        this.targetSpeed = 100;
        this.speedCruising = 100;
        this.speedBoost = 650;
        this.accelerationRate = 250; // speed units per second

        // Steering settings
        this.mouseX = this.width / 2;
        this.mouseY = this.height / 2;
        this.accumulatedMouseX = 0;
        this.accumulatedMouseY = 0;
        this.mouseTurnDurationX = 0;
        this.mouseTurnDurationY = 0;
        this.lastMouseSignX = 0;
        this.lastMouseSignY = 0;
        this.turnX = 0; // Current ship tilt/turn rates
        this.turnY = 0;
        this.targetTurnX = 0;
        this.targetTurnY = 0;
        this.steerSensitivity = 1.6;
        this.steeringDamping = 0.08;
        this.heading = 0;

        // Gamepad steering and firing support
        this.gamepadConnected = false;
        this.usingGamepad = false;
        this.lastActiveGamepadIndex = -1;
        this.phaserCooldown = 0; // Cooldown between automatic shots (s)

        this.isMousePressed = false;
        this.clickedDashboard = false;
        this.lastMouseX = this.mouseX;
        this.lastMouseY = this.mouseY;

        // Touch steering and firing support
        this.usingTouch = false;
        this.touchStickX = 0;
        this.touchStickY = 0;
        this.isTouchFiring = false;

        // Visual effects
        this.screenShake = 0;

        // 1000-gem Milestone Surprise (set to 100 for testing)
        this.surpriseActive = false;
        this.surpriseType = null; // Can be 'disco', 'whale', or 'phaser'
        this.surpriseNextIndex = 0; // Tracks which surprise to play next (cycles disco -> whale -> phaser)
        this.surpriseTimer = 0;
        this.surpriseInterval = 100; // Milestone step (100 for testing, change to 1000 in prod)
        this.surpriseTargetScore = this.surpriseInterval;
        this.confetti = [];
        this.spaceWhale = null;
        this.surpriseAudioDelay = 0;
        this.confettiDelayTimer = 0;
        this.confettiTriggered = false;
        this.delayedExplosions = [];

        // Game Entities
        this.stars = [];
        this.planets = [];
        this.asteroids = [];
        this.aliens = [];
        this.phasers = [];
        this.particles = [];

        // UI Cockpit Dashboard
        this.cockpit = new Cockpit();

        // Control flags
        this.isAccelerating = false;
        
        // Timers
        this.lastTime = performance.now();

        // Setup Events
        this.initEntities();
        this.bindEvents();
        this.cockpit.layout(this.width, this.height);

        // Detect touch device and show controls
        const isTouch = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
        if (isTouch) {
            const touchControls = document.getElementById('touchControls');
            if (touchControls) {
                touchControls.style.display = 'block';
            }
        }
    }

    initEntities() {
        // Create 180 stars
        for (let i = 0; i < 180; i++) {
            this.stars.push(new Star(this.width, this.height));
        }

        // Create 2 colorful planets
        for (let i = 0; i < 2; i++) {
            this.planets.push(new Planet(this.width, this.height));
        }

        // Create 4 asteroids at start
        for (let i = 0; i < 4; i++) {
            this.asteroids.push(new Asteroid(this.width, this.height));
        }

        // Create 2 cute alien UFOs
        for (let i = 0; i < 2; i++) {
            this.aliens.push(new AlienShip(this.width, this.height));
        }
    }

    bindEvents() {
        // Request pointer lock on canvas clicks (after launch, desktop only)
        this.canvas.addEventListener('click', () => {
            const overlay = document.getElementById('startOverlay');
            if (overlay && overlay.classList.contains('hidden')) {
                if (!this.usingTouch && !('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
                    if (!document.pointerLockElement) {
                        this.canvas.requestPointerLock();
                    }
                }
            }
        });

        // Track mouse movement (FPS style using relative movementX/Y)
        window.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.canvas) {
                if (Math.abs(e.movementX) > 1 || Math.abs(e.movementY) > 1) {
                    this.usingGamepad = false;
                    this.usingTouch = false;
                }

                if (!this.usingGamepad && !this.usingTouch) {
                    // Accumulate relative movement delta
                    this.accumulatedMouseX += e.movementX;
                    this.accumulatedMouseY += e.movementY;
                }
            } else {
                if (Math.abs(e.movementX) > 2 || Math.abs(e.movementY) > 2) {
                    this.usingGamepad = false;
                    this.usingTouch = false;
                }
            }

            // Lock logical target coordinates to screen center
            this.mouseX = this.width / 2;
            this.mouseY = this.height / 2;
        });

        // Initialize Virtual Joystick Touch Handlers
        const joystick = document.getElementById('joystickContainer');
        const knob = document.getElementById('joystickKnob');
        if (joystick && knob) {
            let activeTouchId = null;
            const maxRadius = 50;

            const handleJoystickTouch = (e) => {
                e.preventDefault();
                const touches = e.targetTouches;
                
                // Find our active touch
                let touch = null;
                if (activeTouchId === null && touches.length > 0) {
                    touch = touches[0];
                    activeTouchId = touch.identifier;
                } else {
                    for (let i = 0; i < touches.length; i++) {
                        if (touches[i].identifier === activeTouchId) {
                            touch = touches[i];
                            break;
                        }
                    }
                }

                if (touch) {
                    const rect = joystick.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    let dx = touch.clientX - centerX;
                    let dy = touch.clientY - centerY;
                    
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > maxRadius) {
                        dx = (dx / dist) * maxRadius;
                        dy = (dy / dist) * maxRadius;
                    }
                    
                    knob.style.transform = `translate(${dx}px, ${dy}px)`;
                    
                    this.touchStickX = dx / maxRadius;
                    this.touchStickY = dy / maxRadius;
                    this.usingTouch = true;
                    this.usingGamepad = false;
                }
            };

            const resetJoystick = (e) => {
                e.preventDefault();
                activeTouchId = null;
                knob.style.transform = 'translate(0px, 0px)';
                this.touchStickX = 0;
                this.touchStickY = 0;
            };

            joystick.addEventListener('touchstart', handleJoystickTouch, { passive: false });
            joystick.addEventListener('touchmove', handleJoystickTouch, { passive: false });
            joystick.addEventListener('touchend', resetJoystick, { passive: false });
            joystick.addEventListener('touchcancel', resetJoystick, { passive: false });
        }

        // Initialize Virtual Gamepad Buttons handlers
        const btnBoost = document.getElementById('btnBoost');
        const btnFire = document.getElementById('btnFire');

        if (btnBoost) {
            btnBoost.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.isAccelerating = true;
                this.targetSpeed = this.speedBoost;
                this.usingTouch = true;
                this.usingGamepad = false;
            }, { passive: false });

            const releaseBoost = (e) => {
                e.preventDefault();
                this.isAccelerating = false;
                this.targetSpeed = this.speedCruising;
            };
            btnBoost.addEventListener('touchend', releaseBoost, { passive: false });
            btnBoost.addEventListener('touchcancel', releaseBoost, { passive: false });
        }

        if (btnFire) {
            btnFire.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.isTouchFiring = true;
                this.usingTouch = true;
                this.usingGamepad = false;
                
                // Initialize audio on touch action if not started
                if (!this.audioStarted) {
                    sounds.init();
                    this.audioStarted = true;
                } else {
                    sounds.resume();
                }
            }, { passive: false });

            const releaseFire = (e) => {
                e.preventDefault();
                this.isTouchFiring = false;
            };
            btnFire.addEventListener('touchend', releaseFire, { passive: false });
            btnFire.addEventListener('touchcancel', releaseFire, { passive: false });
        }

        // Left click triggers firing phaser
        window.addEventListener('mousedown', (e) => {
            if (!this.audioStarted) {
                sounds.init();
                this.audioStarted = true;
            } else {
                sounds.resume();
            }

            const overlay = document.getElementById('startOverlay');
            const isLaunched = overlay && overlay.classList.contains('hidden');

            if (e.button === 0) { // Left Click
                this.isMousePressed = true;
                
                // Fire at center of screen (FPS reticle)
                if (isLaunched && this.phaserCooldown <= 0) {
                    this.firePhaser(this.width / 2, this.height / 2);
                }
            } else if (e.button === 2) { // Right Click
                this.isAccelerating = true;
                this.targetSpeed = this.speedBoost;
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.isMousePressed = false;
            } else if (e.button === 2) {
                // Decelerate back to cruise
                this.isAccelerating = false;
                this.targetSpeed = this.speedCruising;
            }
        });

        // Safe focus loss handler
        window.addEventListener('blur', () => {
            this.isMousePressed = false;
            this.clickedDashboard = false;
            this.isAccelerating = false;
            this.targetSpeed = this.speedCruising;
        });

        // Prevent standard right-click context menu (so they can hold right-click to fly!)
        window.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Listen for Gamepads
        window.addEventListener('gamepadconnected', (e) => {
            console.log("Gamepad connected: " + e.gamepad.id);
            this.gamepadConnected = true;
            
            // Show HUD indicator if start overlay is still active
            const indicator = document.getElementById('gamepadIndicator');
            if (indicator) {
                indicator.style.display = 'block';
            }
            const hint = document.getElementById('controllerHint');
            if (hint) {
                hint.style.display = 'none';
            }
            
            if (!this.audioStarted) {
                sounds.init();
                this.audioStarted = true;
            }
        });

        window.addEventListener('gamepaddisconnected', (e) => {
            console.log("Gamepad disconnected: " + e.gamepad.id);
            if (e.gamepad.index === this.lastActiveGamepadIndex) {
                this.lastActiveGamepadIndex = -1;
            }
            const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            let active = false;
            for (let i = 0; i < gamepads.length; i++) {
                if (gamepads[i]) {
                    active = true;
                    break;
                }
            }
            this.gamepadConnected = active;
            if (!active) {
                this.usingGamepad = false;
                const indicator = document.getElementById('gamepadIndicator');
                if (indicator) indicator.style.display = 'none';
                const hint = document.getElementById('controllerHint');
                if (hint) hint.style.display = 'block';
            }
        });

        // Window resize adjustment
        window.addEventListener('resize', () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
            this.cockpit.layout(this.width, this.height);
        });
    }

    firePhaser(aimX, aimY) {
        // Reset cooldown
        this.phaserCooldown = 0.22; // 220ms between shots

        if (this.surpriseActive && this.surpriseType === 'phaser') {
            // Play phaser sound
            sounds.playPhaser();
            
            // Upgraded fan of 5 separate wavy colored phaser beams converging on the reticle target
            const beamConfigs = [
                { startRatio: 0.1, color: '#ff3d00' }, // Red
                { startRatio: 0.3, color: '#ffea00' }, // Yellow
                { startRatio: 0.5, color: '#39ff14' }, // Green
                { startRatio: 0.7, color: '#00e5ff' }, // Cyan
                { startRatio: 0.9, color: '#d500f9' }  // Purple
            ];
            
            beamConfigs.forEach(cfg => {
                this.phasers.push(new PhaserBeam(aimX, aimY, this.width, this.height, cfg.color, cfg.startRatio));
            });
            
            // Check hits against asteroids
            for (let i = 0; i < this.asteroids.length; i++) {
                const ast = this.asteroids[i];
                if (ast.checkHit(aimX, aimY, this.width, this.height, this.focalLength)) {
                    // Trigger the chain reaction explosion sequence!
                    this.triggerAsteroidExplosion(ast, false);
                    return;
                }
            }
            
            // Check hits against alien ships
            for (let i = 0; i < this.aliens.length; i++) {
                const alien = this.aliens[i];
                if (alien.checkHit(aimX, aimY, this.width, this.height, this.focalLength)) {
                    sounds.playAlienHappy();
                    // Massive colorful sparkle explosion for tagging aliens
                    this.spawnExplosionParticles(alien.x, alien.y, alien.z, '#f48fb1', 15, 2.0, 1.8, 'sparkle');
                    this.spawnExplosionParticles(alien.x, alien.y, alien.z, '#80deea', 15, 2.0, 1.8, 'sparkle');
                    this.spawnExplosionParticles(alien.x, alien.y, alien.z, '#ffff00', 10, 1.8, 1.5, 'default');
                    this.cockpit.score += 25;
                    alien.capture();
                    return;
                }
            }
        } else {
            // Standard single phaser blast
            sounds.playPhaser();
            this.phasers.push(new PhaserBeam(aimX, aimY, this.width, this.height));
            
            // Check hits against asteroids
            for (let i = 0; i < this.asteroids.length; i++) {
                const ast = this.asteroids[i];
                if (ast.checkHit(aimX, aimY, this.width, this.height, this.focalLength)) {
                    this.triggerAsteroidExplosion(ast, false);
                    return;
                }
            }

            // Check hits against alien ships
            for (let i = 0; i < this.aliens.length; i++) {
                const alien = this.aliens[i];
                if (alien.checkHit(aimX, aimY, this.width, this.height, this.focalLength)) {
                    sounds.playAlienHappy();
                    this.spawnExplosionParticles(alien.x, alien.y, alien.z, '#f48fb1', 8, 1.0, 1.0, 'default');
                    this.spawnExplosionParticles(alien.x, alien.y, alien.z, '#80deea', 8, 1.0, 1.0, 'sparkle');
                    this.cockpit.score += 15;
                    alien.capture();
                    return;
                }
            }
        }
    }

    // Handles standard and upgraded (recursive chain reaction) asteroid explosions
    triggerAsteroidExplosion(ast, isChainHit = false) {
        sounds.playExplosion();
        
        if (this.surpriseActive && this.surpriseType === 'phaser') {
            // Upgraded phaser: massive cartoon explosion
            // 1. Two giant expanding shockwave rings (Cyan & Magenta)
            this.spawnExplosionParticles(ast.x, ast.y, ast.z, '#00e5ff', 1, 4.5, 0.0, 'ring');
            this.spawnExplosionParticles(ast.x, ast.y, ast.z, '#d500f9', 1, 3.5, 0.0, 'ring');
            
            // 2. 24 giant cartoon smoke puffs (Orange & Yellow)
            this.spawnExplosionParticles(ast.x, ast.y, ast.z, 'rgba(255, 61, 0, 0.65)', 12, 3.8, 1.2, 'smoke');
            this.spawnExplosionParticles(ast.x, ast.y, ast.z, 'rgba(255, 234, 0, 0.65)', 12, 3.0, 1.5, 'smoke');
            
            // 3. 30 sparkly stars shooting out
            this.spawnExplosionParticles(ast.x, ast.y, ast.z, '#ffffff', 30, 2.5, 2.8, 'sparkle');
            
            // 4. 35 colorful cartoon chunks
            const colors = ['#ff3d00', '#ffea00', '#39ff14', '#00e5ff', '#d500f9'];
            for (let c = 0; c < 35; c++) {
                this.spawnExplosionParticles(ast.x, ast.y, ast.z, colors[c % colors.length], 1, 2.6, 2.2, 'default');
            }
            
            this.cockpit.score += isChainHit ? 10 : 8; // Chain reactions award higher points!
            this.screenShake = Math.max(this.screenShake, isChainHit ? 22 : 18);
            
            // Chain Reaction Mechanics (scan neighbors in 3D space)
            const ax = ast.x;
            const ay = ast.y;
            const az = ast.z;
            
            // Reset exploded asteroid immediately
            ast.reset(this.width, this.height, false);
            
            const chainRadius = 650; // 3D units threshold for chain trigger
            for (let i = 0; i < this.asteroids.length; i++) {
                const other = this.asteroids[i];
                // Ensure other is an active asteroid within distance (and not already flagged)
                if (other.z < 1800) {
                    const dist = Math.sqrt((ax - other.x)**2 + (ay - other.y)**2 + (az - other.z)**2);
                    if (dist < chainRadius) {
                        // Push to queue with 150ms delay for cartoony staggered sequence
                        this.delayedExplosions.push({
                            x: other.x,
                            y: other.y,
                            z: other.z,
                            color: other.color,
                            delay: 0.15,
                            asteroidRef: other
                        });
                        // Flag it immediately off-screen to avoid multiple targeting
                        other.z = 9999;
                    }
                }
            }
        } else {
            // Standard phaser explosion: smoke, sparkles, chunks
            this.spawnExplosionParticles(ast.x, ast.y, ast.z, 'rgba(255, 100, 10, 0.5)', 4, 1.4, 0.7, 'smoke');
            this.spawnExplosionParticles(ast.x, ast.y, ast.z, '#ffea00', 4, 1.2, 1.4, 'sparkle');
            this.spawnExplosionParticles(ast.x, ast.y, ast.z, ast.color, 10, 1.0, 1.0, 'default');
            
            this.cockpit.score += 5;
            this.screenShake = Math.max(this.screenShake, 5);
            ast.reset(this.width, this.height, false);
        }
    }

    spawnExplosionParticles(x, y, z, color, count, sizeMultiplier = 1.0, speedMultiplier = 1.0, type = 'default') {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, z, color, sizeMultiplier, speedMultiplier, type));
        }
    }

    spawnShieldHitParticles(x, y) {
        // Spark particles radiating outward from screen hit point
        // In screen space, we just spawn them relative to screen center as standard particles
        // but with high outwards velocity
        const z = 20; // very close to screen
        const scale = this.focalLength / z;
        
        // Translate screen hit point back to relative (x,y) coordinates
        const rx = (x - this.width / 2) / scale;
        const ry = (y - this.height / 2) / scale;

        for (let i = 0; i < 15; i++) {
            const p = new Particle(rx, ry, z, this.cockpit.shieldColor);
            p.vx = (Math.random() - 0.5) * 400;
            p.vy = (Math.random() - 0.5) * 400;
            p.vz = -50 - Math.random() * 150; // Fly back away or forwards
            this.particles.push(p);
        }
    }

    isButtonPressed(btn) {
        if (!btn) return false;
        if (typeof btn === 'object') {
            return btn.pressed;
        }
        if (typeof btn === 'number') {
            return btn > 0.5;
        }
        if (typeof btn === 'boolean') {
            return btn;
        }
        return false;
    }

    update(dt) {
        // Decrement phaser cooldown
        if (this.phaserCooldown > 0) {
            this.phaserCooldown -= dt;
        }

        // Poll Gamepad Input - Smart Scanning
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let gp = null;

        // 1. Try to use the previously active gamepad first
        if (this.lastActiveGamepadIndex !== -1 && gamepads[this.lastActiveGamepadIndex]) {
            gp = gamepads[this.lastActiveGamepadIndex];
        }

        // 2. Scan all gamepads for active input to dynamically route inputs to the active controller
        for (let i = 0; i < gamepads.length; i++) {
            const tempGp = gamepads[i];
            if (tempGp) {
                let hasActiveInput = false;

                // Check buttons
                if (tempGp.buttons) {
                    for (let b = 0; b < tempGp.buttons.length; b++) {
                        if (this.isButtonPressed(tempGp.buttons[b])) {
                            hasActiveInput = true;
                            break;
                        }
                    }
                }

                // Check axes (deliberate steering stick deflection > 0.15)
                if (!hasActiveInput && tempGp.axes) {
                    for (let a = 0; a < tempGp.axes.length; a++) {
                        if (Math.abs(tempGp.axes[a]) > 0.15) {
                            hasActiveInput = true;
                            break;
                        }
                    }
                }

                if (hasActiveInput) {
                    gp = tempGp;
                    this.lastActiveGamepadIndex = i;
                    break; // Switch active controller immediately
                }
            }
        }

        // 3. Fallback to the first connected gamepad with axes/buttons if none was active
        if (!gp) {
            for (let i = 0; i < gamepads.length; i++) {
                const tempGp = gamepads[i];
                if (tempGp && (
                    (tempGp.axes && tempGp.axes.length > 0) || 
                    (tempGp.buttons && tempGp.buttons.length > 0)
                )) {
                    gp = tempGp;
                    break;
                }
            }
        }

        this.gamepadConnected = (gp !== null);
        this.activeGp = gp; // Cache active gamepad for drawing and telemetry

        // Joystick states
        let gpStickX = 0;
        let gpStickY = 0;
        let gpAccelerating = false;
        let gpFiring = false;
        let anyButtonPressed = false;

        if (gp) {
            this.gamepadConnected = true;

            // 1. Read stick inputs (blend axes 0/1 and 2/3 for Left/Right Stick compatibility)
            let s0 = (gp.axes && gp.axes.length > 0) ? gp.axes[0] : 0;
            let s1 = (gp.axes && gp.axes.length > 1) ? gp.axes[1] : 0;
            let s2 = (gp.axes && gp.axes.length > 2) ? gp.axes[2] : 0;
            let s3 = (gp.axes && gp.axes.length > 3) ? gp.axes[3] : 0;

            let stickX = Math.abs(s0) > Math.abs(s2) ? s0 : s2;
            let stickY = Math.abs(s1) > Math.abs(s3) ? s1 : s3;

            if (isNaN(stickX)) stickX = 0;
            if (isNaN(stickY)) stickY = 0;

            // Apply deadzone to prevent drift
            const deadzone = 0.15;
            if (Math.abs(stickX) > deadzone) {
                gpStickX = (stickX - Math.sign(stickX) * deadzone) / (1 - deadzone);
            }
            if (Math.abs(stickY) > deadzone) {
                gpStickY = (stickY - Math.sign(stickY) * deadzone) / (1 - deadzone);
            }

            // 2. Scan all buttons (A, Y, LT, RT for acceleration; others for phaser fire)
            if (gp.buttons) {
                for (let b = 0; b < gp.buttons.length; b++) {
                    if (this.isButtonPressed(gp.buttons[b])) {
                        anyButtonPressed = true;
                        
                        // Map boost to typical throttle inputs A (0), Y (3), LT (6), RT (7)
                        if (b === 0 || b === 3 || b === 6 || b === 7) {
                            gpAccelerating = true;
                        } else {
                            // Any other button triggers phaser fire (X, B, bumpers, D-pad, etc.)
                            gpFiring = true;
                        }
                    }
                }
            }


        } else {
            this.gamepadConnected = false;
            this.lockTarget = null;
        }

        // Determine active input mode dynamically
        // Switch to Gamepad HUD drawing mode if there is active stick motion or any button is pressed
        const gpActiveSteer = Math.abs(gpStickX) > 0.05 || Math.abs(gpStickY) > 0.05;
        if (gpActiveSteer || anyButtonPressed) {
            this.usingGamepad = true;
        }

        // If the start screen overlay is active, any button press on the gamepad launches the game!
        const overlay = document.getElementById('startOverlay');
        if (overlay && !overlay.classList.contains('hidden')) {
            if (anyButtonPressed) {
                // Ensure audio context starts on user action
                if (!this.audioStarted) {
                    sounds.init();
                    this.audioStarted = true;
                } else {
                    sounds.resume();
                }
                
                // Call global launchRocket function defined in index.html
                if (typeof window.launchRocket === 'function') {
                    window.launchRocket();
                } else if (typeof launchRocket === 'function') {
                    launchRocket();
                }
            }
        }

        // Steering logic
        if (this.usingTouch) {
            this.targetTurnX = this.touchStickX * 900 * this.steerSensitivity;
            this.targetTurnY = this.touchStickY * 500 * this.steerSensitivity;
        } else if (this.usingGamepad) {
            this.targetTurnX = gpStickX * 900 * this.steerSensitivity;
            this.targetTurnY = gpStickY * 500 * this.steerSensitivity;
        } else {
            // Determine sign of mouse movement deltas
            const currentSignX = Math.sign(this.accumulatedMouseX);
            const currentSignY = Math.sign(this.accumulatedMouseY);

            // Update X continuous turn duration
            if (currentSignX === 0) {
                this.mouseTurnDurationX = Math.max(0, this.mouseTurnDurationX - dt * 2.5);
                this.lastMouseSignX = 0;
            } else if (currentSignX === this.lastMouseSignX) {
                this.mouseTurnDurationX += dt;
            } else {
                this.mouseTurnDurationX = 0;
                this.lastMouseSignX = currentSignX;
            }

            // Update Y continuous turn duration
            if (currentSignY === 0) {
                this.mouseTurnDurationY = Math.max(0, this.mouseTurnDurationY - dt * 2.5);
                this.lastMouseSignY = 0;
            } else if (currentSignY === this.lastMouseSignY) {
                this.mouseTurnDurationY += dt;
            } else {
                this.mouseTurnDurationY = 0;
                this.lastMouseSignY = currentSignY;
            }

            // Dynamic acceleration multipliers: build momentum the longer the turn persists
            // Starts at 1.0, increases up to 3.0 after turning for ~0.8s
            const multX = 1.0 + Math.min(2.0, this.mouseTurnDurationX * 2.5);
            const multY = 1.0 + Math.min(2.0, this.mouseTurnDurationY * 2.5);

            // Mouse steering - convert relative movement deltas with acceleration multipliers
            const sensitivity = 40;
            this.targetTurnX = Math.max(-1900, Math.min(1900, this.accumulatedMouseX * sensitivity * multX));
            this.targetTurnY = Math.max(-1200, Math.min(1200, this.accumulatedMouseY * sensitivity * multY));

            // Reset accumulators for next frame
            this.accumulatedMouseX = 0;
            this.accumulatedMouseY = 0;
        }

        // Acceleration logic
        const isBoosting = this.isAccelerating || gpAccelerating; // Mouse boost OR Gamepad boost
        if (isBoosting) {
            this.targetSpeed = this.speedBoost;
        } else {
            this.targetSpeed = this.speedCruising;
        }

        // Phaser Firing logic
        if (this.phaserCooldown <= 0) {
            if (gpFiring || this.isMousePressed || this.isTouchFiring) {
                // Shoot directly forward at the center reticle
                this.firePhaser(this.width / 2, this.height / 2);
            }
        }

        // Snappy interpolation for mouse-look (1.0 = instant direct mapping), smooth for sticks
        const activeDamping = (this.usingGamepad || this.usingTouch) ? this.steeringDamping : 1.0;
        this.turnX += (this.targetTurnX - this.turnX) * activeDamping;
        this.turnY += (this.targetTurnY - this.turnY) * activeDamping;

        // Update compass heading angle based on current turning rate
        this.heading = (this.heading + this.turnX * 0.003 * dt) % (Math.PI * 2);

        // Adjust current velocity towards target speed
        if (this.speed < this.targetSpeed) {
            this.speed = Math.min(this.targetSpeed, this.speed + this.accelerationRate * dt);
        } else if (this.speed > this.targetSpeed) {
            this.speed = Math.max(this.targetSpeed, this.speed - this.accelerationRate * 2 * dt);
        }

        // Dynamically adjust engine hum pitch/volume based on speed factor
        const accelFactor = (this.speed - this.speedCruising) / (this.speedBoost - this.speedCruising);
        sounds.setEngineAcceleration(accelFactor);

        // Update all game entities
        this.stars.forEach(star => {
            star.update(this.speed, dt, this.turnX, this.turnY);
            if (star.z <= 10) star.reset(this.width, this.height, false);
        });

        this.planets.forEach(planet => {
            planet.update(this.speed, dt, this.turnX, this.turnY);
        });

        this.asteroids.forEach(ast => {
            ast.update(this.speed, dt, this.turnX, this.turnY);

            // COLLISION: If asteroid hits screen (z is very small)
            if (ast.z <= 15) {
                const scale = this.focalLength / ast.z;
                const sx = this.width / 2 + ast.x * scale;
                const sy = this.height / 2 + ast.y * scale;

                this.cockpit.triggerShieldFlash();
                this.screenShake = 22;
                sounds.playShieldBounce();
                this.spawnShieldHitParticles(sx, sy);
                ast.reset(this.width, this.height, false);
            }
        });

        this.aliens.forEach(alien => {
            alien.update(this.speed, dt, this.turnX, this.turnY);
            if (alien.z <= 15) {
                alien.reset(this.width, this.height, false);
            }
        });

        // Phaser beams lifetime
        this.phasers.forEach(laser => laser.update(dt));
        this.phasers = this.phasers.filter(laser => laser.life > 0);

        // Particles physics & lifetime
        this.particles.forEach(p => p.update(this.speed, dt, this.turnX, this.turnY));
        this.particles = this.particles.filter(p => p.life > 0 && p.z > 5);

        // Update delayed chain explosions
        if (this.delayedExplosions.length > 0) {
            for (let i = this.delayedExplosions.length - 1; i >= 0; i--) {
                const exp = this.delayedExplosions[i];
                exp.delay -= dt;
                if (exp.delay <= 0) {
                    if (exp.asteroidRef) {
                        exp.asteroidRef.x = exp.x;
                        exp.asteroidRef.y = exp.y;
                        exp.asteroidRef.z = exp.z;
                        this.triggerAsteroidExplosion(exp.asteroidRef, true);
                    }
                    this.delayedExplosions.splice(i, 1);
                }
            }
        }

        // ----------------------------------------------------
        // Update Milestone Surprise Trigger
        // ----------------------------------------------------
        if (this.cockpit.score >= this.surpriseTargetScore) {
            if (!this.surpriseActive) {
                this.surpriseActive = true;
                
                // Cycle through the rewards sequentially so you can see them all in order
                const types = ['disco', 'whale', 'phaser'];
                this.surpriseType = types[this.surpriseNextIndex % types.length];
                this.surpriseNextIndex++;
                
                // Whale stays for 12s, Phaser upgrade stays for 25s (20s longer), Disco stays for 5s
                if (this.surpriseType === 'whale') {
                    this.surpriseTimer = 12.0;
                } else if (this.surpriseType === 'phaser') {
                    this.surpriseTimer = 25.0;
                } else {
                    this.surpriseTimer = 5.0;
                }
                
                if (this.surpriseType === 'whale') {
                    this.spaceWhale = new SpaceWhale();
                    this.spaceWhale.reset(this.width, this.focalLength);
                    this.surpriseAudioDelay = 4.0; // Play fanfare when whale is 1/3 across (takes 12s total)
                } else if (this.surpriseType === 'disco') {
                    this.confetti = [];
                    this.confettiDelayTimer = 2.66; // Delay confetti explosion to match the fanfare's final C7 flourish note
                    this.confettiTriggered = false;
                    this.surpriseAudioDelay = 0.0;
                } else {
                    this.surpriseAudioDelay = 0.0;
                }
                
                // Play celebration fanfare immediately if there is no delay
                if (this.surpriseAudioDelay === 0.0) {
                    try {
                        sounds.playCelebrationFanfare();
                    } catch (audioErr) {
                        console.error("Audio error playing celebration fanfare:", audioErr);
                    }
                }
                
                // Set next target milestone relative to current score
                this.surpriseTargetScore = this.cockpit.score + this.surpriseInterval;
            }
        }

        // ----------------------------------------------------
        // Update Active Surprise Mechanics
        // ----------------------------------------------------
        if (this.surpriseActive) {
            // Update delayed audio trigger
            if (this.surpriseAudioDelay > 0) {
                this.surpriseAudioDelay -= dt;
                if (this.surpriseAudioDelay <= 0) {
                    try {
                        sounds.playCelebrationFanfare();
                    } catch (audioErr) {
                        console.error("Audio error playing celebration fanfare:", audioErr);
                    }
                }
            }

            this.surpriseTimer -= dt;
            if (this.surpriseTimer <= 0) {
                // End surprise! Return to normal space flight
                this.surpriseActive = false;
                this.surpriseType = null;
                // Fanfare stops playing automatically, no continuous music loop to stop here
            } else {
                if (this.surpriseType === 'disco') {
                    // Spawn confetti on the fanfare's final note (2.66 seconds delay)
                    if (!this.confettiTriggered) {
                        this.confettiDelayTimer -= dt;
                        if (this.confettiDelayTimer <= 0) {
                            for (let i = 0; i < 90; i++) {
                                this.confetti.push(new Confetti(this.width, this.height));
                            }
                            this.confettiTriggered = true;
                        }
                    }
                    this.confetti.forEach(c => c.update(dt, this.width, this.height));
                    this.confetti = this.confetti.filter(c => c.active);
                } else if (this.surpriseType === 'whale' && this.spaceWhale) {
                    this.spaceWhale.update(this.speed, dt, this.turnX, this.turnY, this.width, this.focalLength);
                }
            }
        }

        // Sync surprise state to cockpit HUD helper
        this.cockpit.surpriseActive = this.surpriseActive;

        // Update UI/Cockpit dashboard
        this.cockpit.update(dt, this.turnX / 400, this.screenShake);

        // Decay screen shake
        if (this.screenShake > 0) {
            this.screenShake = Math.max(0, this.screenShake - 40 * dt);
        }
    }



    draw() {
        // Clear canvas with space darkness (deep midnight navy blue, not pure black)
        this.ctx.fillStyle = '#060a17';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Starry night radial background glow (nebula effect)
        const glow = this.ctx.createRadialGradient(this.width/2, this.height/2, 20, this.width/2, this.height/2, this.width * 0.7);
        if (this.surpriseActive && this.surpriseType === 'disco') {
            const hue = (Date.now() * 0.04) % 360;
            glow.addColorStop(0, `hsla(${hue}, 70%, 15%, 1)`);
            glow.addColorStop(0.5, `hsla(${(hue + 60) % 360}, 75%, 10%, 1)`);
            glow.addColorStop(1, `hsla(${(hue + 120) % 360}, 80%, 6%, 1)`);
        } else {
            glow.addColorStop(0, '#10162b');
            glow.addColorStop(0.5, '#0a0e20');
            glow.addColorStop(1, '#060a17');
        }
        this.ctx.fillStyle = glow;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Save context before applying screen shake
        this.ctx.save();
        if (this.screenShake > 0) {
            const sx = (Math.random() - 0.5) * this.screenShake;
            const sy = (Math.random() - 0.5) * this.screenShake;
            this.ctx.translate(sx, sy);
        }

        // Draw deep background entities (Stars and Planets)
        this.stars.forEach(star => star.draw(this.ctx, this.width, this.height, this.focalLength, this.speed));
        this.planets.forEach(planet => planet.draw(this.ctx, this.width, this.height, this.focalLength));



        // Draw gameplay entities (Asteroids, Aliens, Phaser beams)
        this.asteroids.forEach(ast => ast.draw(this.ctx, this.width, this.height, this.focalLength));
        this.aliens.forEach(alien => alien.draw(this.ctx, this.width, this.height, this.focalLength));
        
        if (this.surpriseActive && this.surpriseType === 'whale' && this.spaceWhale) {
            this.spaceWhale.draw(this.ctx, this.width, this.height, this.focalLength);
        }
        
        this.particles.forEach(p => p.draw(this.ctx, this.width, this.height, this.focalLength));
        
        // Lasers draw on top of entities
        this.phasers.forEach(laser => laser.draw(this.ctx));

        // Restore context (removing screen shake translation)
        this.ctx.restore();

        // Draw falling confetti in front of screen window (but behind cockpit frame)
        if (this.surpriseActive && this.surpriseType === 'disco') {
            this.confetti.forEach(c => c.draw(this.ctx));
        }

        // Draw cockpit dashboard overlay (drawn static on screen, not shaken, except dashboard buttons update)
        // Wait, cockpit steering and displays get drawn here
        this.cockpit.draw(
            this.ctx, 
            this.width, 
            this.height, 
            this.isAccelerating, 
            this.asteroids, 
            this.aliens,
            this.heading
        );

        // Draw Telemetry Computer Readout (Top-Left) as a sci-fi HUD panel
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 10, 20, 0.7)';
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.roundRect(15, 15, 260, 100, 5);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = '#00ffff';
        this.ctx.font = 'bold 11px "Courier New", Courier, monospace';
        this.ctx.textAlign = 'left';
        
        let gpInfo = "NONE";
        let gpStick = "X:0.00 Y:0.00";
        let gpBtns = "A:0 B:0 X:0 Y:0";
        
        if (this.usingTouch) {
            gpInfo = "SCREEN JOYSTICK";
            gpStick = `X:${this.touchStickX.toFixed(2)} Y:${this.touchStickY.toFixed(2)}`;
            const boost = this.isAccelerating ? "1" : "0";
            const fire = this.isTouchFiring ? "1" : "0";
            gpBtns = `BOOST:${boost} FIRE:${fire}`;
        } else {
            let gp = this.activeGp;
            if (gp) {
                gpInfo = gp.id.substring(0, 18) + "...";
                const sx = (gp.axes && gp.axes[0] !== undefined) ? gp.axes[0].toFixed(2) : "0.00";
                const sy = (gp.axes && gp.axes[1] !== undefined) ? gp.axes[1].toFixed(2) : "0.00";
                gpStick = `X:${sx} Y:${sy}`;
                
                const a = (gp.buttons && gp.buttons[0] && this.isButtonPressed(gp.buttons[0])) ? "1" : "0";
                const b = (gp.buttons && gp.buttons[1] && this.isButtonPressed(gp.buttons[1])) ? "1" : "0";
                const x = (gp.buttons && gp.buttons[2] && this.isButtonPressed(gp.buttons[2])) ? "1" : "0";
                const y = (gp.buttons && gp.buttons[3] && this.isButtonPressed(gp.buttons[3])) ? "1" : "0";
                gpBtns = `A:${a} B:${b} X:${x} Y:${y}`;
            }
        }

        this.ctx.fillText(`🚀 SYSTEM TELEMETRY`, 25, 30);
        this.ctx.fillStyle = '#80deea';
        this.ctx.fillText(`• MODE: ${this.usingTouch ? "📱 TOUCH" : (this.usingGamepad ? "🎮 GAMEPAD" : "🖱️ MOUSE")}`, 25, 48);
        this.ctx.fillText(`• DEVICE: ${gpInfo}`, 25, 63);
        this.ctx.fillText(`• JOYSTICK: ${gpStick}`, 25, 78);
        this.ctx.fillText(`• BUTTONS: ${gpBtns}`, 25, 93);
        this.ctx.restore();

        // Draw targeting custom crosshair (follows mouse or lock-aim)
        this.drawCrosshair();
    }

    drawCrosshair() {
        // Find aim coordinates - always centered in FPS mode
        let cx = this.width / 2;
        let cy = this.height / 2;
        
        // Target coordinates should not go below dashboard
        if (cy >= this.height * 0.77) return;

        const bracketH = this.height * 0.25; // 1/4 of the screen height
        const bracketW = 20; // width of horizontal tick marks
        const dist = this.height * 0.15; // horizontal distance from center to brackets

        this.ctx.save();
        this.ctx.strokeStyle = this.usingGamepad ? '#e040fb' : '#39ff14'; // Pink for gamepad, Green for mouse
        this.ctx.lineWidth = 3.5;
        this.ctx.lineCap = 'round';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = this.usingGamepad ? 'rgba(224, 64, 251, 0.5)' : 'rgba(57, 255, 20, 0.5)';

        // Left Bracket '['
        this.ctx.beginPath();
        // Top tick
        this.ctx.moveTo(cx - dist + bracketW, cy - bracketH / 2);
        this.ctx.lineTo(cx - dist, cy - bracketH / 2);
        // Vertical line
        this.ctx.lineTo(cx - dist, cy + bracketH / 2);
        // Bottom tick
        this.ctx.lineTo(cx - dist + bracketW, cy + bracketH / 2);
        this.ctx.stroke();

        // Right Bracket ']'
        this.ctx.beginPath();
        // Top tick
        this.ctx.moveTo(cx + dist - bracketW, cy - bracketH / 2);
        this.ctx.lineTo(cx + dist, cy - bracketH / 2);
        // Vertical line
        this.ctx.lineTo(cx + dist, cy + bracketH / 2);
        // Bottom tick
        this.ctx.lineTo(cx + dist - bracketW, cy + bracketH / 2);
        this.ctx.stroke();

        // Center Dot
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        this.ctx.fillStyle = this.usingGamepad ? '#e040fb' : '#39ff14';
        this.ctx.fill();
        this.ctx.stroke();

        // Add some tiny subtle framing corner ticks around the center dot
        this.ctx.lineWidth = 1.5;
        const innerSize = 12;
        // Left-top corner tick
        this.ctx.beginPath();
        this.ctx.moveTo(cx - innerSize, cy - innerSize + 4);
        this.ctx.lineTo(cx - innerSize, cy - innerSize);
        this.ctx.lineTo(cx - innerSize + 4, cy - innerSize);
        // Right-top corner tick
        this.ctx.moveTo(cx + innerSize, cy - innerSize + 4);
        this.ctx.lineTo(cx + innerSize, cy - innerSize);
        this.ctx.lineTo(cx + innerSize - 4, cy - innerSize);
        // Left-bottom corner tick
        this.ctx.moveTo(cx - innerSize, cy + innerSize - 4);
        this.ctx.lineTo(cx - innerSize, cy + innerSize);
        this.ctx.lineTo(cx - innerSize + 4, cy + innerSize);
        // Right-bottom corner tick
        this.ctx.moveTo(cx + innerSize, cy + innerSize - 4);
        this.ctx.lineTo(cx + innerSize, cy + innerSize);
        this.ctx.lineTo(cx + innerSize - 4, cy + innerSize);
        this.ctx.stroke();

        this.ctx.restore();
    }

    loop() {
        const now = performance.now();
        // Convert to seconds, cap to avoid huge physics jumps if focus is lost
        const dt = Math.min(0.08, (now - this.lastTime) / 1000);
        this.lastTime = now;

        this.update(dt);
        this.draw();

        requestAnimationFrame(() => this.loop());
    }
}

// Start game on window load
window.addEventListener('load', () => {
    const game = new Game();
    game.loop();
});
