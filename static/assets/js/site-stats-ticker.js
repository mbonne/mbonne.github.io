(function () {
  var STATS_URL = 'https://raw.githubusercontent.com/mbonne/mbonne.github.io/data/stats.json';
  var ROTATE_MS = 4000;

  function formatMessages(data) {
    var messages = [];
    if (typeof data.unique_visitors_today === 'number') {
      messages.push(data.unique_visitors_today.toLocaleString() + ' unique visitors today');
    }
    if (typeof data.firewall_blocks_today === 'number') {
      messages.push(data.firewall_blocks_today.toLocaleString() + ' firewall blocks today');
    }
    if (data.top_scanned_path && data.top_scanned_path.path && data.top_scanned_path.count) {
      messages.push('Top scanned path: ' + data.top_scanned_path.path + ' (' + data.top_scanned_path.count.toLocaleString() + ' hits)');
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
