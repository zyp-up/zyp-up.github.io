(function () {
  var cfg = window.PAGE_VIEWS_CONFIG || {};
  var provider = cfg.provider || "counterapi";
  var namespace = cfg.namespace || "zypup_blog_pv";
  var counterApiEndpoint = (cfg.counterapi_endpoint || "https://api.counterapi.dev/v1").replace(/\/$/, "");
  var workerEndpoint = (cfg.worker_endpoint || "").replace(/\/$/, "");
  var backupWorkerEndpoint = (cfg.backup_worker_endpoint || "").replace(/\/$/, "");
  var timeoutMs = Number(cfg.timeout_ms) > 0 ? Number(cfg.timeout_ms) : 5000;

  function buildCounterApiReadUrl(key) {
    return counterApiEndpoint + "/" + namespace + "/" + key + "/";
  }

  function buildCounterApiUpUrl(key) {
    return counterApiEndpoint + "/" + namespace + "/" + key + "/up";
  }

  function buildWorkerReadUrl(endpoint, key) {
    return endpoint + "/view?key=" + encodeURIComponent(key);
  }

  function buildWorkerUpUrl(endpoint, key) {
    return endpoint + "/view/up?key=" + encodeURIComponent(key);
  }

  function uniqueUrls(urls) {
    return urls.filter(function (url, idx) {
      return !!url && urls.indexOf(url) === idx;
    });
  }

  function buildReadUrls(key) {
    if (provider === "worker") {
      return uniqueUrls([
        workerEndpoint ? buildWorkerReadUrl(workerEndpoint, key) : "",
        backupWorkerEndpoint ? buildWorkerReadUrl(backupWorkerEndpoint, key) : "",
      ]);
    }

    return uniqueUrls([buildCounterApiReadUrl(key)]);
  }

  function buildUpUrls(key) {
    if (provider === "worker") {
      return uniqueUrls([
        workerEndpoint ? buildWorkerUpUrl(workerEndpoint, key) : "",
        backupWorkerEndpoint ? buildWorkerUpUrl(backupWorkerEndpoint, key) : "",
      ]);
    }

    return uniqueUrls([buildCounterApiUpUrl(key)]);
  }

  function fetchJsonWithTimeout(url) {
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = null;

    if (controller) {
      timer = setTimeout(function () {
        controller.abort();
      }, timeoutMs);
    }

    return fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller ? controller.signal : undefined,
    }).then(function (res) {
      if (timer) {
        clearTimeout(timer);
      }

      if (!res.ok) {
        throw new Error("http_" + res.status);
      }

      return res.json();
    }).catch(function (err) {
      if (timer) {
        clearTimeout(timer);
      }
      throw err;
    });
  }

  function fetchWithFallback(urls) {
    var idx = 0;

    function tryNext() {
      if (idx >= urls.length) {
        return Promise.reject(new Error("all_endpoints_failed"));
      }

      var url = urls[idx];
      idx += 1;

      return fetchJsonWithTimeout(url).catch(function () {
        return tryNext();
      });
    }

    return tryNext();
  }

  function getSessionItemSafe(key) {
    try {
      return sessionStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function setSessionItemSafe(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch (e) {}
  }

  function incrementPostView() {
    var pageKey = document.body.getAttribute("data-page-key");
    var shouldIncrement = document.body.getAttribute("data-increment-view") === "true";

    if (!shouldIncrement || !pageKey) {
      return;
    }

    var guardKey = "view_incremented_" + pageKey;
    if (getSessionItemSafe(guardKey) === "1") {
      return;
    }

    fetchWithFallback(buildUpUrls(pageKey))
      .then(function () {
        setSessionItemSafe(guardKey, "1");
      })
      .catch(function () {});
  }

  function hydrateCounters() {
    var counters = document.querySelectorAll(".counter-view-span");
    if (!counters.length) {
      return;
    }

    counters.forEach(function (el) {
      var key = el.getAttribute("data-key");
      if (!key) {
        el.textContent = "0";
        return;
      }

      fetchWithFallback(buildReadUrls(key))
        .then(function (data) {
          el.textContent = typeof data.count === "number" ? String(data.count) : "0";
        })
        .catch(function () {
          el.textContent = "--";
        });
    });
  }

  function initPageViews() {
    incrementPostView();
    hydrateCounters();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPageViews);
  } else {
    initPageViews();
  }
})();
