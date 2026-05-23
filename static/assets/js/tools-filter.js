(function () {
  var filter = document.getElementById('tools-filter');
  var list = document.getElementById('tools-list');
  if (!filter || !list) return;

  var cards = list.querySelectorAll('.tool-card');

  filter.addEventListener('click', function (e) {
    var btn = e.target.closest('.topic-btn');
    if (!btn) return;

    filter.querySelectorAll('.topic-btn').forEach(function (b) {
      b.classList.remove('active');
    });
    btn.classList.add('active');

    var cat = btn.getAttribute('data-cat');
    cards.forEach(function (card) {
      if (cat === 'all') {
        card.style.display = '';
      } else {
        var cats = (card.getAttribute('data-categories') || '').split(',');
        card.style.display = cats.indexOf(cat) !== -1 ? '' : 'none';
      }
    });
  });
}());
