// brettisgay.com: Matrix Mode (ported from the original site). Rain fills the game window.
(() => {
  const canvas = document.getElementById('matrix-canvas');
  const box = document.getElementById('mx');
  const ctx = canvas.getContext('2d');
  const input = document.getElementById('matrix-phrase-input');
  const controls = document.getElementById('matrix-controls');
  const modeToggle = document.getElementById('matrix-mode-toggle');
  const speedSlider = document.getElementById('matrix-speed-slider');

  const fontSize = 16;
  const brettPhrase = 'BRETT IS GAY   ';
  const classicChars = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*';
  let phrase = (input.value || ' ') + '   ';
  let classic = false;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) speedSlider.value = 12; // gentler rain for people who asked for less motion
  let fps = parseInt(speedSlider.value, 10);
  let interval = 1000 / fps, then = 0, drops = [];

  const newDrop = () => {
    const isBrett = Math.random() < 0.04;
    return { y: Math.random() * (canvas.height / fontSize), charIndex: isBrett ? 0 : Math.floor(Math.random() * phrase.length), isBrettCol: isBrett };
  };
  function resize() {
    const r = box.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width));
    canvas.height = Math.max(1, Math.round(r.height));
    const columns = Math.floor(canvas.width / fontSize);
    const next = [];
    for (let i = 0; i < columns; i++) next[i] = drops[i] || newDrop();
    drops = next;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  input.addEventListener('input', () => {
    phrase = (input.value.length > 0 ? input.value : ' ') + '   ';
    drops.forEach((d) => { if (d.charIndex >= phrase.length) d.charIndex = Math.floor(Math.random() * phrase.length); });
  });
  modeToggle.addEventListener('click', () => {
    classic = !classic;
    if (classic) {
      modeToggle.textContent = 'Switch to Custom Text';
      input.style.display = 'none';
      drops.forEach((d) => { d.y = Math.random() * (canvas.height / fontSize); d.isBrettCol = Math.random() < 0.04; if (d.isBrettCol) d.charIndex = 0; });
    } else {
      modeToggle.textContent = 'Enable Classic Matrix';
      input.style.display = '';
    }
  });
  speedSlider.addEventListener('input', () => { fps = parseInt(speedSlider.value, 10); interval = 1000 / fps; });
  controls.addEventListener('click', (e) => e.stopPropagation());
  canvas.addEventListener('click', () => {
    controls.classList.toggle('hidden-ui');
    if (controls.classList.contains('hidden-ui')) input.blur();
  });

  function draw() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = fontSize + 'px "Courier New", monospace';
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      let text, prevText;
      const src = classic ? (d.isBrettCol ? brettPhrase : null) : phrase;
      if (src) {
        if (d.charIndex >= src.length) d.charIndex = 0;
        text = src.charAt(d.charIndex);
        prevText = src.charAt(d.charIndex - 1 < 0 ? src.length - 1 : d.charIndex - 1);
        d.charIndex = (d.charIndex + 1) % src.length;
      } else {
        text = classicChars.charAt(Math.floor(Math.random() * classicChars.length));
        prevText = classicChars.charAt(Math.floor(Math.random() * classicChars.length));
      }
      if (prevText !== ' ') { ctx.fillStyle = '#0F0'; ctx.fillText(prevText, i * fontSize, (d.y - 1) * fontSize); }
      if (text !== ' ') {
        ctx.fillStyle = '#CEFFCE'; ctx.shadowBlur = 4; ctx.shadowColor = '#0F0';
        ctx.fillText(text, i * fontSize, d.y * fontSize);
        ctx.shadowBlur = 0;
      }
      if (d.y * fontSize > canvas.height && Math.random() > 0.975) {
        d.y = 0;
        if (!classic) d.charIndex = Math.floor(Math.random() * phrase.length);
        else { d.isBrettCol = Math.random() < 0.04; if (d.isBrettCol) d.charIndex = 0; }
      }
      d.y++;
    }
  }
  function animate(now) {
    requestAnimationFrame(animate);
    if (!then) then = now;
    const delta = now - then;
    if (delta > interval) { then = now - (delta % interval); draw(); }
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(animate);
})();
