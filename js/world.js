import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* =========================================================
   Murmelflug – 3D-Welt
   Spiralbahn mit 60 Levels durch 6 Welten, Glasmurmel,
   Ausrüstung, Spuren, Weltwechsel und 5 Enden.
   ========================================================= */

const TAU = Math.PI * 2;
export const MAXL = 60;
const HR = 16;          // Radius der Spiralbahn
const LH = 5;           // Höhe pro Level
const Y0 = 2;           // Höhe Level 1
const ARC = Math.hypot(TAU * HR / 10, LH); // Bahnlänge pro Level
const MR = 0.7;         // Murmelradius
const BH = new THREE.Vector3(0, 345, 0);

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const R = mulberry(20261007);
const rr = (a, b) => a + R() * (b - a);
const pick = a => a[Math.floor(R() * a.length)];
function hash2(x, y) { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); }
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, y, o = 5) { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2; a *= .5; } return s; }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function at(o, { p, r, s } = {}) { if (p) o.position.copy(p); if (r) o.rotation.copy(r); if (s) o.scale.copy(s); return o; }

export const zoneOfLevel = l => Math.min(5, Math.floor((Math.max(1, l) - 1) / 10));
export function helixPoint(s, out = V()) { const a = s * TAU / 10; return out.set(HR * Math.cos(a), Y0 + (s - 1) * LH, HR * Math.sin(a)); }
function helixTan(s, out = V()) { const a = s * TAU / 10, da = TAU / 10; return out.set(-HR * Math.sin(a) * da, LH, HR * Math.cos(a) * da).normalize(); }
function radial(s, out = V()) { const a = s * TAU / 10; return out.set(Math.cos(a), 0, Math.sin(a)); }
function frame(s) { const t = helixTan(s), r = radial(s); const up = V().crossVectors(t, r).normalize(); const right = V().crossVectors(up, t).normalize(); return { t, r: right, up }; }

/* ---------------- Texturen ---------------- */
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
let _glow = null, _ring = null, _cloud = null, _soft = null;
function glowTex() { return _glow || (_glow = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.22, 'rgba(255,255,255,.55)'); gr.addColorStop(.55, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); })); }
function softTex() { return _soft || (_soft = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); })); }
function ringTex() { return _ring || (_ring = canvasTex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 60, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.35, 'rgba(255,220,170,.9)'); gr.addColorStop(.55, 'rgba(255,170,90,.35)'); gr.addColorStop(1, 'rgba(255,120,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); })); }
function cloudTex() {
  return _cloud || (_cloud = canvasTex(256, 256, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2), d = Math.sqrt(dx * dx + dy * dy);
      const n = fbm(x * .02 + 11, y * .02 + 5, 5); const a = Math.max(0, (n - .3) * 1.8) * Math.max(0, 1 - d) * 1.2;
      const i = (y * w + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = Math.min(255, a * 255);
    }
    g.putImageData(img, 0, 0);
  }));
}
function noiseSphereTex(w, h, fn) {
  return canvasTex(w, h, (g) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const lon = x / w * TAU, lat = (y / h - .5) * Math.PI;
      const px = Math.cos(lat) * Math.cos(lon), py = Math.sin(lat), pz = Math.cos(lat) * Math.sin(lon);
      const c = fn(px, py, pz, x / w, y / h); const i = (y * w + x) * 4; img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = c[3] ?? 255;
    }
    g.putImageData(img, 0, 0);
  });
}
const n3 = (x, y, z) => (fbm(x * 2 + z * 1.3 + 7, y * 2 - z * .7 + 3, 5));
function mixc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

function badgeTex(n) {
  return canvasTex(128, 128, (g) => {
    g.fillStyle = 'rgba(255,255,255,.96)'; g.beginPath(); g.arc(64, 64, 52, 0, TAU); g.fill();
    g.lineWidth = 8; g.strokeStyle = '#6c4dff'; g.stroke();
    g.fillStyle = '#1f1747'; g.font = '800 56px "Baloo 2", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 64, 70);
  });
}

/* ---------------- Muster-Masken für den Murmelkern ---------------- */
const maskCache = {};
export function patternMask(id) {
  if (maskCache[id]) return maskCache[id];
  const t = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
    const r = mulberry(99);
    const wrap = f => { for (const dx of [-w, 0, w]) f(dx); };
    switch (id) {
      case 'streifen': g.lineWidth = 15; for (let i = 0; i < 6; i++) { const y0 = (i + .5) * h / 6; g.beginPath(); for (let x = 0; x <= w; x += 4) { const y = y0 + Math.sin(x / w * TAU * 2 + i) * 10; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } break;
      case 'punkte': for (let i = 0; i < 38; i++) { const x = r() * w, y = h * .14 + r() * h * .72, rad = 8 + r() * 15; wrap(dx => { g.beginPath(); g.arc(x + dx, y, rad, 0, TAU); g.fill(); }); } break;
      case 'katzenauge': for (let k = 0; k < 4; k++) { const cx = k * w / 4 + w / 8; wrap(dx => { const x = cx + dx; g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 52, h * .32, x - 18, h * .66, x + 22, h); g.bezierCurveTo(x - 34, h * .66, x - 46, h * .34, x, 0); g.fill(); g.fillStyle = '#9a9a9a'; g.beginPath(); g.moveTo(x, h * .08); g.bezierCurveTo(x + 22, h * .35, x - 6, h * .62, x + 10, h * .92); g.bezierCurveTo(x - 12, h * .62, x - 18, h * .36, x, h * .08); g.fill(); }); } break;
      case 'spirale': g.lineWidth = 17; for (let i = 0; i < 5; i++) { const x0 = i * w / 5; wrap(dx => { g.beginPath(); g.moveTo(x0 + dx, -10); g.bezierCurveTo(x0 + dx + w * .15, h * .3, x0 + dx + w * .3, h * .6, x0 + dx + w * .5, h + 10); g.stroke(); }); } break;
      case 'baender': for (let i = 0; i < 12; i++) { const y0 = i * h / 12; g.fillStyle = i % 2 ? '#fff' : '#6a6a6a'; g.beginPath(); g.moveTo(0, y0); for (let x = 0; x <= w; x += 8) g.lineTo(x, y0 + Math.sin(x / w * TAU * 3 + i) * 4); g.lineTo(w, y0 + h / 12 + 6); g.lineTo(0, y0 + h / 12 + 6); g.fill(); } g.fillStyle = '#222'; g.beginPath(); g.ellipse(w * .6, h * .62, 30, 13, 0, 0, TAU); g.fill(); break;
      case 'flammen': for (let pass = 0; pass < 2; pass++) { g.fillStyle = pass ? '#fff' : '#8a8a8a'; for (let i = 0; i < 14; i++) { const x0 = i * w / 14 + (pass ? w / 28 : 0), hg = h * (pass ? .38 : .6) * (.7 + r() * .45), ww = w / 14 * .62; g.beginPath(); g.moveTo(x0 - ww, h); g.quadraticCurveTo(x0 - ww * .8, h - hg * .5, x0 + (r() - .5) * 12, h - hg); g.quadraticCurveTo(x0 + ww * .8, h - hg * .5, x0 + ww, h); g.fill(); } } break;
      case 'schuppen': g.lineWidth = 4; for (let row = 0; row < 12; row++) for (let k = 0; k < 27; k++) { const x = k * w / 25 + (row % 2) * w / 50, y = row * h / 11; g.fillStyle = '#5a5a5a'; g.beginPath(); g.arc(x, y, 12, 0, Math.PI); g.fill(); g.stroke(); } break;
      case 'galaxie':
        for (let i = 0; i < 700; i++) { const x = r() * w, y = r() * h, s = r(); g.fillStyle = `rgba(255,255,255,${.25 + s * .75})`; const z = s > .93 ? 3 : 1.4; g.fillRect(x, y, z, z); }
        for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 320; i++) { const tt = i / 320; const x = ((arm * w / 2 + tt * w * .9 + (r() - .5) * 22) % w + w) % w; const y = h * .5 + Math.sin(tt * TAU) * h * .22 * (1 - tt * .6) + (r() - .5) * 16; g.fillStyle = `rgba(255,255,255,${.35 + r() * .6})`; g.beginPath(); g.arc(x, y, 1 + r() * 2.6, 0, TAU); g.fill(); }
        break;
    }
  }, false);
  t.wrapS = THREE.RepeatWrapping; maskCache[id] = t; return t;
}

/* ---------------- Shader ---------------- */
const NOISE = `
float h3(vec3 p){ p=fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float n3(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.-2.*f);
 return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*n3(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=.5; } return s; }`;

const CORE_VS = `varying vec2 vUv; varying vec3 vObj; varying vec3 vN; varying vec3 vV;
void main(){ vUv=uv; vObj=position; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=-mv.xyz; gl_Position=projectionMatrix*mv; }`;
const CORE_FS = `uniform sampler2D uMask; uniform vec3 uC1; uniform vec3 uC2; uniform float uTime;
uniform float uDark, uGlow, uRainbow, uLava, uAurora, uPlasma, uVoid, uSing;
varying vec2 vUv; varying vec3 vObj; varying vec3 vN; varying vec3 vV;
${NOISE}
void main(){
  vec3 N=normalize(vN), Vd=normalize(vV);
  float m=texture2D(uMask,vUv).r;
  vec3 base = uDark>0.5 ? vec3(.012,.012,.045)+uC1*.08 : uC1*.85;
  vec3 col = mix(base, uC2, m);
  vec3 emi = vec3(0.);
  vec3 p = vObj*4.;
  vec3 q = p + vec3(fbm(p+uTime*.3), fbm(p+vec3(5.2,1.3,2.8)-uTime*.25), fbm(p+vec3(2.,7.,1.)+uTime*.2))*1.6;
  float g = fbm(q);
  if(uGlow>0.){ float pulse=.65+.35*sin(uTime*2.2+g*6.); col=mix(col,uC1*1.1,.3*uGlow); emi+=uC1*uGlow*(.3+.9*smoothstep(.42,.75,g))*pulse; }
  if(uRainbow>0.){ vec3 rb=.5+.5*cos(6.2831*(g*1.5+uTime*.08+vec3(0.,.33,.67))); col=mix(col,rb,.7*uRainbow); emi+=rb*.18*uRainbow; }
  if(uLava>0.){ float l=fbm(q*1.25+vec3(0.,-uTime*.55,0.)); vec3 lc=mix(vec3(.12,.01,0.),vec3(1.,.36,.02),smoothstep(.36,.68,l)); col=mix(col,lc,.88*uLava); emi+=vec3(1.,.45,.08)*(smoothstep(.5,.78,l)*2.6+.15)*uLava; }
  if(uAurora>0.){ float b=sin(vObj.y*14.+g*7.+uTime*1.6); vec3 ac=mix(vec3(.1,1.,.55),vec3(.55,.25,1.),.5+.5*sin(uTime*.7+vObj.x*6.)); float k=smoothstep(.25,1.,b); col=mix(col,vec3(.02,.05,.12),.6*uAurora); col=mix(col,ac,k*.85*uAurora); emi+=ac*k*1.1*uAurora; }
  if(uPlasma>0.){ float pl=sin(p.x*2.+uTime*2.)+sin(p.y*2.5-uTime*1.7)+sin((p.x+p.z)*2.2+uTime*1.3)+sin(length(p)*3.-uTime*3.); vec3 pc=.5+.5*cos(vec3(0.,2.1,4.2)+pl*1.2+uTime); float fil=1.-smoothstep(0.,.22,abs(fract(pl*.5+g)-.5)); col=mix(col,pc*.45,.75*uPlasma); emi+=(pc*.45+vec3(.75,.9,1.)*fil*1.2)*uPlasma; }
  if(uVoid>0.){ float ang=atan(vObj.z,vObj.x)+uTime*1.4; float rad=length(vObj.xz)/0.46; float sw=sin(ang*3.+rad*12.-uTime*4.+g*3.); col=mix(col,vec3(0.),.8*uVoid); emi+=mix(vec3(1.,.5,.1),vec3(.6,.2,1.),.5+.5*sin(ang))*smoothstep(.55,1.,sw)*smoothstep(.15,.9,rad)*1.3*uVoid; }
  if(uSing>0.){ col=mix(col,vec3(0.),.92*uSing); float ang=atan(vObj.z,vObj.x); float rad=length(vObj.xz)/0.46; float st=fbm(vec3(ang*3.-uTime*2.2+rad*6., rad*9., uTime*.25)); emi+=vec3(1.,.85,.6)*smoothstep(.52,.78,st)*smoothstep(.25,1.,rad)*2.*uSing; float rim=pow(1.-max(dot(N,Vd),0.),3.); emi+=vec3(.6,.3,1.)*rim*1.6*uSing; }
  float fres = pow(1.-max(dot(N,Vd),0.),2.5);
  vec3 L = normalize(vec3(.35,.85,.45));
  float diff = .45+.55*max(dot(N,L),0.);
  float spec = pow(max(dot(reflect(-L,N),Vd),0.),24.)*.25;
  gl_FragColor = vec4(col*diff + emi + fres*col*.3 + spec, 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/* =========================================================
   Glasmurmel mit Kern, Einschlüssen und Ausrüstung
   ========================================================= */
export class MarbleRig {
  constructor() {
    this.root = new THREE.Group();
    this.roll = new THREE.Group(); this.root.add(this.roll);
    this.glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0, roughness: .025, transmission: 1, thickness: .95, ior: 1.48,
      clearcoat: 1, clearcoatRoughness: .02, specularIntensity: 1, envMapIntensity: 1.6,
      attenuationColor: new THREE.Color('#ffffff'), attenuationDistance: 3.5
    });
    this.glass = new THREE.Mesh(new THREE.SphereGeometry(MR, 72, 54), this.glassMat); this.roll.add(this.glass);
    this.coreU = { uMask: { value: patternMask('uni') }, uC1: { value: new THREE.Color() }, uC2: { value: new THREE.Color() }, uTime: { value: 0 }, uDark: { value: 0 }, uGlow: { value: 0 }, uRainbow: { value: 0 }, uLava: { value: 0 }, uAurora: { value: 0 }, uPlasma: { value: 0 }, uVoid: { value: 0 }, uSing: { value: 0 } };
    this.core = new THREE.Mesh(new THREE.SphereGeometry(.46, 64, 48), new THREE.ShaderMaterial({ uniforms: this.coreU, vertexShader: CORE_VS, fragmentShader: CORE_FS }));
    this.roll.add(this.core);
    // kleine Luftbläschen im Glas, immer da – machen das Glas glaubwürdig
    this.bubbles = this.flakes(14, new THREE.SphereGeometry(.018, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0, roughness: .05, transparent: false, envMapIntensity: 2 }), .5, .64, [1, 1, 1], 5);
    this.bubbles.visible = true;
    this.fl = {
      glitzer: this.flakes(80, new THREE.OctahedronGeometry(.038, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 1, roughness: .12, envMapIntensity: 3 }), .5, .65, [1, .22, 1], 11),
      gold: this.flakes(110, new THREE.TetrahedronGeometry(.03, 0), new THREE.MeshStandardMaterial({ color: '#ffc94a', metalness: 1, roughness: .22, envMapIntensity: 2.2 }), .49, .66, [1, .3, 1], 22),
      sternenstaub: this.flakes(110, new THREE.IcosahedronGeometry(.017, 0), new THREE.MeshBasicMaterial({ color: '#eaf1ff' }), .49, .66, [1, 1, 1], 33),
    };
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    this.glow.scale.setScalar(3.4); this.root.add(this.glow);
    this.gear = new THREE.Group(); this.root.add(this.gear); this.gearId = undefined; this.parts = {};
  }
  flakes(n, geo, mat, r0, r1, sc, seed) {
    const m = new THREE.InstancedMesh(geo, mat, n); const o = new THREE.Object3D(); const Rn = mulberry(seed);
    for (let i = 0; i < n; i++) { const u = Rn() * 2 - 1, a = Rn() * TAU, rad = r0 + Rn() * (r1 - r0), s = Math.sqrt(1 - u * u); o.position.set(Math.cos(a) * s * rad, u * rad, Math.sin(a) * s * rad); o.rotation.set(Rn() * TAU, Rn() * TAU, Rn() * TAU); const k = .6 + Rn() * .8; o.scale.set(sc[0] * k, sc[1] * k, sc[2] * k); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }
    m.visible = false; this.roll.add(m); return m;
  }
  setConfig(cfg) {
    const c1 = new THREE.Color(cfg.c1), c2 = new THREE.Color(cfg.c2);
    this.coreU.uC1.value.copy(c1); this.coreU.uC2.value.copy(c2);
    this.coreU.uMask.value = patternMask(cfg.pattern || 'uni'); this.coreU.uDark.value = cfg.pattern === 'galaxie' ? 1 : 0;
    const mx = new Set(cfg.mix || []);
    for (const [k, u] of [['leucht', 'uGlow'], ['regenbogen', 'uRainbow'], ['lava', 'uLava'], ['nordlicht', 'uAurora'], ['plasma', 'uPlasma'], ['horizont', 'uVoid'], ['singular', 'uSing']]) this.coreU[u].value = mx.has(k) ? 1 : 0;
    this.fl.glitzer.visible = mx.has('glitzer'); this.fl.gold.visible = mx.has('gold'); this.fl.sternenstaub.visible = mx.has('sternenstaub');
    this.glassMat.color.copy(new THREE.Color('#ffffff').lerp(c1, .08));
    this.glassMat.attenuationColor.copy(new THREE.Color('#ffffff').lerp(c1, .3));
    this.glassMat.iridescence = mx.has('perlmutt') ? 1 : 0; this.glassMat.iridescenceIOR = 1.32; this.glassMat.iridescenceThicknessRange = [180, 620];
    const gc = mx.has('singular') ? '#9a6bff' : mx.has('plasma') ? '#8fd2ff' : mx.has('lava') ? '#ff6a1a' : mx.has('nordlicht') ? '#4dffaa' : mx.has('leucht') ? cfg.c1 : mx.has('horizont') ? '#c070ff' : null;
    this.glow.material.color.set(gc || '#ffffff'); this.baseGlow = gc ? .5 : 0; this.glow.material.opacity = this.baseGlow;
    if (cfg.body !== this.gearId) this.buildGear(cfg.body || null);
  }
  buildGear(id) {
    while (this.gear.children.length) { const c = this.gear.children.pop(); c.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    this.gearId = id; this.parts = {};
    if (!id) return;
    const G = this.gear;
    const std = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: .35, metalness: .2 }, o));
    if (id === 'propeller') {
      const red = std('#ff4d5a', { roughness: .3 }), metal = std('#dfe4ec', { metalness: .9, roughness: .25 }), yel = std('#ffd23d', { roughness: .35 });
      const cap = new THREE.Mesh(new THREE.SphereGeometry(.26, 32, 16, 0, TAU, 0, Math.PI / 2), red); cap.position.y = .58; cap.scale.y = .55; G.add(cap);
      const band = new THREE.Mesh(new THREE.TorusGeometry(.26, .03, 8, 32), metal); band.rotation.x = Math.PI / 2; band.position.y = .58; G.add(band);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(.035, .045, .34, 10), metal); mast.position.y = .82; G.add(mast);
      const hubG = new THREE.Group(); hubG.position.y = 1.0; G.add(hubG);
      hubG.add(new THREE.Mesh(new THREE.SphereGeometry(.075, 16, 12), red));
      for (let i = 0; i < 3; i++) { const p = new THREE.Group(); p.rotation.y = i * TAU / 3; const b = new THREE.Mesh(new THREE.BoxGeometry(.62, .025, .15), yel); b.position.x = .36; b.rotation.x = .28; p.add(b); const tip = new THREE.Mesh(new THREE.BoxGeometry(.1, .03, .155), red); tip.position.x = .64; tip.rotation.x = .28; p.add(tip); hubG.add(p); }
      this.parts.spin = hubG;
    } else if (id === 'duesen') {
      const body = std('#eef1f6', { metalness: .85, roughness: .2 }), dark = std('#2b2f3a', { metalness: .7, roughness: .4 }), accent = std('#ff5468');
      this.parts.flames = [];
      for (const s of [-1, 1]) {
        const e = new THREE.Group(); e.position.set(s * .66, -.08, -.2); G.add(e);
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(.17, .21, .78, 24), body); cyl.rotation.x = Math.PI / 2; e.add(cyl);
        const intake = new THREE.Mesh(new THREE.TorusGeometry(.17, .035, 8, 24), accent); intake.position.z = .39; e.add(intake);
        const noz = new THREE.Mesh(new THREE.CylinderGeometry(.2, .15, .14, 24, 1, true), dark); noz.rotation.x = Math.PI / 2; noz.position.z = -.45; e.add(noz);
        const strut = new THREE.Mesh(new THREE.BoxGeometry(.22, .06, .3), dark); strut.position.set(-s * .18, 0, 0); e.add(strut);
        const flm = new THREE.Mesh(new THREE.ConeGeometry(.14, .9, 18, 1, true), new THREE.MeshBasicMaterial({ color: '#ff9a3c', transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false }));
        flm.rotation.x = -Math.PI / 2; flm.position.z = -.95; e.add(flm);
        const inner = new THREE.Mesh(new THREE.ConeGeometry(.07, .55, 14, 1, true), new THREE.MeshBasicMaterial({ color: '#fff4c8', transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false }));
        inner.rotation.x = -Math.PI / 2; inner.position.z = -.78; e.add(inner);
        const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#ff8a3c', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .8 })); gl.scale.setScalar(.9); gl.position.z = -.6; e.add(gl);
        this.parts.flames.push(flm, inner);
      }
    } else if (id === 'engel') {
      const feather = new THREE.SphereGeometry(1, 18, 12);
      const mats = [std('#ffffff', { roughness: .55, metalness: 0, emissive: new THREE.Color('#fff1cf'), emissiveIntensity: .25 }), std('#fff7e6', { roughness: .55, metalness: 0, emissive: new THREE.Color('#ffe3a8'), emissiveIntensity: .2 })];
      this.parts.wings = [];
      for (const s of [-1, 1]) {
        const w = new THREE.Group(); w.position.set(s * .45, .22, -.22); G.add(w);
        for (let i = 0; i < 9; i++) {
          const piv = new THREE.Group(); piv.rotation.z = -s * (.15 + i * .15); piv.rotation.x = -.35 - i * .03;
          const L = .42 + i * .06 - Math.max(0, i - 6) * .08;
          const f = new THREE.Mesh(feather, mats[i % 2]); f.scale.set(.1, L, .035); f.position.y = L * .92; piv.add(f); w.add(piv);
        }
        this.parts.wings.push({ g: w, s });
      }
      const halo = new THREE.Mesh(new THREE.TorusGeometry(.32, .035, 10, 40), new THREE.MeshStandardMaterial({ color: '#ffd96a', emissive: new THREE.Color('#ffcf4a'), emissiveIntensity: 1.2, metalness: .6, roughness: .3 }));
      halo.rotation.x = Math.PI / 2; halo.position.y = 1.0; G.add(halo); this.parts.halo = halo;
    } else if (id === 'jet') {
      const metal = new THREE.MeshStandardMaterial({ color: '#c9d1dc', metalness: .9, roughness: .22, side: THREE.DoubleSide }), red = new THREE.MeshStandardMaterial({ color: '#ff4655', roughness: .35, side: THREE.DoubleSide });
      const sh = new THREE.Shape(); sh.moveTo(0, .2); sh.lineTo(1.15, -.45); sh.lineTo(1.15, -.62); sh.lineTo(0, -.5); sh.lineTo(0, .2);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: .04, bevelEnabled: true, bevelSize: .015, bevelThickness: .015, bevelSegments: 1 }); geo.rotateX(-Math.PI / 2);
      this.parts.wings = [];
      for (const s of [-1, 1]) {
        const w = new THREE.Group(); w.position.set(s * .42, -.05, 0); w.scale.x = s; G.add(w);
        w.add(new THREE.Mesh(geo, metal));
        const tip = new THREE.Mesh(new THREE.BoxGeometry(.06, .05, .3), red); tip.position.set(1.15, .02, .53); w.add(tip);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(.5, .055, .06), red); stripe.position.set(.6, .02, .1); stripe.rotation.y = .5; w.add(stripe);
        this.parts.wings.push({ g: w, s });
      }
      const fs = new THREE.Shape(); fs.moveTo(0, 0); fs.lineTo(-.55, 0); fs.lineTo(-.7, .55); fs.lineTo(-.45, .55); fs.lineTo(0, 0);
      const fg = new THREE.ExtrudeGeometry(fs, { depth: .035, bevelEnabled: false }); fg.rotateY(-Math.PI / 2);
      const fin = new THREE.Mesh(fg, red); fin.position.set(.018, .5, -.15); G.add(fin);
    }
  }
  update(t, dt, speed = 0) {
    this.coreU.uTime.value = t;
    if (this.parts.spin) this.parts.spin.rotation.y += dt * (14 + speed * 10);
    if (this.parts.flames) for (const f of this.parts.flames) { const k = .8 + Math.random() * .4 + speed * .6; f.scale.set(1, k, 1); }
    if (this.parts.wings) for (const w of this.parts.wings) {
      if (this.gearId === 'engel') { w.g.rotation.z = w.s * (Math.sin(t * 3.2) * .32 - .05); w.g.rotation.y = -w.s * Math.sin(t * 3.2) * .1; }
      else { w.g.rotation.z = Math.sin(t * 1.3) * .04 * w.s; }
    }
    if (this.parts.halo) this.parts.halo.position.y = 1.0 + Math.sin(t * 2) * .04;
    if (this.baseGlow) this.glow.material.opacity = this.baseGlow * (.8 + .2 * Math.sin(t * 2.3));
  }
}

/* =========================================================
   Vorschau-Renderer (Werkstatt, Startbildschirm, Kacheln)
   ========================================================= */
export class Preview {
  constructor() {
    this.canvas = document.createElement('canvas'); this.canvas.className = 'preview3d';
    this.r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); this.r.toneMapping = THREE.ACESFilmicToneMapping; this.r.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(this.r); this.scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; pm.dispose();
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#b9a8ff', 1.2));
    const d = new THREE.DirectionalLight('#ffffff', 2); d.position.set(3, 5, 4); this.scene.add(d);
    // Studio-Hintergrund, damit das Glas etwas zum Brechen hat
    const bg = canvasTex(256, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.55, '#efeaff'); gr.addColorStop(1, '#d9cffd'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.fillStyle = 'rgba(108,77,255,.18)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(30 + i * 45, 200 - (i % 2) * 30, 18, 0, TAU); g.fill(); } });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: bg })); back.position.z = -3; this.scene.add(back);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(.9, 40), new THREE.MeshBasicMaterial({ map: softTex(), transparent: true, depthWrite: false })); floor.rotation.x = -Math.PI / 2; floor.position.y = -.74; this.scene.add(floor);
    this.cam = new THREE.PerspectiveCamera(30, 1, .1, 50); this.cam.position.set(0, .55, 3.6); this.cam.lookAt(0, .08, 0);
    this.rig = new MarbleRig(); this.scene.add(this.rig.root); this.rig.root.rotation.y = -.5;
    this.size = 0;
  }
  setSize(px) { if (px === this.size) return; this.size = px; this.r.setSize(px, px, false); }
  configure(cfg) { this.rig.setConfig(cfg); const hasGear = !!cfg.body; this.cam.position.set(0, hasGear ? .9 : .55, hasGear ? 4.6 : 3.6); this.cam.lookAt(0, hasGear ? .3 : .05, 0); }
  render(t, dt = .016) { this.rig.roll.rotation.y = t * .5; this.rig.roll.rotation.x = Math.sin(t * .4) * .3; this.rig.update(t, dt); this.r.render(this.scene, this.cam); }
  snapshot(cfg, px = 152) { const old = this.size; this.setSize(px); this.configure(cfg); this.render(1.6); const url = this.canvas.toDataURL('image/png'); if (old) this.setSize(old); return url; }
}

/* =========================================================
   Welt
   ========================================================= */
const SKY = [
  [0, '#3a95ee', '#d4eeff', 140, 560],
  [40, '#2e7fe2', '#bfe3ff', 160, 620],
  [85, '#1a4cc2', '#9ccbff', 220, 900],
  [112, '#071034', '#203f92', 600, 2600],
  [160, '#03051a', '#140c3c', 900, 3000],
  [215, '#05031a', '#2b0c4c', 900, 3000],
  [270, '#010006', '#1e0736', 900, 3000],
];
function skyAt(y) {
  y = Math.max(0, y);
  let a = SKY[0], b = SKY[SKY.length - 1];
  for (let i = 0; i < SKY.length - 1; i++) if (y >= SKY[i][0] && y <= SKY[i + 1][0]) { a = SKY[i]; b = SKY[i + 1]; break; }
  if (y > SKY[SKY.length - 1][0]) a = b;
  const k = a === b ? 0 : (y - a[0]) / (b[0] - a[0]);
  return { top: new THREE.Color(a[1]).lerp(new THREE.Color(b[1]), k), bot: new THREE.Color(a[2]).lerp(new THREE.Color(b[2]), k), near: a[3] + (b[3] - a[3]) * k, far: a[4] + (b[4] - a[4]) * k };
}
const ZONE_COLORS = [
  { rail: '#8b5a2b', tie: '#5e3b1d', rough: .65, metal: .05, emi: 0 },
  { rail: '#f4f6ff', tie: '#8fc8ff', rough: .28, metal: .1, emi: 0 },
  { rail: '#cfd8e6', tie: '#6f7d95', rough: .22, metal: .92, emi: 0 },
  { rail: '#e8a064', tie: '#7c4524', rough: .28, metal: .85, emi: 0 },
  { rail: '#4ce3ff', tie: '#2a3f86', rough: .3, metal: .3, emi: 1.6 },
  { rail: '#ffb04a', tie: '#5b1c3c', rough: .3, metal: .3, emi: 1.8 },
];

export class World {
  constructor(canvas) {
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75)); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(52, 1, .1, 3200);
    const pm = new THREE.PMREMGenerator(r); this.scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; pm.dispose();
    this.hemi = new THREE.HemisphereLight('#e2f3ff', '#5d8b4a', 1.15); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff3dd', 2.5); this.sun.position.set(140, 260, 90); this.scene.add(this.sun);
    this.scene.fog = new THREE.Fog('#d4eeff', 140, 560);
    this.updaters = []; this.zones = [];
    this.buildSky();
    this.buildEarth(); this.buildClouds(); this.buildOrbit(); this.buildPlanets(); this.buildNebula(); this.buildHole();
    this.buildTrack();
    this.marble = new MarbleRig(); this.scene.add(this.marble.root);
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(.95, 32), new THREE.MeshBasicMaterial({ map: softTex(), transparent: true, depthWrite: false })); this.scene.add(this.shadow);
    this.buildTrail();
    this.s = 1; this.from = 1; this.to = 1; this.moveT = 1; this.moveDur = 1; this.rollAngle = 0; this.speed = 0;
    this.hopT = 9; this.shakeT = 9; this.swoop = null; this.ending = null;
    this.camPos = V(); this.camLook = V(); this.camInit = false; this.view = { cx: 0, cy: 0 };
    this.tmp = { m: new THREE.Matrix4(), v: V(), q: new THREE.Quaternion() };
    this.onText = () => {}; this.time = 0;
    this.resize();
  }

  /* ---------- Himmel & Sterne ---------- */
  buildSky() {
    this.skyU = { top: { value: new THREE.Color() }, bot: { value: new THREE.Color() } };
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: this.skyU,
      vertexShader: `varying vec3 vW; void main(){ vW=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform vec3 top; uniform vec3 bot; varying vec3 vW; void main(){ float h=clamp(vW.y*.5+.5,0.,1.); vec3 c=mix(bot,top,pow(smoothstep(.3,1.,h),.75)); gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`
    }));
    this.sky.renderOrder = -10; this.scene.add(this.sky);
    const n = 4200, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
    for (let i = 0; i < n; i++) { const u = R() * 2 - 1, a = R() * TAU, s = Math.sqrt(1 - u * u); pos.set([Math.cos(a) * s * 1300, u * 1300, Math.sin(a) * s * 1300], i * 3); c.set(pick(['#ffffff', '#ffffff', '#cfe0ff', '#ffe2c4', '#ffd0f0'])); col.set([c.r, c.g, c.b], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.stars = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    this.scene.add(this.stars);
    this.sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#fff2c0', blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
    this.sunSprite.scale.setScalar(260); this.scene.add(this.sunSprite);
    this.sunDisc = new THREE.Mesh(new THREE.SphereGeometry(22, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff6d6', fog: false })); this.scene.add(this.sunDisc);
  }

  zone(i, yMin, yMax) { const g = new THREE.Group(); g.userData = { yMin, yMax }; this.scene.add(g); this.zones[i] = g; return g; }

  /* ---------- Welt 1: Erde ---------- */
  buildEarth() {
    const Z = this.zone(0, -50, 70);
    const riverZ = x => 78 + Math.sin(x * .02) * 26;
    const H = (x, z) => {
      const d = Math.hypot(x, z);
      let h = (fbm(x * .014 + 3, z * .014 + 7) - .45) * 16 * smooth(28, 80, d);
      const rd = Math.abs(z - riverZ(x)); h -= 5 * (1 - smooth(4, 13, rd)) * smooth(30, 44, d);
      h += smooth(150, 235, d) * (22 + fbm(x * .018, z * .018) * 85);
      return h;
    };
    this.terrainH = H;
    const geo = new THREE.PlaneGeometry(560, 560, 200, 200); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color(), g1 = new THREE.Color('#72c75c'), g2 = new THREE.Color('#3f9a41'), sand = new THREE.Color('#d6c08a'), rock = new THREE.Color('#8e8a7b'), snow = new THREE.Color('#f5f8fc');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = H(x, z); pos.setY(i, h);
      c.copy(g1).lerp(g2, fbm(x * .05, z * .05, 3));
      if (h < .1) c.copy(sand); if (h > 12) c.lerp(rock, smooth(12, 30, h)); if (h > 48) c.lerp(snow, smooth(48, 62, h));
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    Z.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, metalness: 0 })));
    const water = new THREE.Mesh(new THREE.PlaneGeometry(560, 560), new THREE.MeshStandardMaterial({ color: '#3d9de6', roughness: .12, metalness: .15, transparent: true, opacity: .88 }));
    water.rotation.x = -Math.PI / 2; water.position.y = -.9; Z.add(water);

    const okSpot = (x, z) => { const d = Math.hypot(x, z); return d > 24 && Math.abs(z - riverZ(x)) > 10 && H(x, z) > .3 && H(x, z) < 30; };
    const spot = (dmin, dmax, tries = 40) => { for (let k = 0; k < tries; k++) { const a = R() * TAU, d = rr(dmin, dmax), x = Math.cos(a) * d, z = Math.sin(a) * d; if (okSpot(x, z)) return [x, z]; } return null; };
    const o = new THREE.Object3D(), cc = new THREE.Color();
    // Laubbäume
    const NT = 260, trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.18, .28, 1, 6), new THREE.MeshStandardMaterial({ color: '#7a4b2a', roughness: .9 }), NT);
    const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: .8, flatShading: true }), NT * 2);
    let ci = 0;
    for (let i = 0; i < NT; i++) {
      const p = spot(30, 170); if (!p) { o.scale.setScalar(0); o.updateMatrix(); trunks.setMatrixAt(i, o.matrix); crowns.setMatrixAt(ci++, o.matrix); crowns.setMatrixAt(ci++, o.matrix); continue; }
      const [x, z] = p, h = H(x, z), s = rr(1.4, 2.6);
      o.position.set(x, h + s * .6, z); o.rotation.set(0, R() * TAU, 0); o.scale.set(s, s * 1.2, s); o.updateMatrix(); trunks.setMatrixAt(i, o.matrix);
      cc.set(pick(['#4fae4a', '#3f9a3e', '#5fbf4f', '#7cc04a', '#368c3a'])); 
      o.position.set(x, h + s * 1.9, z); o.scale.setScalar(s * 1.15); o.updateMatrix(); crowns.setMatrixAt(ci, o.matrix); crowns.setColorAt(ci++, cc);
      o.position.set(x + s * .45, h + s * 2.35, z - s * .2); o.scale.setScalar(s * .75); o.updateMatrix(); crowns.setMatrixAt(ci, o.matrix); crowns.setColorAt(ci++, cc.clone().offsetHSL(0, 0, .06));
    }
    Z.add(trunks, crowns);
    // Nadelbäume
    const NP = 200, cones = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 2.2, 7), new THREE.MeshStandardMaterial({ roughness: .85, flatShading: true }), NP * 3);
    let pi = 0;
    for (let i = 0; i < NP; i++) {
      const p = spot(60, 200) || [0, -999]; const [x, z] = p, h = p[1] === -999 ? -999 : H(x, z), s = rr(1.3, 2.4);
      cc.set(pick(['#2d7a3c', '#25693a', '#337f44']));
      for (let k = 0; k < 3; k++) { o.position.set(x, h + s * (1 + k * .9), z); o.rotation.set(0, R(), 0); o.scale.setScalar(s * (1.2 - k * .3)); o.updateMatrix(); cones.setMatrixAt(pi, o.matrix); cones.setColorAt(pi++, cc); }
    }
    Z.add(cones);
    // Dorf
    const NH = 16, bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: .8 }), NH);
    const roofG = new THREE.ConeGeometry(1, 1, 4); roofG.rotateY(Math.PI / 4);
    const roofs = new THREE.InstancedMesh(roofG, new THREE.MeshStandardMaterial({ roughness: .6 }), NH);
    const chim = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#9b8775' }), NH);
    const wins = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ffd76a', emissive: new THREE.Color('#ffb83a'), emissiveIntensity: .5 }), NH * 2);
    let hi = 0, wi = 0;
    for (let i = 0; i < 60 && hi < NH; i++) {
      const a = .5 + rr(-.6, .6), d = rr(36, 70), x = Math.cos(a) * d, z = Math.sin(a) * d; if (!okSpot(x, z)) continue;
      const h = H(x, z), w = rr(3, 4.2), dpt = rr(3, 4.5), ht = rr(2.2, 3), rot = a + Math.PI / 2 + rr(-.3, .3);
      o.position.set(x, h + ht / 2 - .2, z); o.rotation.set(0, rot, 0); o.scale.set(w, ht, dpt); o.updateMatrix(); bodies.setMatrixAt(hi, o.matrix); bodies.setColorAt(hi, cc.set(pick(['#fff6e6', '#ffe9d6', '#f2f6ff', '#ffe0e6'])));
      o.position.set(x, h + ht - .2 + 1.05, z); o.scale.set(w * .82, 2.1, dpt * .82); o.updateMatrix(); roofs.setMatrixAt(hi, o.matrix); roofs.setColorAt(hi, cc.set(pick(['#e8574a', '#3f7fd9', '#f2a23a', '#c0453a'])));
      const off = V(w * .25, 0, 0).applyAxisAngle(V(0, 1, 0), rot);
      o.position.set(x + off.x, h + ht + 1.2, z + off.z); o.scale.set(.5, 1.4, .5); o.updateMatrix(); chim.setMatrixAt(hi, o.matrix);
      for (const sx of [-.25, .25]) { const wo = V(w * sx, 0, dpt / 2 + .02).applyAxisAngle(V(0, 1, 0), rot); o.position.set(x + wo.x, h + ht * .55, z + wo.z); o.scale.set(.6, .6, .06); o.updateMatrix(); wins.setMatrixAt(wi++, o.matrix); }
      hi++;
    }
    bodies.count = hi; roofs.count = hi; chim.count = hi; wins.count = wi; Z.add(bodies, roofs, chim, wins);
    // Windmühle
    const wm = new THREE.Group(); const wa = -1.1, wd = 52; const wx = Math.cos(wa) * wd, wz = Math.sin(wa) * wd; wm.position.set(wx, H(wx, wz) - .3, wz); wm.rotation.y = -wa + Math.PI / 2;
    wm.add(at(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.4, 10, 10), new THREE.MeshStandardMaterial({ color: '#f4efe6', roughness: .8 })), { p: V(0, 5, 0) }));
    wm.add(at(new THREE.Mesh(new THREE.ConeGeometry(1.9, 2.6, 10), new THREE.MeshStandardMaterial({ color: '#d9534a', roughness: .6 })), { p: V(0, 11.2, 0) }));
    const blades = new THREE.Group(); blades.position.set(0, 10, 1.9); wm.add(blades);
    const bladeMat = new THREE.MeshStandardMaterial({ color: '#fffaf0', roughness: .7 });
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.4, 7, .12), bladeMat); b.position.y = 4; const p = new THREE.Group(); p.rotation.z = i * TAU / 4; p.add(b); blades.add(p); }
    blades.add(new THREE.Mesh(new THREE.SphereGeometry(.45, 12, 8), new THREE.MeshStandardMaterial({ color: '#6b4226' })));
    Z.add(wm); this.updaters.push((t, dt) => { blades.rotation.z += dt * .8; });
    // Blumen & Steine
    const NF = 900, flw = new THREE.InstancedMesh(new THREE.SphereGeometry(.24, 6, 4), new THREE.MeshStandardMaterial({ roughness: .6 }), NF);
    for (let i = 0; i < NF; i++) { const p = spot(20, 80) || [0, 0]; o.position.set(p[0], H(p[0], p[1]) + .25, p[1]); o.scale.setScalar(rr(.7, 1.3)); o.updateMatrix(); flw.setMatrixAt(i, o.matrix); flw.setColorAt(i, cc.set(pick(['#ff5d8f', '#ffd23d', '#ffffff', '#a26bff', '#ff7a3d', '#ff4d6d']))); }
    Z.add(flw);
    const NR = 90, rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#9a978c', roughness: .95, flatShading: true }), NR);
    for (let i = 0; i < NR; i++) { const p = spot(25, 190) || [0, 0]; o.position.set(p[0], H(p[0], p[1]) + .2, p[1]); o.rotation.set(R() * 3, R() * 3, R() * 3); o.scale.set(rr(.6, 2), rr(.4, 1.3), rr(.6, 2)); o.updateMatrix(); rocks.setMatrixAt(i, o.matrix); }
    Z.add(rocks);
    // Startplattform
    const sp = helixPoint(1); const pad = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 1.2, 32), new THREE.MeshStandardMaterial({ color: '#e9e2d4', roughness: .7 }));
    pad.position.set(sp.x, .4, sp.z); Z.add(pad);
    const flag = new THREE.Group(); flag.position.set(sp.x * .72, 0, sp.z * .72 - 3); Z.add(flag);
    flag.add(at(new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 6, 8), new THREE.MeshStandardMaterial({ color: '#dfe4ec', metalness: .8, roughness: .3 })), { p: V(0, 3, 0) }));
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.3, 10, 4), new THREE.MeshStandardMaterial({ color: '#ff5468', side: THREE.DoubleSide, roughness: .6 })); cloth.position.set(1.1, 5.2, 0); flag.add(cloth);
    const cp = cloth.geometry.attributes.position, cbase = cp.array.slice();
    this.updaters.push((t) => { for (let i = 0; i < cp.count; i++) { const x = cbase[i * 3]; cp.setZ(i, Math.sin(t * 4 + x * 2.5) * .18 * (x + 1.1)); } cp.needsUpdate = true; });
    // Wolken über der Erde, Ballons, Vögel
    this.cloudCluster(Z, 22, 70, 190, 34, 48, 1);
    this.balloons(Z, [[-38, 26, 30, '#ff5d6c', '#ffd23d'], [44, 34, -40, '#3a8bff', '#ffffff'], [60, 22, 46, '#1fc48c', '#6c4dff']]);
    this.birds(Z, 14, 30, 90, 14, 40);
  }
  cloudCluster(Z, n, dmin, dmax, ymin, ymax, scale = 1) {
    const per = 8, m = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: new THREE.Color('#a9bedc'), emissiveIntensity: .18 }), n * per);
    const o = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < n; i++) {
      const a = R() * TAU, d = rr(dmin, dmax), cx = Math.cos(a) * d, cz = Math.sin(a) * d, cy = rr(ymin, ymax), s = rr(3, 6) * scale;
      for (let j = 0; j < per; j++) { o.position.set(cx + rr(-1.6, 1.6) * s, cy + rr(-.2, .5) * s, cz + rr(-1, 1) * s); o.scale.set(s * rr(.7, 1.2), s * rr(.5, .8), s * rr(.7, 1.1)); o.updateMatrix(); m.setMatrixAt(k++, o.matrix); }
    }
    Z.add(m); return m;
  }
  balloons(Z, list) {
    for (const [x, y, z, c1, c2] of list) {
      const g = new THREE.Group(); g.position.set(x, y, z);
      const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20, a = t * Math.PI; const r = Math.sin(a) * (1 - .35 * t) * 2.4 + (t > .85 ? .25 : 0); pts.push(new THREE.Vector2(Math.max(.3, r), 2.6 - t * 5.2 + (t > .9 ? 0 : 0))); }
      pts.reverse();
      const tex = canvasTex(256, 64, (gc) => { for (let i = 0; i < 12; i++) { gc.fillStyle = i % 2 ? c1 : c2; gc.fillRect(i * 256 / 12, 0, 256 / 12 + 1, 64); } });
      const env = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), new THREE.MeshStandardMaterial({ map: tex, roughness: .55 })); g.add(env);
      const bask = new THREE.Mesh(new THREE.BoxGeometry(1, .8, 1), new THREE.MeshStandardMaterial({ color: '#8a5a33', roughness: .9 })); bask.position.y = -4.1; g.add(bask);
      const rope = new THREE.MeshStandardMaterial({ color: '#5a3c22' });
      for (const [rx, rz] of [[-.4, -.4], [.4, -.4], [-.4, .4], [.4, .4]]) { const rp = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.6, 4), rope); rp.position.set(rx, -3, rz); g.add(rp); }
      Z.add(g); const ph = R() * 9, base = g.position.clone();
      this.updaters.push((t) => { g.position.y = base.y + Math.sin(t * .6 + ph) * 1.2; g.rotation.y = t * .05 + ph; });
    }
  }
  birds(Z, n, rmin, rmax, ymin, ymax) {
    const wingG = new THREE.BufferGeometry(); wingG.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, -.25, 0, 0, .25, 1.1, 0, 0]), 3)); wingG.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: '#2a3550', side: THREE.DoubleSide, roughness: .8 });
    for (let i = 0; i < n; i++) {
      const b = new THREE.Group(); const l = new THREE.Mesh(wingG, mat), rw = new THREE.Mesh(wingG, mat); rw.scale.x = -1; b.add(l, rw);
      const body = new THREE.Mesh(new THREE.SphereGeometry(.18, 8, 6), mat); body.scale.z = 2.2; b.add(body);
      const rad = rr(rmin, rmax), y = rr(ymin, ymax), sp = rr(.08, .16) * (R() < .5 ? 1 : -1), ph = R() * TAU, s = rr(.8, 1.3); b.scale.setScalar(s); Z.add(b);
      this.updaters.push((t) => { const a = ph + t * sp; b.position.set(Math.cos(a) * rad, y + Math.sin(t + ph) * 2, Math.sin(a) * rad); b.rotation.y = -a + (sp > 0 ? 0 : Math.PI); const f = Math.sin(t * 8 + ph) * .6; l.rotation.z = f; rw.rotation.z = -f; });
    }
  }

  /* ---------- Welt 2: Wolken ---------- */
  buildClouds() {
    const Z = this.zone(1, 20, 60);
    // Wolkenmeer
    const N = 620, m = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 18, 12), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: new THREE.Color('#b9cbe6'), emissiveIntensity: .22 }), N);
    const o = new THREE.Object3D();
    for (let i = 0; i < N; i++) { const a = R() * TAU, d = 24 + Math.sqrt(R()) * 300, s = rr(4, 11); o.position.set(Math.cos(a) * d, 50 + rr(-2, 2.5), Math.sin(a) * d); o.scale.set(s * rr(1, 1.6), s * rr(.35, .55), s * rr(1, 1.6)); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }
    Z.add(m);
    this.cloudCluster(Z, 30, 40, 220, 62, 100, 1.2);
    // Wolkenschloss
    const castle = new THREE.Group(); castle.position.set(-72, 74, -46); Z.add(castle);
    const isl = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: new THREE.Color('#c8d6ee'), emissiveIntensity: .2 }), 14);
    for (let i = 0; i < 14; i++) { o.position.set(rr(-9, 9), rr(-3, 0), rr(-7, 7)); const s = rr(4, 7); o.scale.set(s, s * .5, s); o.updateMatrix(); isl.setMatrixAt(i, o.matrix); }
    castle.add(isl);
    const wall = new THREE.MeshStandardMaterial({ color: '#f6f0ff', roughness: .6 }), roof = new THREE.MeshStandardMaterial({ color: '#8a6bff', roughness: .45 }), roof2 = new THREE.MeshStandardMaterial({ color: '#ff7ab8', roughness: .45 });
    const keep = new THREE.Mesh(new THREE.BoxGeometry(8, 7, 6), wall); keep.position.y = 4.5; castle.add(keep);
    for (const [x, z, h, mat] of [[-5, -4, 11, roof], [5, -4, 11, roof2], [-5, 4, 9, roof2], [5, 4, 9, roof], [0, 0, 15, roof]]) {
      const tw = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, h, 14), wall); tw.position.set(x, h / 2 + 1, z); castle.add(tw);
      const cn = new THREE.Mesh(new THREE.ConeGeometry(1.8, 3.4, 14), mat); cn.position.set(x, h + 2.7, z); castle.add(cn);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .7), new THREE.MeshStandardMaterial({ color: '#ffd23d', side: THREE.DoubleSide })); fl.position.set(x + .6, h + 5, z); castle.add(fl);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1.6, 6), wall); pole.position.set(x, h + 4.8, z); castle.add(pole);
      this.updaters.push((t) => { fl.rotation.y = Math.sin(t * 2 + x) * .4; });
    }
    for (let i = 0; i < 6; i++) { const w = new THREE.Mesh(new THREE.BoxGeometry(.9, 1.3, .1), new THREE.MeshStandardMaterial({ color: '#ffd76a', emissive: new THREE.Color('#ffb83a'), emissiveIntensity: .7 })); w.position.set(-3 + (i % 3) * 3, 3.5 + Math.floor(i / 3) * 2.6, 3.05); castle.add(w); }
    this.updaters.push((t) => { castle.position.y = 74 + Math.sin(t * .4) * 1.2; });
    // Regenbogen
    const rb = new THREE.Group(); rb.position.set(55, 50, -120); rb.lookAt(0, 50, 0); Z.add(rb);
    ['#ff4d4d', '#ff9a3d', '#ffe03d', '#5fd35a', '#3dbdff', '#5b6bff', '#a54dff'].forEach((c, i) => {
      const t = new THREE.Mesh(new THREE.TorusGeometry(70 - i * 2.2, 1.1, 8, 120, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .5, depthWrite: false, fog: false }));
      rb.add(t);
    });
    // Flugzeug
    const plane = new THREE.Group(); Z.add(plane);
    const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .35, metalness: .2 }), blue = new THREE.MeshStandardMaterial({ color: '#3a8bff', roughness: .4 });
    const fus = new THREE.Mesh(new THREE.CapsuleGeometry(.9, 7, 8, 16), white); fus.rotation.x = Math.PI / 2; plane.add(fus);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(11, .2, 2), white); wing.position.z = .5; plane.add(wing);
    const tailW = new THREE.Mesh(new THREE.BoxGeometry(4, .15, 1.2), white); tailW.position.z = -4; plane.add(tailW);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(.15, 2, 1.6), blue); fin.position.set(0, 1.1, -4); plane.add(fin);
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(.92, .92, 7.2, 16, 1, true), blue); stripe.rotation.x = Math.PI / 2; stripe.scale.set(1, 1, .15); plane.add(stripe);
    this.updaters.push((t) => { const a = t * .09; plane.position.set(Math.cos(a) * 95, 88 + Math.sin(t * .3) * 3, Math.sin(a) * 95); plane.rotation.set(0, -a, .25); });
    this.balloons(Z, [[-30, 70, 46, '#ff8a3d', '#fff3d6'], [70, 82, 30, '#ff5fbf', '#ffffff'], [-58, 92, -10, '#22c3d9', '#ffd23d']]);
    this.birds(Z, 8, 40, 80, 60, 80);
  }

  /* ---------- Welt 3: Mond & Erdumlaufbahn ---------- */
  buildOrbit() {
    const Z = this.zone(2, 70, 200);
    const earthTex = noiseSphereTex(512, 256, (x, y, z, u, v) => {
      const n = n3(x * 1.3, y * 1.3, z * 1.3); const lat = Math.abs(v - .5) * 2;
      if (lat > .86) return [240, 246, 252]; if (n > .55) { const c = n > .66 ? [176, 152, 104] : [76, 160, 84]; return c; }
      const o = mixc([52, 128, 220], [22, 70, 160], Math.min(1, (.55 - n) * 3)); return o.map(Math.round);
    });
    const earth = new THREE.Mesh(new THREE.SphereGeometry(60, 64, 48), new THREE.MeshStandardMaterial({ map: earthTex, roughness: .7 }));
    earth.position.set(-175, 112, -170); Z.add(earth);
    const cloudT = noiseSphereTex(512, 256, (x, y, z) => { const n = n3(x * 2 + 4, y * 2, z * 2 - 3); const a = Math.max(0, (n - .52) * 4); return [255, 255, 255, Math.min(255, a * 255)]; });
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(61, 48, 32), new THREE.MeshStandardMaterial({ map: cloudT, transparent: true, depthWrite: false })); clouds.position.copy(earth.position); Z.add(clouds);
    const atm = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#7cc8ff', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .55 })); atm.scale.setScalar(175); atm.position.copy(earth.position); Z.add(atm);
    this.updaters.push((t, dt) => { earth.rotation.y += dt * .02; clouds.rotation.y += dt * .028; });
    const moonTex = noiseSphereTex(512, 256, (x, y, z, u, v) => {
      let g = 150 + (n3(x * 3, y * 3, z * 3) - .5) * 120;
      for (let i = 0; i < 26; i++) { const cu = hash2(i, 1), cv = .15 + hash2(i, 2) * .7, cr = .02 + hash2(i, 3) * .05; const du = Math.min(Math.abs(u - cu), 1 - Math.abs(u - cu)) * 2, dv = v - cv, d = Math.hypot(du, dv); if (d < cr) g -= 40 * (1 - d / cr); else if (d < cr * 1.25) g += 25; }
      return [g, g * .98, g * .93];
    });
    const moon = new THREE.Mesh(new THREE.SphereGeometry(18, 64, 48), new THREE.MeshStandardMaterial({ map: moonTex, bumpMap: moonTex, bumpScale: 1.2, roughness: .95 }));
    moon.position.set(92, 148, -96); Z.add(moon); this.updaters.push((t, dt) => { moon.rotation.y += dt * .015; });
    // Raumstation
    const st = new THREE.Group(); st.position.set(-58, 132, 62); Z.add(st);
    const metal = new THREE.MeshStandardMaterial({ color: '#d6dce6', metalness: .85, roughness: .3 }), panel = new THREE.MeshStandardMaterial({ color: '#2f5fb8', metalness: .4, roughness: .35, emissive: new THREE.Color('#0b2050'), emissiveIntensity: .4 });
    st.add(at(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 12, 16), metal), { r: new THREE.Euler(0, 0, Math.PI / 2) }));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(7, .7, 12, 48), metal); st.add(ring);
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(6, .1, 3), panel); p.position.set(s * 9.5, 0, 0); st.add(p); }
    this.updaters.push((t, dt) => { ring.rotation.z += dt * .3; st.rotation.y += dt * .05; });
    // Satellit
    const sat = new THREE.Group(); Z.add(sat);
    sat.add(new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.8), new THREE.MeshStandardMaterial({ color: '#e9c46a', metalness: .9, roughness: .35 })));
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(3.6, .06, 1.4), panel); p.position.x = s * 2.6; sat.add(p); }
    const dish = new THREE.Mesh(new THREE.SphereGeometry(.8, 16, 8, 0, TAU, 0, Math.PI / 3), new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide })); dish.position.y = 1.2; sat.add(dish);
    this.updaters.push((t) => { const a = t * .12; sat.position.set(Math.cos(a) * 34, 122 + Math.sin(a * 2) * 4, Math.sin(a) * 34); sat.rotation.set(t * .2, -a, 0); });
    // Rakete
    const rocket = this.makeRocket(); Z.add(rocket);
    this.updaters.push((t) => { const q = (t % 16) / 16; rocket.visible = q < .75; const k = q / .75; rocket.position.set(48, 96 + k * 90, -36); rocket.rotation.y = t * .5; });
  }
  makeRocket() {
    const g = new THREE.Group(); const white = new THREE.MeshStandardMaterial({ color: '#f4f4fa', roughness: .35, metalness: .2 }), red = new THREE.MeshStandardMaterial({ color: '#ff5468', roughness: .4 });
    const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new THREE.Vector2(Math.max(.02, Math.sin(Math.min(1, t * 1.25) * Math.PI / 2) * 1.2 * (t > .8 ? (1 - (t - .8) * 4.6) : 1)), t * 6 - 3)); }
    g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 24), white));
    const nose = new THREE.Mesh(new THREE.ConeGeometry(.55, 1.2, 24), red); nose.position.y = 3.1; g.add(nose);
    for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(.12, 1.6, 1.2), red); const p = new THREE.Group(); p.rotation.y = i * TAU / 3; f.position.set(0, -2.4, 1.2); p.add(f); g.add(p); }
    const win = new THREE.Mesh(new THREE.CircleGeometry(.4, 20), new THREE.MeshStandardMaterial({ color: '#3a8bff', metalness: .5, roughness: .2 })); win.position.set(0, 1, 1.19); g.add(win);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#ffb347', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); flame.scale.set(3, 6, 1); flame.position.y = -4.8; g.add(flame);
    return g;
  }

  /* ---------- Welt 4: Planeten ---------- */
  buildPlanets() {
    const Z = this.zone(3, 120, 260);
    const mars = new THREE.Mesh(new THREE.SphereGeometry(14, 64, 48), new THREE.MeshStandardMaterial({
      map: noiseSphereTex(512, 256, (x, y, z, u, v) => { const n = n3(x * 1.8, y * 1.8, z * 1.8); const lat = Math.abs(v - .5) * 2; if (lat > .88) return [245, 240, 235]; return mixc([226, 120, 70], [120, 40, 26], Math.min(1, Math.max(0, (n - .35) * 2.2))).map(Math.round); }), roughness: .9
    }));
    mars.position.set(92, 170, 70); Z.add(mars);
    const jupT = noiseSphereTex(512, 256, (x, y, z, u, v) => {
      const cols = [[234, 211, 177], [201, 155, 109], [242, 228, 201], [183, 122, 79], [231, 202, 163], [168, 100, 62], [239, 220, 192]];
      const vv = v + (n3(x * 3, y * 3, z * 3) - .5) * .06; const b = Math.floor(vv * 18) % cols.length; let c = cols[(b + cols.length) % cols.length];
      const du = Math.min(Math.abs(u - .3), 1 - Math.abs(u - .3)), dv = (v - .66); if ((du * du) / .0025 + (dv * dv) / .0012 < 1) c = [196, 85, 58];
      return c;
    });
    const jup = new THREE.Mesh(new THREE.SphereGeometry(38, 64, 48), new THREE.MeshStandardMaterial({ map: jupT, roughness: .8 })); jup.position.set(-142, 196, -42); Z.add(jup);
    const sat = new THREE.Group(); sat.position.set(56, 206, -140); sat.rotation.set(.35, 0, .28); Z.add(sat);
    const satT = noiseSphereTex(256, 128, (x, y, z, u, v) => { const c = [[241, 222, 176], [227, 196, 134], [244, 230, 196], [214, 178, 118]]; return c[Math.floor(v * 14) % 4]; });
    sat.add(new THREE.Mesh(new THREE.SphereGeometry(20, 64, 48), new THREE.MeshStandardMaterial({ map: satT, roughness: .8 })));
    const rg = new THREE.RingGeometry(26, 50, 128, 1); const rp = rg.attributes.position, ruv = rg.attributes.uv;
    for (let i = 0; i < rp.count; i++) { const r = Math.hypot(rp.getX(i), rp.getY(i)); ruv.setXY(i, (r - 26) / 24, .5); }
    const ringT = canvasTex(512, 8, (g) => { for (let x = 0; x < 512; x++) { const k = x / 512; const a = (.35 + .6 * Math.abs(Math.sin(k * 40) * Math.sin(k * 7 + 1))) * (k > .62 && k < .66 ? .1 : 1) * (1 - Math.pow(k, 6)); const c = Math.round(200 + 40 * Math.sin(k * 23)); g.fillStyle = `rgba(${c},${c - 20},${c - 60},${a})`; g.fillRect(x, 0, 1, 8); } });
    const ring = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: ringT, transparent: true, side: THREE.DoubleSide, roughness: .8, depthWrite: false })); ring.rotation.x = -Math.PI / 2; sat.add(ring);
    this.updaters.push((t, dt) => { jup.rotation.y += dt * .04; mars.rotation.y += dt * .03; });
    // Asteroidengürtel
    const NA = 460, ast = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#8c8075', roughness: .95, flatShading: true }), NA);
    const o = new THREE.Object3D(); const belt = new THREE.Group(); belt.position.y = 178; Z.add(belt);
    for (let i = 0; i < NA; i++) { const a = R() * TAU, d = rr(36, 82); o.position.set(Math.cos(a) * d, rr(-6, 6), Math.sin(a) * d); o.rotation.set(R() * 3, R() * 3, R() * 3); const s = Math.pow(R(), 2) * 2.4 + .3; o.scale.set(s * rr(.7, 1.3), s * rr(.6, 1), s * rr(.7, 1.3)); o.updateMatrix(); ast.setMatrixAt(i, o.matrix); }
    belt.add(ast); this.updaters.push((t, dt) => { belt.rotation.y += dt * .02; });
    // Komet
    const comet = new THREE.Group(); Z.add(comet);
    const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#cff4ff', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); head.scale.setScalar(8); comet.add(head);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(2.5, 40, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#8fe0ff', transparent: true, opacity: .25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); tail.rotation.z = Math.PI / 2; tail.position.x = 20; comet.add(tail);
    this.updaters.push((t) => { const q = (t % 30) / 30; comet.position.set(260 - q * 520, 220 - q * 30, -120 + q * 60); });
  }

  /* ---------- Welt 5: Sternennebel ---------- */
  buildNebula() {
    const Z = this.zone(4, 170, 320);
    const cols = ['#b44dff', '#ff4dbe', '#3fd0ff', '#ff8a3d', '#5b6bff', '#9b4dff', '#ff5fa0'];
    for (let i = 0; i < 46; i++) {
      const a = R() * TAU, d = rr(70, 320), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex(), color: pick(cols), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: rr(.25, .55), fog: false }));
      sp.position.set(Math.cos(a) * d, rr(195, 285), Math.sin(a) * d); sp.scale.setScalar(rr(50, 150)); sp.material.rotation = R() * TAU; Z.add(sp);
      const ph = R() * 9; this.updaters.push((t) => { sp.material.rotation += .0004; sp.material.opacity = sp.material.opacity * .999 + (.3 + .2 * Math.sin(t * .2 + ph)) * .001; });
    }
    // Galaxie
    const n = 6000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
    for (let i = 0; i < n; i++) { const arm = i % 3, d = Math.pow(R(), .6), a = arm * TAU / 3 + d * 6 + (R() - .5) * .8 / (d + .3); pos.set([Math.cos(a) * d * 70, (R() - .5) * 4 * (1 - d), Math.sin(a) * d * 70], i * 3); c.set(d < .2 ? '#fff1d8' : pick(['#a8c4ff', '#ffffff', '#ff9ad8', '#c7a8ff'])); col.set([c.r, c.g, c.b], i * 3); }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); gg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const gal = new THREE.Points(gg, new THREE.PointsMaterial({ size: 2.6, map: glowTex(), vertexColors: true, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    gal.position.set(-140, 238, -175); gal.rotation.set(.9, 0, .3); Z.add(gal);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#ffe6c0', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); core.scale.setScalar(50); core.position.copy(gal.position); Z.add(core);
    this.updaters.push((t, dt) => { gal.rotation.y += dt * .03; });
    // Sternhaufen
    for (let k = 0; k < 6; k++) {
      const m = 400, p = new Float32Array(m * 3); const cx = rr(-200, 200), cy = rr(205, 280), cz = rr(-200, 200); if (Math.hypot(cx, cz) < 60) continue;
      for (let i = 0; i < m; i++) { const u = R() * 2 - 1, a = R() * TAU, s = Math.sqrt(1 - u * u), d = Math.pow(R(), 2) * 16; p.set([cx + Math.cos(a) * s * d, cy + u * d, cz + Math.sin(a) * s * d], i * 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
      Z.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 2, map: glowTex(), color: pick(['#ffffff', '#cfe0ff', '#ffe0c8']), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
    }
    // Pulsar
    const pul = new THREE.Group(); pul.position.set(98, 226, 86); Z.add(pul);
    pul.add(new THREE.Mesh(new THREE.SphereGeometry(2, 20, 14), new THREE.MeshBasicMaterial({ color: '#eaf7ff' })));
    const pg = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#9fe0ff', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); pg.scale.setScalar(22); pul.add(pg);
    const beams = new THREE.Group(); pul.add(beams);
    for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.ConeGeometry(6, 120, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#8fd8ff', transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); b.position.y = s * 62; b.rotation.z = s > 0 ? Math.PI : 0; beams.add(b); }
    beams.rotation.z = .5;
    this.updaters.push((t, dt) => { beams.rotation.y += dt * 2.2; });
  }

  /* ---------- Welt 6: Schwarzes Loch ---------- */
  buildHole() {
    const Z = this.zone(5, 220, 420);
    const g = new THREE.Group(); g.position.copy(BH); g.rotation.x = .18; Z.add(g); this.bhGroup = g;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); halo.scale.setScalar(70); g.add(halo);
    const hole = new THREE.Mesh(new THREE.SphereGeometry(14, 48, 32), new THREE.MeshBasicMaterial({ color: '#000000', fog: false })); g.add(hole);
    const pr = new THREE.Mesh(new THREE.TorusGeometry(14.6, .35, 12, 96), new THREE.MeshBasicMaterial({ color: '#ffe0b0', fog: false })); pr.rotation.x = Math.PI / 2; g.add(pr);
    this.diskU = { t: { value: 0 } };
    const disk = new THREE.Mesh(new THREE.RingGeometry(16, 62, 160, 6), new THREE.ShaderMaterial({
      uniforms: this.diskU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      vertexShader: `varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform float t; varying vec2 vP; ${NOISE}
      void main(){ float r=length(vP); float a=atan(vP.y,vP.x); float rn=(r-16.)/46.;
        float sw=a+t*.5/(.15+rn);
        float n=fbm(vec3(cos(sw)*3.+rn*6.,sin(sw)*3.,rn*10.-t*.2));
        vec3 c=mix(vec3(1.,.95,.82),vec3(1.,.55,.15),smoothstep(0.,.32,rn)); c=mix(c,vec3(.55,.1,.6),smoothstep(.32,1.,rn));
        float dop=.65+.35*cos(a+1.2);
        float al=(1.-smoothstep(.65,1.,rn))*smoothstep(0.,.04,rn)*(.35+.9*n)*dop;
        gl_FragColor=vec4(c*al*1.5,al); }`
    }));
    disk.rotation.x = -Math.PI / 2; g.add(disk);
    // einfallende Teilchen
    const n = 2600, pa = new Float32Array(n * 3), seed = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { seed.set([R(), R() * TAU, rr(.04, .12)], i * 3); }
    const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute('position', new THREE.BufferAttribute(pa, 3)); pgeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
    pgeo.boundingSphere = new THREE.Sphere(V(), 200);
    this.inU = { t: { value: 0 }, px: { value: 1 } };
    const parts = new THREE.Points(pgeo, new THREE.ShaderMaterial({
      uniforms: this.inU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      vertexShader: `attribute vec3 aSeed; uniform float t; uniform float px; varying float vA; varying float vR;
        void main(){ float k=fract(aSeed.x - t*aSeed.z); float r=16.+k*k*110.; float a=aSeed.y + t*(26./r) ; vec3 p=vec3(cos(a)*r, sin(aSeed.y*7.)*(2.+k*14.)*(1.-k*.3), sin(a)*r);
          vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=px*(2.+3.*(1.-k))*(220./-mv.z); vA=smoothstep(0.,.08,k)*(1.-k*.6); vR=k; }`,
      fragmentShader: `varying float vA; varying float vR; void main(){ float d=length(gl_PointCoord-.5); float a=(1.-smoothstep(0.,.5,d))*vA; vec3 c=mix(vec3(1.,.85,.6),vec3(.7,.4,1.),vR); gl_FragColor=vec4(c*a,a); }`
    }));
    g.add(parts);
    for (const s of [-1, 1]) { const j = new THREE.Mesh(new THREE.ConeGeometry(5, 160, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#a77bff', transparent: true, opacity: .14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); j.position.y = s * 84; j.rotation.z = s > 0 ? Math.PI : 0; g.add(j); }
    this.updaters.push((t) => { this.diskU.t.value = t; this.inU.t.value = t; });
    // Zielplattform
    const top = helixPoint(60.6);
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 2.2, .8, 40), new THREE.MeshStandardMaterial({ color: '#2a1440', metalness: .8, roughness: .25, emissive: new THREE.Color('#ff8a3c'), emissiveIntensity: .25 }));
    plat.position.set(top.x, top.y - .9, top.z); Z.add(plat);
    const prg = new THREE.Mesh(new THREE.TorusGeometry(3.4, .12, 10, 60), new THREE.MeshBasicMaterial({ color: '#ffb04a' })); prg.rotation.x = Math.PI / 2; prg.position.copy(plat.position).add(V(0, .45, 0)); Z.add(prg);
  }

  /* ---------- Bahn ---------- */
  buildTrack() {
    this.gates = [];
    const up = V(0, 1, 0);
    for (let z = 0; z < 6; z++) {
      const zc = ZONE_COLORS[z];
      const s0 = z === 0 ? .55 : z * 10 + .45, s1 = z === 5 ? 60.7 : (z + 1) * 10 + .55;
      const mat = new THREE.MeshStandardMaterial({ color: zc.rail, roughness: zc.rough, metalness: zc.metal, emissive: zc.emi ? new THREE.Color(zc.rail) : new THREE.Color(0), emissiveIntensity: zc.emi });
      const tieMat = new THREE.MeshStandardMaterial({ color: zc.tie, roughness: .6, metalness: zc.metal * .6, emissive: zc.emi ? new THREE.Color(zc.tie) : new THREE.Color(0), emissiveIntensity: zc.emi * .3 });
      for (const side of [-1, 1, 0]) {
        const pts = [];
        for (let s = s0; s <= s1 + 1e-6; s += .08) { const f = frame(s); const p = helixPoint(s).addScaledVector(f.r, side * .56).addScaledVector(f.up, side === 0 ? -.78 : -.42); pts.push(p); }
        const curve = new THREE.CatmullRomCurve3(pts);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, pts.length * 2, side === 0 ? .13 : .085, side === 0 ? 8 : 7, false), side === 0 ? tieMat : mat);
        this.zones[z].add(tube);
      }
      const nt = Math.floor((s1 - s0) / .22), ties = new THREE.InstancedMesh(new THREE.BoxGeometry(1.42, .07, .18), tieMat, nt), o = new THREE.Object3D(), m = new THREE.Matrix4();
      for (let i = 0; i < nt; i++) { const s = s0 + i * .22, f = frame(s); m.makeBasis(f.r, f.up, f.t); o.quaternion.setFromRotationMatrix(m); o.position.copy(helixPoint(s)).addScaledVector(f.up, -.5); o.scale.set(1, 1, 1); o.updateMatrix(); ties.setMatrixAt(i, o.matrix); }
      this.zones[z].add(ties);
      if (z <= 1) {
        const supMat = new THREE.MeshStandardMaterial({ color: z === 0 ? '#6e4a2a' : '#e6ecf8', roughness: .7 });
        for (let s = Math.max(1, s0); s <= Math.min(s1, 12.5); s += .5) { const p = helixPoint(s); const h = p.y - .9; if (h < .5) continue; const c = new THREE.Mesh(new THREE.CylinderGeometry(.12, .16, h, 8), supMat); c.position.set(p.x * 1.0, h / 2, p.z * 1.0); this.zones[0].add(c); }
      }
    }
    for (let L = 1; L <= MAXL; L++) {
      const z = zoneOfLevel(L), zc = ZONE_COLORS[z], f = frame(L), p = helixPoint(L);
      const gm = new THREE.MeshStandardMaterial({ color: zc.rail, metalness: .6, roughness: .3, emissive: new THREE.Color('#ffd23d'), emissiveIntensity: 0 });
      const gate = new THREE.Mesh(new THREE.TorusGeometry(1.55, .075, 10, 48), gm);
      const m = new THREE.Matrix4().makeBasis(f.r, f.up, f.t); gate.quaternion.setFromRotationMatrix(m); gate.position.copy(p).addScaledVector(f.up, .45);
      this.zones[z].add(gate);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex(L), depthWrite: false, transparent: true })); sp.scale.setScalar(1.15); sp.position.copy(p).addScaledVector(f.up, 2.55); this.zones[z].add(sp);
      this.gates[L] = gm;
    }
  }
  setReached(best) { for (let L = 1; L <= MAXL; L++) { const g = this.gates[L]; g.emissiveIntensity = L <= best ? .9 : 0; g.emissive.set(L <= best ? '#ffcf4a' : '#000000'); } }

  /* ---------- Spur ---------- */
  buildTrail() {
    const n = 160; this.trailN = n; this.trailPts = [];
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('aA', new THREE.BufferAttribute(new Float32Array(n), 1)); g.setAttribute('aS', new THREE.BufferAttribute(new Float32Array(n), 1));
    g.boundingSphere = new THREE.Sphere(V(), 1e5);
    this.trailU = { px: { value: 1 }, c1: { value: new THREE.Color('#ffd23d') }, c2: { value: new THREE.Color('#ff5a1a') } };
    this.trail = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.trailU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float aA; attribute float aS; uniform float px; varying float vA; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=aS*px*(36./-mv.z); vA=aA; }`,
      fragmentShader: `uniform vec3 c1; uniform vec3 c2; varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=(1.-smoothstep(0.,.5,d))*vA; gl_FragColor=vec4(mix(c2,c1,vA)*a*1.4,a); }`
    }));
    this.trail.frustumCulled = false; this.scene.add(this.trail); this.trailType = null; this.trailAcc = 0;
  }
  updateTrail(dt, pos) {
    const type = this.forceTrail || this.trailType; const P = this.trailPts;
    if (type) {
      const cfg = type === 'komet' ? { life: 1.5, size: 1.5, every: .02, jit: .05 } : type === 'gold' ? { life: 1.8, size: 1.7, every: .012, jit: .12 } : { life: .7, size: 1.0, every: .025, jit: .22 };
      this.trailAcc += dt;
      while (this.trailAcc > cfg.every) { this.trailAcc -= cfg.every; P.push({ p: pos.clone().add(V((Math.random() - .5) * cfg.jit, (Math.random() - .5) * cfg.jit, (Math.random() - .5) * cfg.jit)), v: V((Math.random() - .5) * cfg.jit, Math.random() * cfg.jit * 1.5, (Math.random() - .5) * cfg.jit), age: 0, life: cfg.life * (.7 + Math.random() * .5), size: cfg.size }); }
    }
    for (const q of P) { q.age += dt; q.p.addScaledVector(q.v, dt); }
    while (P.length && (P[0].age > P[0].life || P.length > this.trailN)) P.shift();
    const pa = this.trail.geometry.attributes.position, aa = this.trail.geometry.attributes.aA, as = this.trail.geometry.attributes.aS;
    for (let i = 0; i < this.trailN; i++) { const q = P[i]; if (q) { pa.setXYZ(i, q.p.x, q.p.y, q.p.z); const k = 1 - q.age / q.life; aa.setX(i, k); as.setX(i, q.size * (.35 + .65 * k)); } else { aa.setX(i, 0); as.setX(i, 0); } }
    pa.needsUpdate = aa.needsUpdate = as.needsUpdate = true;
  }
  setTrailColors(type) {
    const c = type === 'komet' ? ['#e8fbff', '#3aa0ff'] : type === 'gold' ? ['#fff3b0', '#ffaa1a'] : ['#ffe27a', '#ff4a1a'];
    this.trailU.c1.value.set(c[0]); this.trailU.c2.value.set(c[1]);
  }

  /* ---------- Steuerung von außen ---------- */
  setMarble(cfg) { this.marble.setConfig(cfg); this.trailType = cfg.trail || null; if (!this.forceTrail) this.setTrailColors(this.trailType); }
  setLevel(l, { instant = false } = {}) {
    if (instant) { this.s = this.from = this.to = l; this.moveT = 1; this.camInit = false; return; }
    const prevZone = zoneOfLevel(Math.round(this.to));
    this.from = this.s; this.to = l; this.moveT = 0; this.moveDur = Math.min(2.6, .95 + Math.abs(l - this.s) * .22);
    if (zoneOfLevel(l) > prevZone && l > this.s) this.swoop = { t: 0, dur: 3.6 };
  }
  hop() { this.hopT = 0; }
  shake() { this.shakeT = 0; }
  setView(cx, cy) { this.view.cx = cx; this.view.cy = cy; this.applyView(); }
  applyView() { const w = this.W, h = this.H; if (!w) return; this.camera.setViewOffset(w, h, w / 2 - this.view.cx, h / 2 - this.view.cy, w, h); }
  resize() {
    this.W = window.innerWidth; this.H = window.innerHeight;
    this.renderer.setSize(this.W, this.H, false); this.camera.aspect = this.W / this.H; this.camera.updateProjectionMatrix(); this.applyView();
    const px = this.renderer.getPixelRatio() * this.H / 900; this.trailU.px.value = px; this.inU.px.value = px;
  }
  marbleScreen() { const v = this.marble.root.position.clone().project(this.camera); return { x: (v.x + 1) / 2 * this.W, y: (1 - v.y) / 2 * this.H }; }

  /* ---------- Hauptschleife ---------- */
  update(dt, t) {
    this.time = t;
    let speed = 0;
    if (this.moveT < 1) { this.moveT = Math.min(1, this.moveT + dt / this.moveDur); const k = ease(this.moveT); const ns = this.from + (this.to - this.from) * k; const ds = ns - this.s; this.s = ns; this.rollAngle += ds * ARC / MR; speed = Math.abs(ds) / Math.max(dt, 1e-4) * .15; }
    this.speed += (speed - this.speed) * Math.min(1, dt * 5);
    const f = frame(this.s); const pos = helixPoint(this.s).addScaledVector(f.up, .15);
    if (this.hopT < .7) { this.hopT += dt; pos.addScaledVector(f.up, Math.sin(Math.min(1, this.hopT / .7) * Math.PI) * 1.1); }
    if (this.shakeT < .6) { this.shakeT += dt; const k = this.shakeT / .6; pos.addScaledVector(f.r, Math.sin(k * 38) * .18 * (1 - k)); }
    if (!this.ending || !this.ending.ownMarble) {
      this.marble.root.position.copy(pos);
      this.tmp.m.makeBasis(f.r, f.up, f.t); this.marble.root.quaternion.setFromRotationMatrix(this.tmp.m);
      this.marble.roll.rotation.x = this.rollAngle;
      this.shadow.visible = true; this.shadow.position.copy(helixPoint(this.s)).addScaledVector(f.up, -.36); this.shadow.quaternion.setFromRotationMatrix(this.tmp.m); this.shadow.rotateX(-Math.PI / 2);
    }
    this.marble.update(t, dt, this.speed);
    for (const u of this.updaters) u(t, dt);
    if (this.ending) this.updateEnding(dt); else this.updateCamera(dt, f, pos);
    this.updateTrail(dt, this.marble.root.position);
    // Himmel, Nebel, Licht nach Höhe
    const cy = this.camera.position.y, sk = skyAt(cy);
    this.skyU.top.value.copy(sk.top); this.skyU.bot.value.copy(sk.bot); this.scene.fog.color.copy(sk.bot); this.scene.fog.near = sk.near; this.scene.fog.far = sk.far;
    this.sky.position.copy(this.camera.position); this.stars.position.copy(this.camera.position);
    this.stars.material.opacity = smooth(78, 125, cy);
    const space = smooth(90, 125, cy);
    this.hemi.intensity = 1.15 - .6 * space; this.hemi.groundColor.set(space > .5 ? '#2a2050' : '#5d8b4a');
    this.sun.intensity = 2.5 - .4 * space;
    const sd = V(140, 260, 90).normalize().multiplyScalar(1100); this.sunSprite.position.copy(this.camera.position).add(sd); this.sunDisc.position.copy(this.sunSprite.position);
    this.sunSprite.material.opacity = 1 - .55 * space;
    for (const z of this.zones) { const u = z.userData; z.visible = cy > u.yMin - 60 && cy < u.yMax + 90; }
    if (this.ending && this.ending.forceVisible) for (const z of this.zones) z.visible = true;
    this.renderer.render(this.scene, this.camera);
  }
  updateCamera(dt, f, pos) {
    let dist = 10.5, h = 4.6, back = 4.2, ang = 0;
    if (this.swoop) { this.swoop.t += dt; const k = Math.min(1, this.swoop.t / this.swoop.dur), e = Math.sin(Math.PI * k); dist += 20 * e; h += 9 * e; ang = 1.5 * e; if (k >= 1) this.swoop = null; }
    const off = V().addScaledVector(radial(this.s), dist).addScaledVector(V(0, 1, 0), h).addScaledVector(f.t, -back);
    off.applyAxisAngle(V(0, 1, 0), ang + Math.sin(this.time * .15) * .05);
    const want = pos.clone().add(off), look = pos.clone().addScaledVector(f.t, .6).add(V(0, .45, 0));
    const kb = smooth(49, 60, this.s); if (kb > 0) { want.y -= 2.5 * kb; want.addScaledVector(radial(this.s), 3 * kb); look.y += 1.6 * kb; }
    if (!this.camInit) { this.camPos.copy(want); this.camLook.copy(look); this.camInit = true; }
    const k = 1 - Math.exp(-dt * (this.moveT < 1 ? 3.2 : 2.2));
    this.camPos.lerp(want, k); this.camLook.lerp(look, k);
    this.camera.position.copy(this.camPos); this.camera.lookAt(this.camLook);
  }

  /* ---------- Enden ---------- */
  playEnding(id) {
    return new Promise(res => {
      const P = this.marble.root.position.clone();
      this.ending = { id, t: 0, res, objs: [], P, dur: id === 'stern' ? 9 : 10, ownMarble: true, step: -1 };
      this.setupEnding();
    });
  }
  skipEnding() { if (this.ending) this.ending.t = this.ending.dur; }
  addE(o) { this.scene.add(o); this.ending.objs.push(o); return o; }
  setupEnding() {
    const E = this.ending, P = E.P;
    E.camFrom = this.camera.position.clone(); E.lookFrom = this.camLook.clone();
    if (E.id === 'wurm') {
      E.dir = BH.clone().sub(P).normalize();
      E.rings = [];
      for (let i = 0; i < 70; i++) { const c = new THREE.Color().setHSL((i / 70 * 2) % 1, .9, .6); const r = new THREE.Mesh(new THREE.TorusGeometry(4.2 - Math.sin(i / 70 * Math.PI) * 1.2, .14, 8, 48), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); r.position.copy(P).addScaledVector(E.dir, 8 + i * 3.2); r.lookAt(r.position.clone().add(E.dir)); this.addE(r); E.rings.push(r); }
      E.flash = this.flashSprite();
    } else if (E.id === 'stern') {
      E.rays = [];
      for (let i = 0; i < 14; i++) { const s = this.addE(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#fff0b0', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: false }))); s.position.copy(P); E.rays.push(s); }
      E.big = this.addE(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#fff6d0', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: false }))); E.big.position.copy(P);
      E.flash = this.flashSprite();
    } else if (E.id === 'urknall') {
      const n = 7000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
      E.vel = new Float32Array(n * 3); E.tgt = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const u = Math.random() * 2 - 1, a = Math.random() * TAU, s = Math.sqrt(1 - u * u), sp = 10 + Math.random() * 40;
        E.vel.set([Math.cos(a) * s * sp, u * sp, Math.sin(a) * s * sp], i * 3); pos.set([P.x, P.y, P.z], i * 3);
        const arm = i % 3, d = Math.pow(Math.random(), .6), ga = arm * TAU / 3 + d * 6 + (Math.random() - .5) * .7 / (d + .3);
        E.tgt.set([P.x + Math.cos(ga) * d * 40, P.y + (Math.random() - .5) * 3 * (1 - d), P.z + Math.sin(ga) * d * 40], i * 3);
        c.setHSL(Math.random(), .8, .7); col.set([c.r, c.g, c.b], i * 3);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.boundingSphere = new THREE.Sphere(P.clone(), 400);
      E.cloud = this.addE(new THREE.Points(g, new THREE.PointsMaterial({ size: .9, map: glowTex(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }))); E.cloud.visible = false;
      E.core = this.addE(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#ffffff', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: false }))); E.core.position.copy(P);
      E.flash = this.flashSprite();
    } else if (E.id === 'aliens') {
      E.al = [];
      const cols = ['#ff4d6d', '#ffc83d', '#7ad94f', '#22c3d9', '#b04dff', '#ff8a3d', '#3a8bff', '#ff5fbf', '#1fc48c', '#ffffff'];
      for (let i = 0; i < 10; i++) {
        const g = new THREE.Group(); const c = new THREE.Color(cols[i]);
        g.add(new THREE.Mesh(new THREE.SphereGeometry(.6, 32, 24), new THREE.MeshPhysicalMaterial({ color: c, roughness: .08, clearcoat: 1, metalness: .1, emissive: c, emissiveIntensity: .25 })));
        const eye = new THREE.Mesh(new THREE.SphereGeometry(.16, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' })); eye.position.set(0, .15, .52); g.add(eye);
        const pu = new THREE.Mesh(new THREE.SphereGeometry(.08, 10, 8), new THREE.MeshBasicMaterial({ color: '#111' })); pu.position.set(0, .15, .65); g.add(pu);
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .5, 6), new THREE.MeshStandardMaterial({ color: '#ccc' })); ant.position.y = .8; g.add(ant);
        const tip = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), new THREE.MeshBasicMaterial({ color: cols[(i + 3) % 10] })); tip.position.y = 1.07; g.add(tip);
        this.addE(g); E.al.push({ g, a0: i / 10 * TAU, from: P.clone().add(V((Math.random() - .5) * 120, (Math.random() - .3) * 60, (Math.random() - .5) * 120)) });
      }
      const ufo = new THREE.Group();
      ufo.add(at(new THREE.Mesh(new THREE.SphereGeometry(4, 40, 20), new THREE.MeshStandardMaterial({ color: '#c8d0dc', metalness: .9, roughness: .25 })), { s: V(1, .25, 1) }));
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1.7, 32, 16, 0, TAU, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#9fe8ff', transmission: .8, roughness: .05, thickness: .5 })); dome.position.y = .7; ufo.add(dome);
      for (let i = 0; i < 12; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(i / 12, 1, .6) })); l.position.set(Math.cos(i / 12 * TAU) * 3.6, -.2, Math.sin(i / 12 * TAU) * 3.6); ufo.add(l); }
      const beam = new THREE.Mesh(new THREE.ConeGeometry(3, 8, 32, 1, true), new THREE.MeshBasicMaterial({ color: '#9fffd0', transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); beam.position.y = -4.4; ufo.add(beam);
      E.ufo = this.addE(ufo); ufo.position.copy(P).add(V(0, 40, 0));
    } else if (E.id === 'zeit') {
      this.forceTrail = 'gold'; this.setTrailColors('gold'); E.forceVisible = true;
      E.clocks = [];
      const ct = canvasTex(256, 256, (g) => { g.strokeStyle = '#ffe28a'; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 110, 0, TAU); g.stroke(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.beginPath(); g.moveTo(128 + Math.cos(a) * 88, 128 + Math.sin(a) * 88); g.lineTo(128 + Math.cos(a) * 104, 128 + Math.sin(a) * 104); g.stroke(); } g.lineWidth = 12; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 50); g.moveTo(128, 128); g.lineTo(185, 128); g.stroke(); });
      for (let i = 0; i < 8; i++) { const s = this.addE(new THREE.Sprite(new THREE.SpriteMaterial({ map: ct, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .8, fog: false }))); s.scale.setScalar(2.5); E.clocks.push(s); }
      E.flash = this.flashSprite();
    }
  }
  flashSprite() { const s = this.addE(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#ffffff', blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity: 0, fog: false }))); s.scale.setScalar(80); s.renderOrder = 999; return s; }
  camTo(pos, look, k) { this.camera.position.lerp(pos, k); this.camLook.lerp(look, k); this.camera.lookAt(this.camLook); }
  updateEnding(dt) {
    const E = this.ending; E.t += dt; const t = E.t, P = E.P, M = this.marble.root, cam = this.camera;
    const say = (step, a, b) => { if (E.step < step) { E.step = step; this.onText(a, b); } };
    const flashAt = (t0, len = .9) => { if (!E.flash) return; const k = (t - t0) / len; E.flash.material.opacity = k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0; E.flash.position.copy(cam.position).add(cam.getWorldDirection(V()).multiplyScalar(5)); };
    if (E.id === 'wurm') {
      say(0, 'Ein Wurmloch!', 'Halt dich fest …');
      const k = smooth(1.2, 6.2, t), dist = k * k * 230;
      M.position.copy(P).addScaledVector(E.dir, dist); M.lookAt(M.position.clone().add(E.dir)); this.marble.roll.rotation.x += dt * 8;
      E.rings.forEach((r, i) => { r.rotation.z += dt * (1 + i * .02); r.material.opacity = .9 * (1 - smooth(6, 6.6, t)); });
      if (t < 6.4) this.camTo(M.position.clone().addScaledVector(E.dir, -7).add(V(0, 1.6, 0)), M.position.clone().addScaledVector(E.dir, 6), 1 - Math.exp(-dt * 4));
      flashAt(6.1, 1.1);
      if (t > 6.6) {
        say(1, 'Zurück auf der Erde!', 'Durch das Wurmloch bis nach Hause.');
        const home = helixPoint(1).add(V(0, .15 + Math.sin(t * 3) * .1, 0)); M.position.copy(home); E.forceVisible = true;
        if (!E.jumped) { E.jumped = true; cam.position.set(home.x * 2.6, 14, home.z * 2.6 + 6); this.camLook.copy(home); }
        this.camTo(V(home.x * 1.8, 6, home.z * 1.8 + 4), home, 1 - Math.exp(-dt * .8));
      }
    } else if (E.id === 'stern') {
      say(0, 'Was passiert mit deiner Murmel?', 'Sie wird heller und heller …');
      const k = smooth(1, 5.2, t); M.scale.setScalar(1 + k * 5); M.position.copy(P).add(V(0, k * 6, 0));
      E.big.position.copy(M.position); E.big.scale.setScalar(4 + k * 50); E.big.material.opacity = k;
      E.rays.forEach((s, i) => { const a = i / E.rays.length * TAU + t * .4; s.position.copy(M.position); s.material.rotation = a; s.scale.set(3 + k * 6, 30 * k * (0.7 + .3 * Math.sin(t * 3 + i)), 1); s.material.opacity = k * .7; });
      flashAt(5.2, 1);
      if (t > 5.6) say(1, 'Ein neuer Stern!', 'Deine Murmel leuchtet jetzt im Weltall.');
      const dir = radial(60).multiplyScalar(14 + k * 50).add(V(0, 4 + k * 18, 0));
      this.camTo(P.clone().add(dir), M.position, 1 - Math.exp(-dt * 1.5));
    } else if (E.id === 'urknall') {
      say(0, 'Alles zieht sich zusammen …', '');
      const k0 = smooth(.5, 2, t); M.scale.setScalar(Math.max(.001, 1 - k0)); E.core.scale.setScalar(2 + k0 * 6); E.core.material.opacity = k0;
      flashAt(2, 1);
      if (t > 2.2) {
        say(1, 'Urknall!', 'Ein neues Universum entsteht.');
        E.cloud.visible = true; E.core.material.opacity = Math.max(0, 1 - (t - 2.2));
        const pos = E.cloud.geometry.attributes.position, tt = t - 2.2, blend = smooth(2, 7, tt);
        for (let i = 0; i < pos.count; i++) { const ex = P.x + E.vel[i * 3] * Math.min(tt, 2.5) * (1 - blend * .2), ey = P.y + E.vel[i * 3 + 1] * Math.min(tt, 2.5), ez = P.z + E.vel[i * 3 + 2] * Math.min(tt, 2.5); pos.setXYZ(i, ex + (E.tgt[i * 3] - ex) * blend, ey + (E.tgt[i * 3 + 1] - ey) * blend, ez + (E.tgt[i * 3 + 2] - ez) * blend); }
        pos.needsUpdate = true; E.cloud.rotation.y = 0;
      }
      const a = t * .25; this.camTo(P.clone().add(V(Math.cos(a) * (12 + smooth(2, 6, t) * 60), 6 + smooth(2, 6, t) * 30, Math.sin(a) * (12 + smooth(2, 6, t) * 60))), P, 1 - Math.exp(-dt * 1.8));
    } else if (E.id === 'aliens') {
      say(0, 'Da kommt Besuch!', '');
      M.position.copy(P).add(V(0, Math.sin(t * 2) * .2, 0));
      E.al.forEach((o, i) => { const k = smooth(.5 + i * .15, 3.5 + i * .15, t); const a = o.a0 + t * .8; const ring = P.clone().add(V(Math.cos(a) * 4.5, Math.sin(t * 2 + i) * .6 + .5, Math.sin(a) * 4.5)); o.g.position.copy(o.from).lerp(ring, ease(k)); o.g.lookAt(P); o.g.rotation.z = Math.sin(t * 4 + i) * .2; });
      const ku = smooth(3.5, 6, t); E.ufo.position.copy(P).add(V(0, 40 - ku * 31, 0)); E.ufo.rotation.y += dt * 1.2;
      if (t > 4) say(1, 'Die Murmel-Aliens begrüßen dich!', 'Du bist die erste Erd-Murmel, die es bis hierher geschafft hat.');
      const a = t * .3; this.camTo(P.clone().add(V(Math.cos(a) * 19, 4 + ku * 6, Math.sin(a) * 19)), P.clone().add(V(0, ku * 4, 0)), 1 - Math.exp(-dt * 2));
    } else if (E.id === 'zeit') {
      say(0, 'Zeitreise!', 'Zurück zum Anfang – mit goldener Spur.');
      const k = smooth(.8, 8.2, t), s = 60 - k * 59; const f = frame(s); const pos = helixPoint(s).addScaledVector(f.up, .15);
      M.position.copy(pos); this.tmp.m.makeBasis(f.r, f.up, f.t); M.quaternion.setFromRotationMatrix(this.tmp.m); this.marble.roll.rotation.x -= dt * 30 * Math.sin(Math.PI * k);
      E.clocks.forEach((c, i) => { const a = i / E.clocks.length * TAU + t * 2; c.position.copy(pos).add(V(Math.cos(a) * 2.6, Math.sin(a * 1.3) * .8 + .5, Math.sin(a) * 2.6)); c.material.rotation = -t * 4; });
      const off = radial(s).multiplyScalar(13).add(V(0, 6, 0)); this.camTo(pos.clone().add(off), pos, 1 - Math.exp(-dt * 4));
      flashAt(8.6, 1);
    }
    if (t >= E.dur) this.endEnding();
  }
  endEnding() {
    const E = this.ending; if (!E) return;
    for (const o of E.objs) { this.scene.remove(o); o.traverse(c => { if (c.geometry) c.geometry.dispose(); }); }
    this.marble.root.scale.setScalar(1); this.forceTrail = null; this.setTrailColors(this.trailType); this.trailPts.length = 0;
    this.ending = null; this.camInit = false; this.s = this.from = this.to = MAXL; this.moveT = 1;
    E.res();
  }
}
