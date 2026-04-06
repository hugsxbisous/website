const TEMPLATE_COPY_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRPijOiKx9bW01Ffj3nyervBJ4KBUZ1o3A-SnmFGo1FCJj3q7OcCHBpW0PySZqffl8XgYd86EtPpl7M/pub?output=csv/copy";
const WIDGET_BASE_URL = "https://hugsxbisous.github.io/page/member_timeline/index.html";
const sheetUrlInput = document.getElementById("sheetUrlInput");
const copyTemplateBtn = document.getElementById("copyTemplateBtn");
const createWidgetBtn = document.getElementById("createWidgetBtn");
const previewWidgetBtn = document.getElementById("previewWidgetBtn");
const copyEmbedBtn = document.getElementById("copyEmbedBtn");
const embedCodeOutput = document.getElementById("embedCodeOutput");
const successBox = document.getElementById("successBox");
const errorBox = document.getElementById("errorBox");

let currentWidgetUrl = "";

function showSuccess(message) {
  successBox.textContent = message;
  successBox.hidden = false;
  errorBox.hidden = true;
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
  successBox.hidden = true;
}

function clearMessages() {
  successBox.hidden = true;
  errorBox.hidden = true;
}

function looksLikeGoogleSheetsCsv(url) {
  if (!url) return false;
  const lower = url.toLowerCase();

  return (
    lower.includes("docs.google.com/spreadsheets") &&
    (lower.includes("format=csv") ||
      lower.includes("output=csv") ||
      lower.includes("/export?"))
  );
}

function buildWidgetUrl(sheet) {
  const url = new URL(WIDGET_BASE_URL);
  url.searchParams.set("sheet", sheet);
  return url.toString();
}

function buildEmbedCode(widgetUrl) {
  const iframeId = `member-timeline-${Date.now()}`;
  const widgetOrigin = new URL(widgetUrl).origin;

  return `<iframe
  id="${iframeId}"
  src="${widgetUrl}"
  width="100%"
  height="360"
  style="border:0; width:100%; display:block; overflow:hidden;"
  loading="lazy"
  scrolling="no"
  title="Member Timeline Widget">
</iframe>
<script>
(function() {
  const iframe = document.getElementById("${iframeId}");
  if (!iframe) return;

  window.addEventListener("message", function(event) {
    if (event.origin !== "${widgetOrigin}") return;
    const data = event.data;
    if (!data || data.type !== "member-timeline-height") return;
    if (!data.height) return;
    iframe.style.height = data.height + "px";
  });
})();
</script>`;
}

copyTemplateBtn.addEventListener("click", () => {
  clearMessages();

  if (!TEMPLATE_COPY_URL.includes("/copy")) {
    showError("Set TEMPLATE_COPY_URL to a Google Sheets /copy link.");
    return;
  }

  window.open(TEMPLATE_COPY_URL, "_blank", "noopener,noreferrer");
  showSuccess("Template opened in a new tab. Make a copy, fill it out, publish it as CSV, then paste that CSV link here.");
});

createWidgetBtn.addEventListener("click", () => {
  clearMessages();

  const sheet = sheetUrlInput.value.trim();

  if (!sheet) {
    showError("Paste a published Google Sheet CSV URL first.");
    return;
  }

  if (!looksLikeGoogleSheetsCsv(sheet)) {
    showError("That does not look like a published Google Sheets CSV URL.");
    return;
  }

  currentWidgetUrl = buildWidgetUrl(sheet);
  embedCodeOutput.textContent = buildEmbedCode(currentWidgetUrl);
  showSuccess("Embed code generated.");
});

previewWidgetBtn.addEventListener("click", () => {
  clearMessages();

  const sheet = sheetUrlInput.value.trim();

  if (!sheet) {
    showError("Paste a published Google Sheet CSV URL first.");
    return;
  }

  if (!looksLikeGoogleSheetsCsv(sheet)) {
    showError("That does not look like a published Google Sheets CSV URL.");
    return;
  }

  currentWidgetUrl = buildWidgetUrl(sheet);
  window.open(currentWidgetUrl, "_blank", "noopener,noreferrer");
});

copyEmbedBtn.addEventListener("click", async () => {
  clearMessages();

  const text = embedCodeOutput.textContent.trim();
  if (!text || text.startsWith('Click "Create widget code"')) {
    showError("Generate the embed code first.");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showSuccess("Embed code copied to clipboard.");
  } catch {
    showError("Could not copy automatically. Please copy the code manually.");
  }
});