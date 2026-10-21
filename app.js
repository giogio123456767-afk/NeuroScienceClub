// ===== EDIT ME =====
const CLUB_NAME = "Neuroscience Club";
// ===================

const PAGES = [["/", "Gallery"], ["/submit.html", "Submit"], ["/officers.html", "Officers"], ["/admin.html", "Admin"]];
const here = location.pathname.replace(/index\.html$/, "");
document.body.insertAdjacentHTML("afterbegin",
  `<canvas id="net"></canvas><nav class="glass"><a class="brand" href="/"><i></i>${CLUB_NAME}</a>` +
  PAGES.map(([h, t]) => `<a class="l${here === h || here === h.replace(".html", "") ? " on" : ""}" href="${h}">${t}</a>`).join("") + `</nav>`);

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Drifting neuron network background
(() => {
  const c = document.getElementById("net"), x = c.getContext("2d");
  if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  let w, h, n = [];
  const rs = () => { w = c.width = innerWidth; h = c.height = innerHeight; n = Array.from({ length: Math.min(70, w * h / 22000 | 0) }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25 })); };
  rs(); addEventListener("resize", rs);
  (function f() {
    x.clearRect(0, 0, w, h);
    for (const p of n) { p.x = (p.x + p.vx + w) % w; p.y = (p.y + p.vy + h) % h; x.fillStyle = "rgba(124,242,212,.55)"; x.beginPath(); x.arc(p.x, p.y, 1.6, 0, 7); x.fill(); }
    for (let i = 0; i < n.length; i++) for (let j = i + 1; j < n.length; j++) {
      const d = Math.hypot(n[i].x - n[j].x, n[i].y - n[j].y);
      if (d < 150) { x.strokeStyle = `rgba(138,164,255,${.18 * (1 - d / 150)})`; x.beginPath(); x.moveTo(n[i].x, n[i].y); x.lineTo(n[j].x, n[j].y); x.stroke(); }
    }
    requestAnimationFrame(f);
  })();
})();
