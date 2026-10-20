// brettisgay.com: Breakout Deluxe (ported from the original site).
// Changes vs. the original: fixed 60 Hz timestep (refresh-rate independent), crisp canvas on retina,
// high score saved in localStorage, arrow-key controls, Tone.js self-hosted and loaded only on this page,
// family-friendly end-of-game messages.
(() => {
                const canvas = document.getElementById('breakoutCanvas');
                const helpEl = document.getElementById('bo-help');
                const bestEl = document.getElementById('best');
                const KEY = 'brett.best.breakout';
                function loadBest() { try { return parseInt(localStorage.getItem(KEY), 10) || 0; } catch (e) { return 0; } }
                function showBest(v) { bestEl.textContent = 'High score: ' + Number(v).toLocaleString(); }
                function saveBest() { if (score > best) { best = score; try { localStorage.setItem(KEY, String(best)); } catch (e) {} } showBest(best); }

                // --- Tone.js (self-hosted, ~79 KB gzipped). Fetched after this page loads; sound starts on START. ---
                let tonePromise = null;
                function loadTone() {
                    if (window.Tone) return Promise.resolve(window.Tone);
                    if (!tonePromise) {
                        tonePromise = new Promise((resolve, reject) => {
                            const sc = document.createElement('script');
                            sc.src = '../../js/vendor/tone-14.7.77.min.js';
                            sc.async = true;
                            sc.onload = () => resolve(window.Tone);
                            sc.onerror = (e) => { tonePromise = null; reject(e); };
                            document.head.appendChild(sc);
                        });
                    }
                    return tonePromise;
                }
                window.loadTone = loadTone;

                // --- keyboard (desktop) ---
                const keys = { left: false, right: false };
                function keyMove() { const d = (keys.right ? 1 : 0) - (keys.left ? 1 : 0); if (d) movePaddle(paddle.x + paddle.width / 2 + d * 8 * scale); }
                document.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'a') { keys.left = true; e.preventDefault(); } if (e.key === 'ArrowRight' || e.key === 'd') { keys.right = true; e.preventDefault(); } });
                document.addEventListener('keyup', (e) => { if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false; if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false; });
                const ctx = canvas.getContext('2d');
                const scoreEl = document.getElementById('score');
                const livesEl = document.getElementById('lives');
                const levelEl = document.getElementById('level-display');
                const modal = document.getElementById('modal');
                const modalText = document.getElementById('modal-text');
                const modalSubtitle = document.getElementById('modal-subtitle');
                const startBtn = document.getElementById('start-btn');

                let score = 0, lives = 3, level = 1;
                let W = 0, H = 0, dpr = 1;
                let best = loadBest();
                let gameState = 'start-screen';
                let levelTransitionEndTime = 0;
                const baseWidth = 480, baseHeight = 640;
                let scale = 1;
                let extraLifeDroppedThisLevel = false;
                let lifeLostThisLevel = false;
                let hasUsedExtraLifeChance = false;

                let powerUpState = { isFireballShooter: false, fireballShooterEndTime: 0, nextFireballTime: 0, isBallShooter: false, ballShooterEndTime: 0, nextBallTime: 0, isFastBall: false, fastBallEndTime: 0 };
                let balls = [], bricks = [], powerUps = [], fireballs = [];
                const paddle = { x: 0, y: 0, width: 100, height: 10, color: '#FF00FF', baseWidth: 100 };
                const enemyAIPaddle = { x: 0, y: 0, width: 100, height: 10, color: '#FF4500', active: false };
                const cornerBumperSize = 30;
                const brickInfo = { rowCount: 7, columnCount: 7, width: 55, height: 20, padding: 10, offsetTop: 50 };
                const brickColors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#8B00FF'];
                const multiHitColors = { 3: '#FFD700', 2: '#C0C0C0', 1: '#CD7F32' };

                let synth, metalSynth, brickHitSynth, brickBreakSynth, megatronSynth, audioInitialized = false;
                let lastSoundTime = 0;

                function playSoundSafe(synth, ...args) {
                    if (!audioInitialized || !synth) return;
                    try {
                        let time = Tone.now();
                        if (time <= lastSoundTime) {
                            time = lastSoundTime + 0.05; 
                        }
                        synth.triggerAttackRelease(...args, time);
                        lastSoundTime = time;
                    } catch (e) {
                        // Fail silently 
                    }
                }

                function initAudio() {
                    if (audioInitialized) return;
                    if (!window.Tone) { window.loadTone().then(initAudio).catch(() => {}); return; }
                    try {
                        if (Tone.context.state !== 'running') { Tone.start(); }
                        synth = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.2 } }).toDestination();
                        metalSynth = new Tone.MetalSynth({ frequency: 100, envelope: { attack: 0.01, decay: 0.2, release: 0.1 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).toDestination();
                        brickHitSynth = new Tone.MembraneSynth({ pitchDecay: 0.01, octaves: 2, oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 0.2, sustain: 0.01, release: 0.1 } }).toDestination();
                        brickBreakSynth = new Tone.NoiseSynth({ noise: { type: 'brown' }, volume: -12, envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 } }).toDestination();
                        megatronSynth = new Tone.FMSynth({ harmonicity: 3, modulationIndex: 14, detune: 0, oscillator: { type: 'sawtooth' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.4 }, modulation: { type: 'sine' }, modulationEnvelope: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.4 } }).toDestination();
                        audioInitialized = true;
                        lastSoundTime = 0;
                    } catch (e) { console.error("Could not initialize audio:", e); }
                }

                function resizeAndScale() {
                    const { width, height } = canvas.getBoundingClientRect();
                    dpr = Math.min(window.devicePixelRatio || 1, 2);
                    W = width; H = height;
                    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
                    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // crisp on retina phones; game logic stays in CSS pixels
                    scale = Math.min(width / baseWidth, height / baseHeight);
                    paddle.width = paddle.baseWidth * scale;
                    paddle.height = 10 * scale;
                    enemyAIPaddle.width = 100 * scale;
                    enemyAIPaddle.height = 10 * scale;
                    brickInfo.width = 55 * scale;
                    brickInfo.height = 20 * scale;
                    brickInfo.padding = 10 * scale;
                    brickInfo.offsetTop = 60 * scale;
                    brickInfo.offsetLeft = (W - (brickInfo.columnCount * (brickInfo.width + brickInfo.padding) - brickInfo.padding)) / 2;
                    paddle.y = H - 30 * scale;
                    enemyAIPaddle.y = H / 3;
                }

                function createBricks(currentLevel) {
                    bricks = [];
                    const layouts = [
                        (c, r) => ({ health: 1, color: brickColors[r] }),
                        (c, r) => { if (r >= 3 && c >= r - 3 && c <= 9 - r) { const health = (r === 3 || c === r - 3 || c === 9 - r) ? 2 : 1; return { health, color: health === 2 ? multiHitColors[2] : brickColors[r] }; } return null; },
                        (c, r) => { if ((c + r) % 2 === 0) { const health = (c > 1 && c < 5 && r > 1 && r < 5) ? 3 : 1; return { health, color: health === 3 ? multiHitColors[3] : brickColors[r] }; } return null; },
                        (c, r) => { if (c === 0 || c === 6 || r === 0 || r === 6) return { health: 2, color: multiHitColors[2] }; if (c === 1 || c === 5 || r === 1 || r === 5) return { health: 1, color: brickColors[r] }; if (c > 1 && c < 5 && r > 1 && r < 5) return { health: 3, color: multiHitColors[3] }; return null; },
                        (c, r) => { if (c % 2 === 0) { const health = r < 2 ? 2 : 1; return { health, color: health === 2 ? multiHitColors[2] : brickColors[r] }; } return null; },
                        (c, r) => { if ((r === 1 || r === 2) && (c === 1 || c === 5)) return { health: 2, color: multiHitColors[2] }; if (r === 4 && c > 0 && c < 6) return { health: 1, color: brickColors[1] }; if (r === 5 && (c === 1 || c === 5)) return { health: 1, color: brickColors[1] }; return null; },
                        (c, r) => { if (c === 0 || c === 6 || r === 0) return { health: 3, color: multiHitColors[3] }; if (r > 2 && (c === 2 || c === 4)) return { health: 2, color: multiHitColors[2] }; if (r === 4 && c === 3) return { health: 1, color: brickColors[0] }; return null; },
                        (c, r) => { if ((c === 1 && r === 1) || (c === 5 && r === 1) || (c === 3 && r === 4) || (c === 1 && r === 6) || (c === 5 && r === 6)) return { health: 3, color: multiHitColors[3] }; return null; },
                        (c, r) => { const health = (c + r) % 2 === 0 ? 3 : 1; return { health, color: health === 3 ? multiHitColors[3] : brickColors[r] }; },
                        (c, r) => ({ health: 3, color: multiHitColors[3] })
                    ];
                    const layoutFunc = layouts[Math.min(currentLevel - 1, layouts.length - 1)];
                    for (let c = 0; c < brickInfo.columnCount; c++) {
                        bricks[c] = [];
                        for (let r = 0; r < brickInfo.rowCount; r++) {
                            const brickProps = layoutFunc(c, r);
                            if (brickProps) {
                                const brickX = c * (brickInfo.width + brickInfo.padding) + brickInfo.offsetLeft;
                                const brickY = r * (brickInfo.height + brickInfo.padding) + brickInfo.offsetTop;
                                bricks[c][r] = { x: brickX, y: brickY, status: 1, initialHealth: brickProps.health, ...brickProps };
                            } else {
                                bricks[c][r] = { status: 0 };
                            }
                        }
                    }
                }

                function createBall(x, y, dx, dy, type = 'normal') {
                    let newBall = { x, y, radius: 8 * scale, dx: dx * scale, dy: dy * scale, type, isFast: false };
                    if (powerUpState.isFastBall) {
                        newBall.isFast = true;
                        newBall.dx *= 1.5;
                        newBall.dy *= 1.5;
                    }
                    return newBall;
                }

                function createFireball() {
                    fireballs.push({ x: paddle.x + paddle.width / 2, y: paddle.y, radius: 6 * scale, dy: -8 * scale, color: '#FF4500' });
                    playSoundSafe(synth, "A5", "16n");
                }

                function shootExtraBall() {
                    balls.push(createBall(paddle.x + paddle.width / 2, paddle.y, (Math.random() - 0.5) * 4, -4));
                    playSoundSafe(synth, "G5", "16n");
                }

                function createPowerUp(x, y) {
                    let type;
                    const symbols = { 'enlarge': 'E', 'super-ball': 'S', 'multi-ball': 'M', 'extra-life': '+', 'fast-ball': 'F', 'fireball-shooter': 'C', 'ball-shooter': 'B' };
                    if (!extraLifeDroppedThisLevel && Math.random() < 0.1) {
                        type = 'extra-life';
                        extraLifeDroppedThisLevel = true;
                    } else {
                        const rand = Math.random();
                        if (rand < 0.30) { type = 'multi-ball'; }
                        else {
                            const remainingTypes = ['enlarge', 'super-ball', 'fast-ball', 'fireball-shooter', 'ball-shooter'];
                            type = remainingTypes[Math.floor(Math.random() * remainingTypes.length)];
                        }
                    }
                    if (type) {
                        powerUps.push({ x, y, type, symbol: symbols[type], size: 15 * scale, dy: 2 * scale });
                    }
                }

                function draw() {
                    ctx.clearRect(0, 0, W, H);
                    drawBricks();
                    drawPaddle();
                    if (enemyAIPaddle.active) drawEnemyAIPaddle();
                    drawPowerUps();
                    drawBalls();
                    drawFireballs();
                    drawCornerBumpers();
                }

                function drawCornerBumpers() { const size = cornerBumperSize * scale; ctx.fillStyle = '#444'; ctx.beginPath(); ctx.moveTo(0, H - size); ctx.lineTo(size, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(W, H - size); ctx.lineTo(W - size, H); ctx.lineTo(W, H); ctx.closePath(); ctx.fill(); }
                function drawBalls() { balls.forEach(ball => { ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2); ctx.fillStyle = ball.type === 'super' ? '#FFA500' : '#00FFFF'; ctx.fill(); ctx.closePath(); }); }
                function drawFireballs() { fireballs.forEach(fb => { ctx.beginPath(); ctx.arc(fb.x, fb.y, fb.radius, 0, Math.PI * 2); ctx.fillStyle = fb.color; ctx.fill(); ctx.closePath(); }); }
                function drawPaddle() { ctx.beginPath(); ctx.rect(paddle.x, paddle.y, paddle.width, paddle.height); ctx.fillStyle = paddle.color; ctx.fill(); ctx.closePath(); }
                function drawEnemyAIPaddle() { ctx.beginPath(); ctx.rect(enemyAIPaddle.x, enemyAIPaddle.y, enemyAIPaddle.width, enemyAIPaddle.height); ctx.fillStyle = enemyAIPaddle.color; ctx.fill(); ctx.closePath(); }
                function drawBricks() { bricks.flat().forEach(b => { if (b.status === 1) { ctx.beginPath(); ctx.rect(b.x, b.y, brickInfo.width, brickInfo.height); ctx.fillStyle = b.health > 1 ? multiHitColors[b.health] : b.color; ctx.fill(); ctx.closePath(); } }); }
                function drawPowerUps() { powerUps.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fillStyle = '#FF00FF'; ctx.fill(); ctx.fillStyle = '#FFFFFF'; ctx.font = `bold ${p.size}px "Courier New", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.symbol, p.x, p.y); ctx.closePath(); }); }

                function update() {
                    let powerUpsToActivate = [];
                    moveBalls();
                    updateFireballs();
                    powerUpsToActivate = updatePowerUps();
                    powerUpsToActivate.forEach(type => activatePowerUp(type));
                    updateActivePowerUps();
                    if (enemyAIPaddle.active) updateEnemyAIPaddle();
                }

                function updateEnemyAIPaddle() { let targetBall = balls.reduce((lowest, ball) => ball.y > lowest.y ? ball : lowest, {y: -Infinity}); if(targetBall.y !== -Infinity) { enemyAIPaddle.x += (targetBall.x - (enemyAIPaddle.x + enemyAIPaddle.width / 2)) * 0.12; } if (enemyAIPaddle.x < 0) enemyAIPaddle.x = 0; if (enemyAIPaddle.x + enemyAIPaddle.width > W) enemyAIPaddle.x = W - enemyAIPaddle.width; }
                function moveBalls() {
                    const collisions = [];
                    balls.forEach(ball => {
                        ball.x += ball.dx;
                        ball.y += ball.dy;
                        if (ball.x > W - ball.radius || ball.x < ball.radius) { ball.dx = -ball.dx; }
                        if (ball.y < ball.radius) { ball.dy = -ball.dy; }
                        const size = cornerBumperSize * scale;
                        if (ball.y > H - size) {
                            if (ball.x < size && ball.dy > 0) { ball.dx = Math.abs(ball.dy); ball.dy = -Math.abs(ball.dx); playSoundSafe(synth, "E4", "8n"); }
                            if (ball.x > W - size && ball.dy > 0) { ball.dx = -Math.abs(ball.dy); ball.dy = -Math.abs(ball.dx); playSoundSafe(synth, "E4", "8n"); }
                        }
                        if (enemyAIPaddle.active && ball.y < enemyAIPaddle.y + enemyAIPaddle.height + ball.radius && ball.dy < 0) { if (ball.x > enemyAIPaddle.x && ball.x < enemyAIPaddle.x + enemyAIPaddle.width) { ball.dy = -ball.dy; playSoundSafe(synth, "G3", "8n"); } }
                        if (ball.y > paddle.y - ball.radius && ball.y < paddle.y + paddle.height && ball.x > paddle.x && ball.x < paddle.x + paddle.width) { let collidePoint = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2); let currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy); let angle; if (Math.abs(collidePoint) < 0.1) { angle = (collidePoint >= 0 ? 1 : -1) * (Math.PI / 8); } else { angle = collidePoint * (Math.PI / 3); } ball.dx = currentSpeed * Math.sin(angle); ball.dy = -currentSpeed * Math.cos(angle); ball.y += ball.dy; playSoundSafe(synth, "C4", "8n"); }
                        const hitBrick = brickCollisionDetection(ball);
                        if (hitBrick) { collisions.push({ ball, brick: hitBrick }); }
                    });
                    collisions.forEach(({ ball, brick }) => resolveBrickCollision(ball, brick));
                    const initialBallCount = balls.length;
                    balls = balls.filter(ball => ball.y < H);
                    if (balls.length < initialBallCount && balls.length > 0) playSoundSafe(synth, "C3", "8n");
                    if (balls.length === 0 && gameState === 'playing') {
                        lives--;
                        lifeLostThisLevel = true;
                        playSoundSafe(metalSynth, "C2", "4n");
                        if (lives <= 0) gameOver(); else resetBallAndPaddle();
                    }
                }

                function updateFireballs() { fireballs.forEach((fb, index) => { fb.y += fb.dy; if (fb.y < 0) { fireballs.splice(index, 1); return; } for (const b of bricks.flat()) { if (b.status === 1 && fb.x > b.x && fb.x < b.x + brickInfo.width && fb.y > b.y && fb.y < b.y + brickInfo.height) { fireballs.splice(index, 1); handleBrickHit(b); return; } } }); }
                function handleBrickHit(b) { if (b.status !== 1) return; b.health--; score += 10; if (b.health <= 0) { playSoundSafe(brickBreakSynth, "8n"); b.status = 0; score += 20; const isSpecialLevel = level >= 5 && level <= 8; const enemyChance = isSpecialLevel ? 0.10 : 0.03; let powerUpChance; if (b.initialHealth > 1) { powerUpChance = 0.80; } else { powerUpChance = isSpecialLevel ? 0.40 : 0.25; } if (Math.random() < enemyChance && !enemyAIPaddle.active) { activateEnemyAI(); } else if (Math.random() < powerUpChance) { createPowerUp(b.x + brickInfo.width / 2, b.y + brickInfo.height / 2); } } else { playSoundSafe(brickHitSynth, "C2", "8n"); } checkWin(); }
                function brickCollisionDetection(ball) { for (const b of bricks.flat()) { if (b.status !== 1) continue; const closestX = Math.max(b.x, Math.min(ball.x, b.x + brickInfo.width)); const closestY = Math.max(b.y, Math.min(ball.y, b.y + brickInfo.height)); const distanceX = ball.x - closestX; const distanceY = ball.y - closestY; const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY); if (distanceSquared < (ball.radius * ball.radius)) { return b; } } return null; }
                function resolveBrickCollision(ball, b) { if (b.status !== 1) return; if (ball.type !== 'super') { const closestX = Math.max(b.x, Math.min(ball.x, b.x + brickInfo.width)); const closestY = Math.max(b.y, Math.min(ball.y, b.y + brickInfo.height)); const distanceX = ball.x - closestX; const distanceY = ball.y - closestY; const overlapX = ball.radius - Math.abs(distanceX); const overlapY = ball.radius - Math.abs(distanceY); if (overlapX > overlapY) { ball.dy = -ball.dy; ball.y += ball.dy > 0 ? overlapY : -overlapY; } else { ball.dx = -ball.dx; ball.x += ball.dx > 0 ? overlapX : -overlapX; } } handleBrickHit(b); }
                function updatePowerUps() { const collectedPowerUps = []; powerUps = powerUps.filter(p => { p.y += p.dy; if (p.y > paddle.y && p.x > paddle.x && p.x < paddle.x + paddle.width) { collectedPowerUps.push(p.type); return false; } return p.y < H; }); return collectedPowerUps; }
                function updateActivePowerUps() { const now = Date.now(); if (powerUpState.isFireballShooter) { if (now > powerUpState.fireballShooterEndTime) { powerUpState.isFireballShooter = false; } else if (now > powerUpState.nextFireballTime) { createFireball(); powerUpState.nextFireballTime = now + 1000; } } if (powerUpState.isBallShooter) { if (now > powerUpState.ballShooterEndTime) { powerUpState.isBallShooter = false; } else if (now > powerUpState.nextBallTime) { shootExtraBall(); powerUpState.nextBallTime = now + 2000; } } if (powerUpState.isFastBall && now > powerUpState.fastBallEndTime) { powerUpState.isFastBall = false; balls.forEach(ball => { if (ball.isFast) { ball.dx /= 1.5; ball.dy /= 1.5; ball.isFast = false; } }); } }
                function activatePowerUp(type) { playSoundSafe(synth, "C6", "8n"); if (type === 'enlarge') { paddle.baseWidth = 150; resizeAndScale(); setTimeout(() => { paddle.baseWidth = 100; resizeAndScale(); }, 10000); } else if (type === 'super-ball') { balls.forEach(b => b.type = 'super'); setTimeout(() => balls.forEach(b => b.type = 'normal'), 10000); } else if (type === 'multi-ball') { const originalBalls = [...balls]; originalBalls.forEach(b => { balls.push(createBall(b.x, b.y, b.dx + 1, b.dy)); balls.push(createBall(b.x, b.y, b.dx - 1, b.dy)); }); } else if (type === 'extra-life') { lives++; } else if (type === 'fast-ball') { if (!powerUpState.isFastBall) { balls.forEach(ball => { ball.dx *= 1.5; ball.dy *= 1.5; ball.isFast = true; }); } powerUpState.isFastBall = true; powerUpState.fastBallEndTime = Date.now() + 8000; } else if (type === 'fireball-shooter') { powerUpState.isFireballShooter = true; powerUpState.fireballShooterEndTime = Date.now() + 10000; powerUpState.nextFireballTime = Date.now(); } else if (type === 'ball-shooter') { powerUpState.isBallShooter = true; powerUpState.ballShooterEndTime = Date.now() + 10000; powerUpState.nextBallTime = Date.now(); } }
                function activateEnemyAI() { enemyAIPaddle.active = true; if(audioInitialized) { const now = Tone.now(); megatronSynth.triggerAttackRelease("G2", "4n", now); megatronSynth.triggerAttackRelease("C3", "4n", now + 0.3); megatronSynth.triggerAttackRelease("F2", "2n", now + 0.6); } setTimeout(() => { enemyAIPaddle.active = false; }, 10000); }

                function checkWin() { if (bricks.flat().every(b => b.status === 0)) { if (!lifeLostThisLevel) { lives++; } if (level === 10) { winGame(); return; } gameState = 'level-transition'; level++; powerUps = []; fireballs = []; powerUpState.isFireballShooter = false; powerUpState.isBallShooter = false; powerUpState.isFastBall = false; playSoundSafe(synth, "G5", "2n"); levelTransitionEndTime = Date.now() + 2500; } }
                function startNextLevel() { extraLifeDroppedThisLevel = false; lifeLostThisLevel = false; createBricks(level); resetBallAndPaddle(); }
                function resetBallAndPaddle() { balls = [createBall(W / 2, H - 50 * scale, 4 * (Math.random() > 0.5 ? 1 : -1), -4)]; paddle.x = (W - paddle.width) / 2; }
                function resetGame() { score = 0; lives = 3; level = 1; powerUps = []; fireballs = []; powerUpState = { isFireballShooter: false, fireballShooterEndTime: 0, nextFireballTime: 0, isBallShooter: false, ballShooterEndTime: 0, nextBallTime: 0, isFastBall: false, fastBallEndTime: 0 }; enemyAIPaddle.active = false; extraLifeDroppedThisLevel = false; hasUsedExtraLifeChance = false; lifeLostThisLevel = false; resizeAndScale(); createBricks(level); resetBallAndPaddle(); }
                function gameOver() { saveBest(); if (!hasUsedExtraLifeChance) { gameState = 'extra-life-prompt'; hasUsedExtraLifeChance = true; } else { gameState = 'game-over'; } }
                function winGame() { saveBest(); gameState = 'game-won'; }
                function startGame() { initAudio(); resetGame(); gameState = 'playing'; }

                // Fixed 60 Hz simulation step: the original moved everything once per animation frame,
                // so on 90/120 Hz phones the ball ran 1.5-2x too fast. Now physics always runs 60 steps/s.
                const STEP = 1000 / 60;
                let acc = 0, last = 0;
                function tick() {
                    if (gameState === 'playing') { keyMove(); update(); }
                    else if (gameState === 'level-transition') { if (Date.now() > levelTransitionEndTime) { startNextLevel(); gameState = 'playing'; } }
                }
                function loop(now) {
                    if (now === undefined) now = performance.now();
                    if (!last) last = now;
                    let dt = now - last; last = now;
                    if (dt > 100) dt = 100; // tab was hidden / long hitch: don't fast-forward the game
                    acc += dt;
                    let steps = 0;
                    while (acc >= STEP && steps < 6) { tick(); acc -= STEP; steps++; }
                    if (steps === 6) acc = 0;
                    draw();
                    updateUI();
                    requestAnimationFrame(loop);
                }

                function updateUI() { if (score > best && gameState === 'playing') showBest(score); scoreEl.textContent = `SCORE: ${score}`; livesEl.textContent = `LIVES: ${lives}`; levelEl.textContent = `LEVEL: ${level}`; if (gameState === 'start-screen' || gameState === 'game-over') { modal.style.display = ''; startBtn.style.display = ''; modalText.textContent = gameState === 'start-screen' ? 'BREAKOUT' : 'GAME OVER'; modalSubtitle.textContent = gameState === 'start-screen' ? (best ? `Deluxe Edition \u2022 High score: ${best}` : 'Deluxe Edition') : `Final Score: ${score} \u2022 Best: ${best}`; helpEl.hidden = gameState !== 'start-screen'; startBtn.textContent = gameState === 'start-screen' ? 'START GAME' : 'RESTART'; } else if (gameState === 'extra-life-prompt') { modal.style.display = ''; startBtn.style.display = ''; modalText.textContent = "You're out of lives..."; modalSubtitle.textContent = "But you can have one more."; helpEl.hidden = true; startBtn.textContent = "Admit Brett is better"; } else if (gameState === 'game-won') { modal.style.display = ''; startBtn.style.display = ''; modalText.textContent = "CONGRATU-FREAKING-LATIONS!"; modalSubtitle.textContent = `You won!!! Score: ${score} \u2022 Best: ${best}`; helpEl.hidden = true; startBtn.textContent = "Play Again?"; } else if (gameState === 'level-transition') { modal.style.display = ''; startBtn.style.display = 'none'; modalText.textContent = `LEVEL ${level}`; modalSubtitle.textContent = "Get Ready!"; } else { modal.style.display = 'none'; } }
                function movePaddle(x) { paddle.x = x - paddle.width / 2; if (paddle.x < 0) { paddle.x = 0; } if (paddle.x + paddle.width > W) { paddle.x = W - paddle.width; } }
                function handleMove(e) { if (e.type.includes('touch')) { e.preventDefault(); } const rect = canvas.getBoundingClientRect(); const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX; if (clientX === undefined) return; movePaddle(clientX - rect.left); }

                canvas.addEventListener('mousemove', handleMove);
                canvas.addEventListener('touchmove', handleMove, { passive: false });
                canvas.addEventListener('touchstart', handleMove, { passive: false });
                startBtn.addEventListener('click', () => { if (window.Tone && Tone.context.state !== 'running') { try { Tone.start(); } catch (e) {} } if (gameState === 'start-screen' || gameState === 'game-over' || gameState === 'game-won') { startGame(); } else if (gameState === 'extra-life-prompt') { lives = 1; resetBallAndPaddle(); gameState = 'playing'; } });
                window.addEventListener('resize', () => { resizeAndScale(); draw(); updateUI(); });
                showBest(best);
                resizeAndScale();
                resetGame(); // show level 1 behind the start screen
                gameState = 'start-screen';
                requestAnimationFrame(loop);
                const kick = () => setTimeout(() => loadTone().catch(() => {}), 300);
                if (document.readyState === 'complete') kick(); else window.addEventListener('load', kick, { once: true });
                window.addEventListener('pageshow', (e) => { if (e.persisted) { last = 0; } });
})();
