const form = document.getElementById("settings-form");
const apiUrlInput = document.getElementById("api-url");
const siteKeyInput = document.getElementById("site-key");
const statusEl = document.getElementById("status");

async function loadSettings() {
  const config = await chrome.storage.sync.get(["apiUrl", "siteKey"]);
  if (config.apiUrl) apiUrlInput.value = config.apiUrl;
  if (config.siteKey) siteKeyInput.value = config.siteKey;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const apiUrl = apiUrlInput.value.trim().replace(/\/+$/, "");
  const siteKey = siteKeyInput.value.trim();

  if (!apiUrl || !siteKey) return;

  await chrome.storage.sync.set({ apiUrl, siteKey });
  statusEl.textContent = "Saved!";
  setTimeout(() => (statusEl.textContent = ""), 2000);
});

loadSettings();
