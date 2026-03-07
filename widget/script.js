let items = [];
let currentIndex = 0;
let autoRotateTimer = null;
const autoRotateMs = 4000;

const viewport = document.getElementById("carouselViewport");
const dotRow = document.getElementById("dotRow");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const statusText = document.getElementById("statusText");
const pageHeading = document.getElementById("pageHeading");
const pageIntro = document.getElementById("pageIntro");

function getQuery() {
  const p = new URLSearchParams(window.location.search);

  return {
    sheet: p.get("sheet") || "",
    title: p.get("title") || "Embeddable Carousel Widget",
    intro: p.get("intro") || ""
  };
}

/*
  Robust CSV parser.

  Handles:
  - commas inside quoted fields
  - line breaks inside quoted fields
  - escaped quotes ("")
  - normal unquoted cells

  This is much safer for Google Sheets CSV exports.
*/
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i++;
      }

      row.push(cell);
      cell = "";

      if (row.some(value => value.trim() !== "")) {
        rows.push(row);
      }

      row = [];
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some(value => value.trim() !== "")) {
      rows.push(row);
    }
  }

  if (!rows.length) return [];

  const headers = rows[0].map(h => h.trim().toLowerCase());

  return rows.slice(1).map(values => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = (values[index] || "").trim();
    });
    return obj;
  });
}

/*
  Normalize the parsed rows.

  Required columns:
  - date
  - title
  - blurb
  - background image

  Optional column:
  - link

  If link is present, the title becomes clickable.
*/
function normalize(data) {
  return data
    .map(r => ({
      date: r["date"] || "",
      title: r["title"] || "",
      blurb: r["blurb"] || "",
      image: r["background image"] || "",
      link: r["link"] || ""
    }))
    .filter(item => item.date && item.title && item.blurb && item.image);
}

function sortItems(data) {
  return [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function formatDate(dateString) {
  const date = new Date(dateString + "T00:00:00");
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function getTruncatedText(text, maxChars = 200) {
  if (text.length <= maxChars) {
    return { shortText: text, isTruncated: false };
  }

  return {
    shortText: text.slice(0, maxChars).trim() + "...",
    isTruncated: true
  };
}

/*
  Escape text before inserting into HTML.
  This prevents accidental HTML injection.
*/
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/*
  Convert plain URLs and markdown links in text into clickable links.

  Supported:
  1. Plain URLs
     Example:
     https://example.com/paper

  2. Markdown links
     Example:
     [Read the paper](https://example.com/paper)

  Important limitation:
  Google Sheets rich hyperlinks are not preserved in CSV metadata.
  So use plain URLs, markdown links, or an optional separate 'link' column.
*/
function linkifyText(text) {
  let safe = escapeHtml(text);

  safe = safe.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  safe = safe.replace(
    /(^|[\s(])(https?:\/\/[^\s<]+)/g,
    '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>'
  );

  return safe.replace(/\n/g, "<br>");
}

function render() {
  viewport.innerHTML = "";
  dotRow.innerHTML = "";

  items.forEach((item, i) => {
    const slide = document.createElement("div");
    slide.className = "slide";
    if (i === currentIndex) slide.classList.add("active");

    const card = document.createElement("div");
    card.className = "card";
    card.style.backgroundImage = `url("${item.image}")`;

    const caption = document.createElement("div");
    caption.className = "caption";

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = formatDate(item.date);

    const title = document.createElement("div");
    title.className = "title";

    if (item.link) {
      const titleLink = document.createElement("a");
      titleLink.href = item.link;
      titleLink.target = "_blank";
      titleLink.rel = "noopener noreferrer";
      titleLink.textContent = item.title;
      titleLink.style.color = "white";
      titleLink.style.textDecoration = "underline";
      title.appendChild(titleLink);
    } else {
      title.textContent = item.title;
    }

    const bodyText = document.createElement("div");
    bodyText.className = "body-text";

    const { shortText, isTruncated } = getTruncatedText(item.blurb, 200);
    bodyText.innerHTML = linkifyText(shortText);

    caption.appendChild(meta);
    caption.appendChild(title);
    caption.appendChild(bodyText);

    if (isTruncated) {
      const btn = document.createElement("button");
      btn.className = "show-more-btn";
      btn.textContent = "Show more";

      let expanded = false;

      btn.onclick = () => {
        expanded = !expanded;
        bodyText.innerHTML = expanded
          ? linkifyText(item.blurb)
          : linkifyText(shortText);
        btn.textContent = expanded ? "Show less" : "Show more";
      };

      caption.appendChild(btn);
    }

    card.appendChild(caption);
    slide.appendChild(card);
    viewport.appendChild(slide);

    const dot = document.createElement("div");
    dot.className = "dot";
    if (i === currentIndex) dot.classList.add("active");

    dot.onclick = () => {
      currentIndex = i;
      update();
      restartAutoRotate();
    };

    dotRow.appendChild(dot);
  });

  updateStatus();
}

function update() {
  const slides = document.querySelectorAll(".slide");
  const dots = document.querySelectorAll(".dot");

  slides.forEach((s, i) => s.classList.toggle("active", i === currentIndex));
  dots.forEach((d, i) => d.classList.toggle("active", i === currentIndex));

  updateStatus();
}

function updateStatus() {
  if (!items.length) {
    statusText.textContent = "No items loaded.";
    return;
  }

  statusText.textContent = `Showing ${currentIndex + 1} of ${items.length} · newest first`;
}

function showPrev() {
  currentIndex = (currentIndex - 1 + items.length) % items.length;
  update();
}

function showNext() {
  currentIndex = (currentIndex + 1) % items.length;
  update();
}

function startAutoRotate() {
  stopAutoRotate();
  autoRotateTimer = setInterval(() => {
    if (items.length > 1) showNext();
  }, autoRotateMs);
}

function stopAutoRotate() {
  if (autoRotateTimer) {
    clearInterval(autoRotateTimer);
    autoRotateTimer = null;
  }
}

function restartAutoRotate() {
  startAutoRotate();
}

async function load(sheetUrl) {
  if (!sheetUrl) {
    statusText.textContent = "Missing sheet URL.";
    return;
  }

  try {
    const res = await fetch(sheetUrl);

    if (!res.ok) {
      statusText.textContent = "Failed to load data.";
      return;
    }

    const text = await res.text();
    items = sortItems(normalize(parseCSV(text)));
    currentIndex = 0;

    if (!items.length) {
      statusText.textContent = "No valid rows found.";
      return;
    }

    render();
    startAutoRotate();
  } catch (error) {
    console.error(error);
    statusText.textContent = "Error loading widget data.";
  }
}

prevBtn.onclick = () => {
  if (!items.length) return;
  showPrev();
  restartAutoRotate();
};

nextBtn.onclick = () => {
  if (!items.length) return;
  showNext();
  restartAutoRotate();
};

document.getElementById("carouselWidget").addEventListener("mouseenter", stopAutoRotate);
document.getElementById("carouselWidget").addEventListener("mouseleave", startAutoRotate);

const cfg = getQuery();
pageHeading.textContent = cfg.title;
pageIntro.textContent = cfg.intro;

if (cfg.sheet) {
  load(cfg.sheet);
} else {
  statusText.textContent = "No sheet URL provided.";
}