let items = [];
let currentIndex = 0;
let autoRotateTimer = null;
const autoRotateMs = 4000;

const viewport = document.getElementById("carouselViewport");
const dotRow = document.getElementById("dotRow");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

function getQuery() {
  const p = new URLSearchParams(window.location.search);

  return {
    sheet: p.get("sheet") || ""
  };
}

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

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

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
        scheduleHeightPost();
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

  scheduleHeightPost();
}

function update() {
  const slides = document.querySelectorAll(".slide");
  const dots = document.querySelectorAll(".dot");

  slides.forEach((s, i) => s.classList.toggle("active", i === currentIndex));
  dots.forEach((d, i) => d.classList.toggle("active", i === currentIndex));

  scheduleHeightPost();
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
  if (!sheetUrl) return;

  try {
    const res = await fetch(sheetUrl);
    if (!res.ok) return;

    const text = await res.text();
    items = sortItems(normalize(parseCSV(text)));
    currentIndex = 0;

    if (!items.length) return;

    render();
    startAutoRotate();
    scheduleHeightPost();
  } catch (error) {
    console.error(error);
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
if (cfg.sheet) {
  load(cfg.sheet);
}

function postHeightToParent() {
  if (window.parent === window) return;

  const height = Math.ceil(document.documentElement.scrollHeight);

  window.parent.postMessage(
    {
      type: "carousel-widget-height",
      height: height
    },
    "*"
  );
}

function scheduleHeightPost() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      postHeightToParent();
    });
  });
}

window.addEventListener("load", scheduleHeightPost);
window.addEventListener("resize", scheduleHeightPost);