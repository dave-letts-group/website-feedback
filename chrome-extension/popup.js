const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let state = {
  apiUrl: "",
  siteKey: "",
  category: "general",
  rating: 0,
  screenshot: null,
  pageTitle: "",
  pageUrl: "",
};

async function init() {
  const config = await chrome.storage.sync.get(["apiUrl", "siteKey"]);

  if (!config.apiUrl || !config.siteKey) {
    showView("not-configured");
    return;
  }

  state.apiUrl = config.apiUrl.replace(/\/+$/, "");
  state.siteKey = config.siteKey;

  showView("form-view");
  capturePageInfo();
  captureScreenshot();
}

function showView(id) {
  $$(".view").forEach((v) => (v.style.display = "none"));
  $(`#${id}`).style.display = "block";
}

async function capturePageInfo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      state.pageTitle = tab.title || "";
      state.pageUrl = tab.url || "";
      $("#page-title").textContent = state.pageTitle || "Untitled page";
      $("#page-url").textContent = state.pageUrl;
    }
  } catch {
    $("#page-title").textContent = "Untitled page";
    $("#page-url").textContent = "";
  }
}

async function captureScreenshot() {
  $("#screenshot-loading").style.display = "flex";
  $("#screenshot-img").style.display = "none";

  try {
    const response = await chrome.runtime.sendMessage({ action: "captureScreenshot" });
    if (response?.screenshot) {
      state.screenshot = response.screenshot;
      $("#screenshot-img").src = response.screenshot;
      $("#screenshot-img").style.display = "block";
    }
  } catch {
    /* screenshot is optional */
  } finally {
    $("#screenshot-loading").style.display = "none";
  }
}

function initCategoryButtons() {
  $$(".cat-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".cat-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.category = btn.dataset.cat;
    });
  });
}

function initStars() {
  $$(".star").forEach((star) => {
    star.addEventListener("click", () => {
      state.rating = Number(star.dataset.star);
      $$(".star").forEach((s) => {
        s.classList.toggle("active", Number(s.dataset.star) <= state.rating);
      });
    });
    star.addEventListener("mouseenter", () => {
      const val = Number(star.dataset.star);
      $$(".star").forEach((s) => {
        s.classList.toggle("active", Number(s.dataset.star) <= val);
      });
    });
  });
  $("#stars").addEventListener("mouseleave", () => {
    $$(".star").forEach((s) => {
      s.classList.toggle("active", Number(s.dataset.star) <= state.rating);
    });
  });
}

async function submitFeedback() {
  const message = $("#message").value.trim();
  if (!message) {
    $("#error-msg").textContent = "Please enter a message.";
    return;
  }

  const btn = $("#submit-btn");
  btn.disabled = true;
  btn.textContent = "Submitting...";
  $("#error-msg").textContent = "";

  let urlParams = null;
  try {
    const u = new URL(state.pageUrl);
    const params = Object.fromEntries(u.searchParams.entries());
    if (Object.keys(params).length) urlParams = params;
  } catch {
    /* ignore */
  }

  const payload = {
    message,
    category: state.category,
    rating: state.rating || undefined,
    pageTitle: state.pageTitle || undefined,
    pageUrl: state.pageUrl || undefined,
    urlParams: urlParams || undefined,
    screenshot: state.screenshot || undefined,
    metadata: { source: "chrome-extension", version: "1.0.0" },
  };

  try {
    const res = await fetch(`${state.apiUrl}/api/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Site-Key": state.siteKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || `Server error (${res.status})`);
    }

    showView("success-view");
    setTimeout(() => window.close(), 1800);
  } catch (err) {
    $("#error-msg").textContent = err.message || "Submission failed.";
    btn.disabled = false;
    btn.textContent = "Submit Feedback";
  }
}

$("#open-options")?.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

$("#settings-btn")?.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

$("#submit-btn")?.addEventListener("click", submitFeedback);

initCategoryButtons();
initStars();
init();
