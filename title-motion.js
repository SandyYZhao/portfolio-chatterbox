(function () {
  // Weight follows the pointer's height, slant follows its horizontal
  // position. Fine pointers only, and never for people who ask for less motion.
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var titles = document.querySelectorAll('.hero p, .case-title');
  if (!titles.length) return;

  var BASE_WEIGHT = 500;
  var MIN_WEIGHT = 300;
  var MAX_WEIGHT = 800;
  var MAX_SLANT = 10;

  var state = [];

  // Heavier type is wider, so left alone the lines would re-wrap and jump as
  // the weight changes. Freeze each line where it breaks at rest instead.
  function lockLines(item) {
    var el = item.el;
    if (item.original !== null) el.innerHTML = item.original;
    else item.original = el.innerHTML;

    var segments = [];
    var parts = el.innerHTML.split(/<br\s*\/?>/i);
    parts.forEach(function (html) {
      var tmp = document.createElement('div');
      tmp.innerHTML = html;
      segments.push(tmp.textContent.replace(/\s+/g, ' ').trim());
    });

    el.textContent = '';
    var wordEls = [];
    segments.forEach(function (seg, si) {
      var words = seg.split(' ');
      words.forEach(function (w, wi) {
        var span = document.createElement('span');
        span.textContent = w;
        span.dataset.seg = si;
        el.appendChild(span);
        wordEls.push(span);
        if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
        else if (si < segments.length - 1) el.appendChild(document.createElement('br'));
      });
    });

    // Group words into visual lines by their vertical position.
    var lines = [];
    var lastTop = null;
    var lastSeg = null;
    wordEls.forEach(function (span) {
      var top = span.offsetTop;
      // A <br> in the source always starts a new line.
      if (lastTop === null || span.dataset.seg !== lastSeg || Math.abs(top - lastTop) > 4) lines.push([]);
      lines[lines.length - 1].push(span.textContent);
      lastTop = top;
      lastSeg = span.dataset.seg;
    });

    el.textContent = '';
    item.lineEls = [];
    item.inners = lines.map(function (words) {
      var line = document.createElement('span');
      item.lineEls.push(line);
      line.className = 'title-line';
      var inner = document.createElement('span');
      inner.textContent = words.join(' ');
      line.appendChild(inner);
      el.appendChild(line);
      return inner;
    });
  }

  // Cap the top weight so the widest line still fits its column.
  function fitMaxWeight(item) {
    var el = item.el;
    // Lines may grow past the title's own max-width, but never past the column.
    var column = el.closest('.content') || el.parentElement;
    var limit = column.clientWidth;
    var w = MAX_WEIGHT;
    while (w > BASE_WEIGHT) {
      el.style.fontVariationSettings = '"wght" ' + w;
      var widest = 0;
      item.inners.forEach(function (n) { widest = Math.max(widest, n.getBoundingClientRect().width); });
      if (widest <= limit) break;
      w -= 50;
    }
    el.style.fontVariationSettings = '';
    item.maxWeight = w;
  }

  function setup() {
    state = [];
    titles.forEach(function (el) {
      var item = { el: el, original: el.__original || null, inners: [], lineEls: [], maxWeight: MAX_WEIGHT, weight: BASE_WEIGHT, slant: 0 };
      lockLines(item);
      el.__original = item.original;
      fitMaxWeight(item);
      state.push(item);
    });
  }

  var targetY = 0.5;
  var targetX = 0;
  var active = false;
  var raf = 0;

  function frame() {
    raf = 0;
    var moving = false;
    state.forEach(function (item) {
      var w = MIN_WEIGHT + (item.maxWeight - MIN_WEIGHT) * targetY;
      var s = MAX_SLANT * targetX;
      item.weight += (w - item.weight) * 0.14;
      item.slant += (s - item.slant) * 0.14;
      if (Math.abs(w - item.weight) > 0.4 || Math.abs(s - item.slant) > 0.03) moving = true;
      item.el.style.fontVariationSettings = '"wght" ' + item.weight.toFixed(1);
      // Literata has no slant axis, and browsers ignore an oblique angle
      // without one, so lean each line with a skew anchored at its left edge.
      var skew = 'skewX(' + (-item.slant).toFixed(2) + 'deg)';
      item.lineEls.forEach(function (line) { line.style.transform = skew; });
    });
    if (moving) raf = requestAnimationFrame(frame);
  }

  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    targetY = Math.min(1, Math.max(0, e.clientY / window.innerHeight));
    targetX = Math.min(1, Math.max(0, e.clientX / window.innerWidth));
    if (!active) {
      active = true;
    }
    if (!raf) raf = requestAnimationFrame(frame);
  }, { passive: true });

  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var prev = state.map(function (i) { return { weight: i.weight, slant: i.slant }; });
      setup();
      state.forEach(function (item, i) { item.weight = prev[i].weight; item.slant = prev[i].slant; });
      if (active && !raf) raf = requestAnimationFrame(frame);
    }, 200);
  });

  function init() {
    setup();
  }

  // Measure line breaks only once the real font is in.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
  else init();
})();
