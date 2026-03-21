document.addEventListener("DOMContentLoaded", function () {
  addCopyButtons();
  buildTOC();
});

/* ── Copy buttons ─────────────────────────────────────────────────── */
function addCopyButtons() {
  document.querySelectorAll("pre").forEach(function (block) {
    var btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.textContent = "Copy";
    block.appendChild(btn);

    btn.addEventListener("click", function () {
      var code = block.querySelector("code");
      var text = code ? code.innerText : block.innerText;
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = "Copied!";
        setTimeout(function () { btn.textContent = "Copy"; }, 2000);
      }).catch(function () {
        btn.textContent = "Error";
        setTimeout(function () { btn.textContent = "Copy"; }, 2000);
      });
    });
  });
}

/* ── Table of contents ────────────────────────────────────────────── */
function buildTOC() {
  var content = document.querySelector(".blog-post");
  if (!content) return;

  var headings = content.querySelectorAll("h1, h2, h3, h4, h5");
  if (headings.length < 3) return;

  var toc = document.createElement("nav");
  toc.className = "post-toc";

  var label = document.createElement("div");
  label.className = "toc-label";
  label.textContent = "Contents";
  toc.appendChild(label);

  var ul = document.createElement("ul");

  headings.forEach(function (h, i) {
    if (!h.id) {
      h.id = "heading-" + i;
    }
    var li = document.createElement("li");
    li.className = "toc-" + h.tagName.toLowerCase();

    var a = document.createElement("a");
    a.href = "#" + h.id;
    a.textContent = h.textContent;
    li.appendChild(a);
    ul.appendChild(li);
  });

  toc.appendChild(ul);
  document.body.appendChild(toc);

  /* Highlight active section on scroll */
  var tocLinks = toc.querySelectorAll("a");
  window.addEventListener("scroll", function () {
    var scrollY = window.scrollY + 120;
    var active = null;
    headings.forEach(function (h) {
      if (h.offsetTop <= scrollY) active = h.id;
    });
    tocLinks.forEach(function (a) {
      a.classList.toggle("toc-active", a.getAttribute("href") === "#" + active);
    });
  });
}
