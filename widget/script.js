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

function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentValue = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") i++;
      currentRow.push(currentValue);
      currentValue = "";

      if (currentRow.some(cell => cell.trim() !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentValue += char;
    }
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    if (currentRow.some(cell => cell.trim() !== "")) {
      rows.push(currentRow);
    }
  }

  if (!rows.length) return [];

  const headers = rows[0].map(h => h.trim().toLowerCase());

  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (row[i] || "").trim();
    });
    return obj;
  });
}

function normalize(data) {
  return data
    .map(r => ({
      date: r["date"] || "",
      title: r["title"] || "",
      blurb: r["blurb"] || "",
      image: r["background image"] || ""
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
    title.textContent = item.title;

    const bodyText = document.createElement("div");
    bodyText.className = "body-text";

    const { shortText, isTruncated } = getTruncatedText(item.blurb, 200);
    bodyText.textContent = shortText;

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
        bodyText.textContent = expanded ? item.blurb : shortText;
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

  const res = await fetch(sheetUrl);
  if (!res.ok) {
    statusText.textContent = "Failed to load data.";
    return;
  }

  const text = await res.text();
  items = sortItems(normalize(parseCSV(text)));
  currentIndex = 0;
  render();
  startAutoRotate();
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