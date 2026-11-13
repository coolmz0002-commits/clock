const $ = id => document.getElementById(id), NS = 'http://www.w3.org/2000/svg';
const pad = n => String(n).padStart(2, '0');
let h24 = false;

// Load saved settings (24-hour mode and colour theme)
try {
  h24 = localStorage.getItem('clock24') === '1';
  const c = localStorage.getItem('clockc');
  if (c) document.documentElement.dataset.c = c;
} catch (e) {}

// Build the clock dial: 60 tick marks and 12 numbers
const ticks = $('ticks'), nums = $('nums');
for (let i = 0; i < 60; i++) {
  const l = document.createElementNS(NS, 'line'), big = i % 5 === 0;
  l.setAttribute('class', 'tick' + (big ? ' big' : ''));
  l.setAttribute('x1', 200); l.setAttribute('x2', 200);
  l.setAttribute('y1', 14); l.setAttribute('y2', big ? 32 : 24);
  l.setAttribute('transform', 'rotate(' + i * 6 + ' 200 200)');
  ticks.appendChild(l);
}
for (let i = 1; i <= 12; i++) {
  const t = document.createElementNS(NS, 'text'), a = i * Math.PI / 6;
  t.setAttribute('class', 'num');
  t.setAttribute('x', 200 + Math.sin(a) * 148);
  t.setAttribute('y', 200 - Math.cos(a) * 148);
  t.textContent = i;
  nums.appendChild(t);
}

const rot = (el, d) => el.setAttribute('transform', 'rotate(' + d + ' 200 200)');

// Update a digit and play the bounce animation when it changes
function setT(el, v) {
  if (el.textContent !== v) {
    el.textContent = v;
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  }
}

let lastS = -1;
function ripple() {
  const r = document.createElement('div');
  r.className = 'ripple';
  $('clock').appendChild(r);
  setTimeout(() => r.remove(), 1700);
}

// Main loop: moves the hands smoothly and updates the digital clock every second
function frame() {
  const n = new Date(), ms = n.getMilliseconds();
  const s = n.getSeconds() + ms / 1000, m = n.getMinutes() + s / 60, h = (n.getHours() % 12) + m / 60;

  // Smooth sweeping second hand with a small tick bounce
  const sd = s * 6, over = ms < 120 ? Math.sin(ms / 120 * Math.PI) * 1.2 : 0;
  rot($('hS'), sd + over); rot($('hM'), m * 6); rot($('hH'), h * 30);

  const sec = n.getSeconds();
  if (sec !== lastS) {
    lastS = sec;
    const H = n.getHours();
    setT($('dH'), h24 ? pad(H) : String(H % 12 || 12));
    setT($('dM'), pad(n.getMinutes()));
    setT($('dS'), pad(sec));
    $('dA').style.display = h24 ? 'none' : '';
    $('dA').textContent = H < 12 ? 'AM' : 'PM';
    $('date').textContent = n.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const p = (H * 3600 + n.getMinutes() * 60 + sec) / 86400 * 100;
    $('bar').style.width = p + '%';
    $('pct').textContent = 'Day progress · ' + p.toFixed(1) + '%';

    ripple();
    if (sec === 0 && n.getMinutes() === 0) burst(60); // burst on the hour
  }
  requestAnimationFrame(frame);
}

// 3D tilt effect following the mouse
const clock = $('clock');
$('stage').addEventListener('pointermove', e => {
  const r = clock.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
  clock.style.transform = 'rotateY(' + x * 22 + 'deg) rotateX(' + (-y * 22) + 'deg)';
});
$('stage').addEventListener('pointerleave', () => clock.style.transform = '');

// Particle background
const cv = $('fx'), cx = cv.getContext('2d');
let W, H, P = [], mouse = { x: -999, y: -999 };
function size() { W = cv.width = innerWidth; H = cv.height = innerHeight }
addEventListener('resize', size); size();

for (let i = 0; i < 70; i++) {
  P.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4, r: Math.random() * 2 + .6, life: -1 });
}
addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY });

// Burst of particles from the centre of the clock
function burst(k) {
  const r = clock.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  for (let i = 0; i < k; i++) {
    const a = Math.random() * 6.283, v = 2 + Math.random() * 5;
    P.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * 3 + 1, life: 1 });
  }
}
clock.addEventListener('click', () => burst(50));

function col() { return getComputedStyle(document.documentElement).getPropertyValue('--a').trim() || '#22d3ee' }
let C = col(); setInterval(() => C = col(), 500);

function draw() {
  cx.clearRect(0, 0, W, H); cx.fillStyle = C; cx.strokeStyle = C;
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i]; p.x += p.vx; p.y += p.vy;
    if (p.life >= 0) {
      p.life -= .015; p.vx *= .97; p.vy *= .97;
      if (p.life <= 0) { P.splice(i, 1); continue }
    } else {
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
      if (d < 120) { p.x += dx / d * 1.5; p.y += dy / d * 1.5 }
    }
    cx.globalAlpha = p.life >= 0 ? p.life : .7;
    cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.283); cx.fill();
  }
  // Lines between nearby particles
  for (let i = 0; i < P.length; i++) {
    if (P[i].life >= 0) continue;
    for (let j = i + 1; j < P.length; j++) {
      if (P[j].life >= 0) continue;
      const d = Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y);
      if (d < 110) {
        cx.globalAlpha = (1 - d / 110) * .35;
        cx.beginPath(); cx.moveTo(P[i].x, P[i].y); cx.lineTo(P[j].x, P[j].y); cx.stroke();
      }
    }
  }
  cx.globalAlpha = 1; requestAnimationFrame(draw);
}

// Controls: colour themes, 12h/24h, dark/light mode
document.querySelectorAll('.sw').forEach(s => s.onclick = () => {
  document.documentElement.dataset.c = s.dataset.c;
  try { localStorage.setItem('clockc', s.dataset.c) } catch (e) {}
  burst(25);
});
$('fmt').onclick = () => {
  h24 = !h24;
  try { localStorage.setItem('clock24', h24 ? '1' : '0') } catch (e) {}
  lastS = -1;
};
$('mode').onclick = () => {
  const r = document.documentElement;
  const dark = r.dataset.theme ? r.dataset.theme === 'dark' : !matchMedia('(prefers-color-scheme:light)').matches;
  r.dataset.theme = dark ? 'light' : 'dark';
};

frame(); draw();