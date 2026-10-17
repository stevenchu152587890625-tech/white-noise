/* =====================================================================
 * Z63 FISH ANIM — HYDRO CHRONO ENGINE (ECOLOGY & FLORA EXPANSION)
 * 核心特色：
 *  1. 固定步長水面彈簧質點物理（與幀率、速度檔位無關，永不發散、不出屏）
 *  2. 豐富背景植物與水生植物系統：
 *     - 遠景多層山林樹冠剪影、岸邊灌木與青苔石
 *     - 動態隨風搖曳的岸邊蘆葦與香蒲 (Swaying Reeds & Cattails)
 *     - 頂部垂掛搖曳的垂柳枝條 / 懸崖蕨類藤蔓 (Weeping Willows & Ferns)
 *     - 隨水波起伏傾斜的睡蓮荷葉與盛開蓮花 (Floating Lotus Pads & Blooms)
 *     - 水底隨流擺動的多節水草、海帶與珊瑚 (Underwater Kelp & Seaweed)
 *  3. 多樣化生物群落系統 (Rich Interactive Fauna)：
 *     - 躍水錦鯉 / 紅鮭 (Leaping Koi & Salmon)
 *     - 蜻蜓 / 豆娘巡弋與「蜻蜓點水」漣漪互動 (Dragonflies & Damselflies)
 *     - 荷葉青蛙呼吸鳴叫、受驚拋物線跳水與潛泳 (Pond Frogs)
 *     - 水黽水面滑行與足尖微漣漪 (Water Striders)
 *     - 水下群聚巡游小魚苗 Boids 與受驚散開 (School of Minnows)
 *     - 深海發光水母律動推進 (Bioluminescent Jellyfish)
 *     - 悠游海龜 / 池龜換氣漣漪 (Swimming Turtles)
 *     - 遠空拍翅掠過的白鷺 / 海鷗 / 夜鷺剪影 (Flying Birds)
 *     - 竹林螢火蟲微光閃爍 (Fireflies)
 * ===================================================================== */
(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
    const rnd = (a, b) => a + Math.random() * (b - a);
    const TAU = Math.PI * 2;

    function mulberry32(a) {
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function hashStr(s) {
        let h = 2166136261;
        for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    // ------------------------------------------------------------------
    // 七大場景與生態定義
    // ------------------------------------------------------------------
    const SCENES = [
        {
            id: 'bamboo_wood',
            name: '靜心1：竹林木屋 // 木質水潭',
            shortName: '竹林木屋・木質水潭',
            ecoDesc: 'LOTUS / FROG / DRAGONFLY / KOI',
            audioSrc: 'audio/bamboo_wood.mp3?v=2',
            ui: { accent: '#52e59b', rgb: '82, 229, 155', bg: 'rgba(7, 18, 13, 0.93)', muted: '#8bb8a2', badgeText: '#d4ffea', tag: 'JADE // 翠竹' },
            sky: ['#06150d', '#0c2317', '#040a06'],
            water: { g0: 'rgba(30,92,60,0.56)', g1: 'rgba(5,28,17,0.97)', back: 'rgba(60,145,100,0.22)', surf: 'rgba(150,245,190,0.9)', glow: 'rgba(90,220,150,0.24)', caustic: 0.055 },
            moon: { x: 0.22, y: 0.16, r: 30, c: '215,255,225' },
            bamboo: true, hut: true, rimWood: true,
            willow: 'bamboo_vines', reeds: 16, lotus: 5, seaweed: 14,
            fireflies: 16, dragonflies: 3, frogs: 2, striders: 4, minnows: 18, birds: 2, turtles: 0, jellyfish: 0,
            mist: 5, mistA: 0.16, leaf: 'bamboo', current: 0,
            rain: { density: 0.045, wind: 0.03, speed: 0.75, alpha: 0.5, imp: 0.8, ripple: [0.6, 0.7, 0.8] },
            fish: ['#ffc83d', '#ffffff']
        },
        {
            id: 'bamboo_stone',
            name: '靜心1：竹林木屋 // 石頭式池塘',
            shortName: '竹林木屋・石頭池塘',
            ecoDesc: 'REEDS / TURTLE / FROG / DRAGONFLY',
            audioSrc: 'audio/bamboo_stone.mp3?v=2',
            ui: { accent: '#42dcd3', rgb: '66, 220, 211', bg: 'rgba(7, 19, 23, 0.93)', muted: '#8ab8ba', badgeText: '#d6fffc', tag: 'CELADON // 青玉' },
            sky: ['#081820', '#0d242c', '#050f13'],
            water: { g0: 'rgba(26,82,92,0.56)', g1: 'rgba(5,28,34,0.97)', back: 'rgba(70,160,175,0.22)', surf: 'rgba(130,232,240,0.88)', glow: 'rgba(70,200,220,0.24)', caustic: 0.055 },
            moon: { x: 0.8, y: 0.15, r: 28, c: '210,245,255' },
            bamboo: true, hut: true, rimStone: true,
            willow: 'willow', reeds: 20, lotus: 6, seaweed: 16,
            fireflies: 12, dragonflies: 3, frogs: 2, striders: 5, minnows: 20, birds: 2, turtles: 1, jellyfish: 0,
            mist: 5, mistA: 0.15, leaf: 'bamboo', current: 0,
            rain: { density: 0.04, wind: 0.03, speed: 0.75, alpha: 0.5, imp: 0.8, ripple: [0.6, 0.7, 0.8] },
            fish: ['#f5bd22', '#fff4c4']
        },
        {
            id: 'stream',
            name: '河流1：模擬小溪 // 森林溪澗',
            shortName: '森林小溪・清泉流淌',
            ecoDesc: 'WILLOW / MINNOWS / STRIDER / HERON',
            audioSrc: 'audio/stream.mp3?v=2',
            ui: { accent: '#54b6ff', rgb: '84, 182, 255', bg: 'rgba(7, 16, 27, 0.93)', muted: '#8caecc', badgeText: '#d9f0ff', tag: 'AZURE // 溪藍' },
            sky: ['#07151f', '#0b2335', '#040e17'],
            water: { g0: 'rgba(28,78,120,0.56)', g1: 'rgba(5,24,46,0.97)', back: 'rgba(80,160,220,0.2)', surf: 'rgba(140,215,255,0.9)', glow: 'rgba(80,180,255,0.24)', caustic: 0.065 },
            mountains: true, forestTrees: true,
            willow: 'willow', reeds: 22, lotus: 2, seaweed: 22,
            fireflies: 8, dragonflies: 4, frogs: 1, striders: 6, minnows: 26, birds: 3, turtles: 1, jellyfish: 0,
            mist: 4, mistA: 0.12, leaf: 'autumn', current: 1.0,
            rain: { density: 0.03, wind: 0.04, speed: 0.8, alpha: 0.5, imp: 0.8, ripple: [0.6, 0.7, 0.8] },
            fish: ['#ffd35c', '#ffe3bf']
        },
        {
            id: 'waterfall',
            name: '瀑布1：模擬瀑布 // 懸泉奔湧',
            shortName: '飛流瀑布・浩瀚水霧',
            ecoDesc: 'CLIFF FERNS / SALMON / SWALLOWS',
            audioSrc: 'audio/waterfall.mp3?v=2',
            ui: { accent: '#7ce8ff', rgb: '124, 232, 255', bg: 'rgba(8, 15, 28, 0.93)', muted: '#95b9cf', badgeText: '#e6fbff', tag: 'GLACIER // 冰晶' },
            sky: ['#09111f', '#101f33', '#040a14'],
            water: { g0: 'rgba(36,98,148,0.62)', g1: 'rgba(8,32,60,0.98)', back: 'rgba(110,180,230,0.22)', surf: 'rgba(190,238,255,0.92)', glow: 'rgba(120,215,255,0.26)', caustic: 0.07 },
            mountains: true, cliff: true, fall: true, forestTrees: true,
            willow: 'cliff_ferns', reeds: 14, lotus: 0, seaweed: 16,
            fireflies: 6, dragonflies: 2, frogs: 0, striders: 2, minnows: 20, birds: 4, turtles: 0, jellyfish: 0,
            mist: 5, mistA: 0.16, current: 0.35,
            rain: { density: 0, wind: 0, speed: 1, alpha: 0.4, imp: 1, ripple: [0, 0, 0] },
            fish: ['#ffbf2e', '#ffffff']
        },
        {
            id: 'ocean',
            name: '海洋1：模擬海洋 // 潮浪湧動',
            shortName: '深藍海洋・萬頃長波',
            ecoDesc: 'KELP / JELLYFISH / SEA TURTLE / GULLS',
            audioSrc: 'audio/ocean.mp3?v=2',
            ui: { accent: '#29b6f6', rgb: '41, 182, 246', bg: 'rgba(5, 11, 26, 0.94)', muted: '#82a5cc', badgeText: '#d4f2ff', tag: 'OCEAN // 滄海' },
            sky: ['#050b1b', '#0a1630', '#030612'],
            water: { g0: 'rgba(20,70,128,0.62)', g1: 'rgba(3,15,40,0.98)', back: 'rgba(70,150,220,0.24)', surf: 'rgba(110,220,255,0.9)', glow: 'rgba(60,180,255,0.24)', caustic: 0.055 },
            moon: { x: 0.68, y: 0.2, r: 38, c: '225,238,255' }, stars: true, ocean: true, moonReflect: true,
            willow: null, reeds: 0, lotus: 0, seaweed: 24, coral: true,
            fireflies: 0, dragonflies: 0, frogs: 0, striders: 0, minnows: 28, birds: 4, turtles: 2, jellyfish: 5,
            mist: 3, mistA: 0.1, current: 0.15,
            rain: { density: 0, wind: 0, speed: 1, alpha: 0.4, imp: 1, ripple: [0, 0, 0] },
            fish: ['#4fc3f7', '#e1f5fe']
        },
        {
            id: 'rain_soft',
            name: '深夜雨聲1SOFT // 柔和細雨',
            shortName: '深夜雨聲・靜謐小雨',
            ecoDesc: 'NIGHT LOTUS / FROG / GLOW JELLY',
            audioSrc: 'audio/rain_soft.mp3?v=2',
            ui: { accent: '#9aaeff', rgb: '154, 174, 255', bg: 'rgba(10, 13, 25, 0.94)', muted: '#96a2c6', badgeText: '#e6ebff', tag: 'MIST // 夜霧藍' },
            sky: ['#0b0f18', '#131927', '#06080e'],
            water: { g0: 'rgba(30,58,92,0.56)', g1: 'rgba(6,16,32,0.97)', back: 'rgba(90,130,180,0.2)', surf: 'rgba(170,208,248,0.85)', glow: 'rgba(110,170,235,0.22)', caustic: 0.045 },
            forestTrees: true,
            willow: 'willow', reeds: 18, lotus: 5, seaweed: 16,
            fireflies: 8, dragonflies: 1, frogs: 2, striders: 3, minnows: 18, birds: 1, turtles: 1, jellyfish: 2,
            mist: 3, mistA: 0.1, current: 0,
            rain: { density: 0.2, wind: 0.06, speed: 1, alpha: 0.75, imp: 1, ripple: [0.12, 0.3, 0.5] },
            fish: ['#dcdcdc', '#ffffff']
        },
        {
            id: 'rain_heavy',
            name: '深夜雨聲1HEAVY // 疾風暴雨',
            shortName: '深夜雨聲・暴雨狂瀾',
            ecoDesc: 'STORM REEDS / DEEP SCHOOL / NIGHT BIRDS',
            audioSrc: 'audio/rain_heavy.mp3?v=2',
            ui: { accent: '#f5a642', rgb: '245, 166, 66', bg: 'rgba(14, 11, 16, 0.94)', muted: '#bba990', badgeText: '#ffecd1', tag: 'STORM // 琥珀金' },
            sky: ['#070910', '#0e131d', '#030407'],
            water: { g0: 'rgba(38,66,104,0.6)', g1: 'rgba(5,13,26,0.98)', back: 'rgba(100,140,190,0.22)', surf: 'rgba(205,228,255,0.9)', glow: 'rgba(150,195,255,0.26)', caustic: 0.04 },
            lightning: true, forestTrees: true,
            willow: 'willow', reeds: 20, lotus: 3, seaweed: 18,
            fireflies: 0, dragonflies: 0, frogs: 1, striders: 0, minnows: 22, birds: 2, turtles: 1, jellyfish: 3,
            mist: 4, mistA: 0.11, current: 0.25,
            rain: { density: 0.55, wind: 0.2, speed: 1.15, alpha: 0.85, imp: 1.3, ripple: [0.08, 0.2, 0.3] },
            fish: ['#ffb833', '#ffffff']
        }
    ];

    const SPEEDS = [
        { label: 'SPEED: FAST', name: 'FAST (1.0x)', f: 1.0 },
        { label: 'SPEED: MED', name: 'MED (0.6x)', f: 0.6 },
        { label: 'SPEED: SLOW', name: 'SLOW (0.3x)', f: 0.3 }
    ];

    // ------------------------------------------------------------------
    // 畫布 / 全局狀態
    // ------------------------------------------------------------------
    const canvas = $('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    const bgCv = document.createElement('canvas');
    const bgx = bgCv.getContext('2d');
    const prevBgCv = document.createElement('canvas');
    const prevBgx = prevBgCv.getContext('2d');

    let W = 0, H = 0, DPR = 1, dprCap = Math.min(window.devicePixelRatio || 1, 2);
    let quality = 1;
    let waterY = 0;
    let SC = SCENES[0], sceneIdx = 0, speedIdx = 2; // 預設 SLOW (0.3x)
    let T = 0;
    let G = 1000;
    let waterGrad = null, fallGrad = null;
    let stones = [];

    // 日夜天象循環與場景切換動效狀態 (0.0=深夜, 0.25=日出, 0.50=正午, 0.75=日落)
    let dayPhase = 0.25;
    let cycleDurationSec = 180; // 預設 3min 循環一次
    let cycleLabelText = '3min';
    let isDraggingSolar = false;
    let bootComplete = false;
    let starPts = [];
    const solarTrans = {
        active: false,
        t: 0,
        dur: 2.4,
        fromPhase: 0.25,
        toPhase: 0.75,
        label: '日出 ➔ 日落',
        hasPrevBg: false
    };

    // 預渲染精靈
    const mistSpr = document.createElement('canvas');
    mistSpr.width = 256; mistSpr.height = 128;
    (function () {
        const g = mistSpr.getContext('2d');
        g.translate(128, 64); g.scale(2, 1);
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, 64);
        gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(-64, -64, 128, 128);
    })();

    const glowSpr = document.createElement('canvas');
    glowSpr.width = glowSpr.height = 32;
    (function () {
        const g = glowSpr.getContext('2d');
        const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
        gr.addColorStop(0, 'rgba(210,255,150,1)');
        gr.addColorStop(0.3, 'rgba(180,255,120,0.55)');
        gr.addColorStop(1, 'rgba(180,255,120,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    })();

    // ------------------------------------------------------------------
    // 水面彈簧質點 (固定步長，限幅)
    // ------------------------------------------------------------------
    const K_SPRING = 0.035, FRICTION = 0.93, SPREAD = 0.28;
    const H_STEP = 1 / 240;
    const F_STEP = H_STEP * 60;
    const KW = [0.2, 0.5, 0.85, 1, 0.85, 0.5, 0.2];
    let PI_ = 4, N = 0, AMP = 30, VMAX = 7;
    let px, py, pv, tg, dl, dr;
    let acc = 0;

    function initWaterArrays() {
        PI_ = clamp(W / 360, 4, 6);
        N = Math.ceil(W / PI_) + 1;
        px = new Float32Array(N); py = new Float32Array(N); pv = new Float32Array(N);
        tg = new Float32Array(N); dl = new Float32Array(N); dr = new Float32Array(N);
        for (let i = 0; i < N; i++) { px[i] = i * PI_; py[i] = tg[i] = waterY; }
        AMP = Math.min(30, H * 0.05);
        VMAX = 7;
    }
    function surfaceAt(x) {
        let i = Math.round(x / PI_);
        if (i < 0) i = 0; else if (i >= N) i = N - 1;
        return py[i];
    }
    function surfaceSlopeAt(x) {
        let i = Math.round(x / PI_);
        if (i < 1) i = 1; else if (i >= N - 1) i = N - 2;
        return (py[i + 1] - py[i - 1]) / (2 * PI_);
    }
    function kick(x, imp) {
        const c = Math.round(x / PI_);
        for (let k = -3; k <= 3; k++) {
            const i = c + k;
            if (i < 0 || i >= N) continue;
            pv[i] = clamp(pv[i] + imp * KW[k + 3], -VMAX, VMAX);
        }
    }
    const frictionStep = Math.pow(FRICTION, F_STEP);
    function stepWater() {
        for (let i = 0; i < N; i++) {
            let v = pv[i] + K_SPRING * (tg[i] - py[i]) * F_STEP;
            v *= frictionStep;
            pv[i] = v;
            py[i] += v * F_STEP;
        }
        for (let i = 0; i < N; i++) {
            dl[i] = i > 0 ? SPREAD * (py[i] - py[i - 1]) : 0;
            dr[i] = i < N - 1 ? SPREAD * (py[i] - py[i + 1]) : 0;
        }
        for (let i = 0; i < N; i++) {
            if (i > 0) { py[i - 1] += dl[i] * F_STEP; pv[i - 1] += dl[i] * F_STEP; }
            if (i < N - 1) { py[i + 1] += dr[i] * F_STEP; pv[i + 1] += dr[i] * F_STEP; }
        }
        for (let i = 0; i < N; i++) {
            if (pv[i] > VMAX) pv[i] = VMAX; else if (pv[i] < -VMAX) pv[i] = -VMAX;
            const lo = tg[i] - AMP, hi = tg[i] + AMP;
            if (py[i] < lo) { py[i] = lo; pv[i] *= 0.5; } else if (py[i] > hi) { py[i] = hi; pv[i] *= 0.5; }
        }
    }

    // ------------------------------------------------------------------
    // 漣漪 (橢圓環，半徑有上限)
    // ------------------------------------------------------------------
    const RMAX = 110;
    const rpx = new Float32Array(RMAX), rpr = new Float32Array(RMAX), rpm = new Float32Array(RMAX), rps = new Float32Array(RMAX);
    let rn = 0;
    function addRipple(x, y, maxR, strength) {
        if (rn >= RMAX) return;
        rpx[rn] = clamp(x, 0, W); rpr[rn] = 2; rpm[rn] = Math.min(maxR, 110); rps[rn] = strength; rn++;
    }
    function updateRipples(dt) {
        for (let i = rn - 1; i >= 0; i--) {
            rpr[i] += (28 + rpm[i] * 1.3) * dt;
            if (rpr[i] >= rpm[i]) { rn--; rpx[i] = rpx[rn]; rpr[i] = rpr[rn]; rpm[i] = rpm[rn]; rps[i] = rps[rn]; }
        }
    }
    function drawRipples() {
        if (!rn) return;
        ctx.lineWidth = 1.2;
        for (let i = 0; i < rn; i++) {
            const k = 1 - rpr[i] / rpm[i];
            const a = rps[i] * k * k;
            if (a < 0.02) continue;
            ctx.strokeStyle = 'rgba(210,240,255,' + a.toFixed(3) + ')';
            ctx.beginPath();
            ctx.ellipse(rpx[i], surfaceAt(rpx[i]) + 1, rpr[i], rpr[i] * 0.17, 0, 0, TAU);
            ctx.stroke();
        }
    }

    // ------------------------------------------------------------------
    // 水花粒子 (拋物線最高點限幅 → 絕不噴出屏幕)
    // ------------------------------------------------------------------
    const SMAX = 340;
    const spx = new Float32Array(SMAX), spy = new Float32Array(SMAX), svx = new Float32Array(SMAX),
        svy = new Float32Array(SMAX), slf = new Float32Array(SMAX), ssz = new Float32Array(SMAX);
    let sn = 0;
    function spawnSplash(x, y, count, apex) {
        const cap = Math.min(apex, 85 * (H / 900), y - 35);
        if (cap < 4) return;
        for (let c = 0; c < count && sn < SMAX; c++) {
            const h = cap * rnd(0.3, 1);
            spx[sn] = x + rnd(-3, 3); spy[sn] = y;
            svy[sn] = -Math.sqrt(2 * G * h);
            svx[sn] = rnd(-1, 1) * (20 + h * 1.5);
            slf[sn] = 1; ssz[sn] = rnd(0.8, 2.1); sn++;
        }
    }
    function updateSplash(dt) {
        for (let i = sn - 1; i >= 0; i--) {
            svy[i] += G * dt; spx[i] += svx[i] * dt; spy[i] += svy[i] * dt; slf[i] -= dt * 1.5;
            const dead = slf[i] <= 0 || spx[i] < -20 || spx[i] > W + 20 || spy[i] < 10 || (svy[i] > 0 && spy[i] >= surfaceAt(spx[i]));
            if (dead) { sn--; spx[i] = spx[sn]; spy[i] = spy[sn]; svx[i] = svx[sn]; svy[i] = svy[sn]; slf[i] = slf[sn]; ssz[i] = ssz[sn]; }
        }
    }
    function drawSplash() {
        if (!sn) return;
        ctx.fillStyle = 'rgba(228,244,255,0.85)';
        ctx.beginPath();
        for (let i = 0; i < sn; i++) { ctx.moveTo(spx[i] + ssz[i], spy[i]); ctx.arc(spx[i], spy[i], ssz[i], 0, TAU); }
        ctx.fill();
    }

    // ------------------------------------------------------------------
    // 🌿 新增植物系統 1：頂部垂柳枝條 / 竹藤 / 懸崖蕨類
    // ------------------------------------------------------------------
    let hangingBranches = [];
    function initHangingFlora() {
        hangingBranches = [];
        if (!SC.willow) return;
        const rng = mulberry32(hashStr(SC.id + '_willow'));
        const type = SC.willow;
        const count = type === 'cliff_ferns' ? 14 : 18;

        for (let i = 0; i < count; i++) {
            // 主要分佈在畫面左右兩側或頂部邊緣，自然垂落
            const side = i % 2 === 0 ? rng() * 0.34 : 0.66 + rng() * 0.34;
            const x = side * W;
            const len = rnd(H * 0.18, H * 0.42);
            const leavesCount = Math.floor(len / 16);
            hangingBranches.push({
                x,
                len,
                leavesCount,
                phase: rng() * TAU,
                swayAmp: rnd(10, 24),
                swaySpeed: rnd(0.7, 1.3),
                hueOffset: Math.floor(rng() * 18),
                type
            });
        }
    }
    function drawHangingFlora() {
        if (!hangingBranches.length) return;
        const windBoost = SC.rain.wind * 95;
        ctx.save();
        for (const b of hangingBranches) {
            const sway = Math.sin(T * b.swaySpeed + b.phase) * b.swayAmp + windBoost;
            const endX = clamp(b.x + sway, 8, W - 8);
            const endY = Math.min(waterY - 25, b.len);
            const cpX = b.x + sway * 0.45;
            const cpY = endY * 0.55;

            // 枝條主幹
            ctx.strokeStyle = b.type === 'cliff_ferns'
                ? 'rgba(35, 75, 55, 0.55)'
                : 'rgba(42, 95, 58, 0.5)';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(b.x, 0);
            ctx.quadraticCurveTo(cpX, cpY, endX, endY);
            ctx.stroke();

            // 沿枝條分佈的柳葉 / 蕨葉
            ctx.fillStyle = b.type === 'cliff_ferns'
                ? `rgba(${50 + b.hueOffset}, ${115 + b.hueOffset}, 78, 0.62)`
                : `rgba(${65 + b.hueOffset}, ${145 + b.hueOffset}, 85, 0.58)`;

            for (let k = 1; k <= b.leavesCount; k++) {
                const t = k / (b.leavesCount + 1);
                const inv = 1 - t;
                const lx = inv * inv * b.x + 2 * inv * t * cpX + t * t * endX;
                const ly = inv * inv * 0 + 2 * inv * t * cpY + t * t * endY;
                const side = k % 2 === 0 ? 1 : -1;
                const angle = Math.atan2(endY - cpY, endX - cpX) + side * 0.65 + Math.sin(T * 1.8 + k) * 0.12;

                ctx.save();
                ctx.translate(lx, ly);
                ctx.rotate(angle);
                ctx.beginPath();
                ctx.ellipse(7, 0, 8, 2.1, 0, 0, TAU);
                ctx.fill();
                ctx.restore();
            }
        }
        ctx.restore();
    }

    // ------------------------------------------------------------------
    // 🌿 新增植物系統 2：岸邊動態搖曳蘆葦與香蒲 (Swaying Reeds & Cattails)
    // ------------------------------------------------------------------
    let reeds = [];
    function initReeds() {
        reeds = [];
        const cnt = SC.reeds || 0;
        if (!cnt) return;
        const rng = mulberry32(hashStr(SC.id + '_reeds'));
        for (let i = 0; i < cnt; i++) {
            // 聚集在左右兩岸與淺水邊
            const cluster = i < cnt * 0.55
                ? rng() * W * 0.26
                : W * (0.74 + rng() * 0.26);
            const h = rnd(65, 145) * (H / 900);
            reeds.push({
                x: clamp(cluster, 10, W - 10),
                h,
                lean: (rng() - 0.5) * 18,
                phase: rng() * TAU,
                speed: rnd(0.9, 1.5),
                hasCattail: rng() < 0.45,
                width: rnd(1.8, 3.0),
                shade: Math.floor(rng() * 25)
            });
        }
    }
    function drawReeds() {
        if (!reeds.length) return;
        const windPush = SC.rain.wind * 70 + SC.current * 10;
        ctx.save();
        ctx.lineCap = 'round';
        for (const r of reeds) {
            const baseY = waterY + 12;
            const sway = Math.sin(T * r.speed + r.phase) * 12 + r.lean + windPush;
            const tipX = clamp(r.x + sway, 6, W - 6);
            const tipY = Math.max(40, baseY - r.h);
            const midX = r.x + sway * 0.45;
            const midY = baseY - r.h * 0.55;

            ctx.strokeStyle = `rgba(${38 + r.shade}, ${105 + r.shade}, ${62 + r.shade}, 0.78)`;
            ctx.lineWidth = r.width;
            ctx.beginPath();
            ctx.moveTo(r.x, baseY);
            ctx.quadraticCurveTo(midX, midY, tipX, tipY);
            ctx.stroke();

            // 香蒲果穗 (Cattail Head)
            if (r.hasCattail) {
                const cx = 0.25 * r.x + 0.5 * midX + 0.25 * tipX;
                const cy = 0.25 * baseY + 0.5 * midY + 0.25 * tipY;
                const ang = Math.atan2(tipY - midY, tipX - midX);
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(ang);
                ctx.fillStyle = 'rgba(72, 42, 24, 0.9)';
                ctx.beginPath();
                ctx.ellipse(0, 0, 11, 3.6, 0, 0, TAU);
                ctx.fill();
                ctx.restore();
            }
        }
        ctx.restore();
    }

    // ------------------------------------------------------------------
    // 🌿 新增植物系統 3：水面浮動睡蓮荷葉與盛開蓮花 (Floating Lotus Pads)
    // ------------------------------------------------------------------
    let lotusPads = [];
    function initLotusPads() {
        lotusPads = [];
        const cnt = SC.lotus || 0;
        if (!cnt) return;
        const rng = mulberry32(hashStr(SC.id + '_lotus'));
        for (let i = 0; i < cnt; i++) {
            const frac = (i + 0.5) / cnt;
            const x = clamp(W * (0.12 + frac * 0.76 + (rng() - 0.5) * 0.09), 60, W - 60);
            lotusPads.push({
                baseX: x,
                x,
                rx: rnd(26, 40) * clamp(W / 1280, 0.75, 1.25),
                ry: rnd(7, 11) * clamp(W / 1280, 0.75, 1.25),
                notchAngle: rnd(-0.4, 0.4),
                hasFlower: rng() < 0.55,
                flowerColor: rng() < 0.65 ? '#ff9ec4' : '#fff3c4',
                phase: rng() * TAU
            });
        }
    }
    function drawLotusPads() {
        if (!lotusPads.length) return;
        ctx.save();
        for (const p of lotusPads) {
            p.x = p.baseX + Math.sin(T * 0.5 + p.phase) * 6;
            const sy = surfaceAt(p.x);
            const slope = clamp(surfaceSlopeAt(p.x), -0.25, 0.25);

            ctx.save();
            ctx.translate(p.x, sy + 1);
            ctx.rotate(slope * 0.75);

            // 荷葉陰影
            ctx.fillStyle = 'rgba(0, 15, 10, 0.38)';
            ctx.beginPath();
            ctx.ellipse(0, 3, p.rx, p.ry, 0, 0, TAU);
            ctx.fill();

            // 荷葉本體（帶缺口扇形橢圓）
            ctx.fillStyle = 'rgba(46, 132, 78, 0.88)';
            ctx.strokeStyle = 'rgba(95, 190, 120, 0.7)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.ellipse(0, 0, p.rx, p.ry, 0, p.notchAngle + 0.25, p.notchAngle + TAU - 0.25);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 荷葉葉脈
            ctx.strokeStyle = 'rgba(130, 215, 150, 0.28)';
            ctx.lineWidth = 0.9;
            for (let a = 0.6; a < TAU - 0.5; a += 0.75) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(a) * p.rx * 0.82, Math.sin(a) * p.ry * 0.82);
                ctx.stroke();
            }

            // 盛開睡蓮花朵
            if (p.hasFlower) {
                const fx = -p.rx * 0.18;
                const fy = -2;
                ctx.fillStyle = p.flowerColor;
                for (let pet = -2; pet <= 2; pet++) {
                    ctx.save();
                    ctx.translate(fx, fy);
                    ctx.rotate(pet * 0.36 + Math.sin(T * 1.2 + p.phase) * 0.04);
                    ctx.beginPath();
                    ctx.ellipse(0, -6, 3.2, 7.5, 0, 0, TAU);
                    ctx.fill();
                    ctx.restore();
                }
                // 花蕊微光
                ctx.fillStyle = '#ffe566';
                ctx.beginPath();
                ctx.arc(fx, fy - 2, 2.6, 0, TAU);
                ctx.fill();
            }

            ctx.restore();
        }
        ctx.restore();
    }

    // ------------------------------------------------------------------
    // 🌿 新增植物系統 4：水底搖曳水草、海帶與深海珊瑚 (Underwater Seaweed & Kelp)
    // ------------------------------------------------------------------
    let seaweeds = [];
    let corals = [];
    function initUnderwaterFlora() {
        seaweeds = [];
        corals = [];
        const cnt = SC.seaweed || 0;
        const rng = mulberry32(hashStr(SC.id + '_seaweed'));
        const wh = H - waterY;

        for (let i = 0; i < cnt; i++) {
            const x = rnd(20, W - 20);
            const h = rnd(wh * 0.32, wh * 0.78);
            const blades = 2 + Math.floor(rng() * 2);
            for (let b = 0; b < blades; b++) {
                seaweeds.push({
                    x: x + (b - 1) * 9,
                    h: h * rnd(0.75, 1.05),
                    phase: rng() * TAU,
                    speed: rnd(1.0, 1.8),
                    width: SC.ocean ? rnd(3.5, 5.5) : rnd(2.2, 3.8),
                    color: SC.ocean
                        ? `rgba(${22 + Math.floor(rng() * 20)}, ${110 + Math.floor(rng() * 45)}, ${115 + Math.floor(rng() * 40)}, 0.52)`
                        : `rgba(${32 + Math.floor(rng() * 25)}, ${135 + Math.floor(rng() * 40)}, ${82 + Math.floor(rng() * 30)}, 0.5)`
                });
            }
        }

        if (SC.coral) {
            for (let i = 0; i < 8; i++) {
                corals.push({
                    x: (i + 0.5) * (W / 8) + (rng() - 0.5) * 50,
                    size: rnd(18, 32),
                    branches: 4 + Math.floor(rng() * 3),
                    color: i % 2 === 0 ? 'rgba(255, 115, 155, 0.38)' : 'rgba(130, 195, 255, 0.36)',
                    phase: rng() * TAU
                });
            }
        }
    }
    function drawUnderwaterFlora() {
        if (!seaweeds.length && !corals.length) return;
        ctx.save();
        ctx.lineCap = 'round';
        const curPush = SC.current * 18;

        // 珊瑚剪影
        for (const c of corals) {
            ctx.strokeStyle = c.color;
            ctx.lineWidth = 3.2;
            for (let b = 0; b < c.branches; b++) {
                const ang = -Math.PI * 0.8 + (b / (c.branches - 1)) * Math.PI * 0.6;
                const sway = Math.sin(T * 1.1 + c.phase + b) * 3;
                const tx = c.x + Math.cos(ang) * c.size + sway;
                const ty = H - 6 + Math.sin(ang) * c.size;
                ctx.beginPath();
                ctx.moveTo(c.x, H - 4);
                ctx.quadraticCurveTo(c.x + sway * 0.5, H - c.size * 0.5, tx, ty);
                ctx.stroke();
            }
        }

        // 水草 / 巨藻
        for (const s of seaweeds) {
            const baseY = H - 4;
            const topY = Math.max(waterY + 14, baseY - s.h);
            const sway1 = Math.sin(T * s.speed + s.phase) * 12 + curPush * 0.6;
            const sway2 = Math.cos(T * s.speed * 0.85 + s.phase) * 18 + curPush;

            ctx.strokeStyle = s.color;
            ctx.lineWidth = s.width;
            ctx.beginPath();
            ctx.moveTo(s.x, baseY);
            ctx.bezierCurveTo(
                s.x + sway1, baseY - s.h * 0.38,
                s.x - sway1 * 0.6 + sway2 * 0.5, baseY - s.h * 0.72,
                clamp(s.x + sway2, 8, W - 8), topY
            );
            ctx.stroke();
        }
        ctx.restore();
    }

    // ------------------------------------------------------------------
    // 🦋 新增生物系統 1：蜻蜓 / 豆娘 (Dragonflies & Damselflies - 點水互動)
    // ------------------------------------------------------------------
    let dragonflies = [];
    function initDragonflies() {
        dragonflies = [];
        const cnt = SC.dragonflies || 0;
        for (let i = 0; i < cnt; i++) {
            dragonflies.push({
                x: rnd(W * 0.15, W * 0.85),
                y: rnd(waterY * 0.45, waterY - 35),
                tx: rnd(W * 0.15, W * 0.85),
                ty: rnd(waterY * 0.45, waterY - 40),
                vx: 0,
                vy: 0,
                state: 'patrol', // 'patrol' | 'dip' | 'hover'
                timer: rnd(1.5, 4.5),
                wingPhase: rnd(0, TAU),
                dir: Math.random() < 0.5 ? 1 : -1,
                color: i % 2 === 0 ? '#5ce1e6' : '#ff72a5'
            });
        }
    }
    function triggerDragonflyDip(df) {
        df.state = 'dip';
        df.tx = clamp(df.x + rnd(-90, 90), 60, W - 60);
        df.ty = surfaceAt(df.tx) - 3;
        df.timer = 2.5;
    }
    function updateDragonflies(dt) {
        for (const d of dragonflies) {
            d.wingPhase += dt * 55;
            d.timer -= dt;

            if (d.state === 'patrol') {
                const dx = d.tx - d.x, dy = d.ty - d.y;
                d.vx += (dx * 3.5 - d.vx * 3.0) * dt;
                d.vy += (dy * 3.5 - d.vy * 3.0) * dt;
                if (Math.hypot(dx, dy) < 20 || d.timer <= 0) {
                    if (Math.random() < 0.42) {
                        triggerDragonflyDip(d);
                    } else {
                        d.tx = rnd(70, W - 70);
                        d.ty = rnd(Math.max(60, waterY * 0.42), waterY - 32);
                        d.timer = rnd(2.0, 4.5);
                    }
                }
            } else if (d.state === 'dip') {
                const surfY = surfaceAt(d.x);
                const dx = d.tx - d.x, dy = (surfY - 2) - d.y;
                d.vx += (dx * 5.0 - d.vx * 2.5) * dt;
                d.vy += (dy * 6.5 - d.vy * 2.5) * dt;

                // 蜻蜓點水瞬間！
                if (d.y >= surfY - 6) {
                    kick(d.x, 1.4);
                    addRipple(d.x, surfY, 34, 0.55);
                    spawnSplash(d.x, surfY, 3, 18);
                    d.state = 'patrol';
                    d.tx = clamp(d.x + rnd(-140, 140), 70, W - 70);
                    d.ty = rnd(Math.max(60, waterY * 0.45), waterY - 55);
                    d.vy = -85;
                    d.timer = rnd(2.5, 5.0);
                } else if (d.timer <= 0) {
                    d.state = 'patrol';
                    d.timer = 2.5;
                }
            }

            d.x = clamp(d.x + d.vx * dt, 30, W - 30);
            d.y = clamp(d.y + d.vy * dt, 45, waterY - 2);
            if (Math.abs(d.vx) > 4) d.dir = d.vx > 0 ? 1 : -1;
        }
    }
    function drawDragonflies() {
        if (!dragonflies.length) return;
        ctx.save();
        for (const d of dragonflies) {
            ctx.save();
            ctx.translate(d.x, d.y);
            ctx.scale(d.dir, 1);
            const tilt = clamp(d.vy * 0.003, -0.35, 0.35);
            ctx.rotate(tilt);

            // 纖長腹部與胸節
            ctx.strokeStyle = d.color;
            ctx.lineWidth = 2.0;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.lineTo(-14, 2);
            ctx.stroke();

            // 頭部複眼
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(9, -0.5, 2.0, 0, TAU);
            ctx.fill();

            // 高頻振動雙翼
            const w1 = Math.sin(d.wingPhase) * 0.55;
            const w2 = Math.cos(d.wingPhase) * 0.55;
            ctx.fillStyle = 'rgba(215, 245, 255, 0.52)';
            ctx.strokeStyle = 'rgba(180, 235, 255, 0.7)';
            ctx.lineWidth = 0.7;

            ctx.save();
            ctx.translate(3, -1);
            ctx.rotate(-0.4 + w1);
            ctx.beginPath(); ctx.ellipse(0, -7, 2.2, 8.5, 0.2, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.restore();

            ctx.save();
            ctx.translate(0, -1);
            ctx.rotate(-0.7 + w2);
            ctx.beginPath(); ctx.ellipse(0, -6.5, 2.0, 7.5, -0.15, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.restore();

            ctx.restore();
        }
        ctx.restore();
    }

    // ------------------------------------------------------------------
    // 🐸 新增生物系統 2：荷葉青蛙 (Pond Frogs - 呼吸鳴囊 + 拋物線跳水)
    // ------------------------------------------------------------------
    let frogs = [];
    function initFrogs() {
        frogs = [];
        const cnt = SC.frogs || 0;
        if (!cnt || !lotusPads.length) return;
        for (let i = 0; i < cnt; i++) {
            const padIdx = i % lotusPads.length;
            frogs.push({
                padIdx,
                x: lotusPads[padIdx].x,
                y: waterY - 4,
                vx: 0,
                vy: 0,
                dir: i % 2 === 0 ? 1 : -1,
                state: 'sit', // 'sit' | 'jump' | 'swim'
                timer: rnd(4.0, 9.0),
                throatPhase: rnd(0, TAU),
                legExtend: 0
            });
        }
    }
    function triggerFrogJump(f) {
        if (f.state !== 'sit') return;
        f.state = 'jump';
        // 選擇另一片荷葉或水面目標
        const nextPad = (f.padIdx + 1 + Math.floor(Math.random() * Math.max(1, lotusPads.length - 1))) % lotusPads.length;
        f.padIdx = nextPad;
        const targetX = lotusPads[nextPad] ? lotusPads[nextPad].x : clamp(f.x + rnd(-180, 180), 80, W - 80);
        const dx = clamp(targetX - f.x, -260, 260);
        f.dir = dx >= 0 ? 1 : -1;

        // 計算安全拋物線高度（絕不超過畫面頂部）
        const surfY = surfaceAt(f.x);
        const apexH = Math.min(rnd(55, 95) * (H / 900), surfY - 80);
        f.vy = -Math.sqrt(2 * G * Math.max(25, apexH));
        const flightTime = (2 * Math.abs(f.vy)) / G;
        f.vx = dx / Math.max(0.35, flightTime);
        f.legExtend = 1;

        // 起跳時荷葉下壓產生漣漪
        kick(f.x, 2.2);
        addRipple(f.x, surfY, 32, 0.5);
    }
    function updateFrogs(dt) {
        for (const f of frogs) {
            f.throatPhase += dt * 5.5;
            if (f.state === 'sit') {
                const pad = lotusPads[f.padIdx];
                if (pad) {
                    f.x = pad.x + 6 * f.dir;
                    f.y = surfaceAt(f.x) - 3;
                }
                f.legExtend = Math.max(0, f.legExtend - dt * 4);
                f.timer -= dt;
                if (f.timer <= 0) {
                    triggerFrogJump(f);
                }
            } else if (f.state === 'jump') {
                f.vy += G * dt;
                f.x = clamp(f.x + f.vx * dt, 40, W - 40);
                f.y = Math.max(45, f.y + f.vy * dt);
                const surfY = surfaceAt(f.x);

                if (f.vy > 0 && f.y >= surfY - 2) {
                    // 落水或落回荷葉
                    kick(f.x, 3.8);
                    addRipple(f.x, surfY, 55, 0.7);
                    spawnSplash(f.x, surfY, 6, 36);
                    f.state = 'sit';
                    f.timer = rnd(5.0, 11.0);
                    f.vx = 0; f.vy = 0;
                }
            }
        }
    }
    function drawFrogs() {
        if (!frogs.length) return;
        ctx.save();
        for (const f of frogs) {
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.scale(f.dir, 1);
            if (f.state === 'jump') {
                ctx.rotate(clamp(Math.atan2(f.vy, Math.abs(f.vx)) * 0.6, -0.7, 0.7));
            }

            // 後腿（跳躍時伸展）
            ctx.strokeStyle = '#3c9d56';
            ctx.lineWidth = 2.6;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-4, 0);
            if (f.state === 'jump') {
                ctx.lineTo(-15, 7);
                ctx.lineTo(-22, 11);
            } else {
                ctx.lineTo(-9, 2);
                ctx.lineTo(-4, 4);
            }
            ctx.stroke();

            // 青蛙身體
            ctx.fillStyle = '#4eb866';
            ctx.beginPath();
            ctx.ellipse(0, -3, 8.5, 5.5, -0.25, 0, TAU);
            ctx.fill();

            // 背部深綠紋路
            ctx.fillStyle = '#2d7a40';
            ctx.beginPath();
            ctx.ellipse(-1, -5, 5, 2.2, -0.2, 0, TAU);
            ctx.fill();

            // 鼓起鳴囊 (Vocal Sac)
            const sac = Math.max(0, Math.sin(f.throatPhase)) * 3.2;
            if (f.state === 'sit' && sac > 0.3) {
                ctx.fillStyle = 'rgba(215, 245, 200, 0.85)';
                ctx.beginPath();
                ctx.arc(6.5, -1.5, 2.2 + sac, 0, TAU);
                ctx.fill();
            }

            // 凸出大眼睛
            ctx.fillStyle = '#6ad17e';
            ctx.beginPath();
            ctx.arc(5.5, -7.5, 2.4, 0, TAU);
            ctx.fill();
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.arc(6.2, -7.6, 1.1, 0, TAU);
            ctx.fill();

            ctx.restore();
        }
        ctx.restore();
    }

    // ------------------------------------------------------------------
    // 🕷️ 新增生物系統 3：水黽 (Water Striders - 水面滑行與微漣漪)
    // ------------------------------------------------------------------
    let striders = [];
    function initStriders() {
        striders = [];
        const cnt = SC.striders || 0;
        for (let i = 0; i < cnt; i++) {
            striders.push({
                x: rnd(60, W - 60),
                vx: 0,
                dir: Math.random() < 0.5 ? 1 : -1,
                timer: rnd(0.5, 2.2)
            });
        }
    }
    function updateStriders(dt) {
        for (const s of striders) {
            s.timer -= dt;
            if (s.timer <= 0) {
                s.dir = (s.x < 90) ? 1 : (s.x > W - 90) ? -1 : (Math.random() < 0.7 ? s.dir : -s.dir);
                s.vx = s.dir * rnd(95, 175);
                s.timer = rnd(1.0, 2.6);
                const sy = surfaceAt(s.x);
                kick(s.x, 0.35);
                addRipple(s.x, sy, 18, 0.38);
            }
            s.x = clamp(s.x + s.vx * dt, 30, W - 30);
            s.vx *= Math.exp(-dt * 3.8);
        }
    }
    function drawStriders() {
        if (!striders.length) return;
        ctx.save();
        ctx.strokeStyle = 'rgba(180, 225, 245, 0.75)';
        ctx.fillStyle = 'rgba(40, 65, 80, 0.9)';
        ctx.lineWidth = 1.1;
        for (const s of striders) {
            const sy = surfaceAt(s.x);
            ctx.save();
            ctx.translate(s.x, sy - 1);
            ctx.scale(s.dir, 1);

            // 細長六足展開貼合水面
            ctx.beginPath();
            ctx.moveTo(2, -1); ctx.lineTo(10, 2);
            ctx.moveTo(0, -1); ctx.lineTo(-2, 3);
            ctx.moveTo(-3, -1); ctx.lineTo(-11, 2);
            ctx.stroke();

            // 身體
            ctx.beginPath();
            ctx.ellipse(0, -1.5, 4.5, 1.3, 0, 0, TAU);
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();
    }

    // ------------------------------------------------------------------
    // 🐟 新增生物系統 4：水下小魚苗群 (School of Minnows / Boids)
    // ------------------------------------------------------------------
    let minnows = [];
    let minnowLeader = { x: 0, y: 0, vx: 60, vy: 0, timer: 2 };
    function initMinnows() {
        minnows = [];
        const cnt = SC.minnows || 0;
        if (!cnt) return;
        minnowLeader.x = W * 0.5;
        minnowLeader.y = waterY + (H - waterY) * 0.55;
        for (let i = 0; i < cnt; i++) {
            minnows.push({
                x: minnowLeader.x + rnd(-90, 90),
                y: minnowLeader.y + rnd(-35, 35),
                vx: rnd(30, 70),
                vy: rnd(-10, 10),
                size: rnd(3.2, 5.2),
                phase: rnd(0, TAU),
                offsetX: rnd(-65, 65),
                offsetY: rnd(-28, 28)
            });
        }
    }
    function startleMinnows(epicenterX) {
        for (const m of minnows) {
            const dx = m.x - epicenterX;
            if (Math.abs(dx) < 180) {
                m.vx += (dx >= 0 ? 1 : -1) * rnd(90, 160);
                m.vy += rnd(-35, 45);
            }
        }
    }
    function updateMinnows(dt) {
        if (!minnows.length) return;
        minnowLeader.timer -= dt;
        if (minnowLeader.timer <= 0) {
            minnowLeader.timer = rnd(2.2, 4.5);
            const targetX = rnd(90, W - 90);
            const targetY = rnd(waterY + 32, H - 34);
            const ang = Math.atan2(targetY - minnowLeader.y, targetX - minnowLeader.x);
            const spd = rnd(48, 88);
            minnowLeader.vx = Math.cos(ang) * spd;
            minnowLeader.vy = Math.sin(ang) * spd;
        }
        minnowLeader.x = clamp(minnowLeader.x + minnowLeader.vx * dt, 70, W - 70);
        minnowLeader.y = clamp(minnowLeader.y + minnowLeader.vy * dt, waterY + 28, H - 30);
        if (minnowLeader.x <= 75 || minnowLeader.x >= W - 75) minnowLeader.vx *= -1;

        for (const m of minnows) {
            m.phase += dt * 14;
            const tx = minnowLeader.x + m.offsetX;
            const ty = minnowLeader.y + m.offsetY;
            m.vx += ((tx - m.x) * 2.2 - m.vx * 1.8) * dt;
            m.vy += ((ty - m.y) * 2.5 - m.vy * 2.0) * dt;
            m.x = clamp(m.x + m.vx * dt, 15, W - 15);
            m.y = clamp(m.y + m.vy * dt, surfaceAt(m.x) + 18, H - 22);
        }
    }
    function drawMinnows() {
        if (!minnows.length) return;
        ctx.save();
        ctx.fillStyle = SC.ocean ? 'rgba(145, 225, 255, 0.48)' : 'rgba(190, 235, 220, 0.42)';
        for (const m of minnows) {
            const dir = m.vx >= 0 ? 1 : -1;
            const wag = Math.sin(m.phase) * 1.4;
            ctx.save();
            ctx.translate(m.x, m.y);
            ctx.scale(dir, 1);
            ctx.beginPath();
            ctx.moveTo(m.size, 0);
            ctx.quadraticCurveTo(0, -m.size * 0.48, -m.size, wag * 0.3);
            ctx.lineTo(-m.size * 1.45, -m.size * 0.4 + wag);
            ctx.lineTo(-m.size * 1.45, m.size * 0.4 + wag);
            ctx.lineTo(-m.size, wag * 0.3);
            ctx.quadraticCurveTo(0, m.size * 0.48, m.size, 0);
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();
    }

    // ------------------------------------------------------------------
    // 🪼 新增生物系統 5：發光水母 (Bioluminescent Jellyfish)
    // ------------------------------------------------------------------
    let jellyfishes = [];
    function initJellyfish() {
        jellyfishes = [];
        const cnt = SC.jellyfish || 0;
        for (let i = 0; i < cnt; i++) {
            jellyfishes.push({
                x: rnd(60, W - 60),
                y: rnd(waterY + 38, H - 36),
                vx: rnd(-12, 12),
                vy: 0,
                r: rnd(10, 16),
                phase: rnd(0, TAU),
                hue: i % 2 === 0 ? '130, 230, 255' : '255, 130, 200'
            });
        }
    }
    function updateJellyfish(dt) {
        for (const j of jellyfishes) {
            j.phase += dt * 2.6;
            const pulse = Math.sin(j.phase);
            j.vy = -pulse * 14;
            j.x += (j.vx + SC.current * 10) * dt;
            j.y += j.vy * dt;

            if (j.x < -30) j.x = W + 30;
            else if (j.x > W + 30) j.x = -30;
            j.y = clamp(j.y, surfaceAt(j.x) + 26, H - 28);
        }
    }
    function drawJellyfish() {
        if (!jellyfishes.length) return;
        ctx.save();
        for (const j of jellyfishes) {
            const pulse = Math.sin(j.phase);
            const rx = j.r * (1 + pulse * 0.14);
            const ry = j.r * (0.78 - pulse * 0.12);

            ctx.save();
            ctx.translate(j.x, j.y);

            // 發光傘蓋
            ctx.fillStyle = `rgba(${j.hue}, 0.38)`;
            ctx.strokeStyle = `rgba(${j.hue}, 0.72)`;
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.arc(0, 0, rx, Math.PI, 0, false);
            ctx.quadraticCurveTo(0, ry * 0.45, -rx, 0);
            ctx.fill();
            ctx.stroke();

            // 飄逸觸手
            ctx.strokeStyle = `rgba(${j.hue}, 0.45)`;
            ctx.lineWidth = 1.0;
            for (let t = -2; t <= 2; t++) {
                const tx = t * (rx * 0.34);
                const sway = Math.sin(j.phase * 1.3 + t) * 5;
                ctx.beginPath();
                ctx.moveTo(tx, 1);
                ctx.quadraticCurveTo(tx + sway, j.r * 0.9, tx - sway * 0.6, j.r * 1.7);
                ctx.stroke();
            }

            ctx.restore();
        }
        ctx.restore();
    }

    // ------------------------------------------------------------------
    // 🐢 新增生物系統 6：悠游海龜 / 池龜 (Swimming Turtles)
    // ------------------------------------------------------------------
    let turtles = [];
    function initTurtles() {
        turtles = [];
        const cnt = SC.turtles || 0;
        for (let i = 0; i < cnt; i++) {
            const dir = i % 2 === 0 ? 1 : -1;
            turtles.push({
                x: rnd(80, W - 80),
                y: rnd(waterY + 45, H - 42),
                dir,
                speed: rnd(22, 36),
                phase: rnd(0, TAU),
                size: SC.ocean ? rnd(16, 22) : rnd(12, 16)
            });
        }
    }
    function updateTurtles(dt) {
        for (const t of turtles) {
            t.phase += dt * 2.8;
            t.x += t.dir * t.speed * dt;
            t.y += Math.sin(t.phase * 0.5) * 6 * dt;
            t.y = clamp(t.y, surfaceAt(t.x) + 28, H - 32);
            if (t.x > W + 50) { t.dir = -1; t.x = W + 40; }
            else if (t.x < -50) { t.dir = 1; t.x = -40; }
        }
    }
    function drawTurtles() {
        if (!turtles.length) return;
        ctx.save();
        for (const t of turtles) {
            ctx.save();
            ctx.translate(t.x, t.y);
            ctx.scale(t.dir, 1);
            const stroke = Math.sin(t.phase) * 0.45;

            // 前後划水鰭足
            ctx.fillStyle = SC.ocean ? 'rgba(75, 165, 175, 0.72)' : 'rgba(70, 125, 85, 0.72)';
            ctx.save();
            ctx.translate(t.size * 0.35, 2);
            ctx.rotate(0.4 + stroke);
            ctx.beginPath(); ctx.ellipse(0, 7, 3.2, 9, 0.2, 0, TAU); ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.translate(-t.size * 0.45, 2);
            ctx.rotate(-0.4 - stroke * 0.6);
            ctx.beginPath(); ctx.ellipse(0, 5, 2.4, 6, -0.2, 0, TAU); ctx.fill();
            ctx.restore();

            // 頭部
            ctx.beginPath();
            ctx.ellipse(t.size * 0.85, -1, 4.5, 3.0, -0.1, 0, TAU);
            ctx.fill();

            // 龜殼
            ctx.fillStyle = SC.ocean ? 'rgba(42, 108, 122, 0.85)' : 'rgba(52, 92, 62, 0.85)';
            ctx.strokeStyle = 'rgba(160, 220, 195, 0.45)';
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.ellipse(0, -1, t.size * 0.72, t.size * 0.42, 0, 0, TAU);
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        }
        ctx.restore();
    }

    // ------------------------------------------------------------------
    // 🕊️ 新增生物系統 7：遠空飛鳥 / 白鷺 / 海鷗剪影 (Flying Birds)
    // ------------------------------------------------------------------
    let birds = [];
    function initBirds() {
        birds = [];
        const cnt = SC.birds || 0;
        for (let i = 0; i < cnt; i++) {
            const dir = Math.random() < 0.5 ? 1 : -1;
            birds.push({
                x: rnd(0, W),
                y: rnd(55, Math.max(110, waterY * 0.45)),
                dir,
                speed: rnd(38, 68),
                phase: rnd(0, TAU),
                span: rnd(11, 17)
            });
        }
    }
    function updateBirds(dt) {
        for (const b of birds) {
            b.phase += dt * 6.2;
            b.x += b.dir * b.speed * dt;
            b.y = clamp(b.y + Math.sin(b.phase * 0.5) * 4 * dt, 40, waterY * 0.55);
            if (b.x > W + 60) { b.x = -50; b.y = rnd(50, waterY * 0.45); }
            else if (b.x < -60) { b.x = W + 50; b.y = rnd(50, waterY * 0.45); }
        }
    }
    function drawBirds() {
        if (!birds.length) return;
        ctx.save();
        ctx.strokeStyle = 'rgba(205, 228, 245, 0.55)';
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        for (const b of birds) {
            const flap = Math.sin(b.phase) * b.span * 0.48;
            ctx.beginPath();
            ctx.moveTo(b.x - b.span, b.y - flap);
            ctx.quadraticCurveTo(b.x - b.span * 0.45, b.y - flap * 0.35 - 3, b.x, b.y);
            ctx.quadraticCurveTo(b.x + b.span * 0.45, b.y - flap * 0.35 - 3, b.x + b.span, b.y - flap);
            ctx.stroke();
        }
        ctx.restore();
    }

    // ------------------------------------------------------------------
    // 雨滴 (TypedArray 池 + 分層批次繪製 + 荷葉彈跳)
    // ------------------------------------------------------------------
    const RAIN_MAX = 2000;
    const rx = new Float32Array(RAIN_MAX), ry = new Float32Array(RAIN_MAX), rv = new Float32Array(RAIN_MAX),
        rlen = new Float32Array(RAIN_MAX), rlay = new Uint8Array(RAIN_MAX);
    let rc = 0;
    let rainCols = [], rainW = [0.9, 1.2, 1.7];
    function resetDrop(i, initial) {
        const R = SC.rain, l = rlay[i];
        const base = [0.8, 1.2, 1.7][l] * (0.9 + Math.random() * 0.25);
        rv[i] = H * base * R.speed;
        rlen[i] = rv[i] * rnd(0.016, 0.024);
        rx[i] = rnd(-H * R.wind - 40, W + 40);
        ry[i] = initial ? rnd(-30, waterY) : rnd(-80, -4);
    }
    function initRain() {
        rc = Math.min(RAIN_MAX, Math.round(W * SC.rain.density * quality));
        for (let i = 0; i < rc; i++) {
            const r = Math.random();
            rlay[i] = r < 0.45 ? 0 : r < 0.8 ? 1 : 2;
            resetDrop(i, true);
        }
        const a = SC.rain.alpha;
        rainCols = [0.28, 0.5, 0.8].map(k => 'rgba(205,230,255,' + (k * a).toFixed(2) + ')');
    }
    function updateRain(dt) {
        const R = SC.rain, w = R.wind;
        for (let i = 0; i < rc; i++) {
            ry[i] += rv[i] * dt; rx[i] += rv[i] * w * dt;
            const sy = surfaceAt(rx[i]);
            if (ry[i] >= sy) {
                const l = rlay[i], x = rx[i];
                if (x >= 0 && x <= W) {
                    kick(x, [0.5, 1.1, 1.9][l] * R.imp);
                    if (Math.random() < R.ripple[l]) addRipple(x, sy, 12 + l * 9, 0.32 + l * 0.14);
                    if (sn < SMAX - 40) spawnSplash(x, sy, 1 + l, 5 + l * 7);
                }
                resetDrop(i, false);
            }
        }
    }
    function drawRain() {
        if (!rc) return;
        const w = SC.rain.wind;
        ctx.lineCap = 'round';
        for (let l = 0; l < 3; l++) {
            ctx.strokeStyle = rainCols[l]; ctx.lineWidth = rainW[l];
            ctx.beginPath();
            for (let i = 0; i < rc; i++) {
                if (rlay[i] !== l) continue;
                ctx.moveTo(rx[i], ry[i]);
                ctx.lineTo(rx[i] - w * rlen[i], ry[i] - rlen[i]);
            }
            ctx.stroke();
        }
    }

    // ------------------------------------------------------------------
    // 瀑布
    // ------------------------------------------------------------------
    const FS = 70;
    const fo = new Float32Array(FS), fy = new Float32Array(FS), fv = new Float32Array(FS), fl = new Float32Array(FS);
    let fallCX = 0, fallW = 0;
    function initFall() {
        fallCX = W * 0.5; fallW = clamp(W * 0.13, 70, 190);
        for (let i = 0; i < FS; i++) { fo[i] = Math.random(); fl[i] = rnd(40, 150); fv[i] = rnd(0.7, 1.3) * H * 0.9; fy[i] = rnd(-fl[i], waterY); }
        fallGrad = ctx.createLinearGradient(fallCX - fallW * 0.7, 0, fallCX + fallW * 0.7, 0);
        fallGrad.addColorStop(0, 'rgba(210,240,255,0)');
        fallGrad.addColorStop(0.2, 'rgba(225,245,255,0.32)');
        fallGrad.addColorStop(0.5, 'rgba(245,252,255,0.5)');
        fallGrad.addColorStop(0.8, 'rgba(225,245,255,0.32)');
        fallGrad.addColorStop(1, 'rgba(210,240,255,0)');
    }
    function updateFall(dt) {
        for (let i = 0; i < FS; i++) {
            fy[i] += fv[i] * dt;
            if (fy[i] > waterY) { fy[i] = -fl[i]; fo[i] = Math.random(); }
        }
        if (Math.random() < dt * 45) {
            const x = fallCX + rnd(-0.5, 0.5) * fallW;
            kick(x, 1.3);
            if (sn < SMAX - 40) spawnSplash(x, waterY, 2, 48);
        }
        if (Math.random() < dt * 7) addRipple(fallCX + rnd(-0.7, 0.7) * fallW, waterY, 70, 0.5);
    }
    function drawFall() {
        ctx.fillStyle = fallGrad;
        ctx.fillRect(fallCX - fallW * 0.7, 0, fallW * 1.4, waterY + 3);
        ctx.strokeStyle = 'rgba(255,255,255,0.38)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i < FS; i++) {
            const x = fallCX + (fo[i] - 0.5) * fallW * 0.95 + Math.sin(fy[i] * 0.02 + i) * 1.5;
            const y0 = Math.max(0, fy[i]), y1 = Math.min(waterY, fy[i] + fl[i]);
            if (y1 <= y0) continue;
            ctx.moveTo(x, y0); ctx.lineTo(x, y1);
        }
        ctx.stroke();
    }

    // ------------------------------------------------------------------
    // 霧氣 / 螢火蟲 / 落葉
    // ------------------------------------------------------------------
    let mists = [];
    function initMist() {
        mists = [];
        for (let i = 0; i < SC.mist; i++) {
            const nearFall = SC.fall && i < 3;
            mists.push({
                x: nearFall ? fallCX + rnd(-1, 1) * fallW : rnd(0, W),
                y: nearFall ? waterY - rnd(0, 40) : waterY - rnd(5, 90),
                w: nearFall ? rnd(260, 420) : rnd(300, 620), h: nearFall ? rnd(120, 200) : rnd(110, 190),
                v: nearFall ? rnd(-6, 6) : rnd(4, 14), a: nearFall ? SC.mistA * 2 : SC.mistA * rnd(0.7, 1.2)
            });
        }
    }
    function updateMist(dt) {
        for (const m of mists) { m.x += m.v * dt; if (m.x > W + m.w * 0.5) m.x = -m.w * 0.5; else if (m.x < -m.w * 0.5) m.x = W + m.w * 0.5; }
    }
    function drawMist() {
        for (const m of mists) {
            ctx.globalAlpha = m.a;
            ctx.drawImage(mistSpr, m.x - m.w / 2, m.y - m.h / 2, m.w, m.h);
        }
        ctx.globalAlpha = 1;
    }

    let flies = [];
    function initFlies() {
        flies = [];
        for (let i = 0; i < (SC.fireflies || 0); i++) flies.push({ bx: rnd(0, W), by: rnd(waterY * 0.35, waterY - 12), ph: rnd(0, TAU), ph2: rnd(0, TAU), sp: rnd(0.25, 0.6), sz: rnd(10, 18) });
    }
    function drawFlies() {
        if (!flies.length) return;
        ctx.globalCompositeOperation = 'lighter';
        for (const f of flies) {
            const x = clamp(f.bx + Math.sin(T * f.sp + f.ph) * 42, 8, W - 8);
            const y = clamp(f.by + Math.cos(T * f.sp * 1.3 + f.ph) * 20, 20, waterY - 6);
            const a = Math.pow(Math.max(0, Math.sin(T * 1.4 + f.ph2)), 2) * 0.9 + 0.08;
            ctx.globalAlpha = a;
            ctx.drawImage(glowSpr, x - f.sz / 2, y - f.sz / 2, f.sz, f.sz);
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }

    let leaves = [];
    function resetLeaf(l, initial) {
        l.state = 0; l.x = rnd(0, W); l.y = initial ? rnd(-20, waterY * 0.9) : rnd(-60, -10);
        l.vy = rnd(35, 70); l.vx = rnd(8, 26); l.ph = rnd(0, TAU); l.rot = rnd(0, TAU); l.rs = rnd(-1.4, 1.4);
        l.sz = rnd(7, 11); l.life = 0;
    }
    function initLeaves() {
        leaves = [];
        if (!SC.leaf) return;
        for (let i = 0; i < 14; i++) { const l = {}; resetLeaf(l, true); leaves.push(l); }
    }
    function updateLeaves(dt) {
        for (const l of leaves) {
            if (l.state === 0) {
                l.ph += dt * 2.2; l.x += (l.vx + Math.sin(l.ph) * 32) * dt; l.y += l.vy * dt; l.rot += l.rs * dt;
                const sy = surfaceAt(l.x);
                if (l.y >= sy) { l.state = 1; l.life = rnd(6, 11); kick(l.x, 0.5); addRipple(l.x, sy, 20, 0.3); }
                else if (l.x > W + 30) resetLeaf(l, false);
            } else {
                l.x += (SC.current * 28 + 4) * dt; l.rot += l.rs * 0.1 * dt; l.life -= dt;
                l.y = surfaceAt(l.x) - 1;
                if (l.life <= 0 || l.x > W + 30) resetLeaf(l, false);
            }
        }
    }
    function drawLeaves() {
        if (!leaves.length) return;
        const bamboo = SC.leaf === 'bamboo';
        ctx.fillStyle = bamboo ? 'rgba(120,200,125,0.85)' : 'rgba(238,134,60,0.85)';
        for (const l of leaves) {
            const a = l.state ? Math.min(1, l.life / 2) : 1;
            ctx.globalAlpha = a;
            ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.rot);
            if (l.state) ctx.scale(1, 0.35);
            ctx.beginPath();
            if (bamboo) {
                ctx.moveTo(0, -l.sz * 1.5); ctx.quadraticCurveTo(l.sz * 0.45, 0, 0, l.sz * 1.5); ctx.quadraticCurveTo(-l.sz * 0.45, 0, 0, -l.sz * 1.5);
            } else {
                ctx.moveTo(0, -l.sz); ctx.quadraticCurveTo(l.sz, -l.sz * 0.2, 0, l.sz); ctx.quadraticCurveTo(-l.sz, -l.sz * 0.2, 0, -l.sz);
            }
            ctx.fill(); ctx.restore();
        }
        ctx.globalAlpha = 1;
    }

    // ------------------------------------------------------------------
    // 錦鯉 / 鮭魚 (拋物線躍出，最高點保留頂部安全距離)
    // ------------------------------------------------------------------
    class Fish {
        constructor(delay) { this.state = 'wait'; this.wait = delay || 0; this.x = -999; this.y = 0; this.vx = 0; this.vy = 0; }
        launch() {
            const k = clamp(W / 1400, 0.6, 1.4), wh = H - waterY;
            this.dir = Math.random() < 0.5 ? 1 : -1;
            this.speed = rnd(110, 210) * k;
            this.x = this.dir > 0 ? -70 : W + 70;
            this.jumpX = Math.random() < 0.85 ? W * rnd(0.16, 0.84) : null;
            this.depth = waterY + wh * (this.jumpX === null ? rnd(0.25, 0.7) : rnd(0.16, 0.34));
            this.y = this.depth; this.vy = 0; this.vx = this.dir * this.speed;
            this.jumped = false; this.wasOut = false;
            this.sz = rnd(0.85, 1.15); this.th = rnd(0, TAU); this.ph = rnd(0, TAU); this.seed = rnd(0, 100);
            this.state = 'swim';
        }
        startJump(surf) {
            const hmax = surf - 75;
            const h = Math.min(rnd(55, 145) * (H / 900), hmax);
            this.jumped = true;
            if (h < 28) return;
            const rise = this.y - (surf - h);
            this.vy = -Math.sqrt(2 * G * rise);
            this.vx = this.dir * this.speed * 0.85;
            this.state = 'jump'; this.wasOut = this.y < surf;
            startleMinnows(this.x);
        }
        update(dt) {
            if (this.state === 'wait') { this.wait -= dt; if (this.wait <= 0) this.launch(); return; }
            const surf = surfaceAt(this.x);
            this.th += dt * 9; this.ph += dt * 5;
            this.x += this.vx * dt;
            if (this.state === 'swim') {
                const yt = clamp(this.depth + Math.sin(this.x * 0.012 + this.seed) * 9, surf + 22, H - 44);
                this.vy += ((yt - this.y) * 20 - this.vy * 6) * dt;
                this.y = Math.min(this.y + this.vy * dt, H - 30);
                if (this.jumpX !== null && !this.jumped &&
                    ((this.dir > 0 && this.x >= this.jumpX) || (this.dir < 0 && this.x <= this.jumpX))) this.startJump(surf);
                if (this.y - surf < 30 && Math.random() < dt * 3) addRipple(this.x, surf, 18, 0.3);
            } else {
                this.vy += G * dt;
                this.y = Math.max(50, this.y + this.vy * dt);
                const out = this.y < surf;
                if (out && !this.wasOut) { kick(this.x, -3); addRipple(this.x, surf, 50, 0.5); spawnSplash(this.x, surf, 6, 35); }
                else if (!out && this.wasOut && this.vy > 0) {
                    kick(this.x, 6); addRipple(this.x, surf, 90, 0.8); spawnSplash(this.x, surf, 10, 60);
                    startleMinnows(this.x);
                    this.state = 'swim'; this.vx = this.dir * this.speed;
                }
                this.wasOut = out;
            }
            if (this.x < -120 || this.x > W + 120) { this.state = 'wait'; this.wait = rnd(0.6, 3); }
        }
        draw() {
            if (this.state === 'wait') return;
            const surf = surfaceAt(this.x);
            const a = 1 - clamp((this.y - surf) / 40, 0, 1) * 0.45;
            const s = this.vx >= 0 ? 1 : -1;
            ctx.save();
            ctx.globalAlpha = a;
            ctx.translate(this.x, this.y); ctx.scale(s, 1);
            ctx.rotate(Math.atan2(this.vy, Math.abs(this.vx)));
            ctx.scale(0.85 * this.sz, 0.85 * this.sz);
            const body = SC.fish[0], acc2 = SC.fish[1];
            ctx.fillStyle = body;
            ctx.beginPath();
            ctx.moveTo(30, 0); ctx.bezierCurveTo(20, 13, -14, 10, -30, 0); ctx.bezierCurveTo(-14, -10, 20, -13, 30, 0);
            ctx.fill();
            ctx.fillStyle = acc2;
            ctx.beginPath(); ctx.ellipse(-2, -3, 11, 4.5, 0, 0, TAU); ctx.ellipse(-16, 2, 5, 3, 0, 0, TAU); ctx.fill();
            ctx.save();
            ctx.translate(-30, 0); ctx.rotate(Math.sin(this.th) * 0.38); ctx.fillStyle = body;
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.quadraticCurveTo(-6, 11, -23, 9); ctx.quadraticCurveTo(-14, 4, -12, 0);
            ctx.quadraticCurveTo(-14, -4, -23, -9); ctx.quadraticCurveTo(-6, -11, 0, 0);
            ctx.fill(); ctx.restore();
            ctx.save();
            ctx.translate(8, 4); ctx.rotate(0.5 + Math.sin(this.ph) * 0.22); ctx.fillStyle = body;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-8, 17, -19, 15); ctx.quadraticCurveTo(-8, 8, 0, 0); ctx.fill();
            ctx.restore();
            ctx.fillStyle = 'rgba(10,10,20,0.85)';
            ctx.beginPath(); ctx.arc(21, -2.5, 1.6, 0, TAU); ctx.fill();
            ctx.restore();
        }
    }
    const FISH_LIMIT = 7;
    let fishes = [];
    function initFishes() { fishes = [new Fish(0.3), new Fish(2.2), new Fish(4.5)]; }
    function spawnFish() {
        for (const f of fishes) if (f.state === 'wait') { f.wait = 0; return; }
        if (fishes.length < FISH_LIMIT) fishes.push(new Fish(0));
    }

    // 觸發全場景生物互動 (TRIGGER WILDLIFE)
    function triggerWildlifeAction() {
        // 1. 讓荷葉上的青蛙起跳
        if (frogs.length) {
            const sitting = frogs.filter(f => f.state === 'sit');
            if (sitting.length) triggerFrogJump(sitting[Math.floor(Math.random() * sitting.length)]);
        }
        // 2. 讓蜻蜓俯衝點水
        if (dragonflies.length) {
            triggerDragonflyDip(dragonflies[Math.floor(Math.random() * dragonflies.length)]);
        }
        // 3. 驚動小魚群並喚出一尾躍水魚
        startleMinnows(W * 0.5);
        spawnFish();
    }

    // ------------------------------------------------------------------
    // 閃電
    // ------------------------------------------------------------------
    let flash = 0, boltT = 0, bolt = null, nextBolt = 3, flashStage = 0, flashDelay = 0;
    function updateLightning(dt) {
        if (!SC.lightning) return;
        nextBolt -= dt;
        if (nextBolt <= 0) {
            nextBolt = rnd(4, 10);
            const pts = []; let x = rnd(W * 0.15, W * 0.85);
            for (let y = 0; y <= waterY; y += 38) { pts.push(x, y); x += rnd(-26, 26); }
            pts.push(x, waterY); bolt = pts; boltT = 0.14; flash = 0.5; flashStage = 1; flashDelay = 0.13;
            kick(x, 4); addRipple(x, waterY, 80, 0.8); spawnSplash(x, waterY, 8, 50);
            startleMinnows(x);
        }
        if (flashStage === 1) { flashDelay -= dt; if (flashDelay <= 0) { flash = 0.35; flashStage = 0; } }
        flash *= Math.exp(-dt * 8); boltT -= dt;
    }
    function drawLightning() {
        if (!SC.lightning) return;
        if (boltT > 0 && bolt) {
            ctx.lineJoin = 'round';
            ctx.strokeStyle = 'rgba(200,225,255,0.3)'; ctx.lineWidth = 8;
            ctx.beginPath(); ctx.moveTo(bolt[0], bolt[1]); for (let i = 2; i < bolt.length; i += 2) ctx.lineTo(bolt[i], bolt[i + 1]); ctx.stroke();
            ctx.strokeStyle = 'rgba(245,250,255,0.95)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(bolt[0], bolt[1]); for (let i = 2; i < bolt.length; i += 2) ctx.lineTo(bolt[i], bolt[i + 1]); ctx.stroke();
        }
        if (flash > 0.01) { ctx.fillStyle = 'rgba(215,232,255,' + (flash * 0.4).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    }

    // ------------------------------------------------------------------
    // 日夜天象系統 (日出/正午/日落/深夜) & 場景切換「日出⇄日落」動效
    // ------------------------------------------------------------------
    function hexToRgb(hex) {
        const h = hex.replace('#', '');
        const n = parseInt(h, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    function lerpRgb(a, b, t) {
        return [
            Math.round(a[0] + (b[0] - a[0]) * t),
            Math.round(a[1] + (b[1] - a[1]) * t),
            Math.round(a[2] + (b[2] - a[2]) * t)
        ];
    }
    function rgbCss(c, alpha) {
        return alpha === undefined
            ? 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'
            : 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + alpha.toFixed(3) + ')';
    }
    function smoothstep01(t) {
        const c = clamp(t, 0, 1);
        return c * c * (3 - 2 * c);
    }

    function getPhaseLabel(p) {
        const ph = ((p % 1) + 1) % 1;
        if (ph >= 0.19 && ph < 0.33) return '日出';
        if (ph >= 0.33 && ph < 0.67) return '晴晝';
        if (ph >= 0.67 && ph < 0.82) return '日落';
        return '星夜';
    }
    function formatSolarClock(p) {
        const ph = ((p % 1) + 1) % 1;
        const totalMin = Math.floor(ph * 24 * 60) % 1440;
        const hh = String(Math.floor(totalMin / 60)).padStart(2, '0');
        const mm = String(totalMin % 60).padStart(2, '0');
        return hh + ':' + mm;
    }

    let lastSolarDomSync = 0;
    function syncSolarUI(force) {
        const now = performance.now();
        if (!force && now - lastSolarDomSync < 75) return;
        lastSolarDomSync = now;

        const ph = ((dayPhase % 1) + 1) % 1;
        const slider = $('solarSlider');
        if (slider && !isDraggingSolar) {
            slider.value = ph.toFixed(3);
        }
        const clockStr = formatSolarClock(ph);
        const stateStr = getPhaseLabel(ph);
        const timeEl = $('solarTimeValue');
        if (timeEl) {
            timeEl.textContent = solarTrans.active
                ? (clockStr + ' // ' + solarTrans.label)
                : (clockStr + ' // ' + stateStr);
        }
        const hudEl = $('hudSolarStatus');
        if (hudEl) {
            hudEl.textContent = solarTrans.active
                ? ('TRANSITION: ' + solarTrans.label)
                : (clockStr + ' ' + stateStr + ' // ' + cycleLabelText + ' CYCLE');
        }
    }

    // 啟動「日出變日落」或「日落變日出」動效 (切換場景時自動觸發，亦可按 X 手動觸發)
    function startSolarTransition(captureOldBg) {
        if (captureOldBg && bgCv.width > 0 && bgCv.height > 0) {
            prevBgCv.width = bgCv.width;
            prevBgCv.height = bgCv.height;
            prevBgx.clearRect(0, 0, prevBgCv.width, prevBgCv.height);
            prevBgx.drawImage(bgCv, 0, 0);
            solarTrans.hasPrevBg = true;
        } else {
            solarTrans.hasPrevBg = false;
        }

        const cur = ((dayPhase % 1) + 1) % 1;
        solarTrans.active = true;
        solarTrans.t = 0;
        solarTrans.dur = 2.4;

        // 若目前處於日出/白晝前半段 -> 啟動「日出變日落 (0.23 -> 0.76)」
        // 若目前處於日落/夜晚後半段 -> 啟動「日落變日出 (0.75 -> 1.25 [即 0.25])」
        if (cur >= 0.15 && cur < 0.55) {
            solarTrans.fromPhase = 0.23;
            solarTrans.toPhase = 0.76;
            solarTrans.label = '日出 ➔ 日落';
        } else {
            solarTrans.fromPhase = 0.75;
            solarTrans.toPhase = 1.25;
            solarTrans.label = '日落 ➔ 日出';
        }
        dayPhase = solarTrans.fromPhase;

        // 切換時在水面激起柔和轉場波紋
        if (N > 0) {
            kick(W * 0.28, 2.2);
            kick(W * 0.72, 2.2);
            addRipple(W * 0.5, surfaceAt(W * 0.5), 85, 0.55);
        }
        syncSolarUI(true);
    }

    function updateSolar(dt) {
        if (solarTrans.active) {
            solarTrans.t += dt;
            const u = clamp(solarTrans.t / solarTrans.dur, 0, 1);
            // Cubic ease-in-out 讓日出⇄日落天體弧線平滑加速與減速
            const ease = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
            dayPhase = (solarTrans.fromPhase + (solarTrans.toPhase - solarTrans.fromPhase) * ease) % 1;
            if (u >= 1) {
                solarTrans.active = false;
                solarTrans.hasPrevBg = false;
                dayPhase = ((solarTrans.toPhase % 1) + 1) % 1;
            }
            syncSolarUI(false);
        } else if (!isDraggingSolar && cycleDurationSec > 0) {
            dayPhase = (dayPhase + dt / cycleDurationSec) % 1;
            syncSolarUI(false);
        }
    }

    // 計算當前時間點的天空色彩、太陽/月亮座標與環境光強度
    function computeSolarAtmosphere() {
        const ph = ((dayPhase % 1) + 1) % 1;
        const nightPalette = [
            hexToRgb(SC.sky[0]),
            hexToRgb(SC.sky[1]),
            hexToRgb(SC.sky[2])
        ];
        const isStorm = SC.id === 'rain_heavy' || SC.id === 'rain_soft';
        const sunrisePalette = isStorm
            ? [[24, 28, 52], [96, 84, 66], [200, 165, 86]]
            : [[26, 30, 68], [168, 118, 60], [252, 200, 96]];
        const noonPalette = isStorm
            ? [[28, 48, 68], [54, 84, 110], [92, 132, 156]]
            : [[20, 78, 122], [54, 138, 178], [142, 212, 228]];
        const sunsetPalette = isStorm
            ? [[22, 20, 44], [92, 74, 52], [200, 155, 70]]
            : [[24, 16, 54], [150, 100, 40], [248, 190, 64]];

        let pA, pB, segT;
        if (ph < 0.25) {
            pA = nightPalette; pB = sunrisePalette; segT = smoothstep01(ph / 0.25);
        } else if (ph < 0.50) {
            pA = sunrisePalette; pB = noonPalette; segT = smoothstep01((ph - 0.25) / 0.25);
        } else if (ph < 0.75) {
            pA = noonPalette; pB = sunsetPalette; segT = smoothstep01((ph - 0.50) / 0.25);
        } else {
            pA = sunsetPalette; pB = nightPalette; segT = smoothstep01((ph - 0.75) / 0.25);
        }

        const skyTop = lerpRgb(pA[0], pB[0], segT);
        const skyMid = lerpRgb(pA[1], pB[1], segT);
        const skyBot = lerpRgb(pA[2], pB[2], segT);

        // 日出霞光權重 (峰值在 0.25) 與日落晚霞權重 (峰值在 0.75)
        const dawnGlow = Math.max(0, 1 - Math.abs(ph - 0.25) / 0.14);
        const duskGlow = Math.max(0, 1 - Math.abs(ph - 0.75) / 0.14);
        const dayFactor = Math.max(0, Math.sin(clamp((ph - 0.18) / 0.64, 0, 1) * Math.PI));
        const nightFactor = clamp(1 - dayFactor * 1.15, 0, 1);

        // 太陽軌跡 (0.16 東方升起 -> 0.50 正午天頂 -> 0.84 西方落下)
        let sun = null;
        if (ph >= 0.16 && ph <= 0.84) {
            const u = (ph - 0.16) / 0.68;
            const arc = Math.sin(u * Math.PI);
            const sx = W * (0.14 + 0.72 * u);
            const sy = waterY + 14 - arc * (waterY * 0.80);
            const col = u < 0.35
                ? lerpRgb([255, 165, 95], [255, 246, 210], u / 0.35)
                : (u > 0.65 ? lerpRgb([255, 246, 210], [255, 196, 74], (u - 0.65) / 0.35) : [255, 248, 218]);
            sun = { x: sx, y: sy, r: 26 + (1 - arc) * 10, alpha: clamp(arc * 1.35, 0, 1), col, u, arc };
        }

        // 月亮軌跡 (0.70 月升 -> 0.00 午夜 -> 0.30 月落)
        let moon = null;
        if (ph >= 0.70 || ph <= 0.30) {
            const mu = (ph >= 0.70 ? (ph - 0.70) : (ph + 0.30)) / 0.60;
            const marc = Math.sin(mu * Math.PI);
            const baseX = SC.moon ? SC.moon.x : 0.72;
            const mx = W * clamp(baseX + (mu - 0.5) * -0.42, 0.14, 0.86);
            const my = waterY + 10 - marc * (waterY * 0.80);
            const mr = SC.moon ? SC.moon.r : 30;
            const mc = SC.moon ? SC.moon.c : '215,240,255';
            moon = { x: mx, y: my, r: mr, alpha: clamp(marc * 1.25, 0, 1), c: mc };
        }

        return { ph, skyTop, skyMid, skyBot, dawnGlow, duskGlow, dayFactor, nightFactor, sun, moon };
    }

    function drawSkyAndCelestial(atm) {
        // 1. 動態天空漸層
        const gr = ctx.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, rgbCss(atm.skyTop));
        gr.addColorStop(0.62, rgbCss(atm.skyMid));
        gr.addColorStop(1, rgbCss(atm.skyBot));
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, W, H);

        // 2. 動態星群 (夜晚與晨昏微光時顯現)
        if (atm.nightFactor > 0.04 && starPts.length) {
            for (let i = 0; i < starPts.length; i++) {
                const st = starPts[i];
                const tw = 0.65 + 0.35 * Math.sin(T * st.spd + st.ph);
                const al = st.a * atm.nightFactor * tw;
                if (al < 0.02) continue;
                ctx.fillStyle = 'rgba(255,255,255,' + al.toFixed(3) + ')';
                ctx.fillRect(st.x, st.y, st.s, st.s);
            }
        }

        // 3. 日出東方晨曦 / 日落西方晚霞天際輝光
        if (atm.dawnGlow > 0.01) {
            const gx = W * 0.22, gy = waterY;
            const rg = ctx.createRadialGradient(gx, gy, 10, gx, gy, Math.max(W, H) * 0.65);
            rg.addColorStop(0, 'rgba(255, 175, 95, ' + (atm.dawnGlow * 0.52).toFixed(3) + ')');
            rg.addColorStop(0.45, 'rgba(240, 185, 85, ' + (atm.dawnGlow * 0.28).toFixed(3) + ')');
            rg.addColorStop(1, 'rgba(240, 185, 85, 0)');
            ctx.fillStyle = rg;
            ctx.fillRect(0, 0, W, waterY + 40);
        }
        if (atm.duskGlow > 0.01) {
            const gx = W * 0.78, gy = waterY;
            const rg = ctx.createRadialGradient(gx, gy, 10, gx, gy, Math.max(W, H) * 0.68);
            rg.addColorStop(0, 'rgba(255, 205, 80, ' + (atm.duskGlow * 0.56).toFixed(3) + ')');
            rg.addColorStop(0.45, 'rgba(215, 150, 50, ' + (atm.duskGlow * 0.32).toFixed(3) + ')');
            rg.addColorStop(1, 'rgba(130, 90, 30, 0)');
            ctx.fillStyle = rg;
            ctx.fillRect(0, 0, W, waterY + 40);
        }

        // 4. 太陽與日冕 + 晨昏/晴晝耶穌光束 (God-rays)
        if (atm.sun && atm.sun.alpha > 0.02) {
            const s = atm.sun;
            ctx.save();
            // 外層日冕光暈
            const sg = ctx.createRadialGradient(s.x, s.y, s.r * 0.3, s.x, s.y, s.r * 7.5);
            sg.addColorStop(0, rgbCss(s.col, 0.52 * s.alpha));
            sg.addColorStop(0.35, rgbCss(s.col, 0.18 * s.alpha));
            sg.addColorStop(1, rgbCss(s.col, 0));
            ctx.fillStyle = sg;
            ctx.fillRect(0, 0, W, waterY + 30);

            // 斜射陽光束
            if (s.arc > 0.15) {
                const rayAlpha = 0.045 * s.alpha;
                ctx.fillStyle = rgbCss(s.col, rayAlpha);
                for (let k = -2; k <= 2; k++) {
                    const spread = k * 95 + Math.sin(T * 0.4 + k) * 18;
                    ctx.beginPath();
                    ctx.moveTo(s.x - 12, s.y);
                    ctx.lineTo(s.x + 12, s.y);
                    ctx.lineTo(s.x + spread + 70, waterY + 20);
                    ctx.lineTo(s.x + spread - 70, waterY + 20);
                    ctx.closePath();
                    ctx.fill();
                }
            }

            // 太陽本體
            ctx.fillStyle = rgbCss(s.col, 0.94 * s.alpha);
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, TAU);
            ctx.fill();
            ctx.restore();
        }

        // 5. 月亮與月暈
        if (atm.moon && atm.moon.alpha > 0.02) {
            const m = atm.moon;
            const mg = ctx.createRadialGradient(m.x, m.y, m.r * 0.4, m.x, m.y, m.r * 6.5);
            mg.addColorStop(0, 'rgba(' + m.c + ',' + (0.28 * m.alpha).toFixed(3) + ')');
            mg.addColorStop(1, 'rgba(' + m.c + ',0)');
            ctx.fillStyle = mg;
            ctx.fillRect(0, 0, W, waterY + 20);
            ctx.fillStyle = 'rgba(' + m.c + ',' + (0.92 * m.alpha).toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.r, 0, TAU);
            ctx.fill();
        }
    }

    // ------------------------------------------------------------------
    // 背景離屏快取 (透明天空，僅預渲染遠景山脈、松林、竹林、懸崖與木屋剪影)
    // ------------------------------------------------------------------
    function buildBackground() {
        bgCv.width = Math.round(W * DPR); bgCv.height = Math.round(H * DPR);
        const g = bgx; g.setTransform(DPR, 0, 0, DPR, 0, 0);
        g.clearRect(0, 0, W, H);
        const rng = mulberry32(hashStr(SC.id));

        // 預生成星星座標供夜間動態閃爍
        starPts = [];
        for (let i = 0; i < 110; i++) {
            starPts.push({
                x: rng() * W,
                y: rng() * waterY * 0.82,
                s: rng() < 0.18 ? 1.8 : 1.1,
                a: 0.22 + rng() * 0.65,
                spd: 1.2 + rng() * 2.5,
                ph: rng() * TAU
            });
        }

        if (SC.mountains) {
            for (let layer = 0; layer < 2; layer++) {
                const baseY = waterY - H * (0.06 + layer * 0.1), amp = H * (0.16 - layer * 0.05);
                g.fillStyle = layer === 0 ? 'rgba(6,16,24,0.92)' : 'rgba(10,26,38,0.72)';
                g.beginPath(); g.moveTo(0, waterY);
                let y = baseY - amp * rng();
                for (let x = 0; x <= W + 40; x += 40) { y = clamp(y + (rng() - 0.5) * amp * 0.55, baseY - amp, baseY); g.lineTo(x, y); }
                g.lineTo(W, waterY); g.closePath(); g.fill();
            }
        }
        // 遠景森林松柏與岸邊灌木剪影
        if (SC.forestTrees) {
            const treeCount = Math.round(W / 42);
            for (let i = 0; i < treeCount; i++) {
                const tx = (i / treeCount) * W + (rng() - 0.5) * 30;
                const th = (48 + rng() * 85) * (H / 900);
                const tw = 16 + rng() * 18;
                g.fillStyle = i % 2 === 0 ? 'rgba(8, 24, 28, 0.72)' : 'rgba(12, 34, 32, 0.6)';
                for (let tier = 0; tier < 3; tier++) {
                    const yTop = waterY - th + tier * (th * 0.25);
                    const yBot = yTop + th * 0.45;
                    const halfW = tw * (0.65 + tier * 0.25);
                    g.beginPath();
                    g.moveTo(tx, yTop);
                    g.lineTo(tx - halfW, yBot);
                    g.lineTo(tx + halfW, yBot);
                    g.closePath();
                    g.fill();
                }
            }
        }
        if (SC.cliff) {
            const cx = W * 0.5, fw = clamp(W * 0.13, 70, 190);
            g.fillStyle = 'rgba(4,10,16,0.96)';
            g.fillRect(cx - fw * 0.9, 0, fw * 1.8, waterY);
            for (let s = -1; s <= 1; s += 2) {
                g.beginPath(); g.moveTo(cx + s * fw * 0.9, 0);
                let x = cx + s * fw * 0.9;
                g.lineTo(x, waterY);
                const edge = s < 0 ? 0 : W;
                g.lineTo(edge, waterY); g.lineTo(edge, H * 0.25);
                for (let k = 0; k <= 6; k++) { const t = k / 6; g.lineTo(edge + (x - edge) * t, H * 0.25 - H * 0.2 * Math.sin(t * Math.PI) * rng()); }
                g.closePath(); g.fillStyle = 'rgba(5,12,19,0.95)'; g.fill();
            }
        }
        if (SC.bamboo) {
            for (let d = 0; d < 3; d++) {
                const cnt = Math.round(W / (110 - d * 26)), wd = 5 + d * 5, al = 0.22 + d * 0.14;
                for (let i = 0; i < cnt; i++) {
                    const x = rng() * W, lean = (rng() - 0.5) * 24;
                    g.strokeStyle = 'rgba(' + (18 + d * 8) + ',' + (60 + d * 22) + ',' + (34 + d * 10) + ',' + al.toFixed(2) + ')';
                    g.lineWidth = wd; g.lineCap = 'butt';
                    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + lean, waterY); g.stroke();
                    g.strokeStyle = 'rgba(' + (60 + d * 25) + ',' + (130 + d * 20) + ',' + (80 + d * 10) + ',' + (al * 0.55).toFixed(2) + ')';
                    g.lineWidth = wd + 2.5;
                    for (let ny = 40 + rng() * 50; ny < waterY; ny += 70 + rng() * 40) {
                        const nx = x + lean * (ny / waterY);
                        g.beginPath(); g.moveTo(nx - wd * 0.5 - 1, ny); g.lineTo(nx + wd * 0.5 + 1, ny); g.stroke();
                    }
                    g.fillStyle = 'rgba(' + (40 + d * 20) + ',' + (105 + d * 25) + ',' + (60 + d * 12) + ',' + (al * 0.82).toFixed(2) + ')';
                    for (let k = 0; k < 6; k++) {
                        const ly = rng() * waterY * 0.55, lx = x + lean * (ly / waterY), dir = rng() < 0.5 ? -1 : 1;
                        g.save(); g.translate(lx, ly); g.rotate(dir * (0.5 + rng() * 0.8));
                        g.beginPath(); g.ellipse(dir * 22, 0, 24, 3.2, 0, 0, TAU); g.fill(); g.restore();
                    }
                }
            }
        }
        // 岸邊背景灌木與苔石叢
        if (!SC.ocean) {
            const bushCnt = Math.round(W / 65);
            for (let i = 0; i < bushCnt; i++) {
                const bx = (i / bushCnt) * W + (rng() - 0.5) * 35;
                const br = 18 + rng() * 26;
                g.fillStyle = 'rgba(15, 42, 30, 0.55)';
                g.beginPath();
                g.arc(bx, waterY + 2, br, Math.PI, 0, false);
                g.fill();
            }
        }
        if (SC.hut) {
            const s = clamp(W / 1400, 0.6, 1.2), hx = W * (W < 760 ? 0.72 : 0.78), by = waterY;
            const glow = g.createRadialGradient(hx - 30 * s, by - 48 * s, 4, hx - 30 * s, by - 48 * s, 130 * s);
            glow.addColorStop(0, 'rgba(255,190,90,0.38)'); glow.addColorStop(1, 'rgba(255,190,90,0)');
            g.fillStyle = glow; g.fillRect(hx - 190 * s, by - 190 * s, 380 * s, 260 * s);
            g.fillStyle = '#1b130c'; g.fillRect(hx - 75 * s, by - 80 * s, 150 * s, 80 * s);
            g.fillStyle = 'rgba(0,0,0,0.25)';
            for (let x = hx - 75 * s; x < hx + 75 * s; x += 10 * s) g.fillRect(x, by - 80 * s, 1.5, 80 * s);
            g.fillStyle = '#0d0907';
            g.beginPath(); g.moveTo(hx - 104 * s, by - 76 * s); g.lineTo(hx, by - 138 * s); g.lineTo(hx + 104 * s, by - 76 * s); g.closePath(); g.fill();
            const wg = g.createLinearGradient(0, by - 62 * s, 0, by - 34 * s);
            wg.addColorStop(0, '#ffd27a'); wg.addColorStop(1, '#e8903a');
            g.fillStyle = wg; g.fillRect(hx - 48 * s, by - 62 * s, 30 * s, 28 * s);
            g.fillStyle = '#1b130c'; g.fillRect(hx - 34 * s, by - 62 * s, 2, 28 * s); g.fillRect(hx - 48 * s, by - 49 * s, 30 * s, 2);
            g.fillStyle = '#0d0907'; g.fillRect(hx + 18 * s, by - 52 * s, 24 * s, 52 * s);
            g.fillStyle = '#120c08'; g.fillRect(hx - 90 * s, by - 6 * s, 180 * s, 6 * s);
            g.fillRect(hx - 88 * s, by - 40 * s, 4 * s, 36 * s); g.fillRect(hx + 84 * s, by - 40 * s, 4 * s, 36 * s);
        }
        stones = [];
        if (SC.rimStone) { const r2 = mulberry32(77); for (let x = -10; x < W + 40; x += 34) stones.push({ x: x + r2() * 10, w: 22 + r2() * 20, h: 9 + r2() * 8, c: 28 + Math.floor(r2() * 26) }); }

        const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.82);
        v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.45)');
        g.fillStyle = v; g.fillRect(0, 0, W, H);
    }

    function drawTerrainWithTransition(atm) {
        if (solarTrans.active && solarTrans.hasPrevBg) {
            const u = clamp(solarTrans.t / solarTrans.dur, 0, 1);
            const fade = smoothstep01(u);
            ctx.save();
            ctx.globalAlpha = 1 - fade;
            ctx.drawImage(prevBgCv, 0, 0, W, H);
            ctx.globalAlpha = fade;
            ctx.drawImage(bgCv, 0, 0, W, H);
            ctx.restore();
        } else {
            ctx.drawImage(bgCv, 0, 0, W, H);
        }

        // 晨曦 / 晚霞 / 晴晝對竹林與遠山的環境光染色層
        if (atm.dawnGlow > 0.02 || atm.duskGlow > 0.02) {
            const warmA = Math.max(atm.dawnGlow, atm.duskGlow) * 0.14;
            ctx.fillStyle = atm.duskGlow > atm.dawnGlow
                ? 'rgba(255, 200, 80, ' + warmA.toFixed(3) + ')'
                : 'rgba(255, 165, 95, ' + warmA.toFixed(3) + ')';
            ctx.fillRect(0, 0, W, waterY);
        } else if (atm.dayFactor > 0.25) {
            ctx.fillStyle = 'rgba(180, 235, 255, ' + (atm.dayFactor * 0.07).toFixed(3) + ')';
            ctx.fillRect(0, 0, W, waterY);
        }
    }

    // ------------------------------------------------------------------
    // 水體繪製 (隨日出/正午/日落/星夜動態折射與倒影)
    // ------------------------------------------------------------------
    function updateTargets() {
        if (SC.ocean) {
            for (let i = 0; i < N; i++) {
                const x = px[i];
                tg[i] = waterY + Math.sin(T * 1.1 + x * 0.006) * 7 + Math.sin(T * 0.7 + x * 0.0021 + 1.3) * 5;
            }
        }
    }
    function drawWater(atm) {
        const wc = SC.water;
        const bp = new Path2D();
        for (let i = 0; i < N; i += 2) {
            const x = px[i], y = py[i] * 0.5 + waterY * 0.5 - 5 + Math.sin(T * 0.9 + x * 0.011) * 2.5;
            if (i === 0) bp.moveTo(x, y); else bp.lineTo(x, y);
        }
        bp.lineTo(W, H); bp.lineTo(0, H); bp.closePath();
        ctx.fillStyle = wc.back; ctx.fill(bp);

        const fp = new Path2D();
        fp.moveTo(px[0], py[0]);
        for (let i = 1; i < N - 1; i++) fp.quadraticCurveTo(px[i], py[i], (px[i] + px[i + 1]) / 2, (py[i] + py[i + 1]) / 2);
        fp.lineTo(px[N - 1], py[N - 1]);
        const line = new Path2D(fp);
        fp.lineTo(W, H); fp.lineTo(0, H); fp.closePath();
        ctx.fillStyle = waterGrad; ctx.fill(fp);

        // 日出/日落/晴晝水面環境天光倒影染色
        if (atm) {
            const warmGlow = Math.max(atm.dawnGlow, atm.duskGlow);
            if (warmGlow > 0.02) {
                const wg = ctx.createLinearGradient(0, waterY - 10, 0, H);
                const cStr = atm.duskGlow > atm.dawnGlow ? '255, 200, 80' : '255, 208, 110';
                wg.addColorStop(0, 'rgba(' + cStr + ',' + (warmGlow * 0.34).toFixed(3) + ')');
                wg.addColorStop(0.65, 'rgba(' + cStr + ',' + (warmGlow * 0.10).toFixed(3) + ')');
                wg.addColorStop(1, 'rgba(' + cStr + ',0)');
                ctx.fillStyle = wg;
                ctx.fill(fp);
            } else if (atm.dayFactor > 0.15) {
                const dg = ctx.createLinearGradient(0, waterY - 10, 0, H);
                dg.addColorStop(0, 'rgba(130, 220, 245,' + (atm.dayFactor * 0.24).toFixed(3) + ')');
                dg.addColorStop(1, 'rgba(30, 95, 135, 0)');
                ctx.fillStyle = dg;
                ctx.fill(fp);
            }
        }

        // 水下光斑 (焦散，白晝時更清澈明亮)
        const causticBoost = atm ? (1 + atm.dayFactor * 0.65) : 1;
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,' + (wc.caustic * causticBoost).toFixed(3) + ')';
        const wh = H - waterY;
        for (let k = 0; k < 6; k++) {
            const by = waterY + 26 + k * (wh - 40) / 6;
            ctx.beginPath();
            for (let x = 0; x <= W; x += 28) {
                const y = by + Math.sin(T * (0.6 + k * 0.08) + x * 0.012 + k * 1.7) * 5;
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // 水底水草、珊瑚與水下生物層
        drawUnderwaterFlora();
        drawMinnows();
        drawJellyfish();
        drawTurtles();

        ctx.lineJoin = 'round';
        ctx.strokeStyle = wc.glow; ctx.lineWidth = 7; ctx.stroke(line);
        ctx.strokeStyle = wc.surf; ctx.lineWidth = 2; ctx.stroke(line);
    }
    function drawFlow(atm) {
        if (SC.current > 0) {
            ctx.strokeStyle = 'rgba(210,240,255,0.14)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
            ctx.beginPath();
            const wh = H - waterY - 24;
            for (let i = 0; i < 18; i++) {
                const x = ((i * 97 + T * SC.current * (50 + (i % 5) * 18)) % (W + 240)) - 120;
                const y = waterY + 10 + ((i * 37) % Math.max(20, wh));
                ctx.moveTo(x, y); ctx.lineTo(x + 36 + (i % 4) * 22, y);
            }
            ctx.stroke();
        }
        // 太陽水面波光倒影帶 (日出/晴晝/日落跟隨太陽 X 座標閃耀)
        if (atm && atm.sun && atm.sun.alpha > 0.04) {
            const sx = atm.sun.x;
            const sc = atm.sun.col;
            for (let i = 0; i < 15; i++) {
                const y = waterY + 4 + i * 8.5;
                if (y >= H - 18) break;
                const wdt = (18 + i * 5.5 + Math.sin(T * 1.8 + i) * 7) * (1.25 - atm.sun.arc * 0.35);
                const al = (0.44 - i * 0.026) * atm.sun.alpha;
                if (al <= 0.01) continue;
                ctx.fillStyle = rgbCss(sc, al);
                ctx.fillRect(sx - wdt / 2 + Math.sin(T * 1.4 + i * 0.8) * 5, y, wdt, 2.2);
            }
        }
        // 月亮水面波光倒影帶 (夜間跟隨月亮 X 座標)
        if (atm && atm.moon && atm.moon.alpha > 0.04) {
            const mx = atm.moon.x;
            for (let i = 0; i < 14; i++) {
                const y = waterY + 4 + i * 8;
                if (y >= H - 18) break;
                const wdt = 16 + i * 5 + Math.sin(T * 1.6 + i) * 6;
                const al = (0.38 - i * 0.025) * atm.moon.alpha;
                if (al <= 0.01) continue;
                ctx.fillStyle = 'rgba(220,238,255,' + al.toFixed(3) + ')';
                ctx.fillRect(mx - wdt / 2 + Math.sin(T * 1.2 + i * 0.8) * 5, y, wdt, 2);
            }
        }
    }
    function drawRim() {
        if (SC.rimWood) {
            ctx.fillStyle = '#4a2c18'; ctx.fillRect(0, H - 18, W, 18);
            ctx.fillStyle = 'rgba(130,86,52,0.7)'; ctx.fillRect(0, H - 18, W, 3);
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            for (let x = 0; x < W; x += 120) ctx.fillRect(x, H - 18, 2, 18);
        }
        if (SC.rimStone) {
            for (const s of stones) {
                ctx.fillStyle = 'rgb(' + s.c + ',' + (s.c + 8) + ',' + (s.c + 14) + ')';
                ctx.beginPath(); ctx.ellipse(s.x + s.w / 2, H - s.h * 0.4, s.w, s.h, 0, 0, TAU); ctx.fill();
            }
        }
    }

    // ------------------------------------------------------------------
    // 場景構建 / 尺寸
    // ------------------------------------------------------------------
    function rebuildScene() {
        waterGrad = ctx.createLinearGradient(0, waterY - 30, 0, H);
        waterGrad.addColorStop(0, SC.water.g0); waterGrad.addColorStop(1, SC.water.g1);
        for (let i = 0; i < N; i++) { tg[i] = waterY; }
        if (SC.fall) initFall();
        buildBackground();
        initHangingFlora();
        initReeds();
        initLotusPads();
        initUnderwaterFlora();
        initRain();
        initLeaves();
        initMist();
        initFlies();
        initDragonflies();
        initFrogs();
        initStriders();
        initMinnows();
        initJellyfish();
        initTurtles();
        initBirds();
        rn = 0; sn = 0; flash = 0; boltT = 0; nextBolt = rnd(2, 5);
        initFishes();
    }
    function resize() {
        W = Math.max(320, window.innerWidth); H = Math.max(320, window.innerHeight);
        DPR = dprCap;
        canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        waterY = H * 0.72; G = 1000 * (H / 900);
        initWaterArrays();
        rebuildScene();
    }
    let resizeTimer = 0;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 120); });

    // ------------------------------------------------------------------
    // 音效：無縫循環交叉淡化
    // ------------------------------------------------------------------
    const Audio2 = (function () {
        const XF = 2.0, FADE = 1.2;
        const players = {};
        let master = 0.75, muted = false, unlocked = false, current = null;
        const status = (t) => { const el = $('hudAudioStatus'); if (el) el.textContent = t; };

        // ---- 全景聲 (3D 環繞)：HRTF 空間化，環境音緩慢繞場、蟲鳴在四周飛移 ----
        let ac = null, spatialOK = false, bugBus = null, spatialT = 0, curScene = null;
        const orbiters = [];
        function initSpatial() {
            if (ac) return;
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            ac = new AC();
            spatialOK = /^https?:$/.test(location.protocol); // file:// 會令 MediaElementSource 靜音，故退回普通播放
            const L = ac.listener;
            if (L.positionX) { L.positionX.value = 0; L.positionY.value = 0; L.positionZ.value = 0; L.forwardX.value = 0; L.forwardY.value = 0; L.forwardZ.value = -1; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; }
            bugBus = ac.createGain(); bugBus.gain.value = 0; bugBus.connect(ac.destination);
            for (const id in players) for (const e of [players[id].a, players[id].b]) if (e) attachSpatial(e);
            scheduleBug();
        }
        function mkPanner() {
            const p = ac.createPanner();
            p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 3; p.rolloffFactor = 0.6;
            return p;
        }
        function attachSpatial(e) {
            if (!ac || !spatialOK || e._sp) return;
            try {
                const src = ac.createMediaElementSource(e), pn = mkPanner();
                src.connect(pn); pn.connect(ac.destination);
                e._sp = pn; orbiters.push({ pn, ph: Math.random() * 6.283, sp: 0.12 + Math.random() * 0.08, r: 4 + Math.random() * 2, bob: Math.random() * 6 });
            } catch (err) { /* ignore */ }
        }
        function setPos(pn, x, y, z, t) {
            if (pn.positionX) { pn.positionX.setTargetAtTime(x, ac.currentTime, t || 0.05); pn.positionY.setTargetAtTime(y, ac.currentTime, t || 0.05); pn.positionZ.setTargetAtTime(z, ac.currentTime, t || 0.05); }
            else pn.setPosition(x, y, z);
        }
        function spatialTick(dt) {
            if (!ac) return;
            spatialT += dt;
            for (const o of orbiters) {
                const a = o.ph + spatialT * o.sp;
                setPos(o.pn, Math.sin(a) * o.r, Math.sin(spatialT * 0.3 + o.bob) * 1.2, Math.cos(a) * o.r, 0.12);
            }
            if (bugBus) {
                const want = (!muted && curScene && curScene.fireflies > 0) ? master * 0.5 : 0;
                bugBus.gain.setTargetAtTime(want, ac.currentTime, 0.4);
            }
        }
        function chirp(x0, z0, x1, z1) {
            const t0 = ac.currentTime + 0.02, pn = mkPanner(), g = ac.createGain();
            const dur = 1.2 + Math.random() * 1.6;
            const pulses = 3 + Math.floor(Math.random() * 4), gap = 0.085 + Math.random() * 0.03;
            const f = 3800 + Math.random() * 1500;
            const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f;
            g.gain.value = 0;
            o.connect(g); g.connect(pn); pn.connect(bugBus);
            const y = (Math.random() - 0.3) * 2;
            if (pn.positionX) {
                pn.positionX.setValueAtTime(x0, t0); pn.positionY.setValueAtTime(y, t0); pn.positionZ.setValueAtTime(z0, t0);
                pn.positionX.linearRampToValueAtTime(x1, t0 + dur); pn.positionZ.linearRampToValueAtTime(z1, t0 + dur);
            } else pn.setPosition(x0, y, z0);
            const chirps = Math.floor(dur / (pulses * gap + 0.25)) + 1;
            for (let c = 0; c < chirps; c++) for (let i = 0; i < pulses; i++) {
                const s = t0 + c * (pulses * gap + 0.25) + i * gap;
                g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.06, s + 0.012); g.gain.linearRampToValueAtTime(0, s + 0.05);
            }
            o.start(t0); o.stop(t0 + dur + 0.1);
            o.onended = () => { try { o.disconnect(); g.disconnect(); pn.disconnect(); } catch (err) { } };
        }
        function scheduleBug() {
            if (ac && ac.state === 'running' && unlocked && !muted && curScene && curScene.fireflies > 0) {
                const a0 = Math.random() * 6.283, sweep = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random() * 2.2), r = 2 + Math.random() * 4;
                chirp(Math.sin(a0) * r, Math.cos(a0) * r, Math.sin(a0 + sweep) * r, Math.cos(a0 + sweep) * r);
            }
            setTimeout(scheduleBug, 350 + Math.random() * 1100);
        }

        function mkEl(src) {
            const e = new Audio();
            e.preload = 'auto'; e.loop = false; e.src = src; e.volume = 0; e._env = 0; e._goal = 0;
            attachSpatial(e);
            e.addEventListener('playing', () => status(muted ? 'MUTED // SILENT' : 'ONLINE // LOOPING'));
            e.addEventListener('waiting', () => status('BUFFERING'));
            e.addEventListener('error', () => status('FILE ERROR'));
            return e;
        }
        function getPlayer(sc) {
            let p = players[sc.id];
            if (!p) { p = players[sc.id] = { sc, a: mkEl(sc.audioSrc), b: null, cur: null, env: 0, goal: 0 }; p.cur = p.a; }
            return p;
        }
        function safePlay(e) { const pr = e.play(); if (pr && pr.catch) pr.catch(() => status('CLICK TO ENABLE AUDIO')); }
        function startPlayer(p) {
            p.goal = 1; const e = p.cur; e._goal = 1;
            if (e.paused) safePlay(e);
        }
        function tick() {
            const dt = 0.05;
            spatialTick(dt);
            for (const id in players) {
                const p = players[id];
                p.env = clamp(p.env + (p.goal > p.env ? 1 : -1) * dt / FADE, 0, 1);
                const els = p.b ? [p.a, p.b] : [p.a];
                for (const e of els) {
                    e._env = clamp(e._env + (e._goal > e._env ? 1 : -1) * dt / XF, 0, 1);
                    e.volume = clamp(muted ? 0 : e._env * p.env * master, 0, 1);
                    if (e._env === 0 && e._goal === 0 && !e.paused) e.pause();
                }
                if (p.goal === 0 && p.env === 0) for (const e of els) if (!e.paused) e.pause();
                if (p.goal === 1 && p.cur && isFinite(p.cur.duration) && p.cur.duration > XF * 2 && !p.cur.paused &&
                    p.cur.duration - p.cur.currentTime < XF) {
                    if (!p.b) p.b = mkEl(p.sc.audioSrc);
                    const other = p.cur === p.a ? p.b : p.a;
                    if (other.paused) {
                        other.currentTime = 0; other._goal = 1; p.cur._goal = 0; const old = p.cur; p.cur = other; safePlay(other);
                        old._goal = 0;
                    }
                }
            }
        }
        setInterval(tick, 50);
        return {
            unlock() { if (unlocked) return; unlocked = true; initSpatial(); if (ac && ac.state !== 'running') ac.resume(); if (current) startPlayer(current); },
            play(sc) {
                const next = getPlayer(sc);
                if (current && current !== next) { current.goal = 0; current.a._goal = 0; if (current.b) current.b._goal = 0; }
                current = next; curScene = sc;
                if (unlocked) startPlayer(next); else status('CLICK TO ENABLE AUDIO');
            },
            setVolume(v) { master = clamp(parseFloat(v), 0, 1); },
            toggleMute() { muted = !muted; status(muted ? 'MUTED // SILENT' : 'ONLINE // LOOPING'); return !muted; },
            isUnlocked() { return unlocked; }
        };
    })();

    // ------------------------------------------------------------------
    // 主循環
    // ------------------------------------------------------------------
    let last = performance.now(), ema = 16.7, frames = 0, lastAdapt = 0, fpsT = 0, fpsN = 0;
    function frame(now) {
        requestAnimationFrame(frame);
        let raw = (now - last) / 1000; last = now;
        if (raw <= 0) return;
        const dt = Math.min(raw, 0.05);
        const sdt = dt * SPEEDS[speedIdx].f;
        T += sdt;

        // 更新日夜循環與「日出⇄日落」場景切換動效 (以真實秒數推進週期)
        updateSolar(dt);
        const atm = computeSolarAtmosphere();

        // 自適應畫質
        ema = ema * 0.95 + raw * 1000 * 0.05; frames++;
        if (frames > 120 && ema > 24 && now - lastAdapt > 2500) {
            lastAdapt = now;
            if (quality > 0.5) { quality = Math.max(0.5, quality - 0.15); initRain(); }
            else if (dprCap > 1) { dprCap = 1; resize(); }
        }
        fpsT += raw; fpsN++;
        if (fpsT >= 0.5) { const el = $('hudWaveStatus'); if (el) el.textContent = 'SPRING ' + Math.round(fpsN / fpsT) + 'FPS'; fpsT = 0; fpsN = 0; }

        // 物理 (固定步長)
        updateTargets();
        acc += sdt; let n = 0;
        while (acc >= H_STEP && n < 16) { stepWater(); acc -= H_STEP; n++; }
        if (n === 16) acc = 0;

        // 實體與生態更新
        updateRain(sdt);
        if (SC.fall) updateFall(sdt);
        updateLeaves(sdt);
        updateBirds(sdt);
        updateDragonflies(sdt);
        updateFrogs(sdt);
        updateStriders(sdt);
        updateMinnows(sdt);
        updateJellyfish(sdt);
        updateTurtles(sdt);
        for (const f of fishes) f.update(sdt);
        updateRipples(sdt); updateSplash(sdt); updateMist(sdt); updateLightning(sdt);

        // 繪製順序：動態天空與日月星辰 -> 遠山/竹林/木屋剪影(含切換淡入淡出) -> 遠空飛鳥 -> 雲霧 -> 瀑布 -> 岸邊蘆葦 -> 垂柳/藤蔓 -> 螢火蟲 -> 雨滴 -> 水體 -> 水紋與日月倒影 -> 躍魚 -> 睡蓮荷葉 -> 青蛙 -> 水黽 -> 落葉 -> 漣漪 -> 水花 -> 蜻蜓 -> 池緣 -> 閃電
        drawSkyAndCelestial(atm);
        drawTerrainWithTransition(atm);
        drawBirds();
        drawMist();
        if (SC.fall) drawFall();
        drawReeds();
        drawHangingFlora();
        drawFlies();
        drawRain();
        drawWater(atm);
        drawFlow(atm);
        for (const f of fishes) f.draw();
        drawLotusPads();
        drawFrogs();
        drawStriders();
        drawLeaves();
        drawRipples();
        drawSplash();
        drawDragonflies();
        drawRim();
        drawLightning();
        applyLightGrade(atm);

        // 賽博時鐘掛件更新 (同步當下時間與面孔)
        updateClock();
    }

    // ------------------------------------------------------------------
    // 場景切換 / UI 主題動態變色
    // ------------------------------------------------------------------
    // ------------------------------------------------------------------
    // 全域光照調色：畫面所有物件 + 時鐘/介面文字 跟隨日出/正午/日落/夜晚光色
    // ------------------------------------------------------------------
    let lightUiT = 0;
    function lightTint(atm) {
        const day = [255, 255, 255], warm = [255, 218, 130], night = [128, 150, 205];
        const w = Math.max(atm.dawnGlow, atm.duskGlow);
        let c = lerpRgb(night, day, clamp(atm.dayFactor * 1.2, 0, 1));
        c = lerpRgb(c, warm, clamp(w * 1.1, 0, 1));
        return c;
    }
    function applyLightGrade(atm) {
        if (!atm) return;
        const c = lightTint(atm);
        const w = Math.max(atm.dawnGlow, atm.duskGlow);
        // 1) 乘色：所有帶色物體（竹子、木屋、魚、植物…）染上當下光色
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')';
        ctx.globalAlpha = 0.6;
        ctx.fillRect(0, 0, W, H);
        // 2) 晨昏暖光疊加
        if (w > 0.02) {
            ctx.globalCompositeOperation = 'soft-light';
            ctx.globalAlpha = w * 0.5;
            ctx.fillStyle = 'rgb(255,200,90)';
            ctx.fillRect(0, 0, W, H);
        }
        ctx.restore();
        // 3) 介面 / 時鐘字體顏色
        const now = performance.now();
        if (now - lightUiT < 33) return;
        lightUiT = now;
        const u = SC.ui; if (!u) return;
        const base = hexToRgb(u.accent);
        const k = 0.45 + w * 0.35;
        const a = lerpRgb(base, c[0] + c[1] + c[2] > 600 ? lerpRgb(base, [255, 214, 120], 0.5) : c, k * 0.6);
        const ar = a.map(v => Math.round(v)).join(', ');
        const hex = '#' + a.map(v => ('0' + Math.round(v).toString(16)).slice(-2)).join('');
        let cc = lerpRgb([140, 178, 255], [255, 252, 236], clamp(atm.dayFactor * 1.25, 0, 1));
        cc = lerpRgb(cc, [255, 190, 70], clamp(w * 1.15, 0, 1));
        const wt = cc;
        const mu = lerpRgb(hexToRgb(u.muted), c, 0.35).map(v => Math.round(v));
        const r = document.documentElement.style;
        const chex = '#' + cc.map(v => ('0' + Math.round(v).toString(16)).slice(-2)).join('');
        r.setProperty('--chrono-pink', chex);
        r.setProperty('--chrono-border', hex);
        r.setProperty('--chrono-rgb', cc.join(', '));
        r.setProperty('--chrono-pink-glow', 'rgba(' + ar + ', 0.38)');
        r.setProperty('--chrono-pink-dim', 'rgba(' + ar + ', 0.36)');
        r.setProperty('--chrono-pink-faint', 'rgba(' + ar + ', 0.08)');
        r.setProperty('--chrono-badge-bg', 'rgba(' + ar + ', 0.22)');
        r.setProperty('--chrono-white', 'rgb(' + wt.join(',') + ')');
        r.setProperty('--chrono-text', 'rgb(' + lerpRgb([226, 232, 240], cc, 0.6).map(v => Math.round(v)).join(',') + ')');
        r.setProperty('--chrono-text-muted', 'rgb(' + mu.join(',') + ')');
    }
    function applyUITheme(sc) {
        if (!sc || !sc.ui) return;
        const u = sc.ui;
        const root = document.documentElement.style;
        root.setProperty('--chrono-pink', u.accent);
        root.setProperty('--chrono-border', u.accent);
        root.setProperty('--chrono-rgb', u.rgb);
        root.setProperty('--chrono-pink-glow', 'rgba(' + u.rgb + ', 0.38)');
        root.setProperty('--chrono-pink-dim', 'rgba(' + u.rgb + ', 0.36)');
        root.setProperty('--chrono-pink-faint', 'rgba(' + u.rgb + ', 0.08)');
        root.setProperty('--chrono-badge-bg', 'rgba(' + u.rgb + ', 0.22)');
        root.setProperty('--chrono-badge-text', u.badgeText);
        root.setProperty('--chrono-bg', u.bg);
        root.setProperty('--chrono-text-muted', u.muted);
        const badge = $('hudStatusBadge');
        if (badge && u.tag) badge.textContent = u.tag;
    }

    function setScene(i) {
        const nextIdx = (i + SCENES.length) % SCENES.length;
        const shouldAnimateTransition = bootComplete;
        if (shouldAnimateTransition) {
            startSolarTransition(true);
        }
        sceneIdx = nextIdx;
        SC = SCENES[sceneIdx];
        applyUITheme(SC);
        $('hudSceneName').textContent = SC.shortName;
        const ecoEl = $('hudEcoStatus');
        if (ecoEl) ecoEl.textContent = SC.ecoDesc;
        document.querySelectorAll('.scene-item-btn').forEach((b, k) => b.classList.toggle('active', k === sceneIdx));
        rebuildScene();
        Audio2.play(SC);
    }
    function cycleSpeed() {
        speedIdx = (speedIdx + 1) % SPEEDS.length;
        $('speedLabel').textContent = SPEEDS[speedIdx].label;
        $('hudSpeedName').textContent = SPEEDS[speedIdx].name;
    }

    function setupUI() {
        const list = $('sceneListContainer'); list.innerHTML = '';
        SCENES.forEach((s, i) => {
            const li = document.createElement('li'), b = document.createElement('button');
            b.className = 'chrono-btn scene-item-btn' + (i === 0 ? ' active' : '');
            b.innerHTML = '<span>' + s.name + '</span><span class="shortcut">0' + (i + 1) + '</span>';
            b.addEventListener('click', () => setScene(i));
            li.appendChild(b); list.appendChild(li);
        });
        const sceneHud = $('sceneHud'), mainHud = $('mainHud'), btnHud = $('btnToggleHud');
        $('speedLabel').textContent = SPEEDS[speedIdx].label;
        $('hudSpeedName').textContent = SPEEDS[speedIdx].name;
        $('btnSpeedToggle').addEventListener('click', cycleSpeed);
        $('btnCycleTheme').addEventListener('click', () => setScene(sceneIdx + 1));
        $('btnToggleScenes').addEventListener('click', () => sceneHud.classList.toggle('collapsed'));

        // 日出⇄日落轉場動效按鈕
        const btnSolarTrans = $('btnSolarTransition');
        if (btnSolarTrans) {
            btnSolarTrans.addEventListener('click', () => startSolarTransition(false));
        }

        // 手動拉桿調整日出/正午/日落/深夜
        const solarSlider = $('solarSlider');
        if (solarSlider) {
            solarSlider.addEventListener('pointerdown', () => { isDraggingSolar = true; solarTrans.active = false; });
            window.addEventListener('pointerup', () => { isDraggingSolar = false; });
            solarSlider.addEventListener('input', (e) => {
                solarTrans.active = false;
                dayPhase = clamp(parseFloat(e.target.value), 0, 0.9999);
                syncSolarUI(true);
            });
        }

        // 10 段循環週期按鍵 (1hr, 40min, 30min, 15min, 10min, 7min, 5min, 3min, 1min, 30sec)
        const cycleGrid = $('cycleBtnGrid');
        if (cycleGrid) {
            const cycleBtns = cycleGrid.querySelectorAll('.chrono-cycle-btn');
            cycleBtns.forEach((btn) => {
                btn.addEventListener('click', () => {
                    cycleBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    cycleDurationSec = parseFloat(btn.getAttribute('data-sec')) || 180;
                    cycleLabelText = btn.textContent.trim();
                    const lbl = $('cyclePeriodLabel');
                    if (lbl) lbl.textContent = cycleLabelText;
                    syncSolarUI(true);
                });
            });
        }

        $('btnAudioToggle').addEventListener('click', () => {
            const on = Audio2.toggleMute();
            $('audioLabel').textContent = on ? 'AUDIO: PLAYING' : 'AUDIO: MUTED';
        });
        $('volumeSlider').addEventListener('input', (e) => { Audio2.setVolume(e.target.value); $('volumeValue').textContent = Math.round(e.target.value * 100) + '%'; });
        $('btnSpawnFish').addEventListener('click', spawnFish);
        const btnEco = $('btnTriggerEco');
        if (btnEco) btnEco.addEventListener('click', triggerWildlifeAction);
        const btnReload = $('btnReloadPage');
        if (btnReload) btnReload.addEventListener('click', () => location.reload());

        // 時鐘控制 (切換樣式、大小拉桿、重設位置)
        const btnCycleClk = $('btnCycleClock');
        if (btnCycleClk) btnCycleClk.addEventListener('click', () => cycleClockFace(1));
        const clkScaleSlider = $('clockScaleSlider');
        if (clkScaleSlider) {
            clkScaleSlider.addEventListener('input', (e) => {
                setClockScale(parseFloat(e.target.value));
            });
        }
        const btnResetClk = $('btnResetClockPos');
        if (btnResetClk) {
            btnResetClk.addEventListener('click', () => {
                resetClockPosAndScale();
            });
        }
        const btnGlass = $('btnToggleGlassBlur');
        if (btnGlass) {
            btnGlass.addEventListener('click', () => {
                toggleGlassBlur();
            });
        }
        const btnShape = $('btnCycleGlassShape');
        if (btnShape) {
            btnShape.addEventListener('click', () => {
                cycleGlassShape();
            });
        }

        const statusHud = $('statusHud');
        let hudOn = false;
        function updateHudDisplay() {
            mainHud.classList.toggle('hidden', !hudOn);
            if (!hudOn) sceneHud.classList.add('collapsed');
            if (statusHud) statusHud.classList.toggle('active', hudOn);
            btnHud.textContent = hudOn ? 'HIDE HUD [H]' : 'SHOW HUD [H]';
        }
        function toggleHud() {
            hudOn = !hudOn;
            updateHudDisplay();
        }
        btnHud.addEventListener('click', toggleHud);
        updateHudDisplay();
        window.addEventListener('keydown', (e) => {
            const tg = e.target;
            if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'SELECT' || tg.tagName === 'TEXTAREA')) return;
            const k = e.key.toLowerCase();
            // WASD 控制邏輯：W/S 切換時鐘樣式，A/D 切換場景主題 (與原 Z64 一致)
            if (k === 'w') { e.preventDefault(); cycleClockFace(1); }
            else if (k === 's') { e.preventDefault(); cycleClockFace(-1); }
            else if (k === 'd') { e.preventDefault(); setScene(sceneIdx + 1); }
            else if (k === 'a') { e.preventDefault(); setScene(sceneIdx - 1); }
            else if (k === 'b') { e.preventDefault(); toggleGlassBlur(); }
            else if (k === 'g') { e.preventDefault(); cycleGlassShape(); }
            else if (k === 't') setScene(sceneIdx + 1);
            else if (k === 'x') startSolarTransition(false);
            else if (k === 'v') cycleSpeed();
            else if (k === 'm') $('btnAudioToggle').click();
            else if (k === 'f') spawnFish();
            else if (k === 'c') triggerWildlifeAction();
            else if (k === 'h' || k === 'tab') { if (k === 'tab') e.preventDefault(); toggleHud(); }
            else if (k >= '1' && k <= '7') setScene(parseInt(k, 10) - 1);
        });
        const unlock = () => Audio2.unlock();
        ['pointerdown', 'keydown', 'touchend'].forEach(ev => window.addEventListener(ev, unlock, { passive: true }));
        syncSolarUI(true);
    }

    // ------------------------------------------------------------------
    // 指標互動 (限幅衝量 + 驚動附近青蛙與魚群)
    // ------------------------------------------------------------------
    let lastPX = null, lastPY = null, lastRipT = 0;
    const isHud = (t) => t && t.closest && t.closest('.chrono-hud, .scene-selector-hud, .hud-toggle-btn, .status-hud, .chrono-clock-stage');
    function pointerMove(x, y, target) {
        if (isHud(target)) { lastPX = null; return; }
        if (y >= waterY - 60 && y <= H) {
            const d = lastPX === null ? 0 : Math.hypot(x - lastPX, y - lastPY);
            const imp = Math.min(2.5, 0.25 + d * 0.06);
            kick(x, imp);
            const now = performance.now();
            if (d > 6 && now - lastRipT > 90) { lastRipT = now; addRipple(x, surfaceAt(x), 40, 0.45); }
            if (d > 25 && Math.random() < 0.4 && sn < SMAX - 40) spawnSplash(x, surfaceAt(x), 2, 22);
            // 游標靠近荷葉上的青蛙時會讓青蛙受驚跳水
            for (const f of frogs) {
                if (f.state === 'sit' && Math.hypot(x - f.x, y - f.y) < 55) {
                    triggerFrogJump(f);
                }
            }
        }
        lastPX = x; lastPY = y;
    }
    window.addEventListener('mousemove', (e) => pointerMove(e.clientX, e.clientY, e.target));
    window.addEventListener('touchmove', (e) => { if (e.touches[0]) pointerMove(e.touches[0].clientX, e.touches[0].clientY, e.target); }, { passive: true });
    window.addEventListener('click', (e) => {
        if (isHud(e.target)) return;
        const sy = surfaceAt(e.clientX);
        kick(e.clientX, 6); addRipple(e.clientX, sy, 100, 0.8); spawnSplash(e.clientX, sy, 9, 55);
        startleMinnows(e.clientX);
        for (const f of frogs) {
            if (f.state === 'sit' && Math.abs(e.clientX - f.x) < 110) triggerFrogJump(f);
        }
    });
    document.addEventListener('visibilitychange', () => { last = performance.now(); });

    // ------------------------------------------------------------------
    // Z64 賽博時鐘模組 (6 款經典錶盤、WASD 切換、色彩跟隨當前主題與日照)
    // ------------------------------------------------------------------
    const CLOCK_FACES = [
        { id: 'MAGNA', name: '01 MAGNA', key: 'PRIMARY DISPLAY' },
        { id: 'VECTOR', name: '02 VECTOR', key: 'TERMINAL' },
        { id: 'SYNCRO', name: '03 SYNCRO', key: 'ANALOG CORE' },
        { id: 'ORBIT', name: '04 ORBIT', key: 'PROGRESS RING' },
        { id: 'ARRAY', name: '05 ARRAY', key: 'SEVEN-SEGMENT' },
        { id: 'SIGNET', name: '06 SIGNET', key: 'DATE HERO' }
    ];
    let clockFaceIdx = 5;
    let clockPainter = null;
    let clockPrev = null;

    const DOW3 = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const DOWF = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const MON3 = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const SEG7_MAP = {
        '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg',
        '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg'
    };
    const pad2 = (n) => (n < 10 ? '0' : '') + n;

    function getClockReading() {
        const d = new Date();
        const y = d.getFullYear(), mo = d.getMonth(), day = d.getDate(), dow = d.getDay();
        const h24 = d.getHours(), h12 = (h24 % 12) || 12;
        const mm = d.getMinutes(), ss = d.getSeconds(), ms = d.getMilliseconds();
        const secF = ss + ms / 1000;
        return {
            y, mo, day, dow,
            h24, h12, mm, ss, secF,
            hh24: pad2(h24), hh12: pad2(h12), mn: pad2(mm), sc: pad2(ss),
            ap: h24 < 12 ? 'AM' : 'PM',
            dateLong: `${DOW3[dow]} ${pad2(day)} ${MON3[mo]} ${y}`,
            isoDate: `${y}-${pad2(mo + 1)}-${pad2(day)}`
        };
    }

    const CLOCK_BUILDERS = {
        MAGNA(root) {
            root.className = 'ck ck-mega';
            root.innerHTML =
                '<div class="mega-time">' +
                '<span data-k="h">00</span><span class="colon" data-k="c1">:</span>' +
                '<span data-k="m">00</span><span class="colon sec" data-k="c2">:</span>' +
                '<span class="sec" data-k="s">00</span><span class="ap" data-k="ap"></span>' +
                '</div>' +
                '<div class="ck-sub" data-k="sub"></div>';
            const eh = root.querySelector('[data-k="h"]'),
                  em = root.querySelector('[data-k="m"]'),
                  es = root.querySelector('[data-k="s"]'),
                  eap = root.querySelector('[data-k="ap"]'),
                  esub = root.querySelector('[data-k="sub"]');
            return function(T, S) {
                if (S.h) { eh.textContent = T.hh24; eap.textContent = ''; }
                if (S.m) em.textContent = T.mn;
                if (S.s) es.textContent = T.sc;
                if (S.s || S.m) esub.innerHTML = T.dateLong;
            };
        },
        VECTOR(root) {
            root.className = 'ck ck-mono';
            root.innerHTML =
                '<div class="mono-wrap">' +
                '<div class="ghost" data-k="g">88:88:88</div>' +
                '<div class="real" data-k="r">00:00:00</div>' +
                '</div>' +
                '<div class="mono-rule">' +
                '<span class="dash"></span>' +
                '<span data-k="l">HYDRO.CHRONO // TERMINAL</span>' +
                '<span class="dash"></span>' +
                '</div>';
            const er = root.querySelector('[data-k="r"]'),
                  el = root.querySelector('[data-k="l"]');
            return function(T, S) {
                if (S.s || S.m || S.h) {
                    er.textContent = `${T.hh24}:${T.mn}:${T.sc}`;
                }
                if (S.date || S.m) {
                    el.textContent = `${DOWF[T.dow]} &middot; ${pad2(T.day)} ${MON3[T.mo]} ${T.y}`;
                }
            };
        },
        SYNCRO(root) {
            root.className = 'ck ck-analog';
            let ticks = '';
            for (let i = 0; i < 60; i++) {
                const maj = i % 5 === 0;
                const a = i * 6 * Math.PI / 180;
                const r1 = maj ? 72 : 79, r2 = 85;
                ticks += `<line class="an-tick${maj ? ' maj' : ''}" x1="${(100 + Math.sin(a) * r1).toFixed(1)}" y1="${(100 - Math.cos(a) * r1).toFixed(1)}" x2="${(100 + Math.sin(a) * r2).toFixed(1)}" y2="${(100 - Math.cos(a) * r2).toFixed(1)}"/>`;
            }
            let nums = '';
            [[12, '100', '34'], [3, '168', '106'], [6, '100', '178'], [9, '32', '106']].forEach(n => {
                nums += `<text class="an-num" x="${n[1]}" y="${n[2]}">${n[0]}</text>`;
            });
            root.innerHTML =
                '<svg class="an-svg" viewBox="0 0 200 200" aria-hidden="true">' +
                '<circle class="an-face" cx="100" cy="100" r="92"/>' +
                '<circle class="an-inner" cx="100" cy="100" r="64"/>' +
                '<g>' + ticks + '</g><g>' + nums + '</g>' +
                '<line class="an-h" data-k="h" x1="100" y1="110" x2="100" y2="56"/>' +
                '<line class="an-m" data-k="m" x1="100" y1="114" x2="100" y2="38"/>' +
                '<line class="an-s" data-k="s" x1="100" y1="120" x2="100" y2="28"/>' +
                '<circle class="an-cap" cx="100" cy="100" r="4.2"/>' +
                '</svg>' +
                '<div class="an-dig" data-k="d">00:00:00 <b>LOCAL</b></div>';
            const eh = root.querySelector('[data-k="h"]'),
                  em = root.querySelector('[data-k="m"]'),
                  es = root.querySelector('[data-k="s"]'),
                  ed = root.querySelector('[data-k="d"]');
            function rot(el, deg) { el.setAttribute('transform', `rotate(${deg.toFixed(2)} 100 100)`); }
            return function(T, S) {
                if (S.h || S.m) rot(eh, ((T.h24 % 12) + T.mm / 60) * 30);
                if (S.m || S.s) rot(em, (T.mm + T.secF / 60) * 6);
                rot(es, T.secF * 6);
                if (S.s || S.m || S.h) {
                    ed.innerHTML = `${T.hh24}:${T.mn}:${T.sc} <b>${T.dateLong}</b>`;
                }
            };
        },
        ORBIT(root) {
            root.className = 'ck ck-ring';
            const R = [84, 68, 52], C = R.map(r => 2 * Math.PI * r);
            const ring = (i, cls, k) => `<circle class="rg-bar ${cls}" data-k="${k}" cx="100" cy="100" r="${R[i]}" stroke-dasharray="${C[i].toFixed(2)}" stroke-dashoffset="${C[i].toFixed(2)}"/>`;
            root.innerHTML =
                '<div class="rg-wrap">' +
                '<svg class="rg-svg" viewBox="0 0 200 200" aria-hidden="true">' +
                `<circle class="rg-trk" cx="100" cy="100" r="${R[0]}"/>` + ring(0, 'rg-h', 'rh') +
                `<circle class="rg-trk" cx="100" cy="100" r="${R[1]}"/>` + ring(1, 'rg-m', 'rm') +
                `<circle class="rg-trk" cx="100" cy="100" r="${R[2]}"/>` + ring(2, 'rg-s', 'rs') +
                '</svg>' +
                '<div class="rg-center">' +
                '<div class="rg-time" data-k="t">00:00</div>' +
                '<div class="rg-sec" data-k="s">00</div>' +
                '</div>' +
                '</div>' +
                '<div class="rg-key">' +
                '<span><i style="background:var(--chrono-pink)"></i>HOUR</span>' +
                '<span><i style="background:var(--chrono-pink);opacity:0.7"></i>MIN</span>' +
                '<span><i style="background:var(--chrono-text);opacity:0.5"></i>SEC</span>' +
                '</div>' +
                '<div class="ck-sub" data-k="sub"></div>';
            const rh = root.querySelector('[data-k="rh"]'),
                  rm = root.querySelector('[data-k="rm"]'),
                  rs = root.querySelector('[data-k="rs"]'),
                  et = root.querySelector('[data-k="t"]'),
                  es = root.querySelector('[data-k="s"]'),
                  esub = root.querySelector('[data-k="sub"]');
            function setOffset(el, i, frac) {
                el.setAttribute('stroke-dashoffset', (C[i] * (1 - Math.max(0, Math.min(1, frac)))).toFixed(2));
            }
            return function(T, S) {
                setOffset(rh, 0, ((T.h24 % 12) + T.mm / 60) / 12);
                setOffset(rm, 1, (T.mm + T.secF / 60) / 60);
                setOffset(rs, 2, T.secF / 60);
                if (S.h || S.m) et.textContent = `${T.hh24}:${T.mn}`;
                if (S.s) es.textContent = T.sc;
                if (S.s || S.m) esub.innerHTML = `${T.dateLong} &middot; <b>CYCLE SYNC</b>`;
            };
        },
        ARRAY(root) {
            root.className = 'ck ck-seg7';
            const digit = (k) => `<div class="s7" data-k="${k}">` +
                ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(s => `<i class="sg ${s}"></i>`).join('') +
                '</div>';
            root.innerHTML =
                '<div class="s7-row">' +
                '<div class="s7-col">' + digit('h1') + digit('h2') + '</div>' +
                '<span class="s7-sp">:</span>' +
                '<div class="s7-col">' + digit('m1') + digit('m2') + '</div>' +
                '<span class="s7-sp">:</span>' +
                '<div class="s7-col">' + digit('s1') + digit('s2') + '</div>' +
                '</div>' +
                '<div class="ck-sub" data-k="sub"></div>';
            const cells = {};
            ['h1', 'h2', 'm1', 'm2', 's1', 's2'].forEach(k => {
                const el = root.querySelector(`[data-k="${k}"]`);
                cells[k] = { el, v: null, seg: {} };
                ['a', 'b', 'c', 'd', 'e', 'f', 'g'].forEach(s => {
                    cells[k].seg[s] = el.querySelector(`.sg.${s}`);
                });
            });
            const sub = root.querySelector('[data-k="sub"]');
            function setDigit(k, val) {
                const c = cells[k];
                if (c.v === val) return;
                const on = SEG7_MAP[val] || '';
                ['a', 'b', 'c', 'd', 'e', 'f', 'g'].forEach(s => {
                    c.seg[s].classList.toggle('on', on.indexOf(s) >= 0);
                });
                c.v = val;
            }
            return function(T, S) {
                if (S.h) { setDigit('h1', T.hh24[0]); setDigit('h2', T.hh24[1]); }
                if (S.m) { setDigit('m1', T.mn[0]); setDigit('m2', T.mn[1]); }
                if (S.s) { setDigit('s1', T.sc[0]); setDigit('s2', T.sc[1]); }
                if (S.s || S.m) sub.innerHTML = `${T.dateLong} &middot; <b>7-SEGMENT LED</b>`;
            };
        },
        SIGNET(root) {
            root.className = 'ck ck-stamp';
            root.innerHTML =
                '<div class="st-top">' +
                '<span class="st-day" data-k="d">01</span>' +
                '<div class="st-right">' +
                '<span class="st-mon" data-k="mo">OCT</span>' +
                '<span class="st-year" data-k="y">2026</span>' +
                '</div>' +
                '</div>' +
                '<div class="st-time" data-k="t">00:00:00</div>' +
                '<div class="st-dow" data-k="dow">MONDAY</div>';
            const ed = root.querySelector('[data-k="d"]'),
                  emo = root.querySelector('[data-k="mo"]'),
                  ey = root.querySelector('[data-k="y"]'),
                  et = root.querySelector('[data-k="t"]'),
                  edw = root.querySelector('[data-k="dow"]');
            return function(T, S) {
                if (S.date || S.m) {
                    ed.textContent = pad2(T.day);
                    emo.textContent = MON3[T.mo];
                    ey.textContent = T.y;
                    edw.textContent = DOWF[T.dow];
                }
                if (S.s || S.m || S.h) {
                    et.textContent = `${T.hh24}:${T.mn}:${T.sc}`;
                }
            };
        }
    };

    // ------------------------------------------------------------------
    // 時鐘大小與位置狀態 (支援用戶拖曳、滑鼠滾輪縮放、玻璃化模糊、拉桿調節與本機記憶)
    // ------------------------------------------------------------------
    const CLK_POS_KEY = 'chrono_clock_pos_v2';
    const CLK_SCALE_KEY = 'chrono_clock_scale_v2';
    const CLK_GLASS_KEY = 'chrono_clock_glass_v2';
    const CLK_SHAPE_KEY = 'chrono_clock_shape_v2';
    const CLK_FACE_KEY = 'chrono_clock_face_v2';

    const GLASS_SHAPES = [
        { id: 'squircle', name: 'SQUIRCLE 方圓', cls: 'glass-shape-squircle' },
        { id: 'chamfer', name: 'CHAMFER 賽博切角', cls: 'glass-shape-chamfer' },
        { id: 'gem', name: 'GEM 寶石切面', cls: 'glass-shape-gem' },
        { id: 'slab', name: 'TECH SLAB 機甲板', cls: 'glass-shape-slab' }
    ];
    let glassShapeIdx = 0;

    let clockPos = { x: -280, y: -100 };
    let clockScale = 1.35;
    let glassBlurEnabled = true;
    let isClockDragging = false;
    let dragStartPointer = { x: 0, y: 0 };
    let dragStartPos = { x: 0, y: 0 };

    function applyClockTransform() {
        const root = document.documentElement;
        root.style.setProperty('--clock-x', `${clockPos.x.toFixed(1)}px`);
        root.style.setProperty('--clock-y', `${clockPos.y.toFixed(1)}px`);
        root.style.setProperty('--clock-scale', clockScale.toFixed(2));
        const slider = $('clockScaleSlider');
        if (slider) slider.value = clockScale.toFixed(2);
        const valTxt = $('clockScaleValue');
        if (valTxt) valTxt.textContent = `${clockScale.toFixed(2)}×`;
    }

    function applyGlassBlurUI() {
        const stage = $('chronoClockStage');
        if (stage) {
            stage.classList.toggle('liquid-glass', glassBlurEnabled);
            // 同步套用選定的幾何形狀 class
            GLASS_SHAPES.forEach(s => stage.classList.remove(s.cls));
            if (glassBlurEnabled) {
                stage.classList.add(GLASS_SHAPES[glassShapeIdx].cls);
            }
        }
        const lbl = $('glassBlurLabel');
        if (lbl) lbl.textContent = glassBlurEnabled ? 'LIQUID GLASS: ON' : 'LIQUID GLASS: OFF';
        const shapeLbl = $('glassShapeLabel');
        if (shapeLbl) shapeLbl.textContent = `SHAPE: ${GLASS_SHAPES[glassShapeIdx].name}`;
        const btn = $('btnToggleGlassBlur');
        if (btn) btn.classList.toggle('active', glassBlurEnabled);
    }

    function setGlassShape(idx) {
        glassShapeIdx = ((idx % GLASS_SHAPES.length) + GLASS_SHAPES.length) % GLASS_SHAPES.length;
        applyGlassBlurUI();
        try { localStorage.setItem(CLK_SHAPE_KEY, GLASS_SHAPES[glassShapeIdx].id); } catch (e) {}
    }

    function cycleGlassShape() {
        if (!glassBlurEnabled) {
            setGlassBlur(true);
        } else {
            setGlassShape(glassShapeIdx + 1);
        }
    }

    function setGlassBlur(on) {
        glassBlurEnabled = !!on;
        applyGlassBlurUI();
        try { localStorage.setItem(CLK_GLASS_KEY, glassBlurEnabled ? '1' : '0'); } catch (e) {}
    }

    function toggleGlassBlur() {
        setGlassBlur(!glassBlurEnabled);
    }

    function setClockScale(val) {
        clockScale = Math.max(0.4, Math.min(3.5, val));
        applyClockTransform();
        try { localStorage.setItem(CLK_SCALE_KEY, clockScale.toString()); } catch (e) {}
    }

    function resetClockPosAndScale() {
        clockPos = { x: -280, y: -100 };
        clockScale = 1.35;
        applyClockTransform();
        try {
            localStorage.removeItem(CLK_POS_KEY);
            localStorage.removeItem(CLK_SCALE_KEY);
        } catch (e) {}
    }

    function activateClockFace(idx) {
        clockFaceIdx = ((idx % CLOCK_FACES.length) + CLOCK_FACES.length) % CLOCK_FACES.length;
        const face = CLOCK_FACES[clockFaceIdx];
        const body = $('clockStageBody');
        if (!body) return;
        body.innerHTML = '';
        const holder = document.createElement('div');
        body.appendChild(holder);
        const builder = CLOCK_BUILDERS[face.id] || CLOCK_BUILDERS.MAGNA;
        clockPainter = builder(holder);
        clockPrev = null;
        const tag = $('clockFaceTag');
        if (tag) tag.textContent = `${face.name} // ${face.key}`;
        const tagMini = $('clockFaceTagMini');
        if (tagMini) tagMini.textContent = `${face.name}`;
        const btnLbl = $('clockStyleLabel');
        if (btnLbl) btnLbl.textContent = `CLOCK: ${face.name}`;
        try { localStorage.setItem(CLK_FACE_KEY, String(clockFaceIdx)); } catch (e) {}
    }

    function cycleClockFace(step) {
        activateClockFace(clockFaceIdx + step);
    }

    function updateClock() {
        if (!clockPainter) return;
        const T = getClockReading();
        const S = {
            h: !clockPrev || clockPrev.h24 !== T.h24,
            m: !clockPrev || clockPrev.mm !== T.mm,
            s: !clockPrev || clockPrev.ss !== T.ss,
            date: !clockPrev || clockPrev.day !== T.day || clockPrev.mo !== T.mo
        };
        clockPainter(T, S);
        if (S.s) {
            if (T.ss % 2 === 1) document.body.classList.add('ck-blink');
            else document.body.classList.remove('ck-blink');
            const dt = $('clockDateLine');
            if (dt) dt.textContent = `${T.dateLong}`;
        }
        clockPrev = T;
    }

    function initClock() {
        // 讀取先前儲存的位置與尺寸 (預設：左上偏中 x=-280, y=-100、開啟 Liquid Glass、SQUIRCLE 方圓、06 SIGNET 錶盤)
        let initFace = 5;
        try {
            const savedPos = JSON.parse(localStorage.getItem(CLK_POS_KEY) || 'null');
            if (savedPos && typeof savedPos.x === 'number' && typeof savedPos.y === 'number') {
                clockPos = savedPos;
            }
            const savedScale = parseFloat(localStorage.getItem(CLK_SCALE_KEY));
            if (!isNaN(savedScale) && savedScale >= 0.4 && savedScale <= 3.5) {
                clockScale = savedScale;
            }
            const savedGlass = localStorage.getItem(CLK_GLASS_KEY);
            if (savedGlass !== null) {
                glassBlurEnabled = savedGlass === '1';
            }
            const savedShape = localStorage.getItem(CLK_SHAPE_KEY);
            if (savedShape) {
                const fIdx = GLASS_SHAPES.findIndex(s => s.id === savedShape);
                if (fIdx >= 0) glassShapeIdx = fIdx;
            }
            const savedFace = parseInt(localStorage.getItem(CLK_FACE_KEY), 10);
            if (!isNaN(savedFace) && savedFace >= 0 && savedFace < CLOCK_FACES.length) {
                initFace = savedFace;
            }
        } catch (e) {}

        applyClockTransform();
        applyGlassBlurUI();
        activateClockFace(initFace);

        // 綁定拖曳移動與滾輪縮放事件
        const stage = $('chronoClockStage');
        if (stage) {
            stage.addEventListener('pointerdown', (e) => {
                isClockDragging = true;
                dragStartPointer = { x: e.clientX, y: e.clientY };
                dragStartPos = { x: clockPos.x, y: clockPos.y };
                stage.setPointerCapture(e.pointerId);
                e.stopPropagation();
            });
            window.addEventListener('pointermove', (e) => {
                if (!isClockDragging) return;
                const dx = e.clientX - dragStartPointer.x;
                const dy = e.clientY - dragStartPointer.y;
                clockPos.x = dragStartPos.x + dx;
                clockPos.y = dragStartPos.y + dy;
                applyClockTransform();
            });
            const stopDrag = (e) => {
                if (!isClockDragging) return;
                isClockDragging = false;
                try { localStorage.setItem(CLK_POS_KEY, JSON.stringify(clockPos)); } catch (err) {}
            };
            window.addEventListener('pointerup', stopDrag);
            window.addEventListener('pointercancel', stopDrag);

            // 滑鼠滾輪即時縮放大小 (Ctrl/Shift 或直接滾輪)
            stage.addEventListener('wheel', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const delta = e.deltaY < 0 ? 0.08 : -0.08;
                setClockScale(clockScale + delta);
            }, { passive: false });
        }
    }

    // ------------------------------------------------------------------
    // 啟動
    // ------------------------------------------------------------------
    resize();
    setupUI();
    initClock();
    setScene(0);
    bootComplete = true;
    requestAnimationFrame(frame);
})();
