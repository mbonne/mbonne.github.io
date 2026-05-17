(function () {
  var filter = document.getElementById('topic-filter');
  var list = document.getElementById('articles-list');
  if (!filter || !list) return;

  var posts = list.querySelectorAll('.post-preview');

  filter.addEventListener('click', function (e) {
    var btn = e.target.closest('.topic-btn');
    if (!btn) return;

    filter.querySelectorAll('.topic-btn').forEach(function (b) {
      b.classList.remove('active');
    });
    btn.classList.add('active');

    var cat = btn.getAttribute('data-cat');
    posts.forEach(function (post) {
      if (cat === 'all') {
        post.style.display = '';
      } else {
        var cats = (post.getAttribute('data-categories') || '').split(',');
        post.style.display = cats.indexOf(cat) !== -1 ? '' : 'none';
      }
    });
  });
}());
