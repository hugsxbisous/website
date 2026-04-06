const timelineRoot = document.getElementById("timelineRoot");

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
      if (char === "\r" && next === "\n") i++;
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
      year: Number(r["year"]),
      phd: Number(r["phd"] || 0),
      masters: Number(r["masters"] || 0)
    }))
    .filter(item =>
      Number.isFinite(item.year) &&
      item.year > 0 &&
      (item.phd > 0 || item.masters > 0)
    )
    .sort((a, b) => a.year - b.year);
}

function makeDots(count, className) {
  const group = document.createElement("div");
  group.className = "dot-group";

  for (let i = 0; i < count; i++) {
    const dot = document.createElement("span");
    dot.className = `dot ${className}`;
    group.appendChild(dot);
  }

  return group;
}

function renderTimeline(items) {
  timelineRoot.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No non-empty years found in this sheet.";
    timelineRoot.appendChild(empty);
    scheduleHeightPost();
    return;
  }

  const track = document.createElement("div");
  track.className = "timeline-track";

  items.forEach(item => {
    const block = document.createElement("div");
    block.className = "year-block";

    const label = document.createElement("div");
    label.className = "year-label";
    label.textContent = item.year;

    const tick = document.createElement("div");
    tick.className = "tick";

    const compartment = document.createElement("div");
    compartment.className = "year-compartment";

    if (item.phd > 0) {
      compartment.appendChild(makeDots(item.phd, "phd"));
    }

    if (item.masters > 0) {
      compartment.appendChild(makeDots(item.masters, "masters"));
    }

    block.appendChild(label);
    block.appendChild(tick);
    block.appendChild(compartment);
    track.appendChild(block);
  });

  const legend = document.createElement("div");
  legend.className = "legend";
  legend.innerHTML = `
    <div class="legend-item">
      <span class="legend-swatch phd"></span>
      <span>PhDs</span>
    </div>
    <div class="legend-item">
      <span class="legend-swatch masters"></span>
      <span>Master’s</span>
    </div>
  `;

  timelineRoot.appendChild(track);
  timelineRoot.appendChild(legend);

  scheduleHeightPost();
}

async function load(sheetUrl) {
  if (!sheetUrl) return;

  try {
    const res = await fetch(sheetUrl);
    if (!res.ok) return;

    const text = await res.text();
    const items = normalize(parseCSV(text));
    renderTimeline(items);
  } catch (error) {
    console.error(error);
  }
}

function postHeightToParent() {
  if (window.parent === window) return;

  const height = Math.ceil(document.documentElement.scrollHeight);

  window.parent.postMessage(
    {
      type: "member-timeline-height",
      height
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

const cfg = getQuery();
if (cfg.sheet) {
  load(cfg.sheet);
}