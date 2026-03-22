(function () {
  var CIRCUMFERENCE = 2 * Math.PI * 22; // 138.23px for r=22

  var btn = document.createElement('button');
  btn.id = 'back-to-top';
  btn.setAttribute('aria-label', 'Back to top');
  btn.innerHTML =
    '<svg class="btt-ring" width="47" height="47" viewBox="0 0 47 47" aria-hidden="true">' +
      '<circle cx="23.5" cy="23.5" r="22" fill="none" stroke="#6272a4" stroke-width="3" opacity="0.4"/>' +
      '<circle cx="23.5" cy="23.5" r="22" fill="none" stroke="#bd93f9" stroke-width="3"' +
        ' stroke-linecap="round" class="btt-progress"' +
        ' style="transform:rotate(-90deg);transform-origin:center;' +
          'stroke-dasharray:' + CIRCUMFERENCE + ';stroke-dashoffset:' + CIRCUMFERENCE + '"/>' +
    '</svg>' +
    '<svg class="btt-arrow" xmlns="http://www.w3.org/2000/svg" width="19" height="19"' +
      ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"' +
      ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<polyline points="18 15 12 9 6 15"/>' +
    '</svg>';

  document.body.appendChild(btn);

  var progressCircle = btn.querySelector('.btt-progress');

  function update() {
    var scrolled   = window.scrollY;
    var scrollable = document.documentElement.scrollHeight - window.innerHeight;

    if (scrolled > window.innerHeight * 0.5) {
      btn.classList.add('btt-visible');
    } else {
      btn.classList.remove('btt-visible');
    }

    var pct = scrollable > 0 ? scrolled / scrollable : 0;
    progressCircle.style.strokeDashoffset = CIRCUMFERENCE * (1 - pct);
  }

  window.addEventListener('scroll', update, { passive: true });

  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  update();
}());
