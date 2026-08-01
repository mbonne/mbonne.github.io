(function () {
  var STATS_URL = 'https://raw.githubusercontent.com/mbonne/mbonne.github.io/data/stats.json';
  var ROTATE_MS = 4000;

  function formatMessages(data) {
    var messages = [];
    if (typeof data.bots_blocked_today === 'number') {
      messages.push(data.bots_blocked_today.toLocaleString() + ' bots/scanners blocked today');
    }
    if (typeof data.requests_today === 'number') {
      messages.push(data.requests_today.toLocaleString() + ' requests served today');
    }
    if (data.radar_stat && data.radar_stat.label && data.radar_stat.value) {
      messages.push(data.radar_stat.label + ': ' + data.radar_stat.value);
    }
    return messages;
  }

  function startRotation(el, messages) {
    var i = 0;
    function show(index) {
      el.classList.remove('stats-ticker__text--visible');
      window.setTimeout(function () {
        el.textContent = messages[index];
        el.classList.add('stats-ticker__text--visible');
      }, 200);
    }
    show(i);
    if (messages.length > 1) {
      window.setInterval(function () {
        i = (i + 1) % messages.length;
        show(i);
      }, ROTATE_MS);
    }
  }

  function init() {
    var container = document.getElementById('site-stats-ticker');
    if (!container) return;
    var textEl = container.querySelector('.stats-ticker__text');
    if (!textEl) return;

    fetch(STATS_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var messages = formatMessages(data);
        if (messages.length === 0) return;
        container.style.display = 'flex';
        startRotation(textEl, messages);
      })
      .catch(function () {});
  }

  init();
})();
