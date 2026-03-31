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

<div class="section-content">
  <p>👀 <strong>Hi, I'm Yunpeng Zhang</strong>, an AI practitioner passionate about pushing the boundaries of large model capabilities. My core work revolves around post-training of VLMs/LLMs, including SFT, RL, and data recipe design. Beyond that, I'm actively exploring AIGC, Agentic RL, and World Models &mdash; <em>stay foolish, stay hungry</em>.</p>

  <p>🧠 I'm committed to turning research ideas into practical, reproducible engineering work. I believe AI is not a weapon to replace humanity, but a force to liberate human productivity &mdash; freeing people to pursue the higher-value endeavors that are uniquely human.</p>

  <p>🤝 Open to discussion and collaboration on AI-related projects &mdash; feel free to reach out!</p>
</div>

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

<p>📖 <a href="{{ '/blog/' | relative_url }}">View all blog posts →</a></p>

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
      <strong>2026.02 - 2026.07</strong> &nbsp;|&nbsp; <a href="https://www.bytedance.com/zh/" target="_blank"><strong>ByteDance</strong></a> &nbsp;&ndash;&nbsp; Data-AML<br>
      <em>VLM/LLM Application Algorithm Intern</em> &nbsp;&bull;&nbsp; Shenzhen, Guangdong, China
    </li>
    <br>
    <li>
      <strong>2025.10 - 2026.01</strong> &nbsp;|&nbsp; <a href="https://www.xiaopeng.com/" target="_blank"><strong>XPeng Motors</strong></a> &nbsp;&ndash;&nbsp; Intelligent Cockpit Center<br>
      <em>VLM Foundation Model Algorithm Intern</em> &nbsp;&bull;&nbsp; Beijing, China
    </li>
    <br>
    <li>
      <strong>2025.07 - 2025.10</strong> &nbsp;|&nbsp; <a href="https://www.truesightai.com/" target="_blank"><strong>Truesight</strong></a> &nbsp;&ndash;&nbsp; AI Research<br>
      <em>Computer Vision R&D Intern</em> &nbsp;&bull;&nbsp; Xiamen, Fujian, China
    </li>
  </ul>
</div>

---

## 🎯 Hobbies {#hobbies}

<div class="section-content">
  <p style="font-size: 1.1em; line-height: 1.8;">
    🏋️‍♂️ <strong>Fitness</strong> &nbsp;&bull;&nbsp; 🏀 <strong>Basketball</strong> &nbsp;&bull;&nbsp; 🏊‍♂️ <strong>Swimming</strong> &nbsp;&bull;&nbsp; 🏄‍♂️ <strong>Surfing</strong> &nbsp;&bull;&nbsp; ⛳ <strong>Golf</strong> &nbsp;&bull;&nbsp; 🎾 <strong>Tennis</strong>
  </p>
  <p><em>...and I'm always open to trying any new sports!</em></p>
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
