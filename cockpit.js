// Space Rocket Game - Cockpit & UI Dashboard

// Polyfill for CanvasRenderingContext2D.prototype.roundRect for backward compatibility with older browsers
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (typeof r === 'undefined') r = 0;
        if (typeof r === 'number') {
            r = {tl: r, tr: r, br: r, bl: r};
        } else if (Array.isArray(r)) {
            if (r.length === 1) r = {tl: r[0], tr: r[0], br: r[0], bl: r[0]};
            else if (r.length === 2) r = {tl: r[0], tr: r[1], br: r[0], bl: r[1]};
            else if (r.length === 4) r = {tl: r[0], tr: r[1], br: r[2], bl: r[3]};
        } else {
            r = {tl: r.tl || 0, tr: r.tr || 0, br: r.br || 0, bl: r.bl || 0};
        }
        
        const minSize = Math.min(w, h);
        const tl = Math.min(r.tl, minSize / 2);
        const tr = Math.min(r.tr, minSize / 2);
        const br = Math.min(r.br, minSize / 2);
        const bl = Math.min(r.bl, minSize / 2);

        this.moveTo(x + tl, y);
        this.lineTo(x + w - tr, y);
        this.arcTo(x + w, y, x + w, y + tr, tr);
        this.lineTo(x + w, y + h - br);
        this.arcTo(x + w, y + h, x + w - br, y + h, br);
        this.lineTo(x + bl, y + h);
        this.arcTo(x, y + h, x, y + h - bl, bl);
        this.lineTo(x, y + tl);
        this.arcTo(x, y, x + tl, y, tl);
        return this;
    };
}

class Cockpit {
    constructor() {
        this.shieldFlash = 0; // 0 to 1, opacity of the shield bubble flash
        this.shieldColor = '#00ffff'; // Neon cyan bubble shield
        this.shieldMax = 100;
        this.shieldVal = 100;
        this.healthMax = 100;
        this.healthVal = 100;
        this.healthColor = '#ff1744'; // Red hull health
        this.score = 0; // Score just increases as they fly/shoot for positive reinforcement!
        this.surpriseActive = false;
        
        // Star decals on cockpit frame
        this.decals = [
            { x: 0.05, y: 0.84, size: 12, color: '#ffe082' },
            { x: 0.08, y: 0.90, size: 8, color: '#e1bee7' },
            { x: 0.92, y: 0.84, size: 10, color: '#b2dfdb' },
            { x: 0.95, y: 0.91, size: 14, color: '#ffcdd2' }
        ];

        // Little helper cartoon face states
        this.helperFace = 'happy';
        this.helperTimer = 0;

        // Floating message banners
        this.messages = [];
    }

    addMessage(text, color = '#ffffff') {
        this.messages.push({
            text: text,
            x: (Math.random() - 0.5) * 80, // slight random drift offset
            y: 0,
            vy: -75, // floats up
            alpha: 1.0,
            color: color,
            size: 26 + Math.floor(Math.random() * 8)
        });
    }

    update(dt, turnRateX, shieldIntensity) {
        // Cool shield recharging (slower in Advanced Mode)
        if (this.shieldVal < this.shieldMax) {
            const rechargeRate = (window.gameMode === 'advanced') ? 3.5 : 15;
            this.shieldVal = Math.min(this.shieldMax, this.shieldVal + rechargeRate * dt);
        }

        // Fade shield flash effect
        if (this.shieldFlash > 0) {
            this.shieldFlash = Math.max(0, this.shieldFlash - 2.5 * dt);
        }

        // Update cute cockpit screen animation
        this.helperTimer += dt;
        if (this.helperTimer > 3.0) {
            this.helperTimer = 0;
            // Cycle helper facial expressions
            const faces = ['happy', 'wink', 'happy'];
            this.helperFace = faces[Math.floor(Math.random() * faces.length)];
        }

        // Update floating messages
        this.messages.forEach(msg => {
            msg.y += msg.vy * dt;
            msg.alpha -= 0.85 * dt; // Fades out completely in ~1.2s
        });
        this.messages = this.messages.filter(msg => msg.alpha > 0);
    }

    triggerShieldFlash() {
        this.shieldFlash = 1.0;
        this.shieldVal = Math.max(0, this.shieldVal - 20); // ticks down shield
        this.helperFace = 'dizzy';
        this.helperTimer = -1.0; // Keep dizzy face for at least 1s
    }

    // Keep layout for compatibility
    layout(width, height) {}

    // No interactive buttons to click
    checkClick(mx, my) {
        return false;
    }

    draw(ctx, width, height, isAccelerating, asteroids, aliens, heading, activeWeapon = 'normal', weaponTimer = 0) {
        const dashY = height * 0.77;
        const dashH = height * 0.23;

        // ----------------------------------------------------
        // 1. Draw Giant Shield Bubble Overlay (When hit)
        // ----------------------------------------------------
        if (this.shieldFlash > 0) {
            ctx.save();
            ctx.globalAlpha = this.shieldFlash * 0.55;
            ctx.strokeStyle = this.shieldColor;
            ctx.lineWidth = 15;
            ctx.beginPath();
            ctx.arc(width/2, height/2, height * 0.6, 0, Math.PI*2);
            ctx.stroke();

            const grad = ctx.createRadialGradient(width/2, height/2, width*0.1, width/2, height/2, width*0.7);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.8, this.shieldColor + '08');
            grad.addColorStop(1, this.shieldColor + '3a');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(width/2, height/2, height * 0.6, 0, Math.PI*2);
            ctx.fill();
            ctx.restore();
        }

        // ----------------------------------------------------
        // 2. Draw Cockpit Outer Frame
        // ----------------------------------------------------
        ctx.fillStyle = '#37474f'; // Dark steel blue-gray
        ctx.strokeStyle = '#263238'; // Cartoony outline
        ctx.lineWidth = 8;

        // Bottom Dashboard Base
        ctx.beginPath();
        ctx.moveTo(0, dashY);
        ctx.quadraticCurveTo(width * 0.5, dashY - height * 0.04, width, dashY);
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw cockpit star decals (cute stars drawn on frame)
        this.decals.forEach(star => {
            this.drawCartoonStar(ctx, star.x * width, star.y * height, star.size, star.color);
        });

        // ----------------------------------------------------
        // 3. Circular Space Radar Compass (Centered on Dashboard)
        // ----------------------------------------------------
        const radarX = width / 2;
        const radarY = dashY + dashH * 0.45;
        const radarR = height * 0.085;

        // Bezel
        ctx.strokeStyle = '#263238';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(radarX, radarY, radarR + 2, 0, Math.PI * 2);
        ctx.stroke();

        // Radar background screen
        ctx.beginPath();
        ctx.arc(radarX, radarY, radarR, 0, Math.PI * 2);
        ctx.fillStyle = '#0f3311'; // dark green radar screen
        ctx.fill();

        // Concentric Compass grids (Rotated by heading like a bubble compass)
        ctx.save();
        ctx.translate(radarX, radarY);
        ctx.rotate(-heading);

        // Crosshairs
        ctx.beginPath();
        ctx.moveTo(-radarR, 0);
        ctx.lineTo(radarR, 0);
        ctx.moveTo(0, -radarR);
        ctx.lineTo(0, radarR);
        ctx.strokeStyle = 'rgba(76, 175, 80, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Concentric circles
        ctx.beginPath();
        ctx.arc(0, 0, radarR * 0.65, 0, Math.PI * 2);
        ctx.arc(0, 0, radarR * 0.3, 0, Math.PI * 2);
        ctx.stroke();

        // Compass Cardinal Ticks (N, S, E, W)
        ctx.fillStyle = '#80deea';
        ctx.font = 'bold 9px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("N", 0, -radarR + 10);
        ctx.fillText("S", 0, radarR - 10);
        ctx.fillText("E", radarR - 10, 0);
        ctx.fillText("W", -radarR + 10, 0);

        ctx.restore();

        // Radar Sweep Line (rotates continuously)
        const sweepAngle = (Date.now() * 0.0035) % (Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(radarX, radarY);
        ctx.lineTo(radarX + Math.cos(sweepAngle) * radarR, radarY + Math.sin(sweepAngle) * radarR);
        ctx.strokeStyle = 'rgba(76, 175, 80, 0.6)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Draw Asteroids and Aliens on Radar
        asteroids.forEach(ast => {
            if (ast.z <= 0 || ast.z > 1000) return;
            const rx = radarX + (ast.x / 400) * radarR;
            const ry = radarY - (1 - ast.z / 1000) * radarR;

            const dx = rx - radarX;
            const dy = ry - radarY;
            if (dx*dx + dy*dy < radarR*radarR) {
                ctx.beginPath();
                ctx.arc(rx, ry, 3.5, 0, Math.PI*2);
                ctx.fillStyle = '#ff7043'; // Orange dot
                ctx.fill();
            }
        });

        aliens.forEach(alien => {
            if (alien.z <= 0 || alien.z > 1000) return;
            const rx = radarX + (alien.x / 400) * radarR;
            const ry = radarY - (1 - alien.z / 1000) * radarR;

            const dx = rx - radarX;
            const dy = ry - radarY;
            if (dx*dx + dy*dy < radarR*radarR) {
                ctx.beginPath();
                ctx.arc(rx, ry, 4.5, 0, Math.PI*2);
                ctx.fillStyle = '#29b6f6'; // Light blue dot
                ctx.fill();
            }
        });

        // ----------------------------------------------------
        // 4. Crystals Score (Left Side Dashboard)
        // ----------------------------------------------------
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px "Courier New", Courier, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`✨ CRYSTALS: ${this.score}`, width * 0.18, dashY + dashH * 0.45);

        // Speedometer Gauge visual
        ctx.font = '12px "Courier New"';
        ctx.fillStyle = isAccelerating ? '#ff7043' : '#80deea';
        ctx.fillText(isAccelerating ? "🔥 HYPERDRIVE BOOST!" : "🛸 CRUISING SPEED", width * 0.18, dashY + dashH * 0.72);

        // ----------------------------------------------------
        // 5. Shield Status Bar (Right Side Dashboard)
        // ----------------------------------------------------
        const barX = width * 0.65;
        const barY = dashY + dashH * 0.45;
        const barW = width * 0.16;
        const barH = height * 0.022;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.strokeStyle = '#263238';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barW, barH);

        const fillW = (this.shieldVal / this.shieldMax) * barW;
        ctx.fillStyle = this.shieldColor;
        ctx.fillRect(barX + 1, barY + 1, fillW - 2, barH - 2);

        ctx.fillStyle = '#ffffff';
        ctx.font = '12px "Courier New"';
        ctx.fillText("🛡️ BUBBLE SHIELD ENERGY", barX, barY - 8);

        // ----------------------------------------------------
        // 5b. Ship Hull Health Bar (Advanced Mode only)
        // ----------------------------------------------------
        if (window.gameMode === 'advanced') {
            const healthBarY = dashY + dashH * 0.72;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(barX, healthBarY, barW, barH);
            ctx.strokeStyle = '#263238';
            ctx.lineWidth = 2;
            ctx.strokeRect(barX, healthBarY, barW, barH);

            const fillHealthW = Math.max(0, (this.healthVal / this.healthMax) * barW);
            let hColor = '#39ff14'; // Bright green
            if (this.healthVal <= 25) {
                hColor = '#ff1744'; // Red
            } else if (this.healthVal <= 50) {
                hColor = '#ffeb3b'; // Yellow
            }
            ctx.fillStyle = hColor;
            ctx.fillRect(barX + 1, healthBarY + 1, fillHealthW - 2, barH - 2);

            ctx.fillStyle = '#ffffff';
            ctx.font = '12px "Courier New"';
            ctx.fillText("🚀 SHIP HULL HEALTH", barX, healthBarY - 8);
        }

        // ----------------------------------------------------
        // 6. Translucent AI Face Screen (Upper Right Corner)
        // ----------------------------------------------------
        const isSurprise = this.surpriseActive;
        const danceX = isSurprise ? Math.sin(Date.now() * 0.012) * 10 : 0;
        const danceY = isSurprise ? Math.cos(Date.now() * 0.018) * 6 : 0;

        const faceW = 100;
        const faceH = 100;
        const faceX = width - faceW - 20 + danceX;
        const faceY = 20 + danceY;

        ctx.save();
        // Translucent backing
        ctx.fillStyle = 'rgba(10, 20, 40, 0.45)';
        ctx.beginPath();
        ctx.roundRect(faceX, faceY, faceW, faceH, 8);
        ctx.fill();

        // Border
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(faceX, faceY, faceW, faceH, 8);
        ctx.stroke();

        // Scanlines
        ctx.beginPath();
        ctx.roundRect(faceX, faceY, faceW, faceH, 8);
        ctx.clip();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        for (let l = faceY + 4; l < faceY + faceH; l += 4) {
            ctx.beginPath();
            ctx.moveTo(faceX, l);
            ctx.lineTo(faceX + faceW, l);
            ctx.stroke();
        }

        // Face lines
        const fx = faceX + faceW / 2;
        const fy = faceY + faceH / 2 + 5;
        ctx.strokeStyle = 'rgba(128, 222, 234, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';

        if (isSurprise) {
            // Draw a dancing happy mouth
            ctx.beginPath();
            ctx.arc(fx, fy + 2, 7, 0, Math.PI);
            ctx.stroke();

            // Draw cool square neon sunglasses! 🕶️
            ctx.fillStyle = 'rgba(0, 255, 255, 0.9)';
            ctx.strokeStyle = 'rgba(128, 222, 234, 0.95)';
            ctx.lineWidth = 2;

            // Left lens
            ctx.beginPath();
            ctx.roundRect(fx - 17, fy - 14, 12, 9, 2);
            ctx.fill();
            ctx.stroke();

            // Right lens
            ctx.beginPath();
            ctx.roundRect(fx + 5, fy - 14, 12, 9, 2);
            ctx.fill();
            ctx.stroke();

            // Bridge connector
            ctx.beginPath();
            ctx.moveTo(fx - 5, fy - 10);
            ctx.lineTo(fx + 5, fy - 10);
            ctx.stroke();
        } else {
            if (this.helperFace === 'happy') {
                ctx.beginPath();
                ctx.arc(fx - 10, fy - 10, 3, Math.PI, 0);
                ctx.arc(fx + 10, fy - 10, 3, Math.PI, 0);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(fx, fy - 2, 7, 0, Math.PI);
                ctx.stroke();
            } else if (this.helperFace === 'wink') {
                ctx.beginPath();
                ctx.arc(fx - 10, fy - 10, 3, Math.PI, 0);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(fx + 6, fy - 10);
                ctx.lineTo(fx + 14, fy - 10);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(fx, fy - 2, 7, 0, Math.PI);
                ctx.stroke();
            } else if (this.helperFace === 'dizzy') {
                this.drawCross(ctx, fx - 10, fy - 10, 4);
                this.drawCross(ctx, fx + 10, fy - 10, 4);
                ctx.beginPath();
                ctx.arc(fx, fy + 2, 4, 0, Math.PI * 2);
                ctx.stroke();
            } else if (this.helperFace === 'sing') {
                ctx.beginPath();
                ctx.arc(fx - 10, fy - 10, 4, Math.PI, 0);
                ctx.arc(fx + 10, fy - 10, 4, Math.PI, 0);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(fx, fy + 2, 5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(128, 222, 234, 0.85)';
                ctx.fill();
                ctx.stroke();
            }
        }

        ctx.fillStyle = 'rgba(128, 222, 234, 0.6)';
        ctx.font = 'bold 8px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText("AI HELPER LINK", fx, faceY + 12);
        ctx.restore();

        // ----------------------------------------------------
        // 7. Active Power-Up/Weapon Upgrade Meter
        // ----------------------------------------------------
        if (activeWeapon && activeWeapon !== 'normal' && weaponTimer > 0) {
            ctx.save();
            const meterW = Math.min(width * 0.35, 300);
            const meterH = 34;
            const mx = width / 2 - meterW / 2;
            const my = dashY - meterH - 12;

            // Translucent glass backing
            ctx.fillStyle = 'rgba(20, 30, 50, 0.7)';
            ctx.strokeStyle = '#263238';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.roundRect(mx, my, meterW, meterH, 6);
            ctx.fill();
            ctx.stroke();

            // Choose weapon color, text, and icon
            let weaponColor = '#ff4081';
            let weaponText = 'BUBBLE GUM';
            let icon = '🍬';
            if (activeWeapon === 'star_wand') {
                weaponColor = '#ffff00';
                weaponText = 'STAR WAND';
                icon = '🌟';
            } else if (activeWeapon === 'ice_cream') {
                weaponColor = '#00e5ff';
                weaponText = 'FREEZE RAY';
                icon = '🍦';
            }

            // Fill bar proportional to remaining time
            const ratio = weaponTimer / 12.0; // 12 seconds max duration
            const barW = (meterW - 12) * ratio;

            ctx.fillStyle = weaponColor;
            ctx.beginPath();
            ctx.roundRect(mx + 6, my + 6, barW, meterH - 12, 4);
            ctx.fill();

            // Render weapon name & icon
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px "Courier New", Courier, monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${icon} ${weaponText}`, mx + 16, my + meterH / 2);

            // Remaining seconds
            ctx.textAlign = 'right';
            ctx.fillText(`${weaponTimer.toFixed(1)}s`, mx + meterW - 16, my + meterH / 2);

            ctx.restore();
        }

        // ----------------------------------------------------
        // 8. Draw Floating Cartoon Messages
        // ----------------------------------------------------
        if (this.messages.length > 0) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            this.messages.forEach(msg => {
                ctx.globalAlpha = msg.alpha;
                ctx.font = `bold ${msg.size}px "Arial Black", Impact, sans-serif`;
                
                // Thick black bubble text outline
                ctx.strokeStyle = '#263238';
                ctx.lineWidth = 8;
                ctx.strokeText(msg.text, width / 2 + msg.x, height * 0.45 + msg.y);
                
                ctx.fillStyle = msg.color;
                ctx.fillText(msg.text, width / 2 + msg.x, height * 0.45 + msg.y);
            });
            ctx.restore();
        }
    }

    drawCartoonStar(ctx, x, y, size, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            ctx.lineTo(0, -size);
            ctx.rotate(Math.PI / 5);
            ctx.lineTo(0, -size * 0.4);
            ctx.rotate(Math.PI / 5);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#263238';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    drawCross(ctx, x, y, size) {
        ctx.beginPath();
        ctx.moveTo(x - size, y - size);
        ctx.lineTo(x + size, y + size);
        ctx.moveTo(x + size, y - size);
        ctx.lineTo(x - size, y + size);
        ctx.stroke();
    }
}

window.Cockpit = Cockpit;
