# Page Views Setup (Single Source of Truth)

This repository now uses a single-source strategy:

- Data source: Cloudflare Worker + KV only
- Fallback order in worker mode: primary worker -> backup worker
- No fallback to CounterAPI when provider is worker (prevents data split)

## 1) Recommended Architecture

Use two domains, one storage:

- Primary endpoint: global/overseas-friendly domain
- Backup endpoint: mainland-friendly domain
- Both endpoints must point to the same Worker and the same KV binding `PAGE_VIEWS`

This gives better network reachability without creating two independent counters.

## 2) Cloudflare Setup

### Step A: Create KV namespace
1. Cloudflare Dashboard -> Workers & Pages -> KV.
2. Create namespace, for example `zyp-up-pageviews`.

### Step B: Deploy Worker
1. Create a Worker service.
2. Use code from `scripts/cloudflare-worker-pageviews.js`.
3. Bind KV in Worker Settings -> Variables:
   - Variable: `PAGE_VIEWS`
   - Namespace: `zyp-up-pageviews`
4. Deploy.

### Step C: Configure two entry domains (recommended)
1. Keep the default workers.dev URL as primary, or use your own global domain.
2. Add another custom domain for mainland-friendly routing.
3. Route both domains to the same Worker service.

## 3) Site Configuration

In `_config.yml` set:

    page_views:
      provider: "worker"
      worker_endpoint: "https://your-primary-endpoint"
      backup_worker_endpoint: "https://your-mainland-friendly-endpoint"
      timeout_ms: 7000

Notes:

- `backup_worker_endpoint` cannot be empty if you want mainland fallback.
- Primary and backup must share the same underlying KV.

## 4) Consistency Validation

Run:

    ./scripts/check-pageviews-consistency.sh <primary_endpoint> <backup_endpoint> <key>

Example key format:

- Post URL `/posts/2026/03/qwen-vl/` -> key `posts-2026-03-qwen-vl`

If both endpoints show the same `count` after an increment request, your setup is consistent.

## 5) Runtime Behavior

- On post detail pages, one browser session increments once per post.
- List pages only read and display counts.
- If both worker endpoints fail, UI displays `--` (unavailable), not `0`.
