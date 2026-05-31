// Space Rocket Game - Entities Definition

class Star {
    constructor(width, height) {
        this.reset(width, height, true);
    }

    reset(width, height, randomZ = false) {
        // Distribute stars in a cone shape extending ahead
        const angle = Math.random() * Math.PI * 2;
        const dist = 100 + Math.random() * 800;
        this.x = Math.cos(angle) * dist;
        this.y = Math.sin(angle) * dist;
        this.z = randomZ ? Math.random() * 1000 : 1000;
        
        // Cartoon star colors (pastel yellow, pink, cyan, white)
        const colors = ['#ffffff', '#fff5cc', '#ffe0f0', '#e0ffff', '#e8f5e9'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.size = 1 + Math.random() * 2; // Real physical size
    }

    update(speed, dt, turnX, turnY) {
        // Move towards camera
        this.z -= speed * dt;
        
        // Influence of ship turning
        this.x -= turnX * dt * (this.z / 1000);
        this.y -= turnY * dt * (this.z / 1000);
    }

    draw(ctx, width, height, f, speed) {
        if (this.z <= 10) return;

        const scale = f / this.z;
        const screenX = width / 2 + this.x * scale;
        const screenY = height / 2 + this.y * scale;

        // Don't draw if outside viewport
        if (screenX < 0 || screenX > width || screenY < 0 || screenY > height) return;

        const drawSize = Math.max(0.5, this.size * scale);

        ctx.fillStyle = this.color;
        
        // If ship is going fast, draw star trails for warp speed effect!
        if (speed > 400) {
            const prevZ = this.z + speed * 0.05; // Position in previous frames
            const prevScale = f / prevZ;
            const prevX = width / 2 + this.x * prevScale;
            const prevY = height / 2 + this.y * prevScale;

            ctx.beginPath();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = drawSize;
            ctx.lineCap = 'round';
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(screenX, screenY);
            ctx.stroke();
        } else {
            // Standard dot
            ctx.beginPath();
            ctx.arc(screenX, screenY, drawSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class Planet {
    constructor(width, height) {
        this.reset(width, height, true);
    }

    reset(width, height, randomZ = false) {
        const angle = Math.random() * Math.PI * 2;
        // Far off to the sides so they don't block the center view
        const dist = 300 + Math.random() * 500;
        this.x = Math.cos(angle) * dist;
        this.y = Math.sin(angle) * dist;
        this.z = randomZ ? 300 + Math.random() * 700 : 1000;
        
        this.radius = 80 + Math.random() * 120; // Big planet sizes
        this.rotation = Math.random() * Math.PI * 2;
        this.spinSpeed = (Math.random() - 0.5) * 0.1;

        // Cute cartoony palettes
        const palettes = [
            { main: '#ff5722', shadow: '#d84315', rings: '#ffb74d', hasRings: true }, // Orange striped gas giant
            { main: '#00bcd4', shadow: '#0097a7', rings: '#e0f7fa', hasRings: true }, // Ice blue ringed planet
            { main: '#e91e63', shadow: '#c2185b', rings: null, hasRings: false },    // Hot pink candy planet
            { main: '#9c27b0', shadow: '#7b1fa2', rings: '#e1bee7', hasRings: true }, // Purple mysterious planet
            { main: '#4caf50', shadow: '#388e3c', rings: null, hasRings: false },    // Green cartoon planet
            { main: '#ffeb3b', shadow: '#fbc02d', rings: '#fff9c4', hasRings: false } // Sweet yellow lemon planet
        ];
        
        const style = palettes[Math.floor(Math.random() * palettes.length)];
        this.color = style.main;
        this.shadowColor = style.shadow;
        this.hasRings = style.hasRings;
        this.ringColor = style.rings;
        this.ringAngle = (Math.random() - 0.5) * 0.5; // Tilting ring

        // Decorative craters or stripes
        this.styleType = Math.random() > 0.5 ? 'craters' : 'stripes';
        this.decorations = [];

        if (this.styleType === 'craters') {
            const count = 3 + Math.floor(Math.random() * 4);
            for (let i = 0; i < count; i++) {
                this.decorations.push({
                    cx: (Math.random() - 0.5) * 0.6, // Relative to center
                    cy: (Math.random() - 0.5) * 0.6,
                    cr: 0.1 + Math.random() * 0.2    // Relative to radius
                });
            }
        } else {
            // Stripes
            const count = 2 + Math.floor(Math.random() * 3);
            for (let i = 0; i < count; i++) {
                this.decorations.push({
                    y: (Math.random() - 0.5) * 0.7,
                    h: 0.1 + Math.random() * 0.15,
                    color: Math.random() > 0.5 ? style.shadow : '#ffffff33'
                });
            }
        }
    }

    update(speed, dt, turnX, turnY) {
        // Move towards camera very slowly
        this.z -= speed * 0.1 * dt; 
        
        // Influence of ship turning
        this.x -= turnX * dt * (this.z / 1000);
        this.y -= turnY * dt * (this.z / 1000);

        this.rotation += this.spinSpeed * dt;

        // If planet is fully passed the camera, respawn far away
        if (this.z <= 20) {
            this.reset(null, null, false);
        }
    }

    draw(ctx, width, height, f) {
        if (this.z <= 20) return;

        const scale = f / this.z;
        const screenX = width / 2 + this.x * scale;
        const screenY = height / 2 + this.y * scale;
        const drawRadius = this.radius * scale;

        // Don't draw if outside viewport + radius
        if (screenX + drawRadius < 0 || screenX - drawRadius > width ||
            screenY + drawRadius < 0 || screenY - drawRadius > height) return;

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(this.ringAngle);

        // Ring - Back side (drawn BEFORE the planet to look 3D)
        if (this.hasRings) {
            ctx.beginPath();
            ctx.ellipse(0, 0, drawRadius * 1.8, drawRadius * 0.4, 0, Math.PI, 0);
            ctx.strokeStyle = this.ringColor;
            ctx.lineWidth = drawRadius * 0.15;
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        // Draw Planet Body (Base circle)
        ctx.beginPath();
        ctx.arc(0, 0, drawRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        // Clip decorations to planet body
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, drawRadius, 0, Math.PI * 2);
        ctx.clip();

        // Draw shadow layer for cartoony volume
        ctx.beginPath();
        ctx.arc(drawRadius * 0.3, drawRadius * 0.3, drawRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.shadowColor;
        // Simple subtraction to get shadow on bottom right
        ctx.fill('evenodd'); 

        // Draw decorations
        ctx.rotate(this.rotation);
        if (this.styleType === 'craters') {
            this.decorations.forEach(crater => {
                ctx.beginPath();
                ctx.arc(crater.cx * drawRadius, crater.cy * drawRadius, crater.cr * drawRadius, 0, Math.PI * 2);
                ctx.fillStyle = this.shadowColor;
                ctx.fill();
                
                // Crater rim highlight
                ctx.beginPath();
                ctx.arc(crater.cx * drawRadius - 1, crater.cy * drawRadius - 1, crater.cr * drawRadius, 0, Math.PI * 2);
                ctx.strokeStyle = '#ffffff22';
                ctx.lineWidth = Math.max(1, drawRadius * 0.02);
                ctx.stroke();
            });
        } else {
            // Stripes
            this.decorations.forEach(stripe => {
                ctx.fillStyle = stripe.color;
                ctx.fillRect(-drawRadius * 1.5, stripe.y * drawRadius, drawRadius * 3, stripe.h * drawRadius);
            });
        }
        ctx.restore(); // End clipping

        // Planet Outline (Very cartoony)
        ctx.beginPath();
        ctx.arc(0, 0, drawRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#263238'; // Dark charcoal cartoon outline
        ctx.lineWidth = Math.max(2, drawRadius * 0.05);
        ctx.stroke();

        // Ring - Front side (drawn AFTER the planet to look 3D)
        if (this.hasRings) {
            ctx.beginPath();
            ctx.ellipse(0, 0, drawRadius * 1.8, drawRadius * 0.4, 0, 0, Math.PI);
            ctx.strokeStyle = this.ringColor;
            ctx.lineWidth = drawRadius * 0.15;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Ring outline
            ctx.beginPath();
            ctx.ellipse(0, 0, drawRadius * 1.8, drawRadius * 0.4, 0, 0, Math.PI);
            ctx.strokeStyle = '#263238';
            ctx.lineWidth = Math.max(1, drawRadius * 0.02);
            // Draw a slightly outer ring for outline
            ctx.ellipse(0, 0, drawRadius * 1.8 + drawRadius * 0.07, drawRadius * 0.4 + drawRadius * 0.02, 0, 0, Math.PI);
            ctx.stroke();
        }

        ctx.restore();
    }
}

class Asteroid {
    constructor(width, height) {
        this.reset(width, height, true);
    }

    reset(width, height, randomZ = false) {
        // Place in front, spread out in coordinates
        const angle = Math.random() * Math.PI * 2;
        const dist = 50 + Math.random() * 250;
        this.x = Math.cos(angle) * dist;
        this.y = Math.sin(angle) * dist;
        this.z = randomZ ? 300 + Math.random() * 700 : 1000;
        
        this.radius = 25 + Math.random() * 30; // Physical radius
        this.rotation = Math.random() * Math.PI * 2;
        this.spinSpeed = (Math.random() - 0.5) * 1.5;

        // Freeze state variables
        this.state = 'normal'; // 'normal', 'frozen'
        this.freezeTimer = 0;

        // Custom polygon vertices to make asteroids bumpy
        this.vertexCount = 7 + Math.floor(Math.random() * 4);
        this.vertexOffsets = [];
        for (let i = 0; i < this.vertexCount; i++) {
            // Vary length of each spoke by 15-30%
            this.vertexOffsets.push(0.75 + Math.random() * 0.35);
        }

        // Cartoony asteroid colors (warm gray, purple, brownish orange)
        const colors = [
            { main: '#78909c', shadow: '#546e7a', craters: '#455a64' }, // Gray
            { main: '#ab47bc', shadow: '#8e24aa', craters: '#7b1fa2' }, // Purple space crystal
            { main: '#8d6e63', shadow: '#6d4c41', craters: '#5d4037' }  // Brown space rock
        ];
        const choice = colors[Math.floor(Math.random() * colors.length)];
        this.color = choice.main;
        this.shadowColor = choice.shadow;
        this.craterColor = choice.craters;

        // Small decorative craters
        this.craters = [];
        const craterCount = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < craterCount; i++) {
            this.craters.push({
                x: (Math.random() - 0.5) * 0.4,
                y: (Math.random() - 0.5) * 0.4,
                r: 0.1 + Math.random() * 0.15
            });
        }

        // Set health based on game mode and color
        if (window.gameMode === 'advanced') {
            if (this.color === '#ab47bc') {
                this.maxHealth = 4; // Purple space crystals are hardest (4 hits)
            } else if (this.color === '#8d6e63') {
                this.maxHealth = 3; // Brown rocks are medium (3 hits)
            } else {
                this.maxHealth = 2; // Gray rocks are basic (2 hits)
            }
        } else {
            this.maxHealth = 1; // Child Friendly mode (1 hit)
        }
        this.health = this.maxHealth;
    }

    update(speed, dt, turnX, turnY) {
        if (this.state === 'frozen') {
            this.z -= speed * 0.15 * dt; // drifts very slowly
            this.freezeTimer -= dt;
            if (this.freezeTimer <= 0) {
                this.state = 'normal';
            }
        } else {
            this.z -= speed * dt;
            this.rotation += this.spinSpeed * dt;
        }
        
        // Influence of ship turning
        this.x -= turnX * dt * (this.z / 1000);
        this.y -= turnY * dt * (this.z / 1000);
    }

    draw(ctx, width, height, f) {
        if (this.z <= 5) return;

        const scale = f / this.z;
        const screenX = width / 2 + this.x * scale;
        const screenY = height / 2 + this.y * scale;
        const drawRadius = this.radius * scale;

        // Outside boundary? Skip
        if (screenX + drawRadius < -100 || screenX - drawRadius > width + 100 ||
            screenY + drawRadius < -100 || screenY - drawRadius > height + 100) return;

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(this.rotation);

        // Draw main body shape
        ctx.beginPath();
        for (let i = 0; i < this.vertexCount; i++) {
            const angle = (i / this.vertexCount) * Math.PI * 2;
            const dist = drawRadius * this.vertexOffsets[i];
            const vx = Math.cos(angle) * dist;
            const vy = Math.sin(angle) * dist;
            if (i === 0) ctx.moveTo(vx, vy);
            else ctx.lineTo(vx, vy);
        }
        ctx.closePath();

        // Custom colors for ice/freeze ray state
        let mainColor = this.color;
        let shadowColor = this.shadowColor;
        let craterColor = this.craterColor;

        if (this.state === 'frozen') {
            mainColor = '#e0f7fa'; // ice white
            shadowColor = '#b2ebf2'; // cold cyan
            craterColor = '#4dd0e1'; // deep frost
        }

        ctx.fillStyle = mainColor;
        ctx.fill();

        // Dark side shading (half of the rock in shadow)
        ctx.save();
        // Setup clip inside the asteroid body
        ctx.clip();
        
        // Shadow drawing
        ctx.beginPath();
        ctx.arc(drawRadius * 0.2, drawRadius * 0.2, drawRadius * 1.1, 0, Math.PI * 2);
        ctx.fillStyle = shadowColor;
        ctx.fill('evenodd');

        // Draw craters
        this.craters.forEach(crater => {
            ctx.beginPath();
            ctx.arc(crater.x * drawRadius, crater.y * drawRadius, crater.r * drawRadius, 0, Math.PI * 2);
            ctx.fillStyle = craterColor;
            ctx.fill();

            // Crater inner highlight
            ctx.beginPath();
            ctx.arc(crater.x * drawRadius - 1, crater.y * drawRadius - 1, crater.r * drawRadius, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffffff15';
            ctx.lineWidth = Math.max(1, drawRadius * 0.02);
            ctx.stroke();
        });

        ctx.restore();

        // Extra frosty snowflake outline details if frozen
        if (this.state === 'frozen') {
            ctx.save();
            ctx.strokeStyle = '#ffffffaa';
            ctx.lineWidth = Math.max(1.5, drawRadius * 0.04);
            ctx.beginPath();
            // simple snowflake cross lines
            ctx.moveTo(-drawRadius * 0.35, -drawRadius * 0.35);
            ctx.lineTo(drawRadius * 0.35, drawRadius * 0.35);
            ctx.moveTo(drawRadius * 0.35, -drawRadius * 0.35);
            ctx.lineTo(-drawRadius * 0.35, drawRadius * 0.35);
            ctx.moveTo(-drawRadius * 0.45, 0);
            ctx.lineTo(drawRadius * 0.45, 0);
            ctx.stroke();
            ctx.restore();
        }

        // Thick outline
        ctx.beginPath();
        for (let i = 0; i < this.vertexCount; i++) {
            const angle = (i / this.vertexCount) * Math.PI * 2;
            const dist = drawRadius * this.vertexOffsets[i];
            const vx = Math.cos(angle) * dist;
            const vy = Math.sin(angle) * dist;
            if (i === 0) ctx.moveTo(vx, vy);
            else ctx.lineTo(vx, vy);
        }
        ctx.closePath();
        ctx.strokeStyle = this.state === 'frozen' ? '#00838f' : '#263238'; // cold blue outline for frozen rocks
        ctx.lineWidth = Math.max(2, drawRadius * 0.08);
        ctx.stroke();

        // Draw arcade health bar in Advanced Mode if damaged
        if (window.gameMode === 'advanced' && this.health < this.maxHealth && this.z > 15) {
            ctx.save();
            const barW = drawRadius * 1.0;
            const barH = 5;
            const bx = -barW / 2;
            const by = -drawRadius - 12;

            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(bx, by, barW, barH);

            const pct = this.health / this.maxHealth;
            ctx.fillStyle = pct > 0.5 ? '#39ff14' : pct > 0.25 ? '#ffeb3b' : '#ff1744';
            ctx.fillRect(bx, by, barW * pct, barH);

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.strokeRect(bx, by, barW, barH);
            ctx.restore();
        }

        ctx.restore();
    }

    // Detect if mouse phaser click hits this asteroid
    checkHit(mx, my, width, height, f) {
        if (this.z <= 10) return false;

        const scale = f / this.z;
        const screenX = width / 2 + this.x * scale;
        const screenY = height / 2 + this.y * scale;
        const drawRadius = this.radius * scale;

        // Simple circle collision with the phaser coordinate
        const dx = mx - screenX;
        const dy = my - screenY;
        return (dx * dx + dy * dy) < (drawRadius * drawRadius);
    }
}

class AlienShip {
    constructor(width, height, isSpecial = false) {
        this.reset(width, height, true, isSpecial);
    }

    reset(width, height, randomZ = false, isSpecial = false) {
        // Spawn ahead, but off center to let it drift across
        this.x = (Math.random() - 0.5) * 300;
        this.y = (Math.random() - 0.5) * 150;
        this.z = randomZ ? 400 + Math.random() * 500 : 1000;
        
        this.isSpecial = isSpecial;
        this.radius = isSpecial ? 70 : 35; // 2x as big for the special power-up carrier!
        
        if (isSpecial) {
            this.color = '#ffd700'; // Special shimmery gold color
            this.domeColor = 'rgba(255, 64, 129, 0.7)'; // Hot pink dome
        } else {
            this.color = ['#00e676', '#ff1744', '#2979ff', '#ffea00'][Math.floor(Math.random() * 4)]; // Neon colors
            this.domeColor = 'rgba(128, 222, 234, 0.6)'; // Translucent cyan
        }

        // Navigation path parameters (aliens wander around playfully)
        this.t = Math.random() * 100;
        if (window.gameMode === 'advanced') {
            // Speed weaving scaled down by half again (now ~1/6 of original speed)
            this.driftSpeed = isSpecial ? 1.05 + Math.random() * 0.65 : 0.8 + Math.random() * 0.95;
        } else {
            this.driftSpeed = isSpecial ? 1.0 + Math.random() * 0.8 : 0.5 + Math.random() * 1.5;
        }
        this.phaseOffset = Math.random() * Math.PI * 2;

        this.lightsColor = '#ffff00';
        this.lightsTimer = 0;

        // Firing behavior (Advanced Mode blasters - fire rate doubled)
        this.fireTimer = 0.67 + Math.random() * 1.33; // initial shot delay
        this.wantsToFire = false;

        // Interactive States
        this.state = 'normal'; // 'normal', 'bubble', 'frozen'
        this.bubbleTimer = 0;
        this.freezeTimer = 0;
        this.spinAngle = 0;
        this.spinSpeed = 0;
        
        this.maxHealth = (isSpecial && window.gameMode === 'advanced') ? 5 : 1;
        this.health = this.maxHealth;
        this.needsReset = false; // Flag for game.js to handle capture reset
    }

    update(speed, dt, turnX, turnY) {
        const globalSpeedMult = (window.gameMode === 'advanced' && window.ufoSpeedMultiplier) ? window.ufoSpeedMultiplier : 1.0;
        const ufoSpeedMult = this.isSpecial ? 1.0 : globalSpeedMult; // Special UFO speed is constant to make it easier to hit
        this.t += dt * this.driftSpeed * ufoSpeedMult;
        this.lightsTimer += dt;
        
        // Slowly float towards the player, but stay floating longer than asteroids
        if (this.state === 'frozen') {
            this.z -= Math.min(20, speed * 0.05) * dt; // Drifts extremely slowly when frozen
            this.freezeTimer -= dt;
            if (this.freezeTimer <= 0) {
                this.state = 'normal';
            }
        } else if (this.isSpecial) {
            // Keep special ship on screen (approaches slower than normal ships to stay visible longer)
            const approachMult = (window.gameMode === 'advanced') ? 0.12 : 0.12;
            const maxZApproach = (window.gameMode === 'advanced') ? 45 : 60;
            this.z -= Math.min(maxZApproach * ufoSpeedMult, speed * approachMult * ufoSpeedMult) * dt;
        } else {
            // Approach speed in advanced mode is slower than asteroids (speed * 0.4 vs speed * 1.0)
            const zSpeed = (window.gameMode === 'advanced') ? speed * 0.4 : speed * 0.6;
            this.z -= zSpeed * ufoSpeedMult * dt;
        }

        // Alien shooting cooldown countdown
        if (window.gameMode === 'advanced' && this.state === 'normal' && this.z > 80 && this.z < 950) {
            this.fireTimer -= dt;
            if (this.fireTimer <= 0) {
                this.wantsToFire = true;
            }
        }

        // Add some playful floating motion (sine wave curves)
        if (this.state === 'normal') {
            if (window.gameMode === 'advanced') {
                const dl = (window.gameInstance && window.gameInstance.lastDangerLevel) ? window.gameInstance.lastDangerLevel : 1;
                
                // Decoupled Amplitude Weaving: derivative of sine/cosine path scaled by freq & driftSpeed & speed multiplier
                const freqX = this.isSpecial ? 1.5 : 1.0;
                const freqY = this.isSpecial ? 1.2 : 0.8;
                
                // Wider sweeps: at least twice as far as before (decoupled from frequency scaling)
                const weaveX = this.isSpecial ? 450 : 250;
                const weaveY = this.isSpecial ? 240 : 140;
                
                this.x += Math.cos(this.t * freqX + this.phaseOffset) * freqX * this.driftSpeed * ufoSpeedMult * weaveX * dt;
                this.y += -Math.sin(this.t * freqY) * freqY * this.driftSpeed * ufoSpeedMult * weaveY * dt;

                // Tier 2 (Levels 4-6): Superimpose circular loop spirals
                if (dl >= 4) {
                    const spiralRad = this.isSpecial ? 120 : 80;
                    const spiralFreq = 3.0;
                    this.x += Math.cos(this.t * spiralFreq) * spiralFreq * this.driftSpeed * ufoSpeedMult * spiralRad * dt;
                    this.y += -Math.sin(this.t * spiralFreq) * spiralFreq * this.driftSpeed * ufoSpeedMult * spiralRad * dt;
                }

                // Tier 3 (Levels 7+): Superimpose circular loops plus high-frequency zig-zag and quantum teleportation jitter
                if (dl >= 7) {
                    const zigFreqX = 7.0;
                    const zigFreqY = 6.0;
                    const zigX = this.isSpecial ? 250 : 150;
                    const zigY = this.isSpecial ? 150 : 90;
                    
                    this.x += -Math.sin(this.t * zigFreqX) * zigFreqX * this.driftSpeed * ufoSpeedMult * zigX * dt;
                    this.y += Math.cos(this.t * zigFreqY) * zigFreqY * this.driftSpeed * ufoSpeedMult * zigY * dt;

                    // Small random glitch jump/teleport (5% chance per frame)
                    if (Math.random() < 0.05) {
                        this.x += (Math.random() - 0.5) * 60;
                        this.y += (Math.random() - 0.5) * 30;
                    }
                }
            } else {
                // Child Friendly Mode: Standard slower, simple, narrower weaving (also decoupled)
                if (this.isSpecial) {
                    const freqX = 1.5;
                    const freqY = 1.2;
                    this.x += Math.cos(this.t * freqX + this.phaseOffset) * freqX * this.driftSpeed * 115 * dt;
                    this.y += -Math.sin(this.t * freqY) * freqY * this.driftSpeed * 65 * dt;
                } else {
                    const freqX = 1.0;
                    const freqY = 0.8;
                    this.x += Math.cos(this.t * freqX + this.phaseOffset) * freqX * this.driftSpeed * 50 * dt;
                    this.y += -Math.sin(this.t * freqY) * freqY * this.driftSpeed * 30 * dt;
                }
            }
        } else if (this.state === 'bubble') {
            // Spin happily inside the bubble and drift upward
            this.spinAngle += this.spinSpeed * dt;
            this.y -= 40 * dt; // Float up!
            this.bubbleTimer -= dt;
            if (this.bubbleTimer <= 0) {
                // Warp away: set needsReset flag for game.js to reset it
                this.needsReset = true;
            }
        }

        // Steer offsets
        this.x -= turnX * dt * (this.z / 1000);
        this.y -= turnY * dt * (this.z / 1000);

        // Flashing lights
        if (this.lightsTimer > 0.15) {
            this.lightsColor = this.lightsColor === '#ffff00' ? '#ff3d00' : '#ffff00';
            this.lightsTimer = 0;
        }
    }

    draw(ctx, width, height, f) {
        if (this.z <= 10) return;

        const scale = f / this.z;
        const screenX = width / 2 + this.x * scale;
        const screenY = height / 2 + this.y * scale;
        const r = this.radius * scale;

        // Skip drawing if way offscreen
        if (screenX + r < -100 || screenX - r > width + 100 ||
            screenY + r < -100 || screenY - r > height + 100) return;

        ctx.save();
        ctx.translate(screenX, screenY);

        // Draw outer glowing halo if it is the special power-up carrier UFO
        if (this.isSpecial && this.state === 'normal') {
            ctx.save();
            const pulse = 1.0 + Math.sin(Date.now() * 0.009) * 0.12;
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.45)';
            ctx.lineWidth = Math.max(5, r * 0.14 * pulse);
            ctx.beginPath();
            ctx.ellipse(0, r * 0.1, r * 1.15, r * 0.5, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Inner thinner bright gold line
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = Math.max(2, r * 0.05);
            ctx.stroke();
            ctx.restore();
        }
        
        // Rotate alien if spinning (when hit)
        if (this.state === 'bubble') {
            ctx.rotate(this.spinAngle);
        }

        // Draw Cute Alien UFO
        
        // Setup colors for frozen / normal state
        let mainColor = this.color;
        let domeColor = this.domeColor;
        if (this.state === 'frozen') {
            mainColor = '#e0f7fa'; // ice-white flying saucer
            domeColor = 'rgba(77, 208, 225, 0.65)'; // icy cyan dome
        }

        // 1. Alien Cockpit Dome
        ctx.beginPath();
        ctx.arc(0, -r * 0.1, r * 0.5, Math.PI, 0);
        ctx.fillStyle = domeColor;
        ctx.fill();
        ctx.strokeStyle = '#263238';
        ctx.lineWidth = Math.max(1.5, r * 0.05);
        ctx.stroke();

        // 2. Cute Little Alien inside
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, -r * 0.1, r * 0.5, Math.PI, 0);
        ctx.clip(); // clip to dome
        
        // Draw head
        ctx.beginPath();
        ctx.arc(0, -r * 0.15, r * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = '#81c784'; // Light green alien
        ctx.fill();
        ctx.strokeStyle = '#263238';
        ctx.lineWidth = Math.max(1, r * 0.03);
        ctx.stroke();

        // Cute alien eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-r * 0.08, -r * 0.18, r * 0.07, 0, Math.PI * 2);
        ctx.arc(r * 0.08, -r * 0.18, r * 0.07, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#263238';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Pupils looking at player
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(-r * 0.07, -r * 0.18, r * 0.03, 0, Math.PI * 2);
        ctx.arc(r * 0.09, -r * 0.18, r * 0.03, 0, Math.PI * 2);
        ctx.fill();

        // Cute smiling mouth
        ctx.beginPath();
        ctx.arc(0, -r * 0.11, r * 0.06, 0, Math.PI);
        ctx.strokeStyle = '#263238';
        ctx.stroke();

        ctx.restore();

        // 3. UFO Flying Saucer Metal Rim (Main saucer ring)
        ctx.beginPath();
        ctx.ellipse(0, r * 0.1, r, r * 0.35, 0, 0, Math.PI * 2);
        ctx.fillStyle = mainColor;
        ctx.fill();
        ctx.strokeStyle = '#263238';
        ctx.lineWidth = Math.max(2, r * 0.08);
        ctx.stroke();

        // 4. Highlight stripe on saucer for cartoony shine
        ctx.beginPath();
        ctx.ellipse(0, r * 0.05, r * 0.85, r * 0.15, 0, Math.PI, 0);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = Math.max(1, r * 0.04);
        ctx.stroke();

        // 5. Flashing Under-Lights
        const lightPositions = [-0.6, -0.2, 0.2, 0.6];
        lightPositions.forEach(pos => {
            ctx.beginPath();
            ctx.arc(r * pos, r * 0.18, r * 0.08, 0, Math.PI * 2);
            ctx.fillStyle = this.lightsColor;
            ctx.fill();
            ctx.strokeStyle = '#263238';
            ctx.lineWidth = Math.max(1, r * 0.03);
            ctx.stroke();
        });

        // Extra frosty snowflake outline details if frozen
        if (this.state === 'frozen') {
            ctx.save();
            ctx.strokeStyle = '#ffffffaa';
            ctx.lineWidth = Math.max(1.5, r * 0.04);
            ctx.beginPath();
            ctx.moveTo(-r * 0.35, -r * 0.35);
            ctx.lineTo(r * 0.35, r * 0.35);
            ctx.moveTo(r * 0.35, -r * 0.35);
            ctx.lineTo(-r * 0.35, r * 0.35);
            ctx.moveTo(-r * 0.45, 0);
            ctx.lineTo(r * 0.45, 0);
            ctx.stroke();
            ctx.restore();
        }

        // Draw arcade health bar for special UFO in Advanced Mode if damaged
        if (window.gameMode === 'advanced' && this.isSpecial && this.health < this.maxHealth && this.state === 'normal') {
            ctx.save();
            const barW = r * 1.2;
            const barH = 6;
            const bx = -barW / 2;
            const by = -r * 0.8;

            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(bx, by, barW, barH);

            const pct = this.health / this.maxHealth;
            ctx.fillStyle = '#ffd700'; // Golden health bar for special UFO!
            ctx.fillRect(bx, by, barW * pct, barH);

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(bx, by, barW, barH);
            ctx.restore();
        }

        ctx.restore();

        // Draw a cute rainbow bubble around the alien if tagged/bubble state
        if (this.state === 'bubble') {
            ctx.save();
            ctx.translate(screenX, screenY);
            
            // Pulsing rainbow border
            const bubblePulse = 1 + Math.sin(Date.now() * 0.01) * 0.05;
            const bubbleRadius = r * 1.3 * bubblePulse;

            // Shiny bubble gradient
            const grad = ctx.createRadialGradient(-bubbleRadius*0.3, -bubbleRadius*0.3, bubbleRadius*0.1, 0, 0, bubbleRadius);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
            grad.addColorStop(0.5, 'rgba(255, 200, 255, 0.25)');
            grad.addColorStop(0.8, 'rgba(128, 222, 234, 0.3)');
            grad.addColorStop(1, 'rgba(233, 30, 99, 0.45)'); // pink bubble rim

            ctx.beginPath();
            ctx.arc(0, 0, bubbleRadius, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            // Rainbow outline
            ctx.beginPath();
            ctx.arc(0, 0, bubbleRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = Math.max(2, r * 0.06);
            ctx.stroke();
            
            ctx.restore();
        }
    }

    // Detect laser hit
    checkHit(mx, my, width, height, f) {
        if (this.z <= 10 || this.state !== 'normal') return false;

        const scale = f / this.z;
        const screenX = width / 2 + this.x * scale;
        const screenY = height / 2 + this.y * scale;
        const r = this.radius * scale;

        const dx = mx - screenX;
        const dy = my - screenY;
        return (dx * dx + dy * dy) < (r * r * 1.2); // Slightly generous hitbox
    }

    // Wrap the alien in a friendly tag bubble
    capture() {
        this.state = 'bubble';
        this.bubbleTimer = 2.0; // Stay on screen spinning for 2 seconds
        this.spinSpeed = Math.PI * 3; // Fast spin!
    }
}

class PhaserBeam {
    constructor(mx, my, screenWidth, screenHeight, typeOrColor = null, startRatio = null) {
        this.endX = mx;
        this.endY = my;
        this.type = 'normal';
        this.color = '#00ffff';
        this.isWavy = false;

        const weaponTypes = ['star_wand', 'bubble_gum', 'ice_cream'];

        if (typeOrColor && weaponTypes.includes(typeOrColor)) {
            this.type = typeOrColor;
            this.life = 0.20;
            this.maxLife = 0.20;
        } else if (typeOrColor && (typeOrColor.startsWith('#') || typeOrColor === 'rainbow')) {
            this.color = typeOrColor;
            if (startRatio !== null) {
                this.isWavy = true;
                this.life = 0.22;
                this.maxLife = 0.22;
            } else {
                this.life = 0.15;
                this.maxLife = 0.15;
            }
        } else {
            // Default random laser colors
            this.life = 0.15;
            this.maxLife = 0.15;
            if (typeOrColor) {
                this.color = typeOrColor;
            } else {
                const colors = ['#00ffff', '#39ff14', '#ff007f', '#ffff00', '#ff00ff'];
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }
        }

        // Setup firing positions
        if (startRatio !== null) {
            this.startX1 = screenWidth * startRatio;
            this.startY1 = screenHeight;
        } else {
            this.startX1 = screenWidth * 0.25;
            this.startY1 = screenHeight;
            this.startX2 = screenWidth * 0.75;
            this.startY2 = screenHeight;
        }
    }

    update(dt) {
        this.life -= dt;
    }

    draw(ctx) {
        if (this.life <= 0) return;

        const alpha = this.life / this.maxLife;

        // Custom weapon types drawing
        if (this.type === 'star_wand') {
            ctx.save();
            ctx.globalAlpha = alpha;
            this.drawStarBeam(ctx, this.startX1, this.startY1, this.endX, this.endY);
            if (this.startX2 !== undefined) {
                this.drawStarBeam(ctx, this.startX2, this.startY2, this.endX, this.endY);
            }
            ctx.restore();
            return;
        }
        if (this.type === 'bubble_gum') {
            ctx.save();
            ctx.globalAlpha = alpha;
            this.drawBubbleBeam(ctx, this.startX1, this.startY1, this.endX, this.endY);
            if (this.startX2 !== undefined) {
                this.drawBubbleBeam(ctx, this.startX2, this.startY2, this.endX, this.endY);
            }
            ctx.restore();
            return;
        }
        if (this.type === 'ice_cream') {
            ctx.save();
            ctx.globalAlpha = alpha;
            this.drawFreezeBeam(ctx, this.startX1, this.startY1, this.endX, this.endY);
            if (this.startX2 !== undefined) {
                this.drawFreezeBeam(ctx, this.startX2, this.startY2, this.endX, this.endY);
            }
            ctx.restore();
            return;
        }
        
        if (this.isWavy) {
            this.drawSingleWavyBeam(ctx, this.startX1, this.startY1, this.endX, this.endY, alpha);
            return;
        }

        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Outer glowing line
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.strokeStyle = this.color;
        
        // Beam 1 (Left cannon)
        ctx.beginPath();
        ctx.moveTo(this.startX1, this.startY1);
        ctx.lineTo(this.endX, this.endY);
        ctx.stroke();

        // Beam 2 (Right cannon)
        if (this.startX2 !== undefined) {
            ctx.beginPath();
            ctx.moveTo(this.startX2, this.startY2);
            ctx.lineTo(this.endX, this.endY);
            ctx.stroke();
        }

        // Inner white hot core
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#ffffff';
        
        ctx.beginPath();
        ctx.moveTo(this.startX1, this.startY1);
        ctx.lineTo(this.endX, this.endY);
        ctx.stroke();

        if (this.startX2 !== undefined) {
            ctx.beginPath();
            ctx.moveTo(this.startX2, this.startY2);
            ctx.lineTo(this.endX, this.endY);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawStarBeam(ctx, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const steps = 8;
        
        // Glowing path
        ctx.strokeStyle = 'rgba(255, 235, 59, 0.4)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        const colors = ['#ffff00', '#ff4081', '#00e5ff', '#39ff14', '#e040fb'];
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const px = x1 + dx * t;
            const py = y1 + dy * t;
            const size = (9 + Math.sin(t * Math.PI * 4.0 - this.life * 30) * 4) * (1.0 - t * 0.4);
            const color = colors[(i + Math.floor(this.life * 10)) % colors.length];
            this.drawSingleStar(ctx, px, py, size, color);
        }
    }

    drawSingleStar(ctx, cx, cy, r, color) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.strokeStyle = '#263238';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a1 = (i / 5) * Math.PI * 2 - Math.PI / 2;
            const a2 = ((i + 0.5) / 5) * Math.PI * 2 - Math.PI / 2;
            ctx.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
            ctx.lineTo(cx + Math.cos(a2) * (r * 0.45), cy + Math.sin(a2) * (r * 0.45));
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    drawBubbleBeam(ctx, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const steps = 7;

        // Glowing pink background path
        ctx.strokeStyle = 'rgba(248, 187, 208, 0.4)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const px = x1 + dx * t;
            const py = y1 + dy * t;
            const size = (5 + t * 14) * (1.0 + Math.sin(this.life * 25 + t * 6) * 0.12);
            
            ctx.fillStyle = 'rgba(255, 64, 129, 0.6)';
            ctx.strokeStyle = '#ff4081';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // highlight glint
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px - size * 0.35, py - size * 0.35, size * 0.22, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawFreezeBeam(ctx, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const steps = Math.floor(distance / 12);
        
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Outer neon cyan helix
        ctx.lineWidth = 4.5;
        ctx.strokeStyle = '#00e5ff';
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            let px = x1 + dx * t;
            let py = y1 + dy * t;
            const offset = Math.sin(t * Math.PI * 8.0 - this.life * 35) * 16 * Math.sin(t * Math.PI);
            px += Math.cos(angle + Math.PI / 2) * offset;
            py += Math.sin(angle + Math.PI / 2) * offset;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Inner white/pale blue helix
        ctx.lineWidth = 3.0;
        ctx.strokeStyle = '#e0f7fa';
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            let px = x1 + dx * t;
            let py = y1 + dy * t;
            const offset = -Math.sin(t * Math.PI * 8.0 - this.life * 35) * 16 * Math.sin(t * Math.PI);
            px += Math.cos(angle + Math.PI / 2) * offset;
            py += Math.sin(angle + Math.PI / 2) * offset;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
    }

    drawSingleWavyBeam(ctx, x1, y1, x2, y2, alpha) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        const steps = Math.floor(distance / 12);
        
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const timePhase = this.life * 45;
        
        // 1. Draw outer colored glow wave
        ctx.lineWidth = 12;
        ctx.strokeStyle = this.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            let px = x1 + dx * t;
            let py = y1 + dy * t;
            
            // Perpendicular sine wave offset (0 offset at start and target end points)
            const waveOffset = Math.sin(t * Math.PI * 5.0 - timePhase) * 16 * Math.sin(t * Math.PI);
            px += Math.cos(angle + Math.PI / 2) * waveOffset;
            py += Math.sin(angle + Math.PI / 2) * waveOffset;
            
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.stroke();
        
        // 2. Draw inner white-hot core
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = alpha * 0.95;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            let px = x1 + dx * t;
            let py = y1 + dy * t;
            const waveOffset = Math.sin(t * Math.PI * 5.0 - timePhase) * 16 * Math.sin(t * Math.PI);
            px += Math.cos(angle + Math.PI / 2) * waveOffset;
            py += Math.sin(angle + Math.PI / 2) * waveOffset;
            
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.stroke();
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, z, color, sizeMultiplier = 1.0, speedMultiplier = 1.0, type = 'default') {
        this.x = x;
        this.y = y;
        this.z = z;
        this.type = type;
        
        // Spread velocities (slower for smoke, none for expanding rings)
        let baseSpeed = 200;
        if (type === 'smoke') baseSpeed = 110;
        if (type === 'ring') baseSpeed = 0;
        if (type === 'bubble') baseSpeed = 60;
        
        this.vx = (Math.random() - 0.5) * baseSpeed * speedMultiplier;
        this.vy = (Math.random() - 0.5) * baseSpeed * speedMultiplier;
        this.vz = (Math.random() - 0.5) * (baseSpeed / 2) * speedMultiplier;
        
        this.radius = (3 + Math.random() * 5) * sizeMultiplier;
        if (type === 'smoke') this.radius = (14 + Math.random() * 16) * sizeMultiplier;
        if (type === 'ring') this.radius = 8 * sizeMultiplier;
        if (type === 'bubble') this.radius = (12 + Math.random() * 8) * sizeMultiplier;
        
        this.color = color;
        this.life = (0.4 + Math.random() * 0.4) * sizeMultiplier;
        if (type === 'ring') this.life = 0.35 * sizeMultiplier;
        this.maxLife = this.life;
    }

    update(speed, dt, turnX, turnY) {
        if (this.type === 'ring') {
            // Rapid shockwave expansion
            this.radius += dt * 280 * (this.maxLife / 0.35);
        } else if (this.type === 'smoke') {
            // Smoke puffs expand slightly and slow down
            this.radius += dt * 20;
            this.vx *= Math.pow(0.08, dt);
            this.vy *= Math.pow(0.08, dt);
        } else if (this.type === 'bubble') {
            // Bubble expands and slows down
            this.radius += dt * 40;
            this.vx *= Math.pow(0.15, dt);
            this.vy *= Math.pow(0.15, dt);
        }
        
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.z += this.vz * dt;
        this.z -= speed * dt;
        this.x -= turnX * dt * (this.z / 1000);
        this.y -= turnY * dt * (this.z / 1000);
        this.life -= dt;
    }

    draw(ctx, width, height, f) {
        if (this.z <= 5 || this.life <= 0) return;

        const scale = f / this.z;
        const screenX = width / 2 + this.x * scale;
        const screenY = height / 2 + this.y * scale;
        const drawRadius = this.radius * scale;
        const alpha = this.life / this.maxLife;

        ctx.save();
        ctx.globalAlpha = alpha;
        
        if (this.type === 'ring') {
            // Expanding shockwave ring (flat outline)
            ctx.strokeStyle = this.color;
            ctx.lineWidth = Math.max(3, 9 * scale * alpha);
            ctx.beginPath();
            ctx.arc(screenX, screenY, drawRadius, 0, Math.PI * 2);
            ctx.stroke();
            
            // White highlight core ring
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1, 3 * scale * alpha);
            ctx.beginPath();
            ctx.arc(screenX, screenY, drawRadius, 0, Math.PI * 2);
            ctx.stroke();
        } else if (this.type === 'smoke') {
            // Fluffy cartoon smoke cloud with thick outline
            ctx.fillStyle = this.color;
            ctx.strokeStyle = '#050505';
            ctx.lineWidth = Math.max(2, 4.5 * scale);
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.arc(screenX, screenY, drawRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'sparkle') {
            // 4-point cartoon star vector
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#050505';
            ctx.lineWidth = Math.max(1.5, 2.5 * scale);
            ctx.beginPath();
            ctx.moveTo(screenX, screenY - drawRadius);
            ctx.quadraticCurveTo(screenX, screenY, screenX + drawRadius, screenY);
            ctx.quadraticCurveTo(screenX, screenY, screenX, screenY + drawRadius);
            ctx.quadraticCurveTo(screenX, screenY, screenX - drawRadius, screenY);
            ctx.quadraticCurveTo(screenX, screenY, screenX, screenY - drawRadius);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'bubble') {
            // Translucent glowing pink bubble
            ctx.fillStyle = 'rgba(255, 64, 129, 0.4)';
            ctx.strokeStyle = '#ff4081';
            ctx.lineWidth = Math.max(1.5, 2.5 * scale);
            ctx.beginPath();
            ctx.arc(screenX, screenY, drawRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // White glint
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(screenX - drawRadius * 0.35, screenY - drawRadius * 0.35, drawRadius * 0.22, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'snowflake') {
            // 6-point frosty snowflake decal
            ctx.strokeStyle = '#e0f7fa';
            ctx.lineWidth = Math.max(1.5, 3.5 * scale * alpha);
            ctx.beginPath();
            for (let i = 0; i < 3; i++) {
                const angle = (i / 3) * Math.PI;
                ctx.moveTo(screenX - Math.cos(angle) * drawRadius, screenY - Math.sin(angle) * drawRadius);
                ctx.lineTo(screenX + Math.cos(angle) * drawRadius, screenY + Math.sin(angle) * drawRadius);
            }
            ctx.stroke();
        } else if (this.type === 'ice_crystal') {
            // Shiny cyan diamond
            ctx.fillStyle = '#00e5ff';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1, 2 * scale);
            ctx.beginPath();
            ctx.moveTo(screenX, screenY - drawRadius);
            ctx.lineTo(screenX + drawRadius * 0.7, screenY);
            ctx.lineTo(screenX, screenY + drawRadius);
            ctx.lineTo(screenX - drawRadius * 0.7, screenY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else {
            // Default cartoon chunky debris
            ctx.fillStyle = this.color;
            ctx.strokeStyle = '#050505';
            ctx.lineWidth = Math.max(1.5, 3.5 * scale);
            ctx.beginPath();
            ctx.arc(screenX, screenY, drawRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    }
}

// Make entities globally accessible
window.Star = Star;
window.Planet = Planet;
window.Asteroid = Asteroid;
window.AlienShip = AlienShip;
window.PhaserBeam = PhaserBeam;
window.Particle = Particle;

class Confetti {
    constructor(width, height) {
        // Spawn at the center of the screen
        this.x = width / 2;
        this.y = height / 2;
        this.w = 8 + Math.random() * 8;
        this.h = 12 + Math.random() * 8;
        
        // Explode outward radially in all directions
        const angle = Math.random() * Math.PI * 2;
        const speed = 250 + Math.random() * 450;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        const colors = ['#ff007f', '#00f6ff', '#ffeb00', '#39ff14', '#e040fb'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.angle = Math.random() * Math.PI;
        this.spinSpeed = (Math.random() - 0.5) * 8;
        this.active = true;
    }
    update(dt, width, height) {
        // gravity pulls confetti down
        this.vy += 300 * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.angle += this.spinSpeed * dt;
        
        // Air friction decays horizontal velocity
        this.vx *= 0.98;
        
        // Deactivate when leaving viewport
        if (this.x < -50 || this.x > width + 50 || this.y > height + 50) {
            this.active = false;
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
        ctx.restore();
    }
}

class SpaceWhale {
    constructor() {
        this.reset();
    }
    reset(width = 1920, focalLength = 300) {
        // Spawns very far away (z = 2400)
        this.z = 2400;
        const scale = focalLength / this.z;
        
        // Start completely off-screen left, dynamically calculated based on screen width
        const startX = -(width / 2 + 1000) / scale;
        this.x = startX;
        
        // Float high in space
        this.y = -80;
        
        // Horizontal speed crossing left to right (takes exactly 12 seconds to cross)
        this.vx = (width + 2000) / scale / 12.0;
        this.vy = 5;
        this.vz = 0; // doesn't move towards camera on its own
        
        this.angle = 0.04; // slight upward tilt
        this.swimCycle = Math.random() * Math.PI * 2;
        this.eyeWink = false;
        
        // Rainbow trail coordinate history
        this.trail = [];
    }
    update(speed, dt, turnX, turnY, width, focalLength) {
        // Majestic slow tail wiggle
        this.swimCycle += dt * 3.0;
        
        // Extremely slow forward approach (only moves forward at 2% of player speed)
        this.z -= speed * 0.02 * dt;
        
        // Move horizontally
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        // Parallax steering (scaled slow since it is far away)
        this.x -= turnX * dt * (this.z / 2400);
        this.y -= turnY * dt * (this.z / 2400);
        
        // Track the wiggling tail position in 3D world space
        const wiggle = Math.sin(this.swimCycle) * 120;
        const tx = this.x - 900 * Math.cos(this.angle) - wiggle * Math.sin(this.angle);
        const ty = this.y - 900 * Math.sin(this.angle) + wiggle * Math.cos(this.angle);
        const tz = this.z;
        
        this.trail.push({ x: tx, y: ty, z: tz });
        if (this.trail.length > 40) {
            this.trail.shift();
        }
        
        // Winking trigger when close to screen center
        const scale = focalLength / this.z;
        const screenX = width / 2 + this.x * scale;
        if (screenX > width * 0.4 && screenX < width * 0.6) {
            this.eyeWink = true;
        } else {
            this.eyeWink = false;
        }
        
        // Reset if it crawls off-screen right
        if (this.x * scale > width / 2 + 1000) {
            this.reset(width, focalLength);
        }
    }
    draw(ctx, width, height, focalLength) {
        if (this.z <= 10) return;
        
        const scale = focalLength / this.z;
        const sx = width / 2 + this.x * scale;
        const sy = height / 2 + this.y * scale;
        
        // Giant size (1800 x 1000)
        const w = 1800 * scale;
        const h = 1000 * scale;
        
        // Draw Fading Rainbow Ribbon Trail behind the whale
        if (this.trail.length > 1) {
            ctx.save();
            ctx.lineCap = 'round';
            
            // Fading Rainbow colors (Red, Orange, Yellow, Green, Cyan)
            const colors = ['#ff1744', '#ff9100', '#ffea00', '#00e676', '#00e5ff'];
            
            colors.forEach((color, cIdx) => {
                ctx.beginPath();
                ctx.strokeStyle = color;
                
                for (let i = 0; i < this.trail.length; i++) {
                    const pt = this.trail[i];
                    const ptScale = focalLength / pt.z;
                    
                    // Stacking offset proportional to 2/3rds of body height (120px step per band)
                    const offset = (cIdx - 2) * 120 * ptScale;
                    
                    const tx = width / 2 + pt.x * ptScale;
                    const sy = height / 2 + pt.y * ptScale + offset;
                    
                    if (i === 0) {
                        ctx.moveTo(tx, sy);
                    } else {
                        ctx.lineTo(tx, sy);
                    }
                }
                
                // Line width is 135px at current scale, slightly larger than 120px step for solid overlap
                ctx.lineWidth = 135 * scale;
                ctx.globalAlpha = 0.45; // semi-translucent blend
                ctx.stroke();
            });
            ctx.restore();
        }
        
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(this.angle);
        
        // Majestic slow tail wiggle
        const wiggle = Math.sin(this.swimCycle) * 120 * scale;
        ctx.fillStyle = '#d1c4e9'; // Soft lavender light purple
        ctx.strokeStyle = '#263238';
        ctx.lineWidth = 14 * scale;
        
        // 1. Tail fin
        ctx.beginPath();
        ctx.moveTo(-w/2, 0);
        ctx.quadraticCurveTo(-w/2 - 200*scale, wiggle, -w/2 - 400*scale, wiggle - 200*scale);
        ctx.lineTo(-w/2 - 350*scale, wiggle);
        ctx.lineTo(-w/2 - 400*scale, wiggle + 200*scale);
        ctx.quadraticCurveTo(-w/2 - 200*scale, wiggle, -w/2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // 2. Giant majestic body
        ctx.fillStyle = '#b39ddb'; // Lavender body
        ctx.beginPath();
        ctx.ellipse(0, 0, w/2, h/2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // 3. Cute pink underbelly
        ctx.fillStyle = '#f8bbd0'; 
        ctx.beginPath();
        ctx.ellipse(0, h/6, w/3, h/3, 0, 0, Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // 4. Side flipper
        ctx.fillStyle = '#b39ddb';
        ctx.beginPath();
        ctx.ellipse(w/6, h/4, w/6, h/8, Math.PI/4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // 5. Giant happy eye
        const eyeX = w/4;
        const eyeY = -h/8;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 55 * scale, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
        
        // 6. Pupil
        ctx.fillStyle = '#263238';
        if (this.eyeWink) {
            // Friendly wink
            ctx.beginPath();
            ctx.arc(eyeX, eyeY + 10*scale, 35*scale, Math.PI, 0);
            ctx.strokeStyle = '#263238';
            ctx.lineWidth = 14*scale;
            ctx.stroke();
        } else {
            // Big happy round pupil
            ctx.beginPath();
            ctx.arc(eyeX + 8*scale, eyeY, 28 * scale, 0, Math.PI*2);
            ctx.fill();
        }
        
        // 7. Small blowhole bubble detail
        ctx.fillStyle = '#80deea';
        ctx.beginPath();
        ctx.arc(0, -h/2, 20*scale, 0, Math.PI*2);
        ctx.fill();
        
        ctx.restore();
    }
}

window.Confetti = Confetti;
window.SpaceWhale = SpaceWhale;

class PowerUp {
    constructor(x, y, z, type) {
        // If coordinates are provided, spawn there. Otherwise, spawn far away.
        this.x = x !== undefined ? x : (Math.random() - 0.5) * 200;
        this.y = y !== undefined ? y : (Math.random() - 0.5) * 100;
        this.z = z !== undefined ? z : 1000;
        
        // type can be 'star_wand', 'bubble_gum', 'ice_cream'
        this.type = type || ['star_wand', 'bubble_gum', 'ice_cream'][Math.floor(Math.random() * 3)];
        this.radius = 28; // physical collision radius
        
        this.rotation = Math.random() * Math.PI * 2;
        this.spinSpeed = 1.0 + Math.random() * 1.5;
        this.pulseTimer = Math.random() * Math.PI * 2;
    }

    update(speed, dt, turnX, turnY) {
        // Float towards the player
        this.z -= speed * 0.45 * dt;
        
        // Add a gentle floating wave motion
        this.pulseTimer += dt * 3.0;
        
        this.rotation += this.spinSpeed * dt;
        
        // Influence of ship turning
        this.x -= turnX * dt * (this.z / 1000);
        this.y -= turnY * dt * (this.z / 1000);
    }

    draw(ctx, width, height, f) {
        if (this.z <= 5) return;

        const scale = f / this.z;
        const screenX = width / 2 + this.x * scale;
        const screenY = height / 2 + this.y * scale;
        const drawRadius = this.radius * scale;

        // Skip if off-screen
        if (screenX + drawRadius < -100 || screenX - drawRadius > width + 100 ||
            screenY + drawRadius < -100 || screenY - drawRadius > height + 100) return;

        ctx.save();
        ctx.translate(screenX, screenY);

        // Pulse size slightly for animated bubble effect
        const pulse = 1.0 + Math.sin(this.pulseTimer) * 0.08;
        const r = drawRadius * pulse;

        // 1. Draw glowing outer bubble (Glossy pink/cyan/yellow depending on type)
        let bubbleGlow = 'rgba(255, 64, 129, 0.4)';
        let bubbleStroke = '#ff4081';
        if (this.type === 'star_wand') {
            bubbleGlow = 'rgba(255, 235, 59, 0.4)';
            bubbleStroke = '#fdd835';
        } else if (this.type === 'ice_cream') {
            bubbleGlow = 'rgba(0, 229, 255, 0.4)';
            bubbleStroke = '#00e5ff';
        } else if (this.type === 'health_canister') {
            bubbleGlow = 'rgba(57, 255, 20, 0.3)'; // Green glow
            bubbleStroke = '#39ff14'; // Bright green stroke
        }

        ctx.fillStyle = bubbleGlow;
        ctx.strokeStyle = bubbleStroke;
        ctx.lineWidth = Math.max(2.5, r * 0.08);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 2. Glossy sheen highlight reflection
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(-r * 0.35, -r * 0.35, r * 0.22, 0, Math.PI * 2);
        ctx.fill();

        // 3. Draw the cartoon vector item inside the bubble
        ctx.save();
        ctx.rotate(this.rotation);
        const itemSize = r * 0.55;
        this.drawItem(ctx, itemSize);
        ctx.restore();

        // Draw Thick cartoon border on the bubble
        ctx.strokeStyle = '#263238';
        ctx.lineWidth = Math.max(2, r * 0.08);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    drawItem(ctx, size) {
        ctx.save();
        ctx.lineWidth = Math.max(2.0, size * 0.12);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        if (this.type === 'star_wand') {
            // Draw Star Wand: Magic brown/gold stick + Yellow Star head
            // Stick
            ctx.strokeStyle = '#8d6e63';
            ctx.beginPath();
            ctx.moveTo(-size * 0.2, size * 0.6);
            ctx.lineTo(size * 0.2, -size * 0.1);
            ctx.stroke();
            
            // Twinkling Star head
            ctx.fillStyle = '#ffeb3b';
            ctx.strokeStyle = '#263238';
            ctx.beginPath();
            const cx = size * 0.2;
            const cy = -size * 0.2;
            const r = size * 0.55;
            for (let i = 0; i < 5; i++) {
                const a1 = (i / 5) * Math.PI * 2 - Math.PI / 2;
                const a2 = ((i + 0.5) / 5) * Math.PI * 2 - Math.PI / 2;
                ctx.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
                ctx.lineTo(cx + Math.cos(a2) * (r * 0.45), cy + Math.sin(a2) * (r * 0.45));
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'bubble_gum') {
            // Draw Bubble Gum: Pink wrapped candy shape
            const w = size * 1.1;
            const h = size * 0.65;
            
            // Wrappers left/right (triangles)
            ctx.fillStyle = '#ff80ab';
            ctx.strokeStyle = '#263238';
            ctx.beginPath();
            // Left wrapper
            ctx.moveTo(-w * 0.4, 0);
            ctx.lineTo(-w * 0.8, -h * 0.5);
            ctx.lineTo(-w * 0.8, h * 0.5);
            ctx.closePath();
            // Right wrapper
            ctx.moveTo(w * 0.4, 0);
            ctx.lineTo(w * 0.8, -h * 0.5);
            ctx.lineTo(w * 0.8, h * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Center circular candy
            ctx.fillStyle = '#ff4081';
            ctx.beginPath();
            ctx.arc(0, 0, w * 0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Candy shine stripe
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1.5, size * 0.08);
            ctx.beginPath();
            ctx.arc(0, 0, w * 0.35, Math.PI * 1.2, Math.PI * 1.5);
            ctx.stroke();
        } else if (this.type === 'ice_cream') {
            // Draw Ice Cream: Brown waffle cone + Cyan ice cream scoop + Pink cherry on top
            // Cone
            ctx.fillStyle = '#ffb74d';
            ctx.strokeStyle = '#263238';
            ctx.beginPath();
            ctx.moveTo(-size * 0.4, -size * 0.1);
            ctx.lineTo(size * 0.4, -size * 0.1);
            ctx.lineTo(0, size * 0.8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Scoop 1 (bottom scoop, blue)
            ctx.fillStyle = '#80deea';
            ctx.beginPath();
            ctx.arc(0, -size * 0.15, size * 0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Scoop 2 (top scoop, cyan/purple or pink cherry)
            ctx.fillStyle = '#00e5ff';
            ctx.beginPath();
            ctx.arc(0, -size * 0.4, size * 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Cherry
            ctx.fillStyle = '#ff1744';
            ctx.beginPath();
            ctx.arc(0, -size * 0.75, size * 0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'health_canister') {
            // Draw Health Canister: white circular pack with a red cross inside
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#263238';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.7, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Red cross
            ctx.fillStyle = '#ff1744';
            const bar = size * 0.22;
            const len = size * 0.9;
            ctx.fillRect(-len * 0.5, -bar * 0.5, len, bar);
            ctx.fillRect(-bar * 0.5, -len * 0.5, bar, len);
        }
        ctx.restore();
    }

    checkHit(mx, my, width, height, f) {
        if (this.z <= 10) return false;

        const scale = f / this.z;
        const screenX = width / 2 + this.x * scale;
        const screenY = height / 2 + this.y * scale;
        const drawRadius = this.radius * scale;

        const dx = mx - screenX;
        const dy = my - screenY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Standard collision: check if click distance is within bubble radius
        // Give slightly larger clickbox for younger children
        return dist <= drawRadius * 1.35;
    }
}

window.PowerUp = PowerUp;

class AlienProjectile {
    constructor(x, y, z, playerSpeed = 100) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.radius = 12; // projectile collision size
        this.speedZ = 220; // travel speed towards player (units/sec)
        
        // Aim trajectory towards player cockpit (0, 0, 0)
        const totalSpeedZ = this.speedZ + playerSpeed * 0.5;
        const timeToPlayer = z / totalSpeedZ;
        
        // Add a slight spread so it is aimed near the player but not 100% laser-precise
        const spread = 25; // 3D units spread
        const targetX = (Math.random() - 0.5) * spread;
        const targetY = (Math.random() - 0.5) * spread;
        
        this.vx = (targetX - x) / timeToPlayer;
        this.vy = (targetY - y) / timeToPlayer;
        
        this.color = '#ff1744'; // Glowing neon red
        this.glowColor = 'rgba(255, 23, 68, 0.4)';
    }

    update(speed, dt, turnX, turnY) {
        // Move towards player in Z
        const totalSpeedZ = this.speedZ + speed * 0.5;
        this.z -= totalSpeedZ * dt;
        
        // Move along aimed trajectory in X and Y
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        // Steer offsets based on player look rotation
        this.x -= turnX * dt * (this.z / 1000);
        this.y -= turnY * dt * (this.z / 1000);
    }

    draw(ctx, width, height, f) {
        if (this.z <= 5) return;
        const scale = f / this.z;
        const screenX = width / 2 + this.x * scale;
        const screenY = height / 2 + this.y * scale;
        const drawRadius = this.radius * scale;

        // Skip if off-screen
        if (screenX + drawRadius < -50 || screenX - drawRadius > width + 50 ||
            screenY + drawRadius < -50 || screenY - drawRadius > height + 50) return;

        ctx.save();
        ctx.translate(screenX, screenY);

        // Outer glowing envelope
        ctx.fillStyle = this.glowColor;
        ctx.beginPath();
        ctx.arc(0, 0, drawRadius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Core blast ball
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = Math.max(1.5, drawRadius * 0.15);
        ctx.beginPath();
        ctx.arc(0, 0, drawRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }

    checkHit(mx, my, width, height, f) {
        if (this.z <= 10) return false;
        const scale = f / this.z;
        const screenX = width / 2 + this.x * scale;
        const screenY = height / 2 + this.y * scale;
        const drawRadius = this.radius * scale;

        const dx = mx - screenX;
        const dy = my - screenY;
        const hitR = drawRadius * 1.6; // Slightly generous to make shooting them down fun
        return (dx * dx + dy * dy) < (hitR * hitR);
    }
}

window.AlienProjectile = AlienProjectile;
