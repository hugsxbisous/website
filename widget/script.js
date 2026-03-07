const TEMPLATE_COPY_URL = "PASTE_TEMPLATE_SHEET_LINK";

let items = [];
let currentIndex = 0;

const viewport = document.getElementById("carouselViewport");
const dotRow = document.getElementById("dotRow");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const titleInput = document.getElementById("widgetTitleInput");
const introInput = document.getElementById("widgetIntroInput");
const sheetInput = document.getElementById("sheetUrlInput");

const embedOutput = document.getElementById("embedCodeOutput");


function getQuery(){

const p = new URLSearchParams(location.search);

return{

sheet:p.get("sheet"),
title:p.get("title") || "Embeddable Carousel Widget",
intro:p.get("intro") || ""

}

}



function parseCSV(text){

const lines = text.trim().split("\n");
const headers = lines[0].split(",");

return lines.slice(1).map(l=>{

const cells = l.split(",");

const obj = {};

headers.forEach((h,i)=>obj[h.trim().toLowerCase()] = cells[i]);

return obj;

});

}



function normalize(data){

return data.map(r=>({

date:r["date"],
title:r["title"],
blurb:r["blurb"],
image:r["background image"]

}));

}



function sortItems(data){

return data.sort((a,b)=>new Date(b.date)-new Date(a.date));

}



function render(){

viewport.innerHTML="";
dotRow.innerHTML="";

items.forEach((item,i)=>{

const slide=document.createElement("div");
slide.className="slide";

if(i===currentIndex)
slide.classList.add("active");


const card=document.createElement("div");
card.className="card";
card.style.backgroundImage=`url(${item.image})`;


const caption=document.createElement("div");
caption.className="caption";


caption.innerHTML=`

<div class="meta">${item.date}</div>

<div class="title">${item.title}</div>

<div class="body-text">${item.blurb}</div>

`;


card.appendChild(caption);
slide.appendChild(card);

viewport.appendChild(slide);


const dot=document.createElement("div");
dot.className="dot";

if(i===currentIndex)
dot.classList.add("active");

dot.onclick=()=>{

currentIndex=i;
update();

}

dotRow.appendChild(dot);

});

}



function update(){

const slides=document.querySelectorAll(".slide");
const dots=document.querySelectorAll(".dot");

slides.forEach((s,i)=>s.classList.toggle("active",i===currentIndex));
dots.forEach((d,i)=>d.classList.toggle("active",i===currentIndex));

}



prevBtn.onclick=()=>{

currentIndex=(currentIndex-1+items.length)%items.length;
update();

}



nextBtn.onclick=()=>{

currentIndex=(currentIndex+1)%items.length;
update();

}



async function load(sheet){

const res = await fetch(sheet);
const text = await res.text();

items = sortItems(normalize(parseCSV(text)));

render();

}



/* generator */

document.getElementById("createWidgetBtn").onclick=()=>{

const title=encodeURIComponent(titleInput.value);
const intro=encodeURIComponent(introInput.value);
const sheet=encodeURIComponent(sheetInput.value);

const url=`${location.origin}${location.pathname}?title=${title}&intro=${intro}&sheet=${sheet}`;

embedOutput.textContent = `<iframe src="${url}" width="100%" height="720" style="border:0"></iframe>`;

load(sheetInput.value);

}



document.getElementById("copyTemplateBtn").onclick=()=>{

window.open(TEMPLATE_COPY_URL);

}



/* init */

const cfg=getQuery();

if(cfg.sheet){

load(cfg.sheet);

}

document.getElementById("pageHeading").textContent=cfg.title;
document.getElementById("pageIntro").textContent=cfg.intro;