(() => {
  const THEME_KEY = "theme";
  const GITHUB_USERNAME = "Isharkii";

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $all(selector, root = document) {
    return [...root.querySelectorAll(selector)];
  }

  function setTheme(theme) {
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem(THEME_KEY, theme);
      return;
    }

    document.documentElement.removeAttribute("data-theme");
    localStorage.removeItem(THEME_KEY);
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") setTheme(saved);

    const btn = $(".theme-toggle");
    if (!btn) return;

    btn.addEventListener("click", () => {
      const attr = document.documentElement.getAttribute("data-theme");
      const current =
        attr === "light" || attr === "dark"
          ? attr
          : window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
            ? "dark"
            : "light";
      const next = current === "light" ? "dark" : "light";
      setTheme(next);
    });
  }

  function initNav() {
    const toggle = $(".nav-toggle");
    const links = $(".nav-links");
    if (!toggle || !links) return;

    function setOpen(open) {
      links.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    }

    toggle.addEventListener("click", () => setOpen(!links.classList.contains("is-open")));

    links.addEventListener("click", (e) => {
      if (e.target instanceof HTMLAnchorElement) setOpen(false);
    });

    document.addEventListener("click", (e) => {
      if (!links.classList.contains("is-open")) return;
      if (e.target === toggle || toggle.contains(e.target)) return;
      if (e.target === links || links.contains(e.target)) return;
      setOpen(false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!links.classList.contains("is-open")) return;
      setOpen(false);
      toggle.focus();
    });
  }

  function initReveal() {
    const items = $all(".reveal");
    if (!items.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.18 }
    );

    for (const el of items) io.observe(el);
  }

  function formatCount(value, suffix) {
    return `${value}${suffix ?? ""}`;
  }

  function initCounters() {
    const stats = $all("[data-count] .stat-value");
    if (!stats.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target;
          const toRaw = el.getAttribute("data-count-to") ?? "0";
          const to = Number(toRaw);
          const decimals = (toRaw.split(".")[1] ?? "").length;
          const suffix = el.getAttribute("data-count-suffix") ?? "";
          const start = performance.now();
          const duration = 900;

          function tick(now) {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            const current = to * eased;
            const rendered = t >= 1 ? to : current;
            el.textContent = formatCount(rendered.toFixed(decimals), suffix);
            if (t < 1) requestAnimationFrame(tick);
          }

          requestAnimationFrame(tick);
          io.unobserve(el);
        }
      },
      { threshold: 0.7 }
    );

    for (const el of stats) io.observe(el);
  }

  function initProjectFilters() {
    const buttons = $all(".filter");
    const cards = $all(".project");
    if (!buttons.length || !cards.length) return;

    function apply(filter) {
      for (const btn of buttons) btn.classList.toggle("is-active", btn.dataset.filter === filter);

      for (const card of cards) {
        if (filter === "all") {
          card.hidden = false;
          continue;
        }
        const tags = (card.getAttribute("data-tags") ?? "").split(/\s+/).filter(Boolean);
        card.hidden = !tags.includes(filter);
      }
    }

    for (const btn of buttons) {
      btn.addEventListener("click", () => apply(btn.dataset.filter ?? "all"));
    }
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const el = document.createElement("textarea");
        el.value = text;
        el.setAttribute("readonly", "true");
        el.style.position = "fixed";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        el.remove();
        return true;
      } catch {
        return false;
      }
    }
  }

  function initCopyButtons() {
    for (const btn of $all("[data-copy]")) {
      btn.addEventListener("click", async () => {
        const text = btn.getAttribute("data-copy");
        if (!text) return;
        const ok = await copyToClipboard(text);
        const prev = btn.textContent;
        btn.textContent = ok ? "Copied" : "Copy failed";
        setTimeout(() => (btn.textContent = prev), 900);
      });
    }

    const reveal = $("#reveal-phone");
    const obfuscated = $("#phone-obfuscated");
    if (reveal && obfuscated) {
      reveal.addEventListener("click", () => {
        const phone = reveal.getAttribute("data-phone");
        if (!phone) return;
        obfuscated.textContent = phone;
        reveal.disabled = true;
        reveal.textContent = "Revealed";
      });
    }
  }

  function renderGitHubRepos(repos) {
    const list = $("#gh-repo-list");
    if (!list) return;
    list.innerHTML = "";

    for (const repo of repos) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = repo.html_url;
      a.target = "_blank";
      a.rel = "noreferrer";
      a.textContent = repo.name;
      li.appendChild(a);
      list.appendChild(li);
    }
  }

  async function initGitHub() {
    const status = $("#gh-status");
    const mini = $("#gh-mini");
    if (!status || !mini) return;

    const headers = { Accept: "application/vnd.github+json" };

    try {
      const [userRes, reposRes] = await Promise.all([
        fetch(`https://api.github.com/users/${encodeURIComponent(GITHUB_USERNAME)}`, { headers }),
        fetch(`https://api.github.com/users/${encodeURIComponent(GITHUB_USERNAME)}/repos?sort=updated&per_page=6`, {
          headers,
        }),
      ]);

      if (!userRes.ok) throw new Error("GitHub user fetch failed");
      if (!reposRes.ok) throw new Error("GitHub repos fetch failed");

      const user = await userRes.json();
      const repos = await reposRes.json();

      $("#gh-avatar").src = user.avatar_url;
      $("#gh-avatar").alt = `${user.login} avatar`;
      $("#gh-name").textContent = user.name || user.login;
      $("#gh-meta").textContent = user.bio || `@${user.login}`;
      $("#gh-repos").textContent = String(user.public_repos ?? "");
      $("#gh-followers").textContent = String(user.followers ?? "");

      renderGitHubRepos(Array.isArray(repos) ? repos : []);

      status.hidden = true;
      mini.hidden = false;
    } catch {
      status.textContent = "GitHub snapshot unavailable right now (rate limit / offline).";
    }
  }

  function initYear() {
    const el = $("#year");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  function initScrollSpy() {
    const links = $all(".nav-links a");
    const sections = links
      .map((a) => {
        const id = a.getAttribute("href")?.replace("#", "");
        if (!id) return null;
        const section = document.getElementById(id);
        if (!section) return null;
        return { a, section };
      })
      .filter(Boolean);

    if (!sections.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0];
        if (!visible) return;

        for (const { a } of sections) {
          a.classList.toggle("is-active", a.getAttribute("href") === `#${visible.target.id}`);
          if (a.classList.contains("is-active")) a.setAttribute("aria-current", "page");
          else a.removeAttribute("aria-current");
        }
      },
      { rootMargin: "-25% 0px -65% 0px", threshold: [0.05, 0.1, 0.2] }
    );

    for (const { section } of sections) io.observe(section);
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initNav();
    initReveal();
    initCounters();
    initProjectFilters();
    initCopyButtons();
    initGitHub();
    initScrollSpy();
    initYear();
  });
})();
