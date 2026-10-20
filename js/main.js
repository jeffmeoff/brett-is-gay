// brettisgay.com homepage: tiny vanilla JS (GoatCounter hit counter, Born This Way player, best scores, toasts)
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

  // Ticker: scroll at ~70 px/s whatever the text length
  const tk = document.querySelector('.ticker__track .ticker__full');
  if (tk) document.querySelector('.ticker__track').style.animationDuration = Math.max(20, tk.offsetWidth / 70) + 's';

  // Old-style hash links (#breakout, #games/breakout) forward to the game's own page
  const routes = { f1: 'f1-reaction', 'f1-reaction': 'f1-reaction', breakout: 'breakout', 'connect-four': 'connect-four', connect4: 'connect-four', matrix: 'matrix', 'matrix-mode': 'matrix' };
  const route = () => {
    const m = location.hash.match(/^#(?:games\/)?([\w-]+)$/);
    if (m && routes[m[1]]) { location.replace('games/' + routes[m[1]] + '/'); return true; }
    return false;
  };
  if (route()) return;
  window.addEventListener('hashchange', route);

  // Real hit counters from GoatCounter. Keep the dashes if blocked (ad blockers etc.).
  // Start date shown in the label lives in index.html (#hitsSince).
  const gc = (q, el, pad) => fetch('https://brettisgay.goatcounter.com/counter/TOTAL.json' + q)
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((d) => {
      const n = parseInt(String(d.count).replace(/\D/g, ''), 10);
      if (!isNaN(n) && el) el.textContent = String(n).padStart(pad, '0');
    })
    .catch(() => {});
  gc('', $('#hits'), 7);
  // "This month": from the 1st of the current month, in the visitor's local time
  const now = new Date();
  const m1 = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01';
  gc('?start=' + m1, $('#hitsMonth'), 5);

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
    a.addEventListener('click', () => toast('Coming soon!!! Check back l8r')));

  // Webring "Random" goes to a random game
  const ring = $('#ringRandom');
  if (ring) ring.addEventListener('click', (e) => {
    const g = ['f1-reaction', 'breakout', 'connect-four', 'matrix'];
    e.preventDefault(); location.href = 'games/' + g[Math.floor(Math.random() * g.length)] + '/';
  });

  // "MIDI": official Born This Way video (youtube-nocookie). Nothing loads until tapped.
  const midi = $('#midi'), player = $('#player'), screen = $('#playerScreen');
  const closePlayer = () => { screen.textContent = ''; player.hidden = true; midi.setAttribute('aria-expanded', 'false'); };
  midi.addEventListener('click', () => {
    if (!player.hidden) { closePlayer(); return; }
    const f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/sskP6PSfP1M?autoplay=1&playsinline=1&rel=0';
    f.title = 'Lady Gaga - Born This Way (Official Audio)';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    screen.appendChild(f); player.hidden = false; midi.setAttribute('aria-expanded', 'true');
  });
  $('#playerClose').addEventListener('click', closePlayer);
})();
