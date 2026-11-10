const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let gameState = 'MENU_MAIN';
let winnerPlayer = null;
let rebindingKey = null;

let menuGridOffset = 0;
const menuParticles = [];
for (let i = 0; i < 60; i++) {
    menuParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speedY: Math.random() * 0.8 + 0.2,
        color: Math.random() > 0.5 ? '#ff0055' : '#00ffff'
    });
}

// Sistema de Pétalos de Sakura flotantes
const sakuraPetals = [];
for (let i = 0; i < 50; i++) {
    sakuraPetals.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 6 + 4,
        speedY: Math.random() * 1.2 + 0.5,
        speedX: Math.random() * 1.5 - 0.7,
        angle: Math.random() * Math.PI * 2,
        spin: Math.random() * 0.04 - 0.02
    });
}

const paletteP1 = ['#ff0055', '#ffaa00', '#ff00ff', '#000000'];
const paletteP2 = ['#00ffff', '#00ff66', '#ffff00', '#aa00ff'];

const MODELS = [
    { name: 'Rx-7 Veilside', w: 42, h: 22, stats: { speed: 88, accel: 82, drift: 95 } },
    { name: 'Skyline GTR',   w: 46, h: 20, stats: { speed: 96, accel: 90, drift: 75 } },
    { name: 'AE86 Trueno',   w: 40, h: 26, stats: { speed: 78, accel: 85, drift: 98 } }
];

const ABILITIES = [
    { id: 'PUSH', name: 'Onda Impulso' },
    { id: 'EMP', name: 'Parálisis EMP' },
    { id: 'BOOST', name: 'Super Turbo' },
    { id: 'SHIELD', name: 'Super Escudo' }
];

let p1Custom = { modelIdx: 0, colorIdx: 0, abilityIdx: 0 };
let p2Custom = { modelIdx: 0, colorIdx: 0, abilityIdx: 1 };

let currentTrackId = 0;

const POWER_TYPES = [
    { type: 'TURBO', icon: '⚡', color: '#ffaa00' },
    { type: 'OIL', icon: '🛢️', color: '#aa00ff' },
    { type: 'SHIELD', icon: '🛡️', color: '#00ffcc' },
    { type: 'EMP', icon: '💥', color: '#ff0055' }
];

function getRandomPowerType() {
    return POWER_TYPES[Math.floor(Math.random() * POWER_TYPES.length)];
}

function createPath(pts) {
    const path = new Path2D();
    path.moveTo(pts[0][0], pts[0][1]);
    for(let i=1; i<pts.length; i++) path.lineTo(pts[i][0], pts[i][1]);
    path.closePath();
    return path;
}

const tracks = [
    {
        name: "MONTE FUJI (CUMBRE NEVADA ÉPICA)",
        kanji: "富士山雪",
        stats: { difficulty: 88, length: 92, curves: 90 },
        bgColor: '#060919', roadColor: '#14182b', curb1: '#ffffff', curb2: '#ff3388', lineDashColor: '#ff99cc',
        checkpoint: { x: 800, y: 620, r: 160 },
        decorations: [
            { type: 'fuji_mountain', x: 675, y: 380 }
        ],
        boostPads: [
            {x: 500, y: 180, angle: 0},
            {x: 1150, y: 400, angle: Math.PI / 2},
            {x: 750, y: 380, angle: Math.PI},
            {x: 300, y: 620, angle: Math.PI}
        ],
        centerPath: createPath([[200,180],[1150,180],[1150,620],[750,620],[750,380],[450,380],[450,620],[200,620]])
    },
    {
        name: "TOKYO SHUTO AUTOPISTA",
        kanji: "首都高",
        stats: { difficulty: 65, length: 70, curves: 50 },
        bgColor: '#040714', roadColor: '#0b1226', curb1: '#00ffff', curb2: '#ff0077', lineDashColor: '#00ffff',
        checkpoint: { x: 675, y: 620, r: 180 },
        decorations: [
            { type: 'fuji_mountain', x: 675, y: 380 }
        ],
        boostPads: [
            {x: 600, y: 180, angle: 0},
            {x: 1150, y: 400, angle: Math.PI / 2},
            {x: 600, y: 620, angle: Math.PI}
        ],
        centerPath: createPath([[200,180],[1150,180],[1150,620],[200,620]])
    },
    {
        name: "PASO AKINA (NEÓN ESPACIO)",
        kanji: "秋名山",
        stats: { difficulty: 82, length: 99, curves: 89 },
        bgColor: '#030108', roadColor: '#120b24', curb1: '#aa00ff', curb2: '#00ffaa', lineDashColor: '#00ffaa',
        checkpoint: { x: 699, y: 635, r: 200 },
        decorations: [
            { type: 'fuji_mountain', x: 699, y: 385 }
        ],
        boostPads: [
            {x: 400, y: 200, angle: 0},
            {x: 950, y: 200, angle: 0},
            {x: 1150, y: 400, angle: Math.PI / 2},
            {x: 675, y: 620, angle: Math.PI}
        ],
        centerPath: createPath([[200,180],[1150,180],[1150,620],[200,620]])
    }
];

let controlsP1 = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', drift: 'ShiftLeft' };
let controlsP2 = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', drift: 'Enter'};

function createCar(x, y, custom, controls, id) {
    let model = MODELS[custom.modelIdx];
    return {
        id, x, y,
        color: id === 1 ? paletteP1[custom.colorIdx] : paletteP2[custom.colorIdx],
        modelIdx: custom.modelIdx,
        abilityId: ABILITIES[custom.abilityIdx].id,
        abilityName: ABILITIES[custom.abilityIdx].name,
        controls,
        vx: 0, vy: 0, angle: 0,
        accel: 0.18 + (model.stats.accel / 100) * 0.05,
        brake: 0.35,
        turnSpeed: 0.042 + (model.stats.drift / 100) * 0.012,
        width: model.w, height: model.h,
        lap: 1, maxLaps: 3, passedCheckpoint: false,
        score: 0, currentCombo: 0, isDrifting: false,
        spinOutTimer: 0, empTimer: 0, shieldTimer: 0,
        abilityCooldown: 0, maxCooldown: 250,
        abilityAnim: 0
    };
}

let p1 = createCar(160, 155, p1Custom, controlsP1, 1);
let p2 = createCar(160, 205, p2Custom, controlsP2, 2);

const powerBoxes = [
    { x: 675, y: 180, info: getRandomPowerType(), active: true, respawn: 0 },
    { x: 1150, y: 320, info: getRandomPowerType(), active: true, respawn: 0 },
    { x: 200, y: 400, info: getRandomPowerType(), active: true, respawn: 0 }
];
const oilSlicks = [];
const sparks = [];

const keys = {};
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (rebindingKey) {
        if (rebindingKey.player === 1) controlsP1[rebindingKey.action] = e.code;
        if (rebindingKey.player === 2) controlsP2[rebindingKey.action] = e.code;
        rebindingKey = null;
    }
});
window.addEventListener('keyup', e => keys[e.code] = false);

canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (gameState === 'MENU_MAIN') {
        if (isInside(mx, my, 475, 290, 400, 55)) resetGame();
        if (isInside(mx, my, 475, 365, 400, 55)) gameState = 'MENU_GARAGE';
        if (isInside(mx, my, 475, 440, 400, 55)) gameState = 'MENU_TRACKS';
        if (isInside(mx, my, 475, 515, 400, 55)) gameState = 'MENU_CONTROLS';
    }
    else if (gameState === 'MENU_GARAGE') {
        if (isInside(mx, my, 400, 280, 200, 40)) p1Custom.modelIdx = (p1Custom.modelIdx + 1) % MODELS.length;
        if (isInside(mx, my, 400, 340, 200, 40)) p1Custom.colorIdx = (p1Custom.colorIdx + 1) % paletteP1.length;

        if (isInside(mx, my, 750, 280, 200, 40)) p2Custom.modelIdx = (p2Custom.modelIdx + 1) % MODELS.length;
        if (isInside(mx, my, 750, 340, 200, 40)) p2Custom.colorIdx = (p2Custom.colorIdx + 1) % paletteP2.length;

        if (isInside(mx, my, 575, 680, 200, 50)) gameState = 'MENU_MAIN';
    }
    else if (gameState === 'MENU_TRACKS') {
        if (isInside(mx, my, 120, 280, 450, 55)) currentTrackId = 0;
        if (isInside(mx, my, 120, 360, 450, 55)) currentTrackId = 1;
        if (isInside(mx, my, 120, 440, 450, 55)) currentTrackId = 2;
        if (isInside(mx, my, 575, 660, 200, 50)) gameState = 'MENU_MAIN';
    }
    else if (gameState === 'MENU_CONTROLS') {
        ['up','left','down','right','drift','ability'].forEach((act, i) => {
            if (isInside(mx, my, 380, 310 + i*40, 110, 32)) rebindingKey = { player: 1, action: act };
            if (isInside(mx, my, 860, 310 + i*40, 110, 32)) rebindingKey = { player: 2, action: act };
        });
        if (isInside(mx, my, 575, 650, 200, 50)) gameState = 'MENU_MAIN';
    }
    else if (gameState === 'WIN') {
        if (isInside(mx, my, 525, 580, 300, 55)) gameState = 'MENU_MAIN';
    }
});

function isInside(x, y, bx, by, bw, bh) {
    return x >= bx && x <= bx + bw && y >= by && y <= by + bh;
}

function resetGame() {
    p1 = createCar(160, 155, p1Custom, controlsP1, 1);
    p2 = createCar(160, 205, p2Custom, controlsP2, 2);
    sparks.length = 0; oilSlicks.length = 0;
    powerBoxes.forEach(box => { box.active = true; box.respawn = 0; box.info = getRandomPowerType(); });
    winnerPlayer = null;
    gameState = 'PLAYING';
}

function triggerAbility(car, enemyCar) {
    if (car.abilityCooldown <= 0) {
        car.abilityCooldown = car.maxCooldown;
        car.abilityAnim = 25;

        if (car.abilityId === 'BOOST') {
            car.vx += Math.cos(car.angle) * 7.5;
            car.vy += Math.sin(car.angle) * 7.5;
        } else if (car.abilityId === 'SHIELD') {
            car.shieldTimer = 220;
        } else if (car.abilityId === 'PUSH') {
            let dist = Math.hypot(car.x - enemyCar.x, car.y - enemyCar.y);
            if (dist < 250 && enemyCar.shieldTimer <= 0) {
                let pushAngle = Math.atan2(enemyCar.y - car.y, enemyCar.x - car.x);
                enemyCar.vx += Math.cos(pushAngle) * 8;
                enemyCar.vy += Math.sin(pushAngle) * 8;
                enemyCar.spinOutTimer = 12;
            }
        } else if (car.abilityId === 'EMP') {
            let dist = Math.hypot(car.x - enemyCar.x, car.y - enemyCar.y);
            if (dist < 320 && enemyCar.shieldTimer <= 0) {
                enemyCar.empTimer = 50;
                enemyCar.vx = 0; enemyCar.vy = 0;
            }
        }
    }
}

function updateCar(car, enemyCar, name) {
    if (car.abilityCooldown > 0) car.abilityCooldown--;
    if (car.abilityAnim > 0) car.abilityAnim--;
    if (car.shieldTimer > 0) car.shieldTimer--;

    if (keys[car.controls.ability]) triggerAbility(car, enemyCar);

    if (car.empTimer > 0) {
        car.empTimer--; car.vx = 0; car.vy = 0; return;
    }

    if (car.spinOutTimer > 0) {
        car.spinOutTimer--;
        car.angle += 0.10;
        car.vx *= 0.95; car.vy *= 0.95;
        car.x += car.vx; car.y += car.vy;
        return;
    }

    car.vx *= 0.96;
    car.vy *= 0.96;

    let speed = Math.hypot(car.vx, car.vy);
    let speedTurnFactor = Math.min(1.0, Math.max(0.2, speed / 2.5));

    let handbrake = keys[car.controls.drift];
    let turnMult = handbrake ? 1.25 : 1.0;

    let currentTurnRate = car.turnSpeed * speedTurnFactor * turnMult;

    if (keys[car.controls.left]) car.angle -= currentTurnRate;
    if (keys[car.controls.right]) car.angle += currentTurnRate;

    let forwardVec = { x: Math.cos(car.angle), y: Math.sin(car.angle) };
    let rightVec = { x: -Math.sin(car.angle), y: Math.cos(car.angle) };

    let forwardSpeed = car.vx * forwardVec.x + car.vy * forwardVec.y;
    let lateralSpeed = car.vx * rightVec.x + car.vy * rightVec.y;

    if (keys[car.controls.up]) forwardSpeed += car.accel;
    if (keys[car.controls.down]) forwardSpeed -= car.brake;

    let grip = handbrake ? 0.91 : 0.96;
    lateralSpeed *= grip;

    car.vx = forwardVec.x * forwardSpeed + rightVec.x * lateralSpeed;
    car.vy = forwardVec.y * forwardSpeed + rightVec.y * lateralSpeed;

    let activeTrack = tracks[currentTrackId];
    let nextX = car.x + car.vx;
    let nextY = car.y + car.vy;

    ctx.lineWidth = 125;
    let onRoad = ctx.isPointInStroke(activeTrack.centerPath, nextX, nextY);

    if (onRoad) {
        car.x = nextX;
        car.y = nextY;
    } else {
        car.vx *= -0.3;
        car.vy *= -0.3;
        car.currentCombo = 0;
    }

    car.x = Math.max(25, Math.min(canvas.width - 25, car.x));
    car.y = Math.max(25, Math.min(canvas.height - 25, car.y));

    activeTrack.boostPads.forEach(pad => {
        if (Math.hypot(car.x - pad.x, car.y - pad.y) < 35) {
            car.vx += Math.cos(car.angle) * 4;
            car.vy += Math.sin(car.angle) * 4;
        }
    });

    let cp = activeTrack.checkpoint;
    if (Math.hypot(car.x - cp.x, car.y - cp.y) < cp.r) {
        car.passedCheckpoint = true;
    }

    if (car.passedCheckpoint && car.x >= 320 && car.x <= 360 && car.y >= 110 && car.y <= 250) {
        car.lap++;
        car.passedCheckpoint = false;
        if (car.lap > car.maxLaps) {
            winnerPlayer = name;
            gameState = 'WIN';
        }
    }

    powerBoxes.forEach(box => {
        if (box.active && Math.hypot(car.x - box.x, car.y - box.y) < 32) {
            box.active = false; 
            box.respawn = 240;

            if (box.info.type === 'TURBO') {
                car.vx += Math.cos(car.angle) * 6.5;
                car.vy += Math.sin(car.angle) * 6.5;
            } else if (box.info.type === 'OIL') {
                oilSlicks.push({ x: car.x - forwardVec.x * 25, y: car.y - forwardVec.y * 25 });
            } else if (box.info.type === 'SHIELD') {
                car.shieldTimer = 200;
            } else if (box.info.type === 'EMP') {
                if (enemyCar.shieldTimer <= 0) enemyCar.empTimer = 40;
            }

            box.info = getRandomPowerType();
        }
    });

    oilSlicks.forEach(oil => {
        if (Math.hypot(car.x - oil.x, car.y - oil.y) < 24) {
            if (car.shieldTimer <= 0) {
                car.spinOutTimer = 10; car.currentCombo = 0;
            }
        }
    });

    if (handbrake && speed > 1) {
        car.isDrifting = true;
        car.currentCombo += 1;

        sparks.push({
            x: car.x - forwardVec.x * 12 + (Math.random() * 8 - 4),
            y: car.y - forwardVec.y * 12 + (Math.random() * 8 - 4),
            color: Math.random() > 0.5 ? '#ff0055' : car.color,
            life: 15
        });
    } else {
        if (car.isDrifting) {
            car.score += car.currentCombo;
            car.currentCombo = 0;
            car.isDrifting = false;
        }
    }
}

function update() {
    menuGridOffset = (menuGridOffset + 1) % 40;
    menuParticles.forEach(p => {
        p.y -= p.speedY;
        if (p.y < 0) {
            p.y = canvas.height;
            p.x = Math.random() * canvas.width;
        }
    });

    sakuraPetals.forEach(p => {
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(p.angle) * 0.8;
        p.angle += p.spin;
        if (p.y > canvas.height + 20) {
            p.y = -20;
            p.x = Math.random() * canvas.width;
        }
    });

    if (gameState !== 'PLAYING') return;

    updateCar(p1, p2, 'JUGADOR 1');
    updateCar(p2, p1, 'JUGADOR 2');

    powerBoxes.forEach(box => {
        if (!box.active) { 
            box.respawn--; 
            if (box.respawn <= 0) {
                box.active = true;
                box.info = getRandomPowerType();
            }
        }
    });

    for (let i = sparks.length - 1; i >= 0; i--) {
        sparks[i].life--;
        if (sparks[i].life <= 0) sparks.splice(i, 1);
    }
}

function drawSakuraPetals() {
    ctx.save();
    sakuraPetals.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = '#ffb7c5';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#ff69b4';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
    ctx.restore();
}

function drawFujiMountain(cx, cy) {
    ctx.save();
    
    let sunGrad = ctx.createLinearGradient(cx, cy - 350, cx, cy - 50);
    sunGrad.addColorStop(0, '#ffea00');
    sunGrad.addColorStop(0.5, '#ff3366');
    sunGrad.addColorStop(1, '#ff0055');

    ctx.fillStyle = sunGrad;
    ctx.shadowBlur = 90;
    ctx.shadowColor = '#ff0055';
    ctx.beginPath();
    ctx.arc(cx, cy - 180, 240, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#060919';
    for (let stripeY = cy - 280; stripeY < cy - 80; stripeY += 16) {
        ctx.fillRect(cx - 260, stripeY, 520, 6);
    }

    ctx.fillStyle = '#101532';
    ctx.beginPath();
    ctx.moveTo(cx - 700, cy + 300);
    ctx.lineTo(cx - 400, cy - 60);
    ctx.lineTo(cx - 150, cy + 300);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + 150, cy + 300);
    ctx.lineTo(cx + 400, cy - 40);
    ctx.lineTo(cx + 700, cy + 300);
    ctx.fill();

    let mountainGrad = ctx.createLinearGradient(cx, cy - 320, cx, cy + 300);
    mountainGrad.addColorStop(0, '#312354');
    mountainGrad.addColorStop(0.4, '#1b1433');
    mountainGrad.addColorStop(1, '#080c1d');

    ctx.fillStyle = mountainGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 520, cy + 300);
    ctx.quadraticCurveTo(cx - 240, cy - 100, cx - 110, cy - 310);
    ctx.lineTo(cx + 110, cy - 310);
    ctx.quadraticCurveTo(cx + 240, cy - 100, cx + 520, cy + 300);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx - 110, cy - 310);
    ctx.lineTo(cx + 110, cy - 310);
    ctx.quadraticCurveTo(cx + 160, cy - 180, cx + 190, cy - 130);
    ctx.lineTo(cx + 115, cy - 150);
    ctx.lineTo(cx + 65, cy - 110);
    ctx.lineTo(cx, cy - 165);
    ctx.lineTo(cx - 65, cy - 115);
    ctx.lineTo(cx - 115, cy - 150);
    ctx.lineTo(cx - 190, cy - 130);
    ctx.quadraticCurveTo(cx - 160, cy - 180, cx - 110, cy - 310);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#bce3ff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 310);
    ctx.lineTo(cx + 110, cy - 310);
    ctx.quadraticCurveTo(cx + 160, cy - 180, cx + 190, cy - 130);
    ctx.lineTo(cx + 115, cy - 150);
    ctx.lineTo(cx + 65, cy - 110);
    ctx.lineTo(cx, cy - 165);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

function drawTrack() {
    let activeTrack = tracks[currentTrackId];
    
    ctx.fillStyle = activeTrack.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    activeTrack.decorations.forEach(d => {
        if (d.type === 'fuji_mountain') {
            drawFujiMountain(d.x, d.y);
        }
    });

    ctx.lineWidth = 145;
    ctx.strokeStyle = activeTrack.curb1;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.setLineDash([20, 20]);
    ctx.stroke(activeTrack.centerPath);

    ctx.lineWidth = 145;
    ctx.strokeStyle = activeTrack.curb2;
    ctx.setLineDash([20, 20]);
    ctx.lineDashOffset = 20;
    ctx.stroke(activeTrack.centerPath);
    ctx.setLineDash([]); ctx.lineDashOffset = 0;

    ctx.lineWidth = 125;
    ctx.strokeStyle = activeTrack.roadColor;
    ctx.stroke(activeTrack.centerPath);

    ctx.lineWidth = 3;
    ctx.strokeStyle = activeTrack.lineDashColor;
    ctx.shadowBlur = 8; ctx.shadowColor = activeTrack.lineDashColor;
    ctx.setLineDash([15, 15]);
    ctx.stroke(activeTrack.centerPath);
    ctx.setLineDash([]); ctx.shadowBlur = 0;

    activeTrack.boostPads.forEach(pad => {
        ctx.save();
        ctx.translate(pad.x, pad.y);
        ctx.rotate(pad.angle);
        ctx.fillStyle = '#ffaa00';
        ctx.shadowBlur = 15; ctx.shadowColor = '#ffaa00';
        ctx.beginPath();
        ctx.moveTo(-16, -12); ctx.lineTo(12, 0); ctx.lineTo(-16, 12);
        ctx.closePath(); ctx.fill();
        ctx.restore();
    });

    ctx.save();
    ctx.translate(340, 180);
    ctx.fillStyle = '#ffffff';
    for (let i = -60; i <= 60; i += 15) {
        ctx.fillRect(0, i, 8, 8);
        ctx.fillStyle = ctx.fillStyle === '#ffffff' ? '#000000' : '#ffffff';
        ctx.fillRect(8, i, 8, 8);
    }
    ctx.restore();
}

function drawCar(car) {
    if (car.shieldTimer > 0) {
        ctx.save(); ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 4;
        ctx.shadowBlur = 15; ctx.shadowColor = '#00ffcc'; ctx.beginPath();
        ctx.arc(car.x, car.y, 32, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }

    if (car.abilityAnim > 0) {
        ctx.save();
        ctx.strokeStyle = car.id === 1 ? '#ff0055' : '#00ffff';
        ctx.lineWidth = 6; ctx.shadowBlur = 20; ctx.shadowColor = ctx.strokeStyle;
        ctx.beginPath();
        ctx.arc(car.x, car.y, (25 - car.abilityAnim) * 8, 0, Math.PI * 2);
        ctx.stroke(); ctx.restore();
    }

    if (car.empTimer > 0) {
        ctx.save(); ctx.strokeStyle = '#ff0055'; ctx.lineWidth = 3; ctx.beginPath();
        ctx.arc(car.x + (Math.random()*6-3), car.y + (Math.random()*6-3), 28, 0, Math.PI * 2);
        ctx.stroke(); ctx.restore();
    }

    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    const w = car.width;
    const h = car.height;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.moveTo(w/2, -h/3);
    ctx.lineTo(w/2 + 50, -h);
    ctx.lineTo(w/2 + 50, h);
    ctx.lineTo(w/2, h/3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#050505';
    ctx.fillRect(-w/2 + 6, -h/2 - 2, 9, 4);
    ctx.fillRect(w/2 - 14, -h/2 - 2, 9, 4);
    ctx.fillRect(-w/2 + 6, h/2 - 2, 9, 4);
    ctx.fillRect(w/2 - 14, h/2 - 2, 9, 4);

    ctx.fillStyle = car.color;
    ctx.shadowBlur = 18; ctx.shadowColor = car.color;

    if (car.modelIdx === 0) {
        ctx.beginPath();
        ctx.moveTo(-w/2, -h/2 + 3);
        ctx.lineTo(w/2 - 6, -h/2 + 2);
        ctx.lineTo(w/2, 0);
        ctx.lineTo(w/2 - 6, h/2 - 2);
        ctx.lineTo(-w/2, h/2 - 3);
        ctx.closePath();
        ctx.fill();
    } else if (car.modelIdx === 1) {
        ctx.fillRect(-w/2 + 4, -h/4, w - 8, h/2);
        ctx.fillRect(w/4, -h/2, 6, h);
        ctx.fillRect(-w/2, -h/2 + 2, 6, h - 4);
    } else {
        ctx.fillRect(-w/2, -h/2, w, h);
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, -h/2 + 2, w/3, h - 4);
    }
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#0a101d';
    ctx.beginPath();
    ctx.ellipse(-w/10, 0, w/4, h/3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawCarPreview(modelIdx, color, x, y, scale = 2.8, angle = 0) {
    let model = MODELS[modelIdx];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);

    const w = model.w;
    const h = model.h;

    ctx.fillStyle = '#050505';
    ctx.fillRect(-w/2 + 6, -h/2 - 2, 9, 4);
    ctx.fillRect(w/2 - 14, -h/2 - 2, 9, 4);
    ctx.fillRect(-w/2 + 6, h/2 - 2, 9, 4);
    ctx.fillRect(w/2 - 14, h/2 - 2, 9, 4);

    ctx.fillStyle = color;
    ctx.shadowBlur = 25; ctx.shadowColor = color;

    if (modelIdx === 0) {
        ctx.beginPath();
        ctx.moveTo(-w/2, -h/2 + 3);
        ctx.lineTo(w/2 - 6, -h/2 + 2);
        ctx.lineTo(w/2, 0);
        ctx.lineTo(w/2 - 6, h/2 - 2);
        ctx.lineTo(-w/2, h/2 - 3);
        ctx.closePath();
        ctx.fill();
    } else if (modelIdx === 1) {
        ctx.fillRect(-w/2 + 4, -h/4, w - 8, h/2);
        ctx.fillRect(w/4, -h/2, 6, h);
        ctx.fillRect(-w/2, -h/2 + 2, 6, h - 4);
    } else {
        ctx.fillRect(-w/2, -h/2, w, h);
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, -h/2 + 2, w/3, h - 4);
    }

    ctx.fillStyle = '#0a101d';
    ctx.beginPath();
    ctx.ellipse(-w/10, 0, w/4, h/3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawTrackPreview(trackIdx, x, y, w, h) {
    let tr = tracks[trackIdx];
    ctx.save();
    ctx.fillStyle = 'rgba(12, 6, 22, 0.9)';
    ctx.strokeStyle = tr.curb1;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 20; ctx.shadowColor = tr.curb1;
    drawRoundedRect(x, y, w, h, 14);
    ctx.fill(); ctx.stroke();

    ctx.save();
    ctx.translate(x + w/2, y + h/2);
    let scale = Math.min(w / 1350, h / 800) * 0.78;
    ctx.scale(scale, scale);
    ctx.translate(-1350/2, -800/2);

    tr.decorations.forEach(d => {
        if (d.type === 'fuji_mountain') {
            drawFujiMountain(d.x, d.y);
        }
    });

    ctx.lineWidth = 85;
    ctx.strokeStyle = tr.curb1;
    ctx.stroke(tr.centerPath);

    ctx.lineWidth = 55;
    ctx.strokeStyle = tr.roadColor;
    ctx.stroke(tr.centerPath);

    ctx.lineWidth = 4;
    ctx.strokeStyle = tr.lineDashColor;
    ctx.setLineDash([12, 12]);
    ctx.stroke(tr.centerPath);
    ctx.restore();

    ctx.restore();
}

function drawStatBar(label, val, x, y, width, color) {
    ctx.save();
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#ccc';
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y);

    let barX = x + 110;
    let barW = width - 110;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(barX, y - 11, barW, 14);

    ctx.fillStyle = color;
    ctx.shadowBlur = 10; ctx.shadowColor = color;
    ctx.fillRect(barX, y - 11, barW * (val / 100), 14);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.strokeRect(barX, y - 11, barW, 14);
    ctx.restore();
}

function drawMenuBackground() {
    let grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#060112');
    grad.addColorStop(0.6, '#15052a');
    grad.addColorStop(1, '#000000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawFujiMountain(canvas.width / 2, 280);

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    for (let x = -400; x < canvas.width + 400; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, canvas.height);
        ctx.lineTo(canvas.width / 2 + (x - canvas.width / 2) * 0.1, 350);
        ctx.stroke();
    }
    for (let y = 350; y < canvas.height; y += 25) {
        let drawY = y + (menuGridOffset % 25);
        if (drawY < canvas.height) {
            ctx.beginPath();
            ctx.moveTo(0, drawY);
            ctx.lineTo(canvas.width, drawY);
            ctx.stroke();
        }
    }
    ctx.restore();
}

function drawRoundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function drawMenuButton(text, kanji, x, y, w, h, active = false) {
    ctx.save();
    let btnGrad = ctx.createLinearGradient(x, y, x + w, y);
    if (active) {
        btnGrad.addColorStop(0, '#ff0055');
        btnGrad.addColorStop(1, '#ffaa00');
    } else {
        btnGrad.addColorStop(0, 'rgba(20, 10, 35, 0.9)');
        btnGrad.addColorStop(1, 'rgba(10, 5, 20, 0.9)');
    }

    ctx.fillStyle = btnGrad;
    ctx.strokeStyle = active ? '#00ffff' : '#ff0055';
    ctx.lineWidth = 2;
    ctx.shadowBlur = active ? 25 : 8;
    ctx.shadowColor = ctx.strokeStyle;

    drawRoundedRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = active ? '#00ffff' : '#ff0055';
    ctx.fillRect(x + 5, y + 5, 4, h - 10);

    if (kanji) {
        ctx.font = 'bold 22px monospace';
        ctx.fillStyle = active ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 0, 85, 0.25)';
        ctx.textAlign = 'right';
        ctx.fillText(kanji, x + w - 15, y + h / 2 + 8);
    }

    ctx.fillStyle = active ? '#000' : '#fff';
    ctx.font = '900 15px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(text, x + 20, y + h / 2 + 5);

    ctx.restore();
}

function drawMenus() {
    drawMenuBackground();

    ctx.textAlign = 'center';
    
    ctx.fillStyle = '#00ffff';
    ctx.font = '900 16px monospace';
    ctx.shadowBlur = 10; ctx.shadowColor = '#00ffff';
    ctx.fillText('最 高 速 ド リ フ ト レ ー ス', canvas.width / 2, 60);

    ctx.fillStyle = '#ff0055'; 
    ctx.font = '900 44px monospace';
    ctx.shadowBlur = 30; ctx.shadowColor = '#ff0055';
    ctx.fillText('峠 TOUGE DRIFT', canvas.width / 2, 105);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px monospace';
    ctx.shadowBlur = 10; ctx.shadowColor = '#ffffff';
    ctx.fillText('ー HASHIRIYA 走り屋 ー', canvas.width / 2, 138);
    ctx.shadowBlur = 0;

    if (gameState === 'MENU_MAIN') {
        drawMenuButton('🏁 INICIAR CARRERA', 'レース', 475, 290, 400, 55);
        drawMenuButton('🏎️ GARAJE', 'ガレージ', 475, 365, 400, 55);
        drawMenuButton('🗺️ SELECCIONAR PISTA', 'コース', 475, 440, 400, 55);
        drawMenuButton('⚙️ EDITAR CONTROLES', '設定', 475, 515, 400, 55);
    }
    else if (gameState === 'MENU_GARAGE') {
        ctx.fillStyle = '#fff'; ctx.font = 'bold 22px monospace';
        ctx.fillText('SHOWROOM DE VEHÍCULOS Y HABILIDADES', canvas.width / 2, 195);

        let rotateAngle = Date.now() * 0.0015;

        ctx.fillStyle = '#ff0055'; ctx.font = 'bold 20px monospace';
        ctx.fillText('PRIMER CONDUCTOR', 340, 245);

        ctx.save();
        ctx.fillStyle = 'rgba(15, 5, 25, 0.85)';
        ctx.strokeStyle = '#ff0055'; ctx.lineWidth = 2;
        ctx.shadowBlur = 15; ctx.shadowColor = '#ff0055';
        drawRoundedRect(120, 270, 250, 160, 12);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = 'rgba(255, 0, 85, 0.2)';
        ctx.beginPath();
        ctx.ellipse(245, 365, 90, 30, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        drawCarPreview(p1Custom.modelIdx, paletteP1[p1Custom.colorIdx], 245, 350, 2.8, rotateAngle);
        ctx.restore();

        drawMenuButton(MODELS[p1Custom.modelIdx].name, '車', 400, 280, 200, 40);
        drawMenuButton('COLOR DE AUTO', '色', 400, 340, 200, 40);
        

        ctx.fillStyle = paletteP1[p1Custom.colorIdx];
        ctx.shadowBlur = 10; ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(610, 345, 30, 30);
        ctx.shadowBlur = 0;

        let m1 = MODELS[p1Custom.modelIdx];
        drawStatBar('VELOCIDAD:', m1.stats.speed, 120, 475, 480, '#ff0055');
        drawStatBar('ACELERACIÓN:', m1.stats.accel, 120, 515, 480, '#ffaa00');
        drawStatBar('DRIFT / CONTROL:', m1.stats.drift, 120, 555, 480, '#00ffff');

        ctx.textAlign = 'center';
        ctx.fillStyle = '#00ffff'; ctx.font = 'bold 20px monospace';
        ctx.fillText('SEGUNDO CONDUCTOR', 1010, 245);

        ctx.save();
        ctx.fillStyle = 'rgba(5, 15, 30, 0.85)';
        ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2;
        ctx.shadowBlur = 15; ctx.shadowColor = '#00ffff';
        drawRoundedRect(980, 270, 250, 160, 12);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.ellipse(1105, 365, 90, 30, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        drawCarPreview(p2Custom.modelIdx, paletteP2[p2Custom.colorIdx], 1105, 350, 2.8, -rotateAngle);
        ctx.restore();

        drawMenuButton(MODELS[p2Custom.modelIdx].name, '車', 750, 280, 200, 40);
        drawMenuButton('COLOR DE AUTO', '色', 750, 340, 200, 40);
        

        ctx.fillStyle = paletteP2[p2Custom.colorIdx];
        ctx.shadowBlur = 10; ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(710, 345, 30, 30);
        ctx.shadowBlur = 0;

        let m2 = MODELS[p2Custom.modelIdx];
        drawStatBar('VELOCIDAD:', m2.stats.speed, 750, 475, 480, '#00ffff');
        drawStatBar('ACELERACIÓN:', m2.stats.accel, 750, 515, 480, '#00ff66');
        drawStatBar('DRIFT / CONTROL:', m2.stats.drift, 750, 555, 480, '#ff00ff');

        ctx.textAlign = 'center';
        drawMenuButton('⬅ VOLVER AL MENÚ', '戻る', 575, 680, 200, 50);
    }
    else if (gameState === 'MENU_TRACKS') {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px monospace';
        ctx.fillText('SELECCIÓN DE CIRCUITO', canvas.width / 2, 195);

        tracks.forEach((tr, i) => {
            let active = currentTrackId === i;
            drawMenuButton(tr.name, tr.kanji, 120, 280 + i * 80, 450, 55, active);
        });

        let selTrack = tracks[currentTrackId];
        drawTrackPreview(currentTrackId, 620, 270, 610, 310);

        drawStatBar('DIFICULTAD:', selTrack.stats.difficulty, 620, 600, 610, '#ff0055');
        drawStatBar('LONGITUD:', selTrack.stats.length, 620, 628, 610, '#ffaa00');
        drawStatBar('CURVAS:', selTrack.stats.curves, 620, 656, 610, '#00ffff');

        ctx.textAlign = 'center';
        drawMenuButton('⬅ VOLVER AL MENÚ', '戻る', 575, 660, 200, 50);
    }
    else if (gameState === 'MENU_CONTROLS') {
        ctx.fillStyle = '#fff'; ctx.font = 'bold 22px monospace';
        ctx.fillText('CONFIGURACIÓN DE CONTROLES', canvas.width / 2, 195);

        ctx.fillStyle = '#ff0055'; ctx.font = 'bold 20px monospace';
        ctx.fillText('PILOTO 1', 320, 260);

        ctx.fillStyle = '#00ffff'; ctx.font = 'bold 20px monospace';
        ctx.fillText('PILOTO 2', 800, 260);

        let actions = [
            { id: 'up', name: 'Acelerar' },
            { id: 'down', name: 'Frenar' },
            { id: 'left', name: 'Izquierda' },
            { id: 'right', name: 'Derecha' },
            { id: 'drift', name: 'Derrape' },
            { id: 'ability', name: 'Habilidad' }
        ];

        actions.forEach((act, i) => {
            let y = 310 + i * 40;
            ctx.fillStyle = '#ccc'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'left';
            ctx.fillText(act.name, 180, y + 20);
            let p1Key = rebindingKey && rebindingKey.player === 1 && rebindingKey.action === act.id ? 'PRESS...' : controlsP1[act.id];
            drawMenuButton(p1Key, '', 380, y, 110, 32, rebindingKey && rebindingKey.player === 1 && rebindingKey.action === act.id);

            ctx.fillStyle = '#ccc'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'left';
            ctx.fillText(act.name, 660, y + 20);
            let p2Key = rebindingKey && rebindingKey.player === 2 && rebindingKey.action === act.id ? 'PRESS...' : controlsP2[act.id];
            drawMenuButton(p2Key, '', 860, y, 110, 32, rebindingKey && rebindingKey.player === 2 && rebindingKey.action === act.id);
        });

        ctx.textAlign = 'center';
        drawMenuButton('⬅ VOLVER AL MENÚ', '戻る', 575, 650, 200, 50);
    }
}

function drawHUD() {
    ctx.fillStyle = 'rgba(10, 5, 20, 0.7)';
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 2;
    drawRoundedRect(20, 20, 280, 95, 10);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#ff0055'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'left';
    ctx.fillText('P1 - ' + MODELS[p1.modelIdx].name, 35, 45);
    ctx.fillStyle = '#fff'; ctx.font = '14px monospace';
    ctx.fillText(`VUELTA: ${Math.min(p1.lap, p1.maxLaps)} / ${p1.maxLaps}`, 35, 68);
    ctx.fillText(`DRIFT SCORE: ${p1.score}`, 35, 90);

    let p1CdRatio = 1 - (p1.abilityCooldown / p1.maxCooldown);
    ctx.fillStyle = 'rgba(255, 0, 85, 0.2)';
    ctx.fillRect(35, 100, 250, 6);
    ctx.fillStyle = '#ff0055';
    ctx.fillRect(35, 100, 250 * p1CdRatio, 6);

    ctx.fillStyle = 'rgba(10, 5, 20, 0.7)';
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    drawRoundedRect(canvas.width - 300, 20, 280, 95, 10);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#00ffff'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'left';
    ctx.fillText('P2 - ' + MODELS[p2.modelIdx].name, canvas.width - 285, 45);
    ctx.fillStyle = '#fff'; ctx.font = '14px monospace';
    ctx.fillText(`VUELTA: ${Math.min(p2.lap, p2.maxLaps)} / ${p2.maxLaps}`, canvas.width - 285, 68);
    ctx.fillText(`DRIFT SCORE: ${p2.score}`, canvas.width - 285, 90);

    let p2CdRatio = 1 - (p2.abilityCooldown / p2.maxCooldown);
    ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
    ctx.fillRect(canvas.width - 285, 100, 250, 6);
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(canvas.width - 285, 100, 250 * p2CdRatio, 6);
}

function drawWinScreen() {
    ctx.fillStyle = 'rgba(5, 2, 10, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = winnerPlayer === 'JUGADOR 1' ? '#e600ff' : '#30d11a';
    ctx.font = '900 50px monospace';
    ctx.shadowBlur = 30; ctx.shadowColor = ctx.fillStyle;
    ctx.fillText(`¡WIN  ${winnerPlayer}!`, canvas.width / 2, 350);
    ctx.shadowBlur = 0;

    drawMenuButton('🏠 VOLVER AL MENU', '主画面', 525, 580, 300, 55);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'PLAYING') {
        drawTrack();

        oilSlicks.forEach(oil => {
            ctx.fillStyle = 'rgba(20, 0, 30, 0.8)';
            ctx.strokeStyle = '#aa00ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(oil.x, oil.y, 18, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
        });

        powerBoxes.forEach(box => {
            if (box.active) {
                ctx.save();
                ctx.fillStyle = box.info.color;
                ctx.shadowBlur = 15; ctx.shadowColor = box.info.color;
                ctx.fillRect(box.x - 14, box.y - 14, 28, 28);
                ctx.fillStyle = '#000';
                ctx.font = '16px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(box.info.icon, box.x, box.y);
                ctx.restore();
            }
        });

        sparks.forEach(s => {
            ctx.fillStyle = s.color;
            ctx.fillRect(s.x, s.y, 3, 3);
        });

        drawCar(p1);
        drawCar(p2);
        
        drawSakuraPetals();
        drawHUD();
    } else if (gameState === 'WIN') {
        drawTrack();
        drawCar(p1);
        drawCar(p2);
        drawSakuraPetals();
        drawWinScreen();
    } else {
        drawMenus();
        drawSakuraPetals();
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);