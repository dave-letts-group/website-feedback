(function () {
  "use strict";

  const HTML2CANVAS_URL =
    "https://cdn.jsdelivr.net/npm/html2canvas-pro@1.6.7/dist/html2canvas-pro.min.js";

  function loadHtml2Canvas() {
    return new Promise((resolve, reject) => {
      if (window.html2canvas) return resolve(window.html2canvas);
      const s = document.createElement("script");
      s.src = HTML2CANVAS_URL;
      s.onload = () => resolve(window.html2canvas);
      s.onerror = () => reject(new Error("Failed to load html2canvas"));
      document.head.appendChild(s);
    });
  }

  const POSITIONS = {
    "bottom-right": { bottom: "24px", right: "24px" },
    "bottom-left": { bottom: "24px", left: "24px" },
    "bottom-center": { bottom: "24px", left: "50%", transform: "translateX(-50%)" },
    "top-right": { top: "24px", right: "24px" },
    "top-left": { top: "24px", left: "24px" },
    "top-center": { top: "24px", left: "50%", transform: "translateX(-50%)" },
    "middle-right": { top: "50%", right: "24px", transform: "translateY(-50%)" },
    "middle-left": { top: "50%", left: "24px", transform: "translateY(-50%)" },
  };

  class FeedbackWidget extends HTMLElement {
    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: "open" });
      this._open = false;
      this._screenshot = null;
      this._category = "general";
      this._rating = 0;
      this._submitting = false;
      this._submitted = false;
    }

    static get observedAttributes() {
      return [
        "position", "site-key", "api-url", "page-title", "page-id",
        "user-id", "user-name", "metadata", "theme-color", "hide-trigger",
      ];
    }

    connectedCallback() {
      this.render();
    }

    attributeChangedCallback() {
      if (this._shadow.innerHTML) this.render();
    }

    get _themeColor() {
      return this.getAttribute("theme-color") || "#6366f1";
    }

    get _position() {
      return this.getAttribute("position") || "bottom-right";
    }

    _darken(hex, amount = 20) {
      const num = parseInt(hex.replace("#", ""), 16);
      const r = Math.max(0, (num >> 16) - amount);
      const g = Math.max(0, ((num >> 8) & 0xff) - amount);
      const b = Math.max(0, (num & 0xff) - amount);
      return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
    }

    async _captureScreen() {
      try {
        const h2c = await loadHtml2Canvas();
        const canvas = h2c(document.body, {
          scale: 0.5,
          useCORS: true,
          logging: false,
          ignoreElements: (el) => el.tagName === "FEEDBACK-WIDGET",
        });
        const result = await canvas;
        this._screenshot = result.toDataURL("image/jpeg", 0.6);
      } catch (err) {
        console.warn("LettsFeedback: screenshot capture failed", err);
        this._screenshot = null;
      }
    }

    async _openModal() {
      this._open = true;
      this._submitted = false;
      this._category = "general";
      this._rating = 0;
      this.render();
      await this._captureScreen();
      this.render();
    }

    _closeModal() {
      this._open = false;
      this._screenshot = null;
      this._submitted = false;
      this.render();
    }

    open() { this._openModal(); }
    close() { this._closeModal(); }

    async _submit() {
      const msg = this._shadow.querySelector("#fw-message");
      const message = msg ? msg.value.trim() : "";
      if (!message) {
        const el = this._shadow.querySelector("#fw-error");
        if (el) { el.textContent = "Please enter your feedback"; el.style.display = "block"; }
        return;
      }

      const apiUrl = this.getAttribute("api-url");
      const siteKey = this.getAttribute("site-key");
      if (!apiUrl || !siteKey) {
        console.error("LettsFeedback: api-url and site-key attributes are required");
        return;
      }

      this._submitting = true;
      this.render();

      let metadata = null;
      try {
        const raw = this.getAttribute("metadata");
        if (raw) metadata = JSON.parse(raw);
      } catch { /* ignore invalid JSON */ }

      let urlParams = null;
      try {
        const sp = new URLSearchParams(window.location.search);
        const obj = {};
        sp.forEach((v, k) => { obj[k] = v; });
        if (Object.keys(obj).length) urlParams = obj;
      } catch { /* ignore */ }

      const payload = {
        pageTitle: this.getAttribute("page-title") || document.title,
        pageId: this.getAttribute("page-id") || null,
        pageUrl: window.location.href,
        urlParams,
        userId: this.getAttribute("user-id") || null,
        userName: this.getAttribute("user-name") || null,
        message,
        category: this._category,
        rating: this._rating || null,
        screenshot: this._screenshot,
        metadata,
        userAgent: navigator.userAgent,
      };

      try {
        const res = await fetch(`${apiUrl.replace(/\/$/, "")}/api/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Site-Key": siteKey },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Submit failed");
        this._submitting = false;
        this._submitted = true;
        this.render();
        setTimeout(() => this._closeModal(), 2500);
      } catch (err) {
        console.error("LettsFeedback: submit error", err);
        this._submitting = false;
        this.render();
        const el = this._shadow.querySelector("#fw-error");
        if (el) { el.textContent = "Failed to send feedback. Please try again."; el.style.display = "block"; }
      }
    }

    render() {
      const c = this._themeColor;
      const cd = this._darken(c);
      const pos = POSITIONS[this._position] || POSITIONS["bottom-right"];
      const posCSS = Object.entries(pos).map(([k, v]) => `${k}:${v}`).join(";");

      this._shadow.innerHTML = `
        <style>
          :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          * { box-sizing: border-box; margin: 0; padding: 0; }

          .trigger {
            position: fixed; ${posCSS}; z-index: 2147483646;
            width: 56px; height: 56px; border-radius: 50%;
            background: ${c}; border: none; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 14px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.1);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            animation: fw-pulse 2s ease-in-out 3;
          }
          .trigger:hover { transform: scale(1.1); box-shadow: 0 6px 20px rgba(0,0,0,0.2); }
          .trigger:active { transform: scale(0.95); }
          .trigger svg { width: 26px; height: 26px; fill: white; }

          @keyframes fw-pulse {
            0%, 100% { box-shadow: 0 4px 14px rgba(0,0,0,0.15); }
            50% { box-shadow: 0 4px 14px rgba(0,0,0,0.15), 0 0 0 8px ${c}33; }
          }

          .overlay {
            position: fixed; inset: 0; z-index: 2147483647;
            background: rgba(0,0,0,0.45); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            padding: 20px;
            animation: fw-fadein 0.25s ease;
          }
          @keyframes fw-fadein { from { opacity: 0; } to { opacity: 1; } }

          .modal {
            background: #fff; border-radius: 20px; width: 100%; max-width: 460px;
            max-height: 90vh; overflow-y: auto;
            box-shadow: 0 25px 60px rgba(0,0,0,0.15);
            animation: fw-slideup 0.3s ease;
          }
          @keyframes fw-slideup { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

          .modal-header {
            display: flex; align-items: center; justify-content: space-between;
            padding: 20px 24px 0;
          }
          .modal-header h2 { font-size: 18px; font-weight: 700; color: #111; }
          .close-btn {
            width: 32px; height: 32px; border: none; background: #f3f4f6; border-radius: 8px;
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            transition: background 0.15s;
          }
          .close-btn:hover { background: #e5e7eb; }
          .close-btn svg { width: 16px; height: 16px; stroke: #6b7280; }

          .modal-body { padding: 20px 24px 24px; }

          .screenshot-wrap {
            border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;
            margin-bottom: 16px; background: #f9fafb;
          }
          .screenshot-wrap img { width: 100%; display: block; }
          .screenshot-loading {
            padding: 30px; text-align: center; color: #9ca3af; font-size: 13px;
          }
          .screenshot-loading .spinner {
            width: 24px; height: 24px; border: 2px solid #e5e7eb; border-top-color: ${c};
            border-radius: 50%; animation: fw-spin 0.7s linear infinite;
            display: inline-block; margin-bottom: 8px;
          }
          @keyframes fw-spin { to { transform: rotate(360deg); } }

          .categories { display: flex; gap: 8px; margin-bottom: 16px; }
          .cat-btn {
            flex: 1; padding: 10px 8px; border: 2px solid #e5e7eb; border-radius: 10px;
            background: #fff; cursor: pointer; font-size: 13px; font-weight: 600;
            color: #6b7280; transition: all 0.15s; text-align: center;
          }
          .cat-btn:hover { border-color: #d1d5db; }
          .cat-btn.active { border-color: ${c}; color: ${c}; background: ${c}0d; }

          .stars { display: flex; gap: 4px; margin-bottom: 16px; }
          .star {
            width: 32px; height: 32px; border: none; background: none;
            cursor: pointer; padding: 0; font-size: 24px; color: #d1d5db;
            transition: color 0.1s, transform 0.1s;
          }
          .star:hover { transform: scale(1.15); }
          .star.filled { color: #f59e0b; }

          label.field-label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
          textarea {
            width: 100%; min-height: 100px; padding: 12px; border: 2px solid #e5e7eb;
            border-radius: 10px; resize: vertical; font-family: inherit; font-size: 14px;
            color: #111; outline: none; transition: border-color 0.15s;
          }
          textarea:focus { border-color: ${c}; }
          textarea::placeholder { color: #9ca3af; }

          .error-msg { color: #ef4444; font-size: 13px; margin-top: 8px; display: none; }

          .submit-btn {
            width: 100%; margin-top: 16px; padding: 14px; border: none; border-radius: 12px;
            background: ${c}; color: #fff; font-size: 15px; font-weight: 700;
            cursor: pointer; transition: background 0.15s;
          }
          .submit-btn:hover { background: ${cd}; }
          .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

          .success-view {
            padding: 40px 24px; text-align: center;
          }
          .success-check {
            width: 60px; height: 60px; border-radius: 50%; background: #ecfdf5;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 16px;
          }
          .success-check svg { width: 30px; height: 30px; stroke: #10b981; }
          .success-view h3 { font-size: 18px; font-weight: 700; color: #111; margin-bottom: 6px; }
          .success-view p { font-size: 14px; color: #6b7280; }

          .powered { text-align: center; padding: 12px; font-size: 11px; color: #9ca3af; }
        </style>

        ${this._open || this.hasAttribute("hide-trigger") ? "" : `
          <button class="trigger" id="fw-trigger" aria-label="Send feedback">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
            </svg>
          </button>
        `}

        ${this._open ? `
          <div class="overlay" id="fw-overlay">
            <div class="modal" id="fw-modal">
              ${this._submitted ? `
                <div class="success-view">
                  <div class="success-check">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <h3>Thank you!</h3>
                  <p>Your feedback has been submitted.</p>
                </div>
              ` : `
                <div class="modal-header">
                  <h2>Send Feedback</h2>
                  <button class="close-btn" id="fw-close" aria-label="Close">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
                <div class="modal-body">
                  <div class="screenshot-wrap">
                    ${this._screenshot
                      ? `<img src="${this._screenshot}" alt="Screenshot"/>`
                      : `<div class="screenshot-loading"><div class="spinner"></div><br>Capturing page...</div>`
                    }
                  </div>

                  <div class="categories">
                    <button class="cat-btn ${this._category === "bug" ? "active" : ""}" data-cat="bug">🐛 Bug</button>
                    <button class="cat-btn ${this._category === "feature" ? "active" : ""}" data-cat="feature">✨ Feature</button>
                    <button class="cat-btn ${this._category === "general" ? "active" : ""}" data-cat="general">💬 General</button>
                  </div>

                  <div class="stars">
                    ${[1,2,3,4,5].map(i => `<button class="star ${i <= this._rating ? "filled" : ""}" data-star="${i}">★</button>`).join("")}
                  </div>

                  <label class="field-label" for="fw-message">Your feedback</label>
                  <textarea id="fw-message" placeholder="What's on your mind? Describe a bug, suggest a feature, or share your thoughts...">${""}</textarea>
                  <div class="error-msg" id="fw-error"></div>

                  <button class="submit-btn" id="fw-submit" ${this._submitting ? "disabled" : ""}>
                    ${this._submitting ? "Sending..." : "Submit Feedback"}
                  </button>
                </div>
                <div class="powered">Powered by LettsFeedback</div>
              `}
            </div>
          </div>
        ` : ""}
      `;

      this._bindEvents();
    }

    _bindEvents() {
      const trigger = this._shadow.querySelector("#fw-trigger");
      if (trigger) trigger.addEventListener("click", () => this._openModal());

      const overlay = this._shadow.querySelector("#fw-overlay");
      if (overlay) overlay.addEventListener("click", (e) => {
        if (e.target === overlay) this._closeModal();
      });

      const close = this._shadow.querySelector("#fw-close");
      if (close) close.addEventListener("click", () => this._closeModal());

      this._shadow.querySelectorAll(".cat-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          this._category = btn.dataset.cat;
          this._shadow.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
        });
      });

      this._shadow.querySelectorAll(".star").forEach((btn) => {
        btn.addEventListener("click", () => {
          this._rating = parseInt(btn.dataset.star);
          this._shadow.querySelectorAll(".star").forEach((s, i) => {
            s.classList.toggle("filled", i < this._rating);
          });
        });
      });

      const submit = this._shadow.querySelector("#fw-submit");
      if (submit) submit.addEventListener("click", () => this._submit());

      const textarea = this._shadow.querySelector("#fw-message");
      if (textarea) textarea.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) this._submit();
      });
    }
  }

  if (!customElements.get("feedback-widget")) {
    customElements.define("feedback-widget", FeedbackWidget);
  }
})();
