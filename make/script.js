/*
  Update these two constants before publishing.

  TEMPLATE_COPY_URL:
  Use the Google Sheets force-copy link format:
  https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/copy

  WIDGET_BASE_URL:
  This should point to your widget-only page.
  Example:
  https://your-username.github.io/your-repo/website/widget/index.html
*/
const TEMPLATE_COPY_URL = "https://docs.google.com/spreadsheets/d/124hJx2BHIy8cktjzEVT4_ZyjpxTxulhCyVChQZ9-rCg/copy";
const WIDGET_BASE_URL = "https://hugsxbisous.github.io/website/widget/index.html";

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
    (
      lower.includes("format=csv") ||
      lower.includes("output=csv") ||
      lower.includes("/export?")
    )
  );
}

/*
  Widget now only needs the sheet URL.
*/
function buildWidgetUrl(sheet) {
  const url = new URL(WIDGET_BASE_URL);
  url.searchParams.set("sheet", sheet);
  return url.toString();
}

function buildEmbedCode(widgetUrl) {
  const iframeId = `carousel-widget-${Date.now()}`;

  return `<iframe
  id="${iframeId}"
  src="${widgetUrl}"
  width="100%"
  height="420"
  style="border:0; width:100%; max-width:1100px; display:block;"
  loading="lazy"
  scrolling="no"
  title="Carousel Widget">
</iframe>
<script>
(function() {
  const iframe = document.getElementById("${iframeId}");
  if (!iframe) return;

  window.addEventListener("message", function(event) {
    const data = event.data;
    if (!data || data.type !== "carousel-widget-height") return;
    if (!data.height) return;

    iframe.style.height = data.height + "px";
  });
})();
</script>`;
}

copyTemplateBtn.addEventListener("click", () => {
  clearMessages();

  if (!TEMPLATE_COPY_URL || !TEMPLATE_COPY_URL.includes("/copy")) {
    showError("Set TEMPLATE_COPY_URL to a Google Sheets force-copy link ending in /copy.");
    return;
  }

  window.open(TEMPLATE_COPY_URL, "_blank", "noopener,noreferrer");
  showSuccess("Template opened in a new tab. Make a copy, fill it out, publish it as CSV, then paste that CSV link here.");
});

createWidgetBtn.addEventListener("click", () => {
  clearMessages();

  const sheet = sheetUrlInput.value.trim();

  if (!WIDGET_BASE_URL || WIDGET_BASE_URL.includes("your-username.github.io")) {
    showError("Set WIDGET_BASE_URL in script.js to your published widget page URL.");
    return;
  }

  if (!sheet) {
    showError("Paste a published Google Sheet CSV URL first.");
    return;
  }

  if (!looksLikeGoogleSheetsCsv(sheet)) {
    showError("That does not look like a published Google Sheets CSV URL. Use the CSV publish/export link.");
    return;
  }

  currentWidgetUrl = buildWidgetUrl(sheet);
  embedCodeOutput.textContent = buildEmbedCode(currentWidgetUrl);
  showSuccess("Embed code generated.");
});

previewWidgetBtn.addEventListener("click", () => {
  clearMessages();

  const sheet = sheetUrlInput.value.trim();

  if (!WIDGET_BASE_URL || WIDGET_BASE_URL.includes("your-username.github.io")) {
    showError("Set WIDGET_BASE_URL in script.js to your published widget page URL.");
    return;
  }

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
  } catch (error) {
    showError("Could not copy automatically. Please copy the code manually.");
  }
});