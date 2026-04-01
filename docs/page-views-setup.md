# Page Views Setup (Stable Production)

Current deployed values in this repository:

- Provider: `worker`
- KV namespace: `zyp-up-pageviews`
- KV binding variable: `PAGE_VIEWS`
- Worker endpoint: `https://misty-shadow-e33bzypup-pageviews-api.yunpengzhangup.workers.dev`

This site supports two providers:

- `counterapi`: zero-setup, good for quick start
- `worker`: long-term stable, recommended for production

## 1) Recommended Production Setup (Cloudflare Worker + KV)

### Step A: Create KV
1. Open Cloudflare dashboard -> Workers & Pages -> KV.
2. Create a namespace named `zyp-up-pageviews`.

### Step B: Create Worker
1. Open Workers & Pages -> Create Worker.
2. Replace code with `scripts/cloudflare-worker-pageviews.js`.
3. In Worker Settings -> Variables -> KV namespace bindings:
   - Variable name: `PAGE_VIEWS`
  - KV namespace: select `zyp-up-pageviews`
4. Deploy Worker.
5. Use Worker URL: `https://misty-shadow-e33bzypup-pageviews-api.yunpengzhangup.workers.dev`

### Step C: Switch site config
In `_config.yml` set:

```yml
page_views:
  provider: "worker"
  namespace: "zypup_blog_pv"
  counterapi_endpoint: "https://api.counterapi.dev/v1"
  worker_endpoint: "https://misty-shadow-e33bzypup-pageviews-api.yunpengzhangup.workers.dev"
```

Then rebuild/redeploy the site.

## 2) Counter Key Strategy
All counters use post URL slugified key, e.g.:
- `/posts/2026/03/qwen-vl/` -> `posts-2026-03-qwen-vl`

## 3) Validation
1. Open one post page, refresh once.
2. Go to homepage and `/blog/`.
3. Verify each item displays a number instead of spinner.

## 4) Optional Hardening
- Add rate limit in Worker (IP + key + time window).
- Add simple bot filtering by user-agent.
- Add allow-list check using `referer` domain.
