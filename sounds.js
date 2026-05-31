// Web Audio API Sound Synthesizer for Space Rocket Game
class SoundManager {
    constructor() {
        this.ctx = null;
        this.engineOsc1 = null;
        this.engineOsc2 = null;
        this.engineGain = null;
        this.engineFilter = null;
        this.isEngineRunning = false;
        this.muted = false;
        this.musicInterval = null;
    }

    init() {
        if (this.ctx) return;
        
        // Create audio context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        
        // Start ambient engine hum
        this.startEngine();
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    startEngine() {
        if (!this.ctx || this.isEngineRunning || this.muted) return;

        try {
            // Lowpass filter to make engine hum bassy and warm
            this.engineFilter = this.ctx.createBiquadFilter();
            this.engineFilter.type = 'lowpass';
            this.engineFilter.frequency.value = 150;
            this.engineFilter.Q.value = 1;

            // First oscillator (Low rumble)
            this.engineOsc1 = this.ctx.createOscillator();
            this.engineOsc1.type = 'sawtooth';
            this.engineOsc1.frequency.value = 45; // Low pitch G#

            // Second oscillator (Slightly detuned for warmth)
            this.engineOsc2 = this.ctx.createOscillator();
            this.engineOsc2.type = 'triangle';
            this.engineOsc2.frequency.value = 45.8;

            // Engine gain (volume)
            this.engineGain = this.ctx.createGain();
            this.engineGain.gain.value = 0.15; // Soft ambient background noise

            // Connect
            this.engineOsc1.connect(this.engineFilter);
            this.engineOsc2.connect(this.engineFilter);
            this.engineFilter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);

            this.engineOsc1.start();
            this.engineOsc2.start();
            this.isEngineRunning = true;
        } catch (e) {
            console.error("Failed to start engine audio:", e);
        }
    }

    // Updates engine sound based on acceleration factor (0 to 1)
    setEngineAcceleration(factor) {
        if (!this.ctx || !this.isEngineRunning || this.muted) return;

        // Smoothly transition engine speed
        const targetFreq = 45 + (factor * 35); // 45Hz to 80Hz
        const targetVolume = 0.15 + (factor * 0.35); // Louder when accelerating
        const targetFilterFreq = 150 + (factor * 250); // Open filter slightly for brightness

        const now = this.ctx.currentTime;
        
        this.engineOsc1.frequency.setTargetAtTime(targetFreq, now, 0.1);
        this.engineOsc2.frequency.setTargetAtTime(targetFreq * 1.018, now, 0.1);
        this.engineGain.gain.setTargetAtTime(targetVolume, now, 0.1);
        this.engineFilter.frequency.setTargetAtTime(targetFilterFreq, now, 0.1);
    }

    stopEngine() {
        if (this.engineOsc1) {
            try { this.engineOsc1.stop(); } catch(e) {}
            this.engineOsc1 = null;
        }
        if (this.engineOsc2) {
            try { this.engineOsc2.stop(); } catch(e) {}
            this.engineOsc2 = null;
        }
        this.isEngineRunning = false;
    }

    // Left click phaser blast
    playPhaser() {
        this.init();
        this.resume();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        
        // Phaser sweep oscillator
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        // Start high, sweep low
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.25); // A2

        // Fast decay envelope
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.25);

        // Connect
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.26);
    }

    // Asteroid destruction (stardust explosion)
    playExplosion() {
        this.init();
        this.resume();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        const duration = 0.5;

        // Generate white noise for the explosion rumble
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = buffer;

        // Lowpass filter to make it rumbling
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.exponentialRampToValueAtTime(50, now + duration);

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

        noiseNode.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        // Add a cute little chime sound for breaking into stardust crystals
        const chimeOsc = this.ctx.createOscillator();
        const chimeGain = this.ctx.createGain();
        chimeOsc.type = 'sine';
        chimeOsc.frequency.setValueAtTime(1200, now);
        chimeOsc.frequency.setValueAtTime(1500, now + 0.05);
        chimeOsc.frequency.setValueAtTime(1800, now + 0.1);
        
        chimeGain.gain.setValueAtTime(0.15, now);
        chimeGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        
        chimeOsc.connect(chimeGain);
        chimeGain.connect(this.ctx.destination);

        noiseNode.start(now);
        chimeOsc.start(now);
        chimeOsc.stop(now + 0.25);
    }

    // Shield bounce (boing) when hit
    playShieldBounce() {
        this.init();
        this.resume();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = 'triangle';
        // Frequency modulation for a boing spring sound
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(400, now + 0.15);
        osc.frequency.linearRampToValueAtTime(200, now + 0.35);

        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.41);
    }

    // Happy alien sound (giggle/chime sequence)
    playAlienHappy() {
        this.init();
        this.resume();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (major arpeggio)
        
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();
            
            // Vibrato LFO
            const lfo = this.ctx.createOscillator();
            const lfoGain = this.ctx.createGain();
            lfo.frequency.value = 15; // Vibrato speed
            lfoGain.gain.value = 15;  // Vibrato depth
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            gainNode.gain.setValueAtTime(0.12, now + (idx * 0.08));
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + (idx * 0.08) + 0.15);
            
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            osc.connect(gainNode);
            gainNode.connect(this.ctx.destination);
            
            lfo.start(now + (idx * 0.08));
            osc.start(now + (idx * 0.08));
            
            lfo.stop(now + (idx * 0.08) + 0.16);
            osc.stop(now + (idx * 0.08) + 0.16);
        });
    }

    // Simple beep sound for dashboard buttons
    playBeep(pitch = 600, duration = 0.1) {
        this.init();
        this.resume();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = pitch;

        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration + 0.01);
    }

    // Spaceship horn sound!
    playHorn() {
        this.init();
        this.resume();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        
        // Two oscillators for a rich, cartoonish chord horn
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc1.type = 'triangle';
        osc1.frequency.value = 261.63; // C4
        
        osc2.type = 'sawtooth';
        osc2.frequency.value = 329.63; // E4

        // Connect
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);

        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.setValueAtTime(0.25, now + 0.4);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.51);
        osc2.stop(now + 0.51);
    }

    startSurpriseMusic() {
        try {
            this.init();
            this.resume();
            if (!this.ctx || this.muted) return;
            
            // Don't duplicate if already running
            if (this.musicInterval) return;
            
            let noteIndex = 0;
            // Heroic chiptune melody (Zelda main theme hook & response)
            const melody = [
                466.16, 349.23, 466.16, 466.16, 523.25, 587.33, 622.25, 698.46,
                698.46, 587.33, 698.46, 698.46, 783.99, 880.00, 932.33, 1046.50
            ];
            
            this.musicInterval = setInterval(() => {
                try {
                    if (this.muted || !this.ctx) return;
                    const now = this.ctx.currentTime;
                    
                    const osc1 = this.ctx.createOscillator();
                    const osc2 = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    
                    // Retro chiptune vibrato LFO (frequency modulation)
                    const lfo = this.ctx.createOscillator();
                    const lfoGain = this.ctx.createGain();
                    lfo.frequency.setValueAtTime(6.0, now); // 6 Hz NES warble
                    lfoGain.gain.setValueAtTime(8, now);    // Vibrato depth
                    lfo.connect(lfoGain);
                    lfoGain.connect(osc1.frequency);
                    
                    // Classic 8-bit square lead voice
                    osc1.type = 'square';
                    osc1.frequency.setValueAtTime(melody[noteIndex % melody.length], now);
                    
                    // Classic 8-bit triangle bass voice (octave lower)
                    osc2.type = 'triangle';
                    osc2.frequency.setValueAtTime(melody[noteIndex % melody.length] / 2, now);
                    
                    gain.gain.setValueAtTime(0.09, now); // Balanced retro mix
                    gain.gain.linearRampToValueAtTime(0.001, now + 0.16);
                    
                    osc1.connect(gain);
                    osc2.connect(gain);
                    gain.connect(this.ctx.destination);
                    
                    lfo.start(now);
                    osc1.start(now);
                    osc2.start(now);
                    
                    lfo.stop(now + 0.17);
                    osc1.stop(now + 0.17);
                    osc2.stop(now + 0.17);
                    
                    noteIndex++;
                } catch (innerError) {
                    console.warn("Audio note play warning:", innerError);
                }
            }, 180); // 180ms tempo is perfect for this heroic march tempo!
        } catch (err) {
            console.error("Failed to start surprise music:", err);
        }
    }

    stopSurpriseMusic() {
        try {
            if (this.musicInterval) {
                clearInterval(this.musicInterval);
                this.musicInterval = null;
            }
        } catch (err) {
            console.error("Failed to stop surprise music:", err);
        }
    }

    // Triumphant Octave Step-Up Fanfare with ascending chiptune flourish
    playCelebrationFanfare() {
        this.init();
        this.resume();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        
        const triggerMotif = (delay, pitchMult, volMult) => {
            const triggerTime = now + delay;
            const steps = [
                { type: 'chord', freqs: [196.00, 293.66, 392.00], time: 0, dur: 0.22 }, // G3 swell
                { type: 'note', freq: 392.00, time: 0.22, dur: 0.1 }, 
                { type: 'note', freq: 440.00, time: 0.32, dur: 0.1 }, 
                { type: 'note', freq: 493.88, time: 0.42, dur: 0.1 }, 
                { type: 'chord', freqs: [523.25, 659.25, 783.99, 1046.50], time: 0.52, dur: 0.55 } // Triumphant C5 resolve
            ];
            
            steps.forEach((step) => {
                const stepTime = triggerTime + step.time;
                if (step.type === 'chord') {
                    step.freqs.forEach((freq) => {
                        try {
                            const osc = this.ctx.createOscillator();
                            const gain = this.ctx.createGain();
                            const lfo = this.ctx.createOscillator();
                            const lfoGain = this.ctx.createGain();
                            
                            lfo.frequency.setValueAtTime(6.5, stepTime);
                            lfoGain.gain.setValueAtTime(7 * pitchMult, stepTime);
                            lfo.connect(lfoGain);
                            lfoGain.connect(osc.frequency);
                            
                            osc.type = 'sawtooth';
                            osc.frequency.setValueAtTime(freq * pitchMult, stepTime);
                            
                            const filter = this.ctx.createBiquadFilter();
                            filter.type = 'bandpass';
                            filter.frequency.setValueAtTime(freq * pitchMult * 2.3, stepTime);
                            filter.Q.value = 1.2;
                            
                            gain.gain.setValueAtTime(0.04 * volMult, stepTime);
                            gain.gain.linearRampToValueAtTime(0.001, stepTime + step.dur);
                            
                            osc.connect(filter);
                            filter.connect(gain);
                            gain.connect(this.ctx.destination);
                            
                            lfo.start(stepTime);
                            osc.start(stepTime);
                            
                            lfo.stop(stepTime + step.dur);
                            osc.stop(stepTime + step.dur);
                        } catch (err) {
                            console.warn("Error playing fanfare chord note:", err);
                        }
                    });
                } else {
                    try {
                        const osc = this.ctx.createOscillator();
                        const gain = this.ctx.createGain();
                        
                        osc.type = 'triangle';
                        osc.frequency.setValueAtTime(step.freq * pitchMult, stepTime);
                        
                        gain.gain.setValueAtTime(0.09 * volMult, stepTime);
                        gain.gain.linearRampToValueAtTime(0.001, stepTime + step.dur);
                        
                        osc.connect(gain);
                        gain.connect(this.ctx.destination);
                        
                        osc.start(stepTime);
                        osc.stop(stepTime + step.dur);
                    } catch (err) {
                        console.warn("Error playing fanfare lead note:", err);
                    }
                }
            });
        };
        
        // Trigger the 3 repeats (1 octave lower start, stepping up)
        triggerMotif(0, 0.5, 1.20);   // Start 1 octave lower, slightly louder (1.20x)
        triggerMotif(0.85, 1.0, 1.00); // Standard octave
        triggerMotif(1.70, 2.0, 0.80); // 1 octave higher

        // Ascending chiptune flourish at the end (pitched 1 octave lower, final note held longer)
        const flourishTime = now + 2.30; // Starts right as the final high chord hits
        const flourishNotes = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1318.51, 1567.98, 2093.00]; // One octave lower (C5 to C7)
        
        flourishNotes.forEach((freq, idx) => {
            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.type = 'sine'; // pure magical chime
                osc.frequency.setValueAtTime(freq, flourishTime + idx * 0.045); // fast 45ms step duration
                
                const isLast = idx === flourishNotes.length - 1;
                const noteDur = isLast ? 1.25 : 0.08; // Hold final note for 1.25s (extra beat)
                const vol = isLast ? 0.095 : 0.055;
                
                gain.gain.setValueAtTime(vol, flourishTime + idx * 0.045);
                gain.gain.linearRampToValueAtTime(0.001, flourishTime + idx * 0.045 + noteDur);
                
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                
                osc.start(flourishTime + idx * 0.045);
                osc.stop(flourishTime + idx * 0.045 + noteDur + 0.01);
            } catch (err) {
                console.warn("Error playing fanfare flourish chime:", err);
            }
        });
    }

    playCheer() {
        this.init();
        this.resume();
        if (!this.ctx || this.muted) return;
        
        const now = this.ctx.currentTime;
        
        // C-Major arpeggiated rising chime sweep (peep-peep-peep!)
        const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
        frequencies.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.04);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + idx * 0.04 + 0.12);
            
            gain.gain.setValueAtTime(0.08, now + idx * 0.04);
            gain.gain.linearRampToValueAtTime(0.001, now + idx * 0.04 + 0.12);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(now + idx * 0.04);
            osc.stop(now + idx * 0.04 + 0.13);
        });
        
        // Filtered white noise burst for crowd "YAY!" cheer texture
        const duration = 0.55;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(900, now);
        filter.frequency.linearRampToValueAtTime(1400, now + duration);
        filter.Q.value = 1.2; // vocal bandpass resonance
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.12, now);
        noiseGain.gain.linearRampToValueAtTime(0.001, now + duration);
        
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        
        noise.start(now);
        noise.stop(now + duration + 0.01);
    }

    playPowerUpCollect() {
        this.init();
        this.resume();
        if (!this.ctx || this.muted) return;
        
        const now = this.ctx.currentTime;
        // Rising magical bells: C5 -> E5 -> G5 -> C6 -> E6 -> G6
        const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
        freqs.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.05);
            
            gain.gain.setValueAtTime(0.0, now + idx * 0.05);
            gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.05 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.20);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(now + idx * 0.05);
            osc.stop(now + idx * 0.05 + 0.22);
        });
    }

    playStarZap() {
        this.init();
        this.resume();
        if (!this.ctx || this.muted) return;
        
        const now = this.ctx.currentTime;
        
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        
        osc.type = 'square';
        // Pitch sweep from 700Hz to 1600Hz very quickly, then down to 900Hz
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.linearRampToValueAtTime(1600, now + 0.06);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.15);
        
        gainNode.gain.setValueAtTime(0.07, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.16);
    }

    playBubblePop() {
        this.init();
        this.resume();
        if (!this.ctx || this.muted) return;
        
        const now = this.ctx.currentTime;
        
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        
        osc.type = 'sine';
        // Low rubbery sound sweeping upwards very fast (like a pop!)
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
        
        gainNode.gain.setValueAtTime(0.18, now);
        gainNode.gain.linearRampToValueAtTime(0.001, now + 0.08);
        
        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.09);
    }

    playFreeze() {
        this.init();
        this.resume();
        if (!this.ctx || this.muted) return;
        
        const now = this.ctx.currentTime;
        const duration = 0.45;
        
        // High crystalline tone
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2000, now);
        osc.frequency.linearRampToValueAtTime(1800, now + 0.2);
        osc.frequency.linearRampToValueAtTime(2200, now + 0.4);
        
        oscGain.gain.setValueAtTime(0.06, now);
        oscGain.gain.linearRampToValueAtTime(0.001, now + duration);
        
        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
        
        // Frost noise sweep
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(3000, now);
        filter.frequency.exponentialRampToValueAtTime(600, now + duration);
        filter.Q.value = 2.0;
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.08, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        
        noise.start(now);
        noise.stop(now + duration + 0.01);
    }

    playIceShatter() {
        this.init();
        this.resume();
        if (!this.ctx || this.muted) return;
        
        const now = this.ctx.currentTime;
        
        // Detuned high frequency chimes for glass/ice cracking
        const freqs = [2500, 3100, 4200, 4800];
        freqs.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.linearRampToValueAtTime(freq * 0.7, now + 0.15 + Math.random() * 0.1);
            
            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15 + Math.random() * 0.1);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(now);
            osc.stop(now + 0.3);
        });
        
        // Fast crack sound
        const duration = 0.15;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(4000, now);
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.12, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        
        noise.start(now);
        noise.stop(now + duration + 0.01);
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            this.stopEngine();
        } else {
            this.startEngine();
        }
        return this.muted;
    }
}

// Single global instance
const sounds = new SoundManager();
window.sounds = sounds;
