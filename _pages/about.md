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

  .education-section {
    margin: 1em 0;
    --edu-top-space: 1.5rem;
    --edu-row-gap: 1rem;
    --edu-bottom-space: 0.5rem;
  }

  .education-card {
    border: 1px solid #d9d6cf;
    border-radius: 16px;
    background-color: #fffdf9;
    padding: var(--edu-top-space) 1.1em var(--edu-bottom-space);
    margin-bottom: 0.8em;
    box-shadow: 0 2px 10px rgba(28, 36, 52, 0.08);
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    display: grid;
    grid-template-rows: auto auto;
    row-gap: var(--edu-row-gap);
  }

  .education-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(28, 36, 52, 0.14);
    border-color: #cbc5b8;
  }

  .education-card-header {
    display: flex;
    justify-content: space-between;
    gap: 1em;
    align-items: center;
    flex-wrap: wrap;
    margin: 0;
    line-height: 1.2;
  }

  .education-school {
    font-size: 1em;
    font-weight: 700;
    line-height: 1.2;
    color: #1a2233;
  }

  .education-school a {
    color: inherit;
    text-decoration: none;
  }

  .education-school a:hover,
  .education-school a:focus-visible {
    color: #1f8db0;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .education-meta {
    font-size: 1em;
    line-height: 1.2;
    color: #6b7384;
  }

  .education-divider {
    color: #8a92a3;
    font-size: 0.95em;
  }

  .education-detail {
    margin: 0.2em 0;
    font-size: 1em;
    color: #6b7384;
  }

  .education-second-line {
    margin: 0;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 0.55em;
    flex-wrap: wrap;
    font-size: 1em;
    line-height: 1.2;
    color: #6b7384;
    text-align: left;
  }

  @media (max-width: 760px) {
    .education-section {
      --edu-top-space: 1.3rem;
      --edu-row-gap: 1rem;
      --edu-bottom-space: 0.7rem;
    }

    .education-card {
      border-radius: 12px;
      padding: var(--edu-top-space) 0.9em var(--edu-bottom-space);
      row-gap: var(--edu-row-gap);
    }

    .education-school {
      font-size: 1em;
    }

    .education-meta {
      font-size: 0.95em;
      white-space: normal;
    }

    .education-second-line {
      font-size: 0.95em;
      justify-content: flex-start;
      text-align: left;
    }
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
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3em;">
          <span class="blog-post-date">{{ post.date | date: "%B %d, %Y" }}</span>
          <span class="blog-post-views" style="font-size: 0.85em; color: #888;"><i class="fa fa-eye" aria-hidden="true"></i> <span class="counter-view-span" data-key="{{ post.url | slugify }}"><i class="fa fa-spinner fa-spin" style="font-size:0.8em; color:#ccc;"></i></span> views</span>
        </div>
        <h3 class="blog-post-title">
          <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
        </h3>
      </div>
    {% endfor %}
  </div>
</div>

<div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; margin-bottom: 1em;">
  <p style="margin: 0;">📖 <a href="{{ '/blog/' | relative_url }}">View all blog posts →</a></p>
  <div style="font-size: 0.85em; color: #888; text-align: right; line-height: 1.4;">
    <em>正在奋笔疾书中，争取每月更新 💪</em><br>
    <em>Writing hard and aiming for monthly updates.</em>
  </div>
</div>

---

## 📝 Publications {#publications}

<div class="empty-placeholder">
  Coming soon...
</div>

<p>📄 <a href="{{ '/publications/' | relative_url }}">View all publications →</a></p>

---

## 📖 Education {#educations}

<div class="education-section">
  <div class="education-card">
    <div class="education-card-header">
      <span class="education-school"><a href="https://illinois.edu/" target="_blank" rel="noopener noreferrer">University of Illinois Urbana-Champaign (UIUC)</a></span>
      <span class="education-meta">Urbana-Champaign · USA | 2026 Fall</span>
    </div>
    <p class="education-second-line">
      <span>Master of Engineering</span>
      <span class="education-divider">|</span>
      <span>Major in Electrical and Computer Engineering</span>
    </p>
  </div>

  <div class="education-card">
    <div class="education-card-header">
      <span class="education-school"><a href="https://english.cjlu.edu.cn/" target="_blank" rel="noopener noreferrer">China Jiliang University (CJLU)</a></span>
      <span class="education-meta">Hangzhou · China | Sept 2022 - Jun 2026</span>
    </div>
    <p class="education-second-line">
      <span>Bachelor of Engineering (Honors)</span>
      <span class="education-divider">|</span>
      <span>Major in Optoelectronic Information Science and Engineering</span>
    </p>
  </div>
</div>

---

## 🏆 Honors and Awards {#honors-and-awards}

<div class="section-content">
  <ul>
    <li>
      <strong>2025</strong> &nbsp;|&nbsp; Provincial Government Scholarship
    </li>
  </ul>
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
