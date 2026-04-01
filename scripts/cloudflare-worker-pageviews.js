export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const key = sanitizeKey(url.searchParams.get("key"));

    if (!key) {
      return json({ code: 400, message: "invalid key" }, 400);
    }

    if (request.method !== "GET") {
      return json({ code: 405, message: "method not allowed" }, 405);
    }

    if (pathname === "/view") {
      const current = await getCount(env, key);
      return json({ key: key, count: current }, 200);
    }

    if (pathname === "/view/up") {
      const current = await getCount(env, key);
      const next = current + 1;
      await env.PAGE_VIEWS.put(key, String(next));
      return json({ key: key, count: next }, 200);
    }

    return json({ code: 404, message: "not found" }, 404);
  },
};

function sanitizeKey(input) {
  if (!input) return "";
  return input.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

async function getCount(env, key) {
  const value = await env.PAGE_VIEWS.get(key);
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
    },
  });
}
