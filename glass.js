/* ==========================================================================
 * glass.js — iOS 26 風格 Liquid Glass 時鐘玻璃
 *  - 10 種折射/扭曲效果 (以 canvas 即時生成位移貼圖 -> SVG feDisplacementMap)
 *  - 可調參數：透明度 / 磨砂 / 折射強度 / 邊框厚度 / 色散 / 飽和 / 亮度 / 邊緣高光
 *  - 按 [L] 或 HUD 內「GLASS LAB」按鈕開關面板，設定自動儲存
 * ========================================================================== */
(function () {
    'use strict';
    const KEY = 'chrono_glass_lab_v1';
    const NS = 'http://www.w3.org/2000/svg';
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

    // ---- 十種效果：fn(ctx) 回傳 [dx, dy] ∈ [-1,1] (取樣偏移方向) ----
    // ctx: x,y (-1..1 以中心為原點), depth(0 邊緣 -> 1 內側, 依邊框厚度), nx,ny (向外法線), r, t(角度), aspect
    const EFFECTS = [
        { id: 'convex',  name: '01 CONVEX LENS 凸透鏡', fn: c => { const m = Math.pow(1 - c.depth, 2); return [-c.nx * m, -c.ny * m]; } },
        { id: 'bezel',   name: '02 BEZEL RIM 窄邊折射', fn: c => { const m = 1 - smooth(0, 0.55, c.depth); return [-c.nx * m, -c.ny * m]; } },
        { id: 'concave', name: '03 CONCAVE 凹透鏡',     fn: c => { const m = Math.pow(1 - c.depth, 2); return [c.nx * m, c.ny * m]; } },
        { id: 'ripple',  name: '04 RIPPLE 水波環',      fn: c => { const m = (1 - c.depth) * Math.sin(c.depth * 18); return [-c.nx * m, -c.ny * m]; } },
        { id: 'wave',    name: '05 FLOW WAVE 流體波',   fn: c => [Math.sin(c.y * 5.5 + 1.2) * 0.7, Math.sin(c.x * 4.2) * 0.7] },
        { id: 'whirl',   name: '06 WHIRL 漩渦',         fn: c => { const m = (1 - clamp(c.r, 0, 1)); return [-Math.sin(c.t) * m, Math.cos(c.t) * m]; } },
        { id: 'pinch',   name: '07 PINCH 收縮',         fn: c => { const m = clamp(c.r, 0, 1); return [c.x * m, c.y * m]; } },
        { id: 'bulge',   name: '08 BULGE 鼓脹',         fn: c => { const m = 1 - clamp(c.r, 0, 1); return [-c.x * m, -c.y * m]; } },
        { id: 'facet',   name: '09 FACET 稜鏡切面',     fn: c => { const m = Math.floor((1 - c.depth) * 4) / 4; return [-c.nx * m, -c.ny * m]; } },
        { id: 'jelly',   name: '10 JELLY 果凍噪波',     fn: c => [vnoise(c.x * 2.6 + 3.1, c.y * 2.6) * 1.6 - 0.8, vnoise(c.x * 2.6, c.y * 2.6 + 7.7) * 1.6 - 0.8] }
    ];
    function hash(i, j) { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); }
    function vnoise(x, y) {
        const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
        const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
        const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }

    const DEF = { fx: 0, opacity: 0.08, frost: 0, refract: 60, bezel: 0.35, disp: 0.18, sat: 170, bright: 105, edge: 1, radius: 26 };
    let P = Object.assign({}, DEF);
    try { Object.assign(P, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { }

    let stage, svg, filt, feImg, dR, dG, dB, panel;
    const cv = document.createElement('canvas');

    function buildSvg() {
        svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
        svg.style.cssText = 'position:fixed;left:-9999px;top:0;pointer-events:none';
        svg.innerHTML =
            '<filter id="lgFilter" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB" filterUnits="objectBoundingBox">' +
            '<feImage id="lgImg" x="0" y="0" width="300" height="120" preserveAspectRatio="none" result="map"/>' +
            '<feDisplacementMap id="lgDR" in="SourceGraphic" in2="map" scale="60" xChannelSelector="R" yChannelSelector="G" result="dr"/>' +
            '<feColorMatrix in="dr" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="cr"/>' +
            '<feDisplacementMap id="lgDG" in="SourceGraphic" in2="map" scale="60" xChannelSelector="R" yChannelSelector="G" result="dg"/>' +
            '<feColorMatrix in="dg" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="cg"/>' +
            '<feDisplacementMap id="lgDB" in="SourceGraphic" in2="map" scale="60" xChannelSelector="R" yChannelSelector="G" result="db"/>' +
            '<feColorMatrix in="db" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="cb"/>' +
            '<feBlend in="cr" in2="cg" mode="screen" result="rg"/>' +
            '<feBlend in="rg" in2="cb" mode="screen"/>' +
            '</filter>';
        document.body.appendChild(svg);
        feImg = svg.querySelector('#lgImg'); dR = svg.querySelector('#lgDR'); dG = svg.querySelector('#lgDG'); dB = svg.querySelector('#lgDB');
    }

    // 圓角矩形 SDF 位移貼圖
    function renderMap(w, h) {
        const S = Math.max(1, Math.min(1, 220 / Math.max(w, h))); // 限制貼圖尺寸以保效能
        const cw = Math.max(8, Math.round(w * S)), ch = Math.max(8, Math.round(h * S));
        cv.width = cw; cv.height = ch;
        const g = cv.getContext('2d'), img = g.createImageData(cw, ch), d = img.data;
        const hw = cw / 2, hh = ch / 2, R = Math.min(P.radius * S, hw, hh), bz = Math.max(2, P.bezel * Math.min(hw, hh));
        const fn = EFFECTS[P.fx].fn;
        for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
            const px = i + 0.5 - hw, py = j + 0.5 - hh;
            const qx = Math.abs(px) - (hw - R), qy = Math.abs(py) - (hh - R);
            const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
            const sd = Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - R; // <0 內部
            let nx, ny;
            if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy) || 1; nx = Math.sign(px) * qx / l; ny = Math.sign(py) * qy / l; }
            else if (qx > qy) { nx = Math.sign(px); ny = 0; } else { nx = 0; ny = Math.sign(py); }
            const depth = clamp(-sd / bz, 0, 1);
            const x = px / hw, y = py / hh, r = Math.hypot(x, y) / 1.2;
            const o = fn({ x, y, r, t: Math.atan2(y, x), nx, ny, depth });
            const k = (j * cw + i) * 4;
            d[k] = clamp(128 + 127 * o[0], 0, 255);
            d[k + 1] = clamp(128 + 127 * o[1], 0, 255);
            d[k + 2] = 128; d[k + 3] = 255;
        }
        g.putImageData(img, 0, 0);
        return cv.toDataURL('image/png');
    }

    let raf = 0;
    function schedule() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; apply(); }); }

    function apply() {
        if (!stage) return;
        const on = stage.classList.contains('liquid-glass');
        const props = ['backdrop-filter', '-webkit-backdrop-filter', 'background'];
        if (!on) { props.forEach(p => stage.style.removeProperty(p)); return; }
        const w = Math.max(40, stage.offsetWidth), h = Math.max(40, stage.offsetHeight);
        const url = renderMap(w, h);
        feImg.setAttribute('width', w); feImg.setAttribute('height', h);
        feImg.setAttribute('href', url); feImg.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', url);
        const s = P.refract;
        dR.setAttribute('scale', (s * (1 - P.disp)).toFixed(1));
        dG.setAttribute('scale', s.toFixed(1));
        dB.setAttribute('scale', (s * (1 + P.disp)).toFixed(1));
        const bf = 'url(#lgFilter) blur(' + P.frost + 'px) saturate(' + P.sat + '%) brightness(' + P.bright + '%)';
        stage.style.setProperty('backdrop-filter', bf, 'important');
        stage.style.setProperty('-webkit-backdrop-filter', bf, 'important');
        stage.style.setProperty('background',
            'linear-gradient(135deg, rgba(255,255,255,' + (P.opacity * 1.4).toFixed(3) + ') 0%, rgba(255,255,255,' + (P.opacity * 0.4).toFixed(3) + ') 45%, rgba(0,0,0,' + (P.opacity * 0.9).toFixed(3) + ') 100%)', 'important');
        stage.style.setProperty('border-radius', P.radius + 'px', 'important');
        stage.style.setProperty('--lg-edge', P.edge);
    }

    function save() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { } }

    // ---------------- 面板 ----------------
    const SLIDERS = [
        ['opacity', 'OPACITY 透明度', 0, 0.6, 0.01],
        ['frost', 'FROST 磨砂', 0, 24, 0.5],
        ['refract', 'REFRACTION 折射強度', 0, 160, 1],
        ['bezel', 'BEZEL 折射邊寬', 0.05, 1, 0.01],
        ['disp', 'DISPERSION 色散', 0, 0.6, 0.01],
        ['sat', 'SATURATION 飽和', 50, 300, 1],
        ['bright', 'BRIGHTNESS 亮度', 60, 160, 1],
        ['edge', 'EDGE GLOW 邊緣高光', 0, 1.6, 0.05],
        ['radius', 'RADIUS 圓角', 0, 60, 1]
    ];
    function buildPanel() {
        const st = document.createElement('style');
        st.textContent =
            '.chrono-clock-stage.liquid-glass::before,.chrono-clock-stage.liquid-glass::after{opacity:var(--lg-edge,1)}' +
            '#glassLab{position:fixed;right:18px;bottom:18px;width:290px;max-height:80vh;overflow:auto;z-index:300;padding:14px 16px;border-radius:20px;' +
            'background:rgba(10,14,20,.78);backdrop-filter:blur(18px) saturate(160%);-webkit-backdrop-filter:blur(18px) saturate(160%);' +
            'border:1px solid rgba(var(--chrono-rgb,82,229,155),.45);color:var(--chrono-text,#e2e8f0);font:11px/1.4 inherit;font-family:inherit;display:none;letter-spacing:1px}' +
            '#glassLab.open{display:block}#glassLab h4{margin:0 0 8px;font-size:12px;color:var(--chrono-pink,#52e59b);display:flex;justify-content:space-between}' +
            '#glassLab .fxg{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:10px}' +
            '#glassLab .fxg button{font:inherit;font-size:10px;padding:6px 4px;border-radius:9px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);color:inherit;cursor:pointer;text-align:left}' +
            '#glassLab .fxg button.on{background:rgba(var(--chrono-rgb,82,229,155),.3);border-color:var(--chrono-pink,#52e59b)}' +
            '#glassLab label{display:flex;justify-content:space-between;margin-top:7px;font-size:10px}#glassLab input[type=range]{width:100%;accent-color:var(--chrono-pink,#52e59b)}' +
            '#glassLab .rb{margin-top:10px;width:100%;font:inherit;padding:7px;border-radius:9px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:inherit;cursor:pointer}';
        document.head.appendChild(st);

        panel = document.createElement('div'); panel.id = 'glassLab';
        let html = '<h4><span>GLASS LAB // 液態玻璃</span><span id="glClose" style="cursor:pointer">✕</span></h4><div class="fxg">';
        EFFECTS.forEach((e, i) => { html += '<button data-fx="' + i + '">' + e.name + '</button>'; });
        html += '</div>';
        SLIDERS.forEach(s => { html += '<label><span>' + s[1] + '</span><b id="glv_' + s[0] + '"></b></label><input type="range" data-k="' + s[0] + '" min="' + s[2] + '" max="' + s[3] + '" step="' + s[4] + '">'; });
        html += '<button class="rb" id="glReset">RESET 還原預設</button>';
        panel.innerHTML = html;
        document.body.appendChild(panel);
        ['pointerdown', 'wheel', 'keydown'].forEach(ev => panel.addEventListener(ev, e => e.stopPropagation()));

        panel.querySelectorAll('[data-fx]').forEach(b => b.addEventListener('click', () => { P.fx = +b.dataset.fx; sync(); save(); schedule(); }));
        panel.querySelectorAll('input[data-k]').forEach(inp => inp.addEventListener('input', () => { P[inp.dataset.k] = parseFloat(inp.value); sync(); save(); schedule(); }));
        panel.querySelector('#glReset').addEventListener('click', () => { P = Object.assign({}, DEF); sync(); save(); schedule(); });
        panel.querySelector('#glClose').addEventListener('click', toggle);
        sync();
    }
    function sync() {
        panel.querySelectorAll('[data-fx]').forEach(b => b.classList.toggle('on', +b.dataset.fx === P.fx));
        panel.querySelectorAll('input[data-k]').forEach(inp => {
            inp.value = P[inp.dataset.k];
            const v = panel.querySelector('#glv_' + inp.dataset.k); if (v) v.textContent = (+P[inp.dataset.k]).toFixed(inp.step < 1 ? 2 : 0);
        });
    }
    function toggle() { panel.classList.toggle('open'); }

    function addButton() {
        const ref = document.getElementById('btnCycleGlassShape');
        if (!ref || !ref.parentElement) return;
        const li = document.createElement('li'); li.innerHTML = '<button class="chrono-btn" id="btnGlassLab" style="font-size:11px;padding:8px 18px;"><span id="glassLabLabel">GLASS LAB: 玻璃參數</span><span class="shortcut">L [面板]</span></button>';
        ref.parentElement.parentElement.insertBefore(li, ref.parentElement.nextSibling);
        li.querySelector('button').addEventListener('click', toggle);
    }

    function init() {
        stage = document.getElementById('chronoClockStage');
        if (!stage) return;
        buildSvg(); buildPanel(); addButton();
        new MutationObserver(schedule).observe(stage, { attributes: true, attributeFilter: ['class'] });
        if (window.ResizeObserver) new ResizeObserver(schedule).observe(stage);
        window.addEventListener('resize', schedule);
        window.addEventListener('keydown', e => {
            const t = e.target; if (t && /INPUT|SELECT|TEXTAREA/.test(t.tagName)) return;
            if (e.key.toLowerCase() === 'l') toggle();
        });
        apply();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
