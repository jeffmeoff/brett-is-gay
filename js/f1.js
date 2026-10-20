// brettisgay.com: F1 Reaction Test (ported from the original site, no frameworks)
(() => {
  const $ = (id) => document.getElementById(id);
  const KEY = 'brett.best.f1';
  const store = {
    get() { try { return parseFloat(localStorage.getItem(KEY)) || null; } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(KEY, String(Math.round(v))); } catch (e) {} }
  };

  const root = $('f1'), statusText = $('f1-status');
  const modal = $('f1-modal'), mTitle = $('f1-modal-title'), mTime = $('f1-modal-time'),
        mDesc = $('f1-modal-desc'), mNew = $('f1-modal-new'), mBest = $('f1-modal-best'), mBtn = $('f1-modal-btn');
  const bestEl = $('best');

  const ranks = [
    { threshold: 100, text: "False Start! Pure luck. Humans physically can't react in under 100ms!", cls: 'c-red' },
    { threshold: 150, text: 'Faster than Brett closing his incognito tabs when someone walks in.', cls: 'c-yellow' },
    { threshold: 200, text: 'Faster than Brett changing the playlist from Ariana Grande to Joe Rogan when the boys get in the car.', cls: 'c-yellow' },
    { threshold: 250, text: 'Elite! Professional F1 Driver.', cls: 'c-green' },
    { threshold: 300, text: 'Great! Olympic Sprinter off the blocks.', cls: 'c-blue' },
    { threshold: 400, text: 'Fast! A cheetah pouncing on its prey.', cls: 'c-dark' },
    { threshold: 600, text: 'Average. You have the reflexes of a house cat.', cls: 'c-gray' },
    { threshold: 1000, text: 'Sluggish. Slower than a Galapagos tortoise.', cls: 'c-gray' },
    { threshold: Infinity, text: "Glacial. You're a three-toed sloth.", cls: 'c-gray' }
  ];

  let state = 'WAITING', startTime = 0, timeouts = [];
  let best = store.get();
  const fmt = (ms) => (ms / 1000).toFixed(3) + 's';
  const showBest = () => { bestEl.textContent = 'Best: ' + (best ? fmt(best) : '--'); };
  showBest();

  const setLight = (i, on) => { $('light-' + i + '-a').classList.toggle('on', on); $('light-' + i + '-b').classList.toggle('on', on); };
  const allOff = () => { for (let i = 1; i <= 5; i++) setLight(i, false); };
  const clearAll = () => { timeouts.forEach(clearTimeout); timeouts = []; };

  function openModal(title, time, timeCls, desc, descCls, isNew) {
    mTitle.textContent = title;
    mTime.textContent = time; mTime.className = 'dlg__big ' + timeCls;
    mDesc.textContent = desc; mDesc.className = descCls;
    mNew.hidden = !isNew;
    mBest.textContent = best ? 'Ur best: ' + fmt(best) : '';
    modal.hidden = false;
    mBtn.focus({ preventScroll: true });
  }

  function reset() {
    state = 'WAITING'; clearAll(); allOff();
    statusText.textContent = 'Tap anywhere to start';
    statusText.hidden = false;
    modal.hidden = true;
  }

  function start() {
    state = 'STARTING';
    statusText.hidden = true; modal.hidden = true;
    allOff(); clearAll();
    for (let i = 1; i <= 5; i++) {
      timeouts.push(setTimeout(() => {
        setLight(i, true);
        if (i === 5) {
          state = 'READY';
          const hold = Math.random() * 4000 + 200;
          timeouts.push(setTimeout(() => { allOff(); state = 'GO'; startTime = performance.now(); }, hold));
        }
      }, i * 1000));
    }
  }

  function tap() {
    if (state === 'WAITING') start();
    else if (state === 'STARTING' || state === 'READY') {
      state = 'FALSE_START'; clearAll(); allOff();
      openModal('JUMPED THE GUN!', '---', 'c-red', 'You tapped before the lights went out.', 'c-dark', false);
    } else if (state === 'GO') {
      const ms = performance.now() - startTime;
      state = 'FINISHED';
      const rank = ranks.find((r) => ms <= r.threshold);
      // under 100 ms is a lucky guess, so it doesn't count as a best time
      const isNew = ms >= 100 && (!best || ms < best);
      if (isNew) { best = ms; store.set(ms); showBest(); }
      openModal('Reaction time', fmt(ms), 'c-blue', rank.text, rank.cls, isNew);
    }
  }

  mBtn.addEventListener('click', reset);
  root.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    if (e.target.closest('button') || e.target.closest('#f1-modal')) return;
    e.preventDefault();
    tap();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.code === 'Space' || e.key === ' ') && modal.hidden) { e.preventDefault(); tap(); }
  });
  window.addEventListener('pagehide', clearAll);
  window.addEventListener('pageshow', (e) => { if (e.persisted) reset(); });
  reset();
})();
