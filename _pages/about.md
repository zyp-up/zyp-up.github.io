---
permalink: /
title: "Yunpeng's Homepage"
author_profile: true
redirect_from: 
  - /about/
  - /about.html
---

<style>
  .section-heading {
    margin-top: 2.5em;
    margin-bottom: 1em;
    font-size: 1.75em;
    font-weight: 700;
    border-bottom: 2px solid #e8e8e8;
    padding-bottom: 0.5em;
  }

  .blog-posts-container {
    margin-top: 1.5em;
    margin-bottom: 1.5em;
  }

  .blog-posts-scroll {
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    padding: 1em 0;
    background-color: #fafafa;
  }

  .blog-post-item {
    padding: 1em 1.5em;
    border-bottom: 1px solid #e8e8e8;
    transition: background-color 0.3s;
  }

  .blog-post-item:last-child {
    border-bottom: none;
  }

  .blog-post-item:hover {
    background-color: #f0f0f0;
  }

  .blog-post-date {
    color: #666;
    font-size: 0.85em;
    margin-bottom: 0.3em;
    display: block;
  }

  .blog-post-title {
    font-weight: 600;
    font-size: 1em;
    margin: 0;
  }

  .blog-post-title a {
    color: #24292e;
    text-decoration: none;
  }

  .blog-post-title a:hover {
    color: #0366d6;
    text-decoration: underline;
  }

  .section-content {
    margin: 1.5em 0;
    line-height: 1.6;
  }

  .empty-placeholder {
    color: #999;
    font-style: italic;
    padding: 2em;
    text-align: center;
    background-color: #fafafa;
    border-radius: 4px;
  }
</style>

## 🧐 About Me {#about-me}

Welcome to my personal website! I'm a passionate researcher and developer interested in AI, machine learning, security, and computer systems. This site showcases my research, publications, and professional experiences.

---

## 📰 Blog Posts {#blog-posts}

<div class="blog-posts-container">
  <div class="blog-posts-scroll">
    {% assign sorted_posts = site.posts | sort: 'date' | reverse %}
    {% for post in sorted_posts limit: 20 %}
      <div class="blog-post-item">
        <span class="blog-post-date">{{ post.date | date: "%B %d, %Y" }}</span>
        <h3 class="blog-post-title">
          <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
        </h3>
      </div>
    {% endfor %}
  </div>
</div>

<p>📖 <a href="{{ '/year-archive/' | relative_url }}">View all blog posts →</a></p>

---

## 📝 Publications {#publications}

<div class="empty-placeholder">
  Coming soon...
</div>

<p>📄 <a href="{{ '/publications/' | relative_url }}">View all publications →</a></p>

---

## 📖 Educations {#educations}

<div class="section-content">
  <!-- Add your education details here -->
  <p style="color: #999; font-style: italic;">To be added...</p>
</div>

---

## 🏆 Honors and Awards {#honors-and-awards}

<div class="section-content">
  <!-- Add your honors and awards here -->
  <p style="color: #999; font-style: italic;">To be added...</p>
</div>

---

## 💻 Internships {#internships}

<div class="section-content">
  <ul>
    <li>
      <strong>2026.02 - 2026.07</strong>: <a href="https://www.bytedance.com/zh/" target="_blank">ByteDance</a>, Data-AML, VLM/LLM Application Algorithm Intern. <em>Shenzhen, Guangdong, China</em>
    </li>
    <li>
      <strong>2025.10 - 2026.01</strong>: <a href="https://www.xiaopeng.com/" target="_blank">XPeng Motors</a>, Intelligent Cockpit Center, VLM Foundation Model Algorithm Intern. <em>Beijing, China</em>
    </li>
    <li>
      <strong>2025.07 - 2025.10</strong>: <a href="https://www.truesightai.com/" target="_blank">Truesight</a>, AI Research, Computer Vision R&D Intern. <em>Xiamen, Fujian, China</em>
    </li>
  </ul>
</div>

---

## 🎯 Hobbies {#hobbies}

<div class="section-content">
  <!-- Add your hobbies here -->
  <p style="color: #999; font-style: italic;">To be added...</p>
</div>

---

## 🎨 Portfolio {#portfolio}

<div class="section-content">
  <!-- Add your portfolio projects here -->
  <p style="color: #999; font-style: italic;">To be added...</p>
</div>

<p>🔗 <a href="{{ '/portfolio/' | relative_url }}">View full portfolio →</a></p>

---

## 📄 CV {#cv}

<p>📥 <a href="{{ '/cv/' | relative_url }}">View full CV →</a></p>
