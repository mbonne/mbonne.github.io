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

  function buildCard(repo) {
    var langColour = repo.language ? (LANG_COLORS[repo.language] || '#6272a4') : null;
    var langSpan = repo.language
      ? '<span class="repo-language">' +
          '<span class="repo-lang-dot" style="background:' + langColour + '"></span>' +
          repo.language +
        '</span>'
      : '';
    var desc = repo.description
      ? repo.description
      : '<span style="color:#6272a4">No description</span>';
    return (
      '<div class="repo-card">' +
        '<div class="repo-card-header">' +
          '<a class="repo-name" href="' + repo.html_url + '" target="_blank" rel="noopener noreferrer">' +
            repo.name +
          '</a>' +
        '</div>' +
        '<p class="repo-description">' + desc + '</p>' +
        '<div class="repo-meta">' +
          langSpan +
          '<span class="repo-stars">&#9733; ' + repo.stargazers_count + '</span>' +
          '<span class="repo-forks">' + repo.forks_count + ' forks</span>' +
          '<span class="repo-updated">Updated ' + relativeTime(repo.pushed_at) + '</span>' +
        '</div>' +
      '</div>'
    );
  }

  function setContainer(html) {
    var el = document.getElementById('github-repos-container');
    if (el) el.innerHTML = html;
  }

  function render(repos) {
    if (!repos.length) {
      setContainer('<p class="repos-status">No repositories found.</p>');
      return;
    }
    setContainer(repos.map(buildCard).join(''));
  }

  function init() {
    setContainer('<p class="repos-status">Loading repositories\u2026</p>');

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
        setContainer('<p class="repos-status">Unable to load repositories right now.</p>');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
