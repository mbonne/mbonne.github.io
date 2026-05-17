(function () {
  var CACHE_KEY = 'btr_visitor_ip';
  var CACHE_TTL = 86400000; // 24hr in ms

  function render(data) {
    var el = document.getElementById('visitor-ip');
    if (!el) return;
    var parts = [data.ip];
    if (data.city && data.country_name) {
      parts.push(data.city + ', ' + data.country_name);
    } else if (data.country_name) {
      parts.push(data.country_name);
    }
    if (data.org) { parts.push(data.org); }
    el.textContent = parts.join(' — ');
    el.style.display = 'block';
  }

  function fetchAndCache() {
    fetch('https://ipapi.co/json/')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.ip) return;
        render(data);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data })); } catch (e) {}
      })
      .catch(function () {});
  }

  try {
    var cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      var parsed = JSON.parse(cached);
      if (Date.now() - parsed.ts < CACHE_TTL) {
        render(parsed.data);
        return;
      }
    }
  } catch (e) {}

  fetchAndCache();
})();
