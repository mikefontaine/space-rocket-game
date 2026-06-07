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

        // Keyboard steering and firing support (Arcade Stick)
        this.usingKeyboard = false;
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
            Space: false
        };

        // 1000-gem Milestone Surprise (set to 100 for testing)
        this.surpriseActive = false;
        this.surpriseType = null; // Can be 'disco', 'whale', or 'phaser'
        this.surpriseNextIndex = 0; // Tracks which surprise to play next (cycles disco -> whale -> phaser)
        this.surpriseTimer = 0;
        this.surpriseInterval = 1000; // Milestone step (1000 gems milestone)
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
        this.powerUps = [];
        this.phasers = [];
        this.particles = [];
        this.alienProjectiles = [];
        this.survivalTimer = 0;
        this.lastDangerLevel = 1;
        window.difficultyMultiplier = 1;
        window.ufoSpeedMultiplier = 1;

        // Weapon upgrades states
        this.activeWeapon = 'normal';
        this.weaponTimer = 0;
        this.nextUfoIsSpecial = false;
        this.specialUfoTimer = 15 + Math.random() * 10; // Spawns first special UFO after 15-25 seconds
        this.gameOver = false;
        this.healthCanisterTimer = 60.0;

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

    setMode(mode) {
        this.activeWeapon = 'normal';
        this.weaponTimer = 0;
        this.specialUfoTimer = 15 + Math.random() * 10;
        this.nextUfoIsSpecial = false;
        this.gameOver = false;
        
        // Repopulate aliens list depending on mode
        this.aliens = [];
        const alienCount = 1; // Start with 1 alien ship in all modes
        for (let i = 0; i < alienCount; i++) {
            this.aliens.push(new AlienShip(this.width, this.height));
        }
        
        // Reset score & shield bubble
        this.cockpit.score = 0;
        this.cockpit.shieldVal = this.cockpit.shieldMax;
        this.cockpit.healthVal = this.cockpit.healthMax;
        this.cockpit.shieldRechargeDelay = 0;
        this.healthCanisterTimer = 60.0;
        this.alienProjectiles = [];
        this.survivalTimer = 0;
        this.lastDangerLevel = 1;
        window.difficultyMultiplier = 1;
        window.ufoSpeedMultiplier = 1;
        
        // Reset all asteroids (this ensures their health gets recalculated for the new mode!)
        this.asteroids.forEach(ast => ast.reset(this.width, this.height, true));
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
            // Ignore mouse movement if keys are currently pressed to prevent jitter from resetting keyboard mode
            if (this.keys.ArrowLeft || this.keys.ArrowRight || this.keys.ArrowUp || this.keys.ArrowDown || this.keys.Space) {
                return;
            }

            if (document.pointerLockElement === this.canvas) {
                if (Math.abs(e.movementX) > 1 || Math.abs(e.movementY) > 1) {
                    this.usingGamepad = false;
                    this.usingTouch = false;
                    this.usingKeyboard = false;
                }

                if (!this.usingGamepad && !this.usingTouch && !this.usingKeyboard) {
                    // Accumulate relative movement delta
                    this.accumulatedMouseX += e.movementX;
                    this.accumulatedMouseY += e.movementY;
                }
            } else {
                if (Math.abs(e.movementX) > 2 || Math.abs(e.movementY) > 2) {
                    this.usingGamepad = false;
                    this.usingTouch = false;
                    this.usingKeyboard = false;
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
                    this.usingKeyboard = false;
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
                this.usingKeyboard = false;
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
                this.usingKeyboard = false;
                
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
                this.usingKeyboard = false;
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

        // Keydown/Keyup listeners for Arcade Stick keys mapping (arrow keys & space)
        window.addEventListener('keydown', (e) => {
            // Prevent default behavior of arrows and space inside active gameplay to avoid browser scrolling
            const overlay = document.getElementById('startOverlay');
            const isStartOverlayActive = overlay && !overlay.classList.contains('hidden');
            const gameOverOverlay = document.getElementById('gameOverOverlay');
            const isGameOverOverlayActive = gameOverOverlay && !gameOverOverlay.classList.contains('hidden');

            if (!isStartOverlayActive && !isGameOverOverlayActive) {
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                    e.preventDefault();
                }
            }

            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.keys.ArrowUp = true;
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.keys.ArrowDown = true;
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.ArrowLeft = true;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.ArrowRight = true;
            if (e.key === ' ' || e.key === 'Spacebar') {
                this.keys.Space = true;
                
                // Initialize audio context if not already started
                if (!this.audioStarted) {
                    sounds.init();
                    this.audioStarted = true;
                } else {
                    sounds.resume();
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.keys.ArrowUp = false;
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.keys.ArrowDown = false;
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.ArrowLeft = false;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.ArrowRight = false;
            if (e.key === ' ' || e.key === 'Spacebar') this.keys.Space = false;
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
            
            this.checkTargetHits(aimX, aimY);
        } else if (this.activeWeapon === 'star_wand' && this.weaponTimer > 0) {
            // Star Wand: fires a rapid cone-spray of 3 twinkling stars
            sounds.playStarZap();
            
            const targets = [
                { x: aimX, y: aimY },
                { x: aimX - 60, y: aimY + 20 },
                { x: aimX + 60, y: aimY + 20 }
            ];

            targets.forEach(t => {
                this.phasers.push(new PhaserBeam(t.x, t.y, this.width, this.height, 'star_wand'));
                this.checkTargetHits(t.x, t.y);
            });
        } else if (this.activeWeapon === 'bubble_gum' && this.weaponTimer > 0) {
            // Bubble Gum: fires large Translucent pink bubbles
            sounds.playBubblePop();
            this.phasers.push(new PhaserBeam(aimX, aimY, this.width, this.height, 'bubble_gum'));
            this.checkTargetHits(aimX, aimY);
        } else if (this.activeWeapon === 'ice_cream' && this.weaponTimer > 0) {
            // Ice Cream: fires frozen blue double-helix laser
            sounds.playFreeze();
            this.phasers.push(new PhaserBeam(aimX, aimY, this.width, this.height, 'ice_cream'));
            this.checkTargetHits(aimX, aimY);
        } else {
            // Standard single phaser blast
            sounds.playPhaser();
            this.phasers.push(new PhaserBeam(aimX, aimY, this.width, this.height));
            this.checkTargetHits(aimX, aimY);
        }
    }

    checkTargetHits(tx, ty) {
        // 1. Check hits against alien projectiles (allow shooting down)
        for (let i = 0; i < this.alienProjectiles.length; i++) {
            const proj = this.alienProjectiles[i];
            if (proj.checkHit(tx, ty, this.width, this.height, this.focalLength)) {
                if (window.sounds) {
                    sounds.playProjectilePop();
                }
                // Emit small glowing red/white sparks
                this.spawnExplosionParticles(proj.x, proj.y, proj.z, '#ff1744', 8, 0.8, 0.8, 'sparkle');
                // Remove projectile
                this.alienProjectiles.splice(i, 1);
                return true;
            }
        }

        // 2. Check hits against power-ups
        for (let i = 0; i < this.powerUps.length; i++) {
            const pu = this.powerUps[i];
            if (pu.checkHit(tx, ty, this.width, this.height, this.focalLength)) {
                sounds.playPowerUpCollect();
                
                if (pu.type === 'health_canister') {
                    // Heal player by 25%
                    this.cockpit.healthVal = Math.min(this.cockpit.healthMax, this.cockpit.healthVal + 25);
                    this.cockpit.addMessage("❤️ HULL INTEGRITY RESTORED +25%!", "#39ff14");
                    
                    // Spawn pop/collection particles (green for health)
                    this.spawnExplosionParticles(pu.x, pu.y, pu.z, '#39ff14', 15, 1.8, 1.2, 'bubble');
                } else {
                    this.activeWeapon = pu.type;
                    this.weaponTimer = 12.0; // 12 seconds duration
                    
                    // Add floating message on Cockpit
                    let msgText = "STAR WAND!";
                    let msgColor = '#ffff00';
                    if (pu.type === 'bubble_gum') {
                        msgText = "BUBBLE GUM!";
                        msgColor = '#ff4081';
                    } else if (pu.type === 'ice_cream') {
                        msgText = "FREEZE RAY!";
                        msgColor = '#00e5ff';
                    }
                    this.cockpit.addMessage(msgText, msgColor);
                    
                    // Spawn pop/collection particles
                    this.spawnExplosionParticles(pu.x, pu.y, pu.z, msgColor, 15, 1.8, 1.2, 'bubble');
                }
                this.spawnExplosionParticles(pu.x, pu.y, pu.z, '#ffffff', 8, 1.2, 0.8, 'sparkle');
                
                // Remove collected power-up
                this.powerUps.splice(i, 1);
                return true;
            }
        }

        // 2. Check hits against asteroids
        for (let i = 0; i < this.asteroids.length; i++) {
            const ast = this.asteroids[i];
            if (ast.checkHit(tx, ty, this.width, this.height, this.focalLength)) {
                if (this.activeWeapon === 'ice_cream' && this.weaponTimer > 0) {
                    // Ice cream freeze ray hit: destroy in 2 shots
                    if (ast.state === 'normal') {
                        sounds.playFreeze();
                        ast.state = 'frozen';
                        ast.freezeTimer = 7.0; // freeze for 7 seconds
                        this.spawnExplosionParticles(ast.x, ast.y, ast.z, '#00e5ff', 12, 1.2, 0.8, 'snowflake');
                    } else if (ast.state === 'frozen') {
                        sounds.playIceShatter();
                        // Shatter explosion!
                        this.spawnExplosionParticles(ast.x, ast.y, ast.z, '#e0f7fa', 20, 1.5, 1.4, 'ice_crystal');
                        this.spawnExplosionParticles(ast.x, ast.y, ast.z, '#00e5ff', 10, 1.0, 1.0, 'snowflake');
                        this.cockpit.score += ast.maxHealth * 2; // Gem value = hits takes X2
                        this.screenShake = Math.max(this.screenShake, 8);
                        ast.reset(this.width, this.height, false);
                    }
                } else {
                    // Apply health damage (Standard: 1, Bubble Gum: 2, Star: 1)
                    let damage = 1;
                    if (this.activeWeapon === 'bubble_gum' && this.weaponTimer > 0) {
                        damage = 2; // Bubble gum launcher does 2x damage!
                    }
                    
                    ast.health -= damage;
                    if (ast.health <= 0) {
                        // Explode!
                        if (this.activeWeapon === 'bubble_gum' && this.weaponTimer > 0) {
                            sounds.playBubblePop();
                            this.spawnExplosionParticles(ast.x, ast.y, ast.z, '#ff4081', 1, 3.5, 0.0, 'bubble'); // Sticky giant bubble
                            this.spawnExplosionParticles(ast.x, ast.y, ast.z, '#ff80ab', 12, 1.4, 1.3, 'bubble'); // Splat debris
                            this.spawnExplosionParticles(ast.x, ast.y, ast.z, '#ffffff', 6, 1.0, 0.8, 'sparkle');
                            this.cockpit.score += ast.maxHealth * 2; // Gem value = hits takes X2
                            this.screenShake = Math.max(this.screenShake, 6);
                            ast.reset(this.width, this.height, false);
                        } else {
                            this.triggerAsteroidExplosion(ast, false);
                        }
                    } else {
                        // Play shield bounce hit chime note and spawn impact particles
                        sounds.playShieldBounce();
                        this.spawnExplosionParticles(ast.x, ast.y, ast.z, ast.color, 4, 0.6, 0.5, 'default');
                    }
                }
                return true;
            }
        }

        // 3. Check hits against alien ships
        for (let i = 0; i < this.aliens.length; i++) {
            const alien = this.aliens[i];
            if (alien.checkHit(tx, ty, this.width, this.height, this.focalLength)) {
                sounds.playAlienHappy();
                
                if (alien.isSpecial) {
                    if (this.activeWeapon === 'ice_cream' && this.weaponTimer > 0) {
                        // Ice cream freeze ray: freeze on 1st hit, shatter/destroy on 2nd hit
                        if (alien.state === 'normal') {
                            sounds.playFreeze();
                            alien.state = 'frozen';
                            alien.freezeTimer = 7.0; // frozen state
                            this.spawnExplosionParticles(alien.x, alien.y, alien.z, '#00e5ff', 12, 1.2, 0.8, 'snowflake');
                        } else if (alien.state === 'frozen') {
                            sounds.playIceShatter();
                            this.spawnExplosionParticles(alien.x, alien.y, alien.z, '#e0f7fa', 20, 1.5, 1.4, 'ice_crystal');
                            
                            // Spawn random power-up in its place
                            const pType = ['star_wand', 'bubble_gum', 'ice_cream'][Math.floor(Math.random() * 3)];
                            this.powerUps.push(new PowerUp(alien.x, alien.y, alien.z, pType));
                            
                            this.cockpit.score += 70; // Doubled points for Special UFO (from 35)
                            this.cockpit.addMessage("SPECIAL UFO!", "#ffd700");
                            alien.capture();
                        }
                    } else {
                        // Apply damage (Star: 1, Bubble Gum: 2, Standard: 1)
                        let damage = 1;
                        if (this.activeWeapon === 'bubble_gum' && this.weaponTimer > 0) {
                            damage = 2; // Bubble gum launcher does 2x damage!
                        }
                        
                        alien.health -= damage;
                        this.spawnExplosionParticles(alien.x, alien.y, alien.z, '#ffd700', 4, 0.8, 0.5, 'sparkle');
                        
                        if (alien.health <= 0) {
                            // Tagging special golden UFO spawns a random power-up in its place
                            const pType = ['star_wand', 'bubble_gum', 'ice_cream'][Math.floor(Math.random() * 3)];
                            this.powerUps.push(new PowerUp(alien.x, alien.y, alien.z, pType));
                            
                            // Extra magical gold & magenta sparkles for special UFO
                            this.spawnExplosionParticles(alien.x, alien.y, alien.z, '#ffd700', 16, 1.5, 1.3, 'sparkle');
                            this.spawnExplosionParticles(alien.x, alien.y, alien.z, '#ff4081', 10, 1.3, 1.0, 'sparkle');
                            this.spawnExplosionParticles(alien.x, alien.y, alien.z, '#ffffff', 8, 1.0, 0.8, 'sparkle');
                            
                            this.cockpit.score += 70; // Doubled points for Special UFO (from 35)
                            this.cockpit.addMessage("SPECIAL UFO!", "#ffd700");
                            alien.capture();
                        } else {
                            // Play metallic shield/hit chime and show HP progress message
                            sounds.playShieldBounce();
                            this.cockpit.addMessage(`HIT! ${alien.health}/${alien.maxHealth}`, '#ffd700');
                        }
                    }
                } else {
                    if (this.activeWeapon === 'ice_cream' && this.weaponTimer > 0) {
                        // Ice cream freeze ray: freeze on 1st hit, shatter on 2nd hit
                        if (alien.state === 'normal') {
                            sounds.playFreeze();
                            alien.state = 'frozen';
                            alien.freezeTimer = 7.0;
                            this.spawnExplosionParticles(alien.x, alien.y, alien.z, '#00e5ff', 8, 1.2, 0.8, 'snowflake');
                        } else if (alien.state === 'frozen') {
                            sounds.playIceShatter();
                            this.spawnExplosionParticles(alien.x, alien.y, alien.z, '#e0f7fa', 15, 1.2, 1.0, 'ice_crystal');
                            this.cockpit.score += 15;
                            alien.capture();
                        }
                    } else {
                        // Apply damage (Star: 1, Bubble: 2, Standard: 1)
                        let damage = 1;
                        if (this.activeWeapon === 'bubble_gum' && this.weaponTimer > 0) {
                            damage = 2;
                        }
                        alien.health -= damage;
                        
                        if (alien.health <= 0) {
                            this.spawnExplosionParticles(alien.x, alien.y, alien.z, '#f48fb1', 8, 1.0, 1.0, 'default');
                            this.spawnExplosionParticles(alien.x, alien.y, alien.z, '#80deea', 8, 1.0, 1.0, 'sparkle');
                            this.cockpit.score += 15;
                            alien.capture();
                        } else {
                            sounds.playShieldBounce();
                        }
                    }
                }
                return true;
            }
        }

        return false;
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
            
            this.cockpit.score += ast.maxHealth * 2; // Gem value = hits takes X2
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
            
            this.cockpit.score += ast.maxHealth * 2; // Gem value = hits takes X2
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
        if (this.gameOver) {
            // Game Over drift loop (only update stars and explosion particles, nothing else)
            this.stars.forEach(star => {
                star.update(this.speed * 0.1, dt, 0, 0); // drift slowly
                if (star.z <= 10) star.reset(this.width, this.height, false);
            });
            this.particles.forEach(p => p.update(this.speed * 0.1, dt, 0, 0));
            this.particles = this.particles.filter(p => p.life > 0 && p.z > 5);
            return;
        }

        // Increment survival timer and calculate danger level multiplier in Advanced Mode
        if (window.gameMode === 'advanced') {
            this.survivalTimer += dt;
            const currentLevel = Math.floor(this.survivalTimer / 30) + 1;
            if (currentLevel > this.lastDangerLevel) {
                this.lastDangerLevel = currentLevel;
                const multiplier = 1.0 + Math.log2(currentLevel) * 0.15;
                window.difficultyMultiplier = multiplier;
                window.ufoSpeedMultiplier = multiplier;

                // Spawning extra alien ships: 1 starting, +1 every 3 danger levels (level 4, 7, 10...)
                const targetAlienCount = 1 + Math.floor((currentLevel - 1) / 3);
                if (this.aliens.length < targetAlienCount) {
                    while (this.aliens.length < targetAlienCount) {
                        this.aliens.push(new AlienShip(this.width, this.height));
                    }
                    setTimeout(() => {
                        this.cockpit.addMessage("🛸 NEW ALIEN SHIP DETECTED! 🛸", "#80deea");
                    }, 1300);
                }

                // Visual warning notifications
                this.cockpit.addMessage(`🚨 WARNING: DANGER LEVEL ${currentLevel}! 🚨`, "#ff1744");
                setTimeout(() => {
                    this.cockpit.addMessage(`⚡ ALIEN SPEED x${multiplier.toFixed(2)}! ⚡`, "#ffea00");
                }, 650);

                if (window.sounds) {
                    sounds.playHorn();
                }
                this.screenShake = Math.max(this.screenShake, 18);
            }
        }

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

        // Keyboard inputs (Arcade Stick)
        let kbStickX = 0;
        let kbStickY = 0;
        let kbFiring = false;
        
        if (this.keys.ArrowLeft) kbStickX = -1;
        if (this.keys.ArrowRight) kbStickX = 1;
        if (this.keys.ArrowUp) kbStickY = -1;
        if (this.keys.ArrowDown) kbStickY = 1;
        if (this.keys.Space) kbFiring = true;

        if (kbStickX !== 0 || kbStickY !== 0 || kbFiring) {
            this.usingKeyboard = true;
            this.usingGamepad = false;
            this.usingTouch = false;
        }

        // Determine active input mode dynamically
        // Switch to Gamepad HUD drawing mode if there is active stick motion or any button is pressed
        const gpActiveSteer = Math.abs(gpStickX) > 0.05 || Math.abs(gpStickY) > 0.05;
        if (gpActiveSteer || anyButtonPressed) {
            this.usingGamepad = true;
            this.usingKeyboard = false;
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
        } else if (this.usingKeyboard) {
            this.targetTurnX = kbStickX * 950 * this.steerSensitivity;
            this.targetTurnY = kbStickY * 550 * this.steerSensitivity;
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
            if (gpFiring || this.isMousePressed || this.isTouchFiring || kbFiring) {
                // Shoot directly forward at the center reticle
                this.firePhaser(this.width / 2, this.height / 2);
            }
        }

        // Snappy interpolation for mouse-look (1.0 = instant direct mapping), smooth for sticks
        const activeDamping = (this.usingGamepad || this.usingTouch || this.usingKeyboard) ? this.steeringDamping : 1.0;
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

        // Update weapon timer
        if (this.weaponTimer > 0) {
            this.weaponTimer -= dt;
            if (this.weaponTimer <= 0) {
                this.activeWeapon = 'normal';
                this.cockpit.addMessage("WEAPON RESET", "#eceff1");
            }
        }

        // Update special power-up carrier UFO spawning timer
        const hasSpecialActive = this.aliens.some(a => a.isSpecial);
        if (!hasSpecialActive && !this.surpriseActive) {
            this.specialUfoTimer -= dt;
            if (this.specialUfoTimer <= 0) {
                this.nextUfoIsSpecial = true;
            }
        }

        // Update health canister power-up spawning timer (Advanced Mode only)
        if (window.gameMode === 'advanced') {
            this.healthCanisterTimer -= dt;
            if (this.healthCanisterTimer <= 0) {
                this.powerUps.push(new PowerUp(undefined, undefined, 1000, 'health_canister'));
                this.healthCanisterTimer = 60.0;
            }
        }

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
                const drawRadius = ast.radius * scale;

                let takeDamage = true;
                if (window.gameMode === 'advanced') {
                    // Check if it's visible on screen (within canvas boundaries)
                    const isVisible = (sx + drawRadius >= 0 && sx - drawRadius <= this.width &&
                                       sy + drawRadius >= 0 && sy - drawRadius <= this.height);
                    takeDamage = isVisible;
                }

                if (takeDamage) {
                    const wasShieldZero = (this.cockpit.shieldVal <= 0);

                    this.cockpit.triggerShieldFlash(window.gameMode === 'advanced' ? 70 : 40);
                    this.screenShake = 22;
                    sounds.playShieldBounce();
                    this.spawnShieldHitParticles(sx, sy);

                    if (window.gameMode === 'advanced') {
                        if (wasShieldZero) {
                            this.cockpit.healthVal = Math.max(0, this.cockpit.healthVal - 50);
                            this.cockpit.addMessage("⚠️ HULL INTEGRITY DAMAGED! -50%", "#ff1744");

                            if (this.cockpit.healthVal <= 0) {
                                this.triggerGameOver();
                            }
                        }
                    }
                }

                ast.reset(this.width, this.height, false);
            }
        });

        this.aliens.forEach(alien => {
            alien.update(this.speed, dt, this.turnX, this.turnY);
            
            // Check firing state
            if (alien.wantsToFire) {
                alien.wantsToFire = false;
                // Fire rate increased by another 50% (cooldown divided by 1.5 again)
                alien.fireTimer = 0.67 + Math.random() * 0.89;
                
                // Fire a single, highly aimed projectile
                const ox = (Math.random() - 0.5) * 20;
                const oy = (Math.random() - 0.5) * 10;
                const oz = alien.z;
                this.alienProjectiles.push(new AlienProjectile(alien.x + ox, alien.y + oy, oz, this.speed));
                
                if (window.sounds) {
                    sounds.playAlienLaser();
                }
            }

            if (alien.z <= 15 || alien.needsReset) {
                const spawnSpecial = this.nextUfoIsSpecial;
                alien.reset(this.width, this.height, false, spawnSpecial);
                if (spawnSpecial) {
                    this.nextUfoIsSpecial = false;
                    this.specialUfoTimer = 25 + Math.random() * 15; // More frequent spawns: 25-40 seconds interval
                }
            }
        });

        // Update alien projectiles and check player collision
        this.alienProjectiles.forEach(proj => {
            proj.update(this.speed, dt, this.turnX, this.turnY);
            
            if (proj.z <= 15) {
                const scale = this.focalLength / proj.z;
                const sx = this.width / 2 + proj.x * scale;
                const sy = this.height / 2 + proj.y * scale;
                const drawRadius = proj.radius * scale;
                
                const isVisible = (sx + drawRadius >= 0 && sx - drawRadius <= this.width &&
                                   sy + drawRadius >= 0 && sy - drawRadius <= this.height);
                
                if (isVisible) {
                    const wasShieldZero = (this.cockpit.shieldVal <= 0);
                    
                    // Half damage of asteroid: 35 shield, 25 hull
                    this.cockpit.triggerShieldFlash(35);
                    this.screenShake = 12;
                    sounds.playShieldBounce();
                    this.spawnShieldHitParticles(sx, sy);
                    
                    if (window.gameMode === 'advanced') {
                        if (wasShieldZero) {
                            this.cockpit.healthVal = Math.max(0, this.cockpit.healthVal - 25);
                            this.cockpit.addMessage("⚠️ HULL HIT! -25% INTEGRITY", "#ff1744");
                            
                            if (this.cockpit.healthVal <= 0) {
                                this.triggerGameOver();
                            }
                        }
                    }
                }
            }
        });
        this.alienProjectiles = this.alienProjectiles.filter(proj => proj.z > 15);

        // Update active powerups
        this.powerUps.forEach(pu => {
            pu.update(this.speed, dt, this.turnX, this.turnY);
        });
        this.powerUps = this.powerUps.filter(pu => pu.z > 15);

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
                
                // Whale stays for 12s, Phaser upgrade stays for 5.5s, Disco stays for 5s
                if (this.surpriseType === 'whale') {
                    this.surpriseTimer = 12.0;
                } else if (this.surpriseType === 'phaser') {
                    this.surpriseTimer = 5.5; // Shortened by 3 more seconds to limit chain reaction duration
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
        this.powerUps.forEach(pu => pu.draw(this.ctx, this.width, this.height, this.focalLength));
        this.alienProjectiles.forEach(proj => proj.draw(this.ctx, this.width, this.height, this.focalLength));
        
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
            this.heading,
            this.activeWeapon,
            this.weaponTimer
        );

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
        this.ctx.strokeStyle = (this.usingGamepad || this.usingKeyboard) ? '#e040fb' : '#39ff14'; // Pink for gamepad/keyboard, Green for mouse
        this.ctx.lineWidth = 3.5;
        this.ctx.lineCap = 'round';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = (this.usingGamepad || this.usingKeyboard) ? 'rgba(224, 64, 251, 0.5)' : 'rgba(57, 255, 20, 0.5)';

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
        this.ctx.fillStyle = (this.usingGamepad || this.usingKeyboard) ? '#e040fb' : '#39ff14';
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

    triggerGameOver() {
        this.gameOver = true;
        this.alienProjectiles = [];
        
        // Hide pointer lock cursor
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        
        // Play massive explosion chiptune sound!
        sounds.playExplosion();
        // Trigger screen shake
        this.screenShake = 40;
        
        // Let's spawn tons of explosion particles around the screen!
        for (let i = 0; i < 40; i++) {
            const rx = (Math.random() - 0.5) * 400;
            const ry = (Math.random() - 0.5) * 200;
            const rz = 20 + Math.random() * 200;
            this.spawnExplosionParticles(rx, ry, rz, '#ff3d00', 2, 3.0, 2.5, 'smoke');
            this.spawnExplosionParticles(rx, ry, rz, '#ffea00', 2, 2.0, 2.0, 'sparkle');
        }
        
        // Update Game Over score text
        const scoreVal = this.cockpit.score;
        document.getElementById('gameOverScore').innerText = `Score: ${scoreVal} Crystals`;
        
        // Check if score qualifies for top 10 high scores
        const qualifies = checkQualifiesForHighScore(scoreVal);
        const inputContainer = document.getElementById('highScoreInputContainer');
        if (qualifies) {
            inputContainer.classList.remove('hidden');
            document.getElementById('submitScoreBtn').disabled = false;
        } else {
            inputContainer.classList.add('hidden');
        }
        
        // Display high scores list
        this.refreshHighScoresBoard();
        
        // Show Game Over Overlay
        const overlay = document.getElementById('gameOverOverlay');
        overlay.classList.remove('hidden');
    }

    refreshHighScoresBoard() {
        const scores = getHighScores();
        const listEl = document.getElementById('highScoresList');
        listEl.innerHTML = '';
        scores.forEach((entry, idx) => {
            const li = document.createElement('li');
            const flag = entry.flag || '🚀';
            li.innerHTML = `<span class="rank">#${idx+1}</span> <span class="flag" style="margin-right: 8px; font-size: 1.15rem;">${flag}</span> <span class="name">${entry.name}</span> <span class="score">${entry.score} ✨</span>`;
            listEl.appendChild(li);
        });
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
    window.gameInstance = new Game();
    window.gameInstance.loop();
});
