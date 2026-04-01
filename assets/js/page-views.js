(function () {
  var cfg = window.PAGE_VIEWS_CONFIG || {};
  var provider = cfg.provider || "counterapi";
  var namespace = cfg.namespace || "zypup_blog_pv";
  var counterApiEndpoint = (cfg.counterapi_endpoint || "https://api.counterapi.dev/v1").replace(/\/$/, "");
  var workerEndpoint = (cfg.worker_endpoint || "").replace(/\/$/, "");

  function buildReadUrl(key) {
    if (provider === "worker" && workerEndpoint) {
      return workerEndpoint + "/view?key=" + encodeURIComponent(key);
    }
    return counterApiEndpoint + "/" + namespace + "/" + key + "/";
  }

  function buildUpUrl(key) {
    if (provider === "worker" && workerEndpoint) {
      return workerEndpoint + "/view/up?key=" + encodeURIComponent(key);
    }
    return counterApiEndpoint + "/" + namespace + "/" + key + "/up";
  }

  function fetchJson(url) {
    return fetch(url, { method: "GET", cache: "no-store" }).then(function (res) {
      if (!res.ok) {
        return { count: 0 };
      }
      return res.json();
    });
  }

  function incrementPostView() {
    var pageKey = document.body.getAttribute("data-page-key");
    var shouldIncrement = document.body.getAttribute("data-increment-view") === "true";

    if (!shouldIncrement || !pageKey) {
      return;
    }

    var guardKey = "view_incremented_" + pageKey;
    if (sessionStorage.getItem(guardKey) === "1") {
      return;
    }

    fetch(buildUpUrl(pageKey), { method: "GET", cache: "no-store" })
      .then(function () {
        sessionStorage.setItem(guardKey, "1");
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

      fetchJson(buildReadUrl(key))
        .then(function (data) {
          el.textContent = typeof data.count === "number" ? String(data.count) : "0";
        })
        .catch(function () {
          el.textContent = "0";
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
