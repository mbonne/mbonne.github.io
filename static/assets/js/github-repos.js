(function () {
  var CACHE_KEY = 'btr_v1_github_repos';
  var TTL = 86400000; // 24 hours in ms
  var API_URL = 'https://api.github.com/users/mbonne/repos?sort=pushed&direction=desc&per_page=20&type=owner';
  var EXCLUDE = 'mbonne.github.io';
  var MAX_REPOS = 5;

  var LANG_COLORS = {
    'JavaScript': '#f1e05a',
    'TypeScript': '#3178c6',
    'Python':     '#3572A5',
    'Shell':      '#89e051',
    'PowerShell': '#012456',
    'HTML':       '#e34c26',
    'CSS':        '#563d7c',
    'Ruby':       '#701516',
    'Go':         '#00ADD8',
    'Rust':       '#dea584',
    'C':          '#555555',
    'C++':        '#f34b7d',
    'C#':         '#178600',
    'Java':       '#b07219',
    'Kotlin':     '#A97BFF',
    'Swift':      '#F05138'
  };

  function escHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function relativeTime(dateStr) {
    var secs = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (secs < 60) return 'just now';
    var rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    var mins = Math.floor(secs / 60);
    if (mins < 60)  return rtf.format(-mins,               'minute');
    var hours = Math.floor(mins / 60);
    if (hours < 24) return rtf.format(-hours,              'hour');
    var days = Math.floor(hours / 24);
    if (days < 30)  return rtf.format(-days,               'day');
    var months = Math.floor(days / 30);
    if (months < 12) return rtf.format(-months,            'month');
    return rtf.format(-Math.floor(days / 365),             'year');
  }

  function safeUrl(url) {
    return typeof url === 'string' && /^https:\/\//.test(url) ? url : '#';
  }

  function buildCardElement(repo) {
    var card = document.createElement('div');
    card.className = 'repo-card';

    var header = document.createElement('div');
    header.className = 'repo-card-header';
    var link = document.createElement('a');
    link.className = 'repo-name';
    link.href = safeUrl(repo.html_url);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = repo.name;
    header.appendChild(link);
    card.appendChild(header);

    var desc = document.createElement('p');
    desc.className = 'repo-description';
    if (repo.description) {
      desc.textContent = repo.description;
    } else {
      desc.style.color = '#6272a4';
      desc.textContent = 'No description';
    }
    card.appendChild(desc);

    var meta = document.createElement('div');
    meta.className = 'repo-meta';

    if (repo.language) {
      var langColour = LANG_COLORS[repo.language] || '#6272a4';
      var langSpan = document.createElement('span');
      langSpan.className = 'repo-language';
      var dot = document.createElement('span');
      dot.className = 'repo-lang-dot';
      dot.style.background = langColour;
      langSpan.appendChild(dot);
      langSpan.appendChild(document.createTextNode(repo.language));
      meta.appendChild(langSpan);
    }

    var stars = document.createElement('span');
    stars.className = 'repo-stars';
    stars.textContent = '★ ' + repo.stargazers_count;
    meta.appendChild(stars);

    var forks = document.createElement('span');
    forks.className = 'repo-forks';
    forks.textContent = repo.forks_count + ' forks';
    meta.appendChild(forks);

    var updated = document.createElement('span');
    updated.className = 'repo-updated';
    updated.textContent = 'Updated ' + relativeTime(repo.pushed_at);
    meta.appendChild(updated);

    card.appendChild(meta);
    return card;
  }

  function showStatus(msg) {
    var el = document.getElementById('github-repos-container');
    if (!el) return;
    var p = document.createElement('p');
    p.className = 'repos-status';
    p.textContent = msg;
    el.replaceChildren(p);
  }

  function render(repos) {
    var el = document.getElementById('github-repos-container');
    if (!el) return;
    el.replaceChildren();
    if (!repos.length) {
      showStatus('No repositories found.');
      return;
    }
    repos.forEach(function (repo) { el.appendChild(buildCardElement(repo)); });
  }

  function init() {
    showStatus('Loading repositories\u2026');

    // Serve from cache if fresh
    try {
      var cached = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (cached && cached.timestamp && (Date.now() - cached.timestamp < TTL) && Array.isArray(cached.repos)) {
        render(cached.repos);
        return;
      }
    } catch (e) {}

    // Fetch from API
    fetch(API_URL)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var repos = data
          .filter(function (r) { return r.name !== EXCLUDE; })
          .slice(0, MAX_REPOS);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), repos: repos }));
        } catch (e) {}
        render(repos);
      })
      .catch(function (err) {
        console.error('github-repos:', err);
        showStatus('Unable to load repositories right now.');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
