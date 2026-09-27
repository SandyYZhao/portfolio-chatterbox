(function () {
  // Fine pointers only: touch screens have no cursor to replace.
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var root = document.documentElement;

  function make(className) {
    var el = document.createElement('div');
    el.className = className;
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    return el;
  }

  var lineV = make('cursor-line cursor-line--v');
  var lineH = make('cursor-line cursor-line--h');
  var dot = make('cursor-dot');

  var x = 0;
  var y = 0;
  var frame = 0;
  var started = false;

  function render() {
    frame = 0;
    // `translate` (not `transform`) so the hover `scale` grows the dot in place.
    dot.style.translate = x + 'px ' + y + 'px';
    lineV.style.transform = 'translate3d(' + x + 'px,0,0)';
    lineH.style.transform = 'translate3d(0,' + y + 'px,0)';
  }

  function show() { root.classList.remove('cursor-away'); }
  function hide() { root.classList.add('cursor-away'); }

  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX;
    y = e.clientY;
    if (!started) {
      // Hide the native cursor only once we know where the pointer is.
      started = true;
      root.classList.add('has-custom-cursor');
    }
    var t = e.target;
    if (t instanceof Element) {
      // Inside an iframe (the Figma prototype) the page stops receiving
      // mouse events, so hand the pointer back to the browser there.
      if (t.closest('iframe')) {
        hide();
      } else {
        show();
        dot.classList.toggle('is-active', !!t.closest('a, button, summary, label, [role="button"], .lbd-option'));
      }
    }
    if (!frame) frame = requestAnimationFrame(render);
  }, { passive: true });

  document.addEventListener('pointerover', function (e) {
    if (e.target instanceof Element && e.target.closest('iframe')) hide();
  });

  root.addEventListener('mouseleave', hide);
  root.addEventListener('mouseenter', show);
})();
