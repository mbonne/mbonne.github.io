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
  var blogPost = document.querySelector(".blog-post");
  if (!blogPost) return;

  var headings = blogPost.querySelectorAll("h1, h2, h3, h4, h5");
  if (headings.length < 3) return;

  /* Build the nav element (no class assigned here — placeTOC sets it) */
  var nav = document.createElement("nav");

  var label = document.createElement("div");
  label.className = "toc-label";
  label.textContent = "Contents";
  nav.appendChild(label);

  var ul = document.createElement("ul");
  headings.forEach(function (h, i) {
    if (!h.id) { h.id = "heading-" + i; }
    var li = document.createElement("li");
    li.className = "toc-" + h.tagName.toLowerCase();
    var a = document.createElement("a");
    a.href = "#" + h.id;
    a.textContent = h.textContent;
    li.appendChild(a);
    ul.appendChild(li);
  });
  nav.appendChild(ul);

  /* Place TOC and attach resize listener */
  placeTOC(nav, blogPost);

  var resizeTimer;
  var lastWide = window.innerWidth >= 1400;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var isWide = window.innerWidth >= 1400;
      if (isWide !== lastWide) {
        lastWide = isWide;
        placeTOC(nav, blogPost);
      }
    }, 150);
  });

  /* Scroll-spy: highlight active section */
  var tocLinks = nav.querySelectorAll("a");
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

/* Place TOC in the correct position based on current viewport width.
   Wide (>=1400px): fixed sidebar appended to body, class "post-toc".
   Narrow (<1400px): inline collapsible at top of .blog-post,
                     wrapped in <details class="post-toc-inline">,
                     nav has no class. */
function placeTOC(nav, blogPost) {
  var isWide = window.innerWidth >= 1400;

  /* Remove from current position first */
  if (nav.parentNode) {
    var parent = nav.parentNode;
    if (parent.tagName === "DETAILS") {
      /* Inline mode: unwrap from details before moving */
      if (parent.parentNode) { parent.parentNode.removeChild(parent); }
    } else {
      parent.removeChild(nav);
    }
  }

  if (isWide) {
    nav.className = "post-toc";
    document.body.appendChild(nav);
  } else {
    nav.className = "";
    var details = document.createElement("details");
    details.className = "post-toc-inline";
    var summary = document.createElement("summary");
    summary.textContent = "Contents";
    details.appendChild(summary);
    details.appendChild(nav);
    blogPost.insertBefore(details, blogPost.firstChild);
  }
}
