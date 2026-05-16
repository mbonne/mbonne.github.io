---
layout: page
title: Articles
permalink: /articles/
---

{% for post in site.posts %}
<div class="post-preview" style="padding: 0.75rem 0;">
  <a href="{{ post.url | relative_url }}"><span class="post-title">{{ post.title }}</span></a>
  <p class="post-meta" style="margin:0.2rem 0 0.3rem;">{{ post.date | date: "%B %-d, %Y" }}</p>
  {% if post.description %}<p style="margin:0;">{{ post.description }}</p>{% endif %}
</div>
{% endfor %}
