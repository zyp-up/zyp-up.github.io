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
    border-bottom: 2px solid var(--global-border-color);
    padding-bottom: 0.5em;
  }

  .blog-posts-container {
    margin-top: 1.5em;
    margin-bottom: 1.5em;
    --blog-item-height: 92px;
    --blog-item-gap: 0.62rem;
  }

  .blog-posts-scroll {
    max-height: calc(var(--blog-item-height) * 3 + var(--blog-item-gap) * 2 + 1.2em);
    overflow-y: auto;
    border: none;
    border-radius: 0;
    padding: 0;
    background-color: transparent;
    scroll-snap-type: y proximity;
  }

  .blog-post-item {
    min-height: var(--blog-item-height);
    height: auto;
    padding: 0.68em 1em;
    border: 1px solid var(--global-border-color);
    border-radius: 12px;
    background-color: color-mix(in srgb, var(--global-bg-color) 94%, #ffffff 6%);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
    display: flex;
    flex-direction: column;
    justify-content: center;
    scroll-snap-align: start;
  }

  .blog-post-item + .blog-post-item {
    margin-top: var(--blog-item-gap);
  }

  .blog-post-item:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--global-base-color) 40%, var(--global-border-color) 60%);
    box-shadow:
      0 12px 24px rgba(0, 0, 0, 0.11),
      0 0 0 1px color-mix(in srgb, var(--global-base-color) 45%, transparent 55%),
      0 0 20px rgba(221, 131, 97, 0.16);
  }

  .blog-post-date {
    color: var(--global-text-color-light);
    font-size: 0.83em;
  }

  .blog-post-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.12em;
    gap: 0.8em;
  }

  .blog-post-views {
    font-size: 0.82em;
    color: var(--global-text-color-light);
    white-space: nowrap;
  }

  .blog-post-item .blog-post-title {
    font-weight: 600;
    font-size: 0.95em;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    line-height: 1.32;
  }

  .blog-post-item .blog-post-title a {
    display: -webkit-box;
    color: var(--global-text-color);
    text-decoration: none;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    transition: color 0.2s ease;
  }

  .blog-post-item:hover .blog-post-title a {
    color: var(--global-link-color);
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
    border: 1px solid var(--global-border-color);
    border-radius: 16px;
    background-color: var(--global-bg-color);
    background-color: color-mix(in srgb, var(--global-bg-color) 88%, #ffffff 12%);
    padding: var(--edu-top-space) 1.1em var(--edu-bottom-space);
    margin-bottom: 0.8em;
    box-shadow: 0 3px 14px rgba(33, 26, 17, 0.08);
    transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease;
    display: block;
  }

  .education-card:hover {
    transform: translateY(-4px);
    box-shadow:
      0 18px 36px rgba(33, 26, 17, 0.15),
      0 0 0 1px color-mix(in srgb, var(--global-base-color) 45%, transparent 55%),
      0 0 26px rgba(221, 131, 97, 0.22);
    border-color: var(--global-base-color);
    border-color: color-mix(in srgb, var(--global-base-color) 45%, var(--global-border-color) 55%);
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
    color: var(--global-text-color);
  }

  .education-school a {
    color: inherit;
    text-decoration: none;
  }

  .education-school a:hover,
  .education-school a:focus-visible {
    color: var(--global-link-color);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .education-meta {
    font-size: 1em;
    line-height: 1.2;
    color: var(--global-text-color-light);
  }

  .education-divider {
    color: var(--global-text-color-light);
    font-size: 0.95em;
  }

  .education-detail {
    margin: 0.2em 0;
    font-size: 1em;
    color: var(--global-text-color-light);
  }

  .education-second-line {
    margin: 0;
    display: block;
    font-size: 1em;
    line-height: 1.2;
    color: var(--global-text-color-light);
    text-align: left;
    text-wrap: balance;
  }

  .education-second-line .education-divider {
    margin: 0 0.15em;
  }

  .education-second-line a {
    color: inherit;
    text-decoration: none;
  }

  .education-second-line a:hover,
  .education-second-line a:focus-visible {
    color: var(--global-link-color);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .education-card-main {
    display: flex;
    align-items: flex-start;
    gap: 0.9em;
  }

  .education-logo-block {
    width: 3.2em;
    height: 3.2em;
    object-fit: contain;
    flex: 0 0 3.2em;
    margin-top: 0.05em;
  }

  .education-card-content {
    display: grid;
    grid-template-rows: auto auto;
    row-gap: var(--edu-row-gap);
    flex: 1;
    min-width: 0;
  }

  .internship-entry {
    display: flex;
    align-items: flex-start;
    gap: 0.72em;
  }

  .org-logo-block {
    width: 3.2em;
    height: 3.2em;
    object-fit: contain;
    flex: 0 0 3.2em;
    margin-top: 0.05em;
    border-radius: 3px;
  }

  .internship-text {
    flex: 1;
    min-width: 0;
  }

  .internships-timeline {
    --timeline-padding-left: 1.7em;
    --timeline-axis-x: 0.6em;
    --timeline-dot-size: 0.58em;
    --timeline-first-dot-y: 1.35em;
    --timeline-head-gap: 1.32em;
    --timeline-tail-gap: 0.3em;
    --timeline-arrow-half-width: 0.22em;
    --timeline-arrow-height: 0.68em;
    --timeline-arrow-color: #8a8377;
    list-style: none;
    margin: 0;
    padding: 0 0 0 var(--timeline-padding-left);
    position: relative;
  }

  .internships-timeline::before {
    content: "";
    position: absolute;
    left: var(--timeline-axis-x);
    transform: translateX(-50%);
    top: calc(var(--timeline-first-dot-y) - var(--timeline-head-gap));
    bottom: var(--timeline-tail-gap);
    width: 2px;
    background: var(--global-text-color-light);
    background: color-mix(in srgb, var(--global-text-color-light) 58%, var(--global-border-color) 42%);
  }

  .internships-timeline::after {
    content: "";
    position: absolute;
    left: var(--timeline-axis-x);
    transform: translateX(-50%);
    top: calc(var(--timeline-first-dot-y) - var(--timeline-head-gap) - var(--timeline-arrow-height));
    width: 0;
    height: 0;
    border-left: var(--timeline-arrow-half-width) solid transparent;
    border-right: var(--timeline-arrow-half-width) solid transparent;
    border-bottom: var(--timeline-arrow-height) solid var(--timeline-arrow-color);
  }

  .internship-item {
    position: relative;
    margin: 0;
  }

  .internship-item + .internship-item {
    margin-top: 1.6em;
  }

  .internship-item::before {
    content: "";
    position: absolute;
    left: calc(var(--timeline-axis-x) - var(--timeline-padding-left));
    transform: translate(-50%, -50%);
    top: var(--timeline-first-dot-y);
    width: var(--timeline-dot-size);
    height: var(--timeline-dot-size);
    border-radius: 50%;
    background: var(--global-base-color);
  }

  html[data-theme="dark"] .blog-post-item:hover {
    box-shadow:
      0 14px 28px rgba(0, 0, 0, 0.45),
      0 0 0 1px rgba(221, 131, 97, 0.36),
      0 0 24px rgba(221, 131, 97, 0.2);
  }

  html[data-theme="dark"] .blog-post-item {
    background-color: #201d18;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.32);
  }

  html[data-theme="dark"] .education-card {
    background-color: #1f1b16;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  }

  html[data-theme="dark"] .education-card:hover {
    box-shadow:
      0 20px 40px rgba(0, 0, 0, 0.52),
      0 0 0 1px rgba(221, 131, 97, 0.42),
      0 0 30px rgba(221, 131, 97, 0.24);
  }

  html[data-theme="dark"] .internships-timeline {
    --timeline-arrow-color: #b4aa9c;
  }

  @media (max-width: 760px) {
    .blog-posts-container {
      --blog-item-height: 96px;
      --blog-item-gap: 0.5rem;
    }

    .blog-posts-scroll {
      border-radius: 0;
      padding: 0;
    }

    .blog-post-item {
      padding: 0.62em 0.86em;
      border-radius: 11px;
    }

    .blog-post-item .blog-post-title {
      font-size: 0.9em;
    }

    .education-section {
      --edu-top-space: 1.3rem;
      --edu-row-gap: 1rem;
      --edu-bottom-space: 0.7rem;
    }

    .education-card {
      border-radius: 12px;
      padding: var(--edu-top-space) 0.9em var(--edu-bottom-space);
    }

    .education-logo-block {
      width: 2.8em;
      height: 2.8em;
      flex-basis: 2.8em;
    }

    .org-logo-block {
      width: 2.8em;
      height: 2.8em;
      flex-basis: 2.8em;
    }

    .internship-entry {
      gap: 0.62em;
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

    .internships-timeline {
      --timeline-padding-left: 1.5em;
      --timeline-axis-x: 0.54em;
      --timeline-dot-size: 0.52em;
      --timeline-first-dot-y: 1.2em;
      --timeline-head-gap: 1.14em;
      --timeline-tail-gap: 0.2em;
      --timeline-arrow-half-width: 0.2em;
      --timeline-arrow-height: 0.58em;
      --timeline-arrow-color: #8a8377;
    }

    .internship-item + .internship-item {
      margin-top: 1.45em;
    }

  }

  .empty-placeholder {
    color: var(--global-text-color-light);
    font-style: italic;
    padding: 2em;
    text-align: center;
    background-color: var(--global-thead-color);
    border-radius: 4px;
  }
</style>

## 🧐 About Me {#about-me}

<div class="section-content">
  <p>👀 <strong>Hi, I'm Yunpeng Zhang</strong>, an AI practitioner passionate about pushing the boundaries of large model capabilities. My core work revolves around post-training of VLMs/LLMs, including SFT, RL, and data recipe design. Beyond that, I'm actively exploring AIGC, Agentic RL, and World Models &mdash; <em>always learning, always building</em>.</p>

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
        <div class="blog-post-meta">
          <span class="blog-post-date">{{ post.date | date: "%B %d, %Y" }}</span>
          <span class="blog-post-views"><i class="fa fa-eye" aria-hidden="true"></i> <span class="counter-view-span" data-key="{{ post.url | slugify }}"><i class="fa fa-spinner fa-spin" style="font-size:0.8em; color:var(--global-text-color-light);"></i></span> views</span>
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
  <div style="font-size: 0.85em; color: var(--global-text-color-light); text-align: right; line-height: 1.4;">
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
    <div class="education-card-main">
      <img class="education-logo-block" src="{{ '/images/homepage_logo/UIUC.jpeg' | relative_url }}" alt="UIUC logo">
      <div class="education-card-content">
        <div class="education-card-header">
          <span class="education-school"><a href="https://illinois.edu/" target="_blank" rel="noopener noreferrer">University of Illinois Urbana-Champaign (UIUC)</a></span>
          <span class="education-meta">Urbana-Champaign · USA | 2026 Fall</span>
        </div>
        <p class="education-second-line">
          <a href="https://grainger.illinois.edu/" target="_blank" rel="noopener noreferrer">The Grainger College of Engineering</a>
          <span class="education-divider">|</span>
          <span>Master of Engineering</span>
          <span class="education-divider">|</span>
          <span>Major in Electrical and Computer Engineering</span>
        </p>
      </div>
    </div>
  </div>

  <div class="education-card">
    <div class="education-card-main">
      <img class="education-logo-block" src="{{ '/images/homepage_logo/CJLU.jpeg' | relative_url }}" alt="CJLU logo">
      <div class="education-card-content">
        <div class="education-card-header">
          <span class="education-school"><a href="https://english.cjlu.edu.cn/" target="_blank" rel="noopener noreferrer">China Jiliang University (CJLU)</a></span>
          <span class="education-meta">Hangzhou · China | Sept 2022 - Jun 2026</span>
        </div>
        <p class="education-second-line">
          <a href="https://lxxy.cjlu.edu.cn/" target="_blank" rel="noopener noreferrer">Liangxin College</a>
          <span class="education-divider">|</span>
          <span>Bachelor of Engineering (Honors)</span>
          <span class="education-divider">|</span>
          <span>Major in Optoelectronic Information Science and Engineering</span>
        </p>
      </div>
    </div>
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
  <ul class="internships-timeline">
    <li class="internship-item">
      <div class="internship-entry">
        <img class="org-logo-block" src="{{ '/images/homepage_logo/bytedance_logo.jpeg' | relative_url }}" alt="ByteDance logo">
        <div class="internship-text">
          <strong>2026.02 - 2026.07</strong> &nbsp;|&nbsp; <a href="https://www.bytedance.com/zh/" target="_blank"><strong>ByteDance</strong></a> &nbsp;&ndash;&nbsp; Data-AML<br>
          <em>VLM/LLM Application Algorithm Intern</em> &nbsp;&bull;&nbsp; Shenzhen, Guangdong, China
        </div>
      </div>
    </li>
    <li class="internship-item">
      <div class="internship-entry">
        <img class="org-logo-block" src="{{ '/images/homepage_logo/xpengmotorsglobal_logo.jpeg' | relative_url }}" alt="XPeng logo">
        <div class="internship-text">
          <strong>2025.10 - 2026.01</strong> &nbsp;|&nbsp; <a href="https://www.xiaopeng.com/" target="_blank"><strong>XPeng Motors</strong></a> &nbsp;&ndash;&nbsp; Intelligent Cockpit Center<br>
          <em>VLM Foundation Model Algorithm Intern</em> &nbsp;&bull;&nbsp; Beijing, China
        </div>
      </div>
    </li>
    <li class="internship-item">
      <div class="internship-entry">
        <img class="org-logo-block" src="{{ '/images/homepage_logo/真景科技.jpg' | relative_url }}" alt="Truesight logo">
        <div class="internship-text">
          <strong>2025.07 - 2025.10</strong> &nbsp;|&nbsp; <a href="https://www.truesightai.com/" target="_blank"><strong>Truesight</strong></a> &nbsp;&ndash;&nbsp; AI Research<br>
          <em>Computer Vision R&D Intern</em> &nbsp;&bull;&nbsp; Xiamen, Fujian, China
        </div>
      </div>
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
  <p style="color: var(--global-text-color-light); font-style: italic;">To be added...</p>
</div>

<p>🔗 <a href="{{ '/portfolio/' | relative_url }}">View full portfolio →</a></p>

---

## 📄 CV {#cv}

<p>📥 <a href="{{ '/cv/' | relative_url }}">View full CV →</a></p>
