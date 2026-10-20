// brettisgay.com homepage: tiny vanilla JS (hit counter, MIDI toggle, best scores, toasts)
(() => {
  const $ = (s) => document.querySelector(s);
  const toast = (msg) => {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600);
  };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  // Old-style hash links (#breakout, #games/breakout) forward to the game's own page
  const routes = { f1: 'f1-reaction', 'f1-reaction': 'f1-reaction', breakout: 'breakout', 'connect-four': 'connect-four', connect4: 'connect-four', matrix: 'matrix', 'matrix-mode': 'matrix' };
  const route = () => {
    const m = location.hash.match(/^#(?:games\/)?([\w-]+)$/);
    if (m && routes[m[1]]) { location.replace('games/' + routes[m[1]] + '/'); return true; }
    return false;
  };
  if (route()) return;
  window.addEventListener('hashchange', route);

  // Fake hit counter: starts at 13,337 and goes up 1 per visit on this device
  const n = (parseInt(store.get('bigHits') || '13336', 10) || 13336) + 1;
  store.set('bigHits', n);
  $('#hits').textContent = String(n).padStart(7, '0');

  // Email: assembled at runtime so scrapers don't see a plain address in the HTML
  const mail = $('#mail');
  if (mail) {
    const addr = ['brettisgaydotcom', 'gmail.com'].join('@');
    mail.href = 'mailto:' + addr + '?subject=Brett%20photos';
    mail.textContent = addr;
  }

  // Best scores saved by the games on this device
  const best = {
    f1: (v) => 'Ur best: ' + (v / 1000).toFixed(3) + 's',
    breakout: (v) => 'Ur high score: ' + Number(v).toLocaleString(),
    c4: (v) => { const r = JSON.parse(v); return 'Ur record: ' + r.w + 'W ' + r.l + 'L ' + r.d + 'D'; }
  };
  document.querySelectorAll('[data-best]').forEach((el) => {
    const v = store.get('brett.best.' + el.dataset.best);
    if (!v) return;
    try { el.textContent = best[el.dataset.best](v); el.hidden = false; } catch (e) {}
  });

  // Coming-soon games
  document.querySelectorAll('.game.is-disabled').forEach((a) =>
    a.addEventListener('click', () => toast('Under construction! Check back soon 🚧')));

  // Webring "Random" goes to a random game
  const ring = $('#ringRandom');
  if (ring) ring.addEventListener('click', (e) => {
    const g = ['f1-reaction', 'breakout', 'connect-four', 'matrix'];
    e.preventDefault(); location.href = 'games/' + g[Math.floor(Math.random() * g.length)] + '/';
  });

  // Guestbook is a static mock for now (a real one is a later upgrade)
  $('#gbForm').addEventListener('submit', (e) => {
    e.preventDefault();
    $('#gbNote').textContent = 'Thx 4 signing!!! The guestbook is still under construction, so nothing was saved yet.';
  });

  // "MIDI" toggle: an original 8-bar chiptune loop made with Web Audio. Off by default;
  // the AudioContext is only created after the user taps the button.
  let ctx = null, timer = null, step = 0;
  const notes = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1047, 988, 784, 659, 587];
  const bass = [131, 131, 175, 175, 147, 147, 196, 196];
  const beep = (f, t, len, type, vol) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + len);
  };
  const tick = () => {
    const t = ctx.currentTime + 0.02;
    beep(notes[step % 16], t, 0.18, 'square', 0.05);
    if (step % 2 === 0) beep(bass[(step / 2) % 8], t, 0.3, 'triangle', 0.08);
    step++;
  };
  const btn = $('#midi'), state = $('#midiState');
  btn.addEventListener('click', () => {
    const on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', on); state.textContent = on ? 'ON' : 'OFF';
    if (on) {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume(); timer = setInterval(tick, 200);
    } else { clearInterval(timer); }
  });
})();
