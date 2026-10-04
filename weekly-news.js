let pdfjsLib = null;
let pdfjsPromise = null;
function ensurePdfjs(){
  if(!pdfjsPromise) pdfjsPromise=import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs').then(lib=>{lib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';pdfjsLib=lib;return lib;});
  return pdfjsPromise;
}
const $ = id => document.getElementById('weeklyNews-'+id);
const state = { events: [], message: '' };
const newsEscape = value => String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const PATTERNS = [
{keys:['consumer price index','cpi'],name:'CPI / ინფლაცია',tier:'red'},
{keys:['producer price index','ppi'],name:'PPI / მწარმოებლის ფასები',tier:'red'},
{keys:['non-farm payrolls','nonfarm payrolls','nonfarm'],name:'NFP / სამუშაო ადგილები',tier:'red'},
{keys:['unemployment rate'],name:'უმუშევრობის მაჩვენებელი',tier:'red'},
{keys:['core pce','pce price index','personal consumption expenditures'],name:'PCE / Core PCE',tier:'red'},
{keys:['federal funds rate','interest rate decision','fomc'],name:'FOMC / განაკვეთი',tier:'red'},
{keys:['powell'],name:'Powell / Fed Chair',tier:'red'},
{keys:['federal reserve'],name:'Fed / მაღალი გავლენის სპიკერი',tier:'red'},
{keys:['treasury sec','treasury secretary','bessent'],name:'Treasury Secretary გამოსვლა',tier:'yellow'},
{keys:['trump speaks','trump'],name:'Trump / პრეზიდენტის გამოსვლა',tier:'yellow'},
{keys:['retail sales'],name:'Retail Sales',tier:'yellow'},
{keys:['initial jobless claims','jobless claims','unemployment claims'],name:'უმუშევრობის განაცხადები',tier:'yellow'},
{keys:['gross domestic product',' gdp'],name:'GDP',tier:'yellow'},
{keys:['ism manufacturing','ism services','ism'],name:'ISM',tier:'yellow'},
{keys:['s&p global pmi','pmi'],name:'PMI',tier:'yellow'},
{keys:['philly fed','philadelphia fed'],name:'Philly Fed Manufacturing',tier:'yellow'},
{keys:['jolts'],name:'JOLTS',tier:'yellow'},
{keys:['adp employment'],name:'ADP Employment',tier:'yellow'},
{keys:['consumer confidence'],name:'Consumer Confidence',tier:'yellow'},
{keys:['university of michigan','michigan'],name:'Michigan Sentiment',tier:'yellow'},
{keys:['durable goods'],name:'Durable Goods',tier:'yellow'}];

function parseDate(s){let m=s.match(/\b(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})\b/);if(m)return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;m=s.match(/\b(\d{1,2})[-\/](\d{1,2})[-\/](20\d{2})\b/);if(m)return `${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;const months={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};m=s.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(20\d{2})\b/i);if(m)return `${m[3]}-${String(months[m[1].slice(0,3).toLowerCase()]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;return null}
function parseTime(s){let m=s.match(/\b(1[0-2]|0?[1-9]):([0-5]\d)\s*(AM|PM)\b/i);if(m){let h=+m[1],mi=m[2],ap=m[3].toUpperCase();if(ap==='PM'&&h<12)h+=12;if(ap==='AM'&&h===12)h=0;return `${String(h).padStart(2,'0')}:${mi}`}m=s.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);return m?`${m[1]}:${m[2]}`:null}
function detectEvent(s){const l=s.toLowerCase();for(const p of PATTERNS)if(p.keys.some(k=>l.includes(k.toLowerCase())))return p;return null}
function weekdayLabel(d){const[y,m,day]=d.split('-').map(Number);return ['კვირა','ორშაბათი','სამშაბათი','ოთხშაბათი','ხუთშაბათი','პარასკევი','შაბათი'][new Date(y,m-1,day,12).getDay()]}
function dateLabel(d){const[y,m,day]=d.split('-').map(Number),months=['იანვარი','თებერვალი','მარტი','აპრილი','მაისი','ივნისი','ივლისი','აგვისტო','სექტემბერი','ოქტომბერი','ნოემბერი','დეკემბერი'];return `${weekdayLabel(d)}, ${day} ${months[m-1]}, ${y}`}
function etToTbilisi(dateStr,timeStr){const[y,m,d]=dateStr.split('-').map(Number),[hh,mm]=timeStr.split(':').map(Number),guess=new Date(Date.UTC(y,m-1,d,hh,mm));const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(guess),get=k=>Number(parts.find(x=>x.type===k)?.value),nyAsUtc=Date.UTC(get('year'),get('month')-1,get('day'),get('hour'),get('minute')),utcMs=guess.getTime()-(nyAsUtc-guess.getTime());return new Intl.DateTimeFormat('ka-GE',{timeZone:'Asia/Tbilisi',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(utcMs))}
function minute(t){const[h,m]=t.split(':').map(Number);return h*60+m}
function timeLabel(m){return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`}
function classify(e){if(/FOMC|Powell|Fed Chair/i.test(e.name))return{c:'red',s:'🔴 ნიუსამდე არ ვაჭრობ',t:'ნიუსამდე ახალ პოზიციას არ ვხსნი. ნიუსის შემდეგ ველოდები ბაზრის დამშვიდებას და ახალ სუფთა setup-ს.'};if(['CPI / ინფლაცია','PPI / მწარმოებლის ფასები','NFP / სამუშაო ადგილები','PCE / Core PCE','უმუშევრობის მაჩვენებელი'].includes(e.name))return{c:'blue',s:'🔵 მხოლოდ Post-News',t:'პირველ რეაქციას არ გავეკიდები. ველოდები სტაბილიზაციას, შემდეგ Liquidity Sweep → 5M MSS → FVG.'};if(e.tier==='yellow')return{c:'yellow',s:'🟡 ფრთხილად',t:'ნიუსთან ახლოს entry არ გავაკეთებ. release-ის მოახლოებისას ველოდები და მერე თავიდან ვაფასებ.'};if(e.tier==='gray')return{c:'gray',s:'⚪ დაბალი გავლენა',t:'low-impact/informational ნიუსია — ცალკე ბუფერს არ ვაწესებ, ჩვეულებრივ workflow-ს ვაგრძელებ.'};return{c:'green',s:'🟢 ჩვეულებრივი რეჟიმი',t:'ვიყენებ Liquidity → Sweep → 5M MSS → Displacement/FVG → Entry პროცესს.'}}
function safeWindows(date,events){const open=570,close=960,relevant=events.filter(e=>e.tier!=='gray'&&minute(e.time)>=open&&minute(e.time)<=close).sort((a,b)=>a.time.localeCompare(b.time)),out=[];let cursor=open+10;for(const e of relevant){const t=minute(e.time);let buffer=e.tier==='red'?30:15;if(/FOMC|Powell|Fed Chair/i.test(e.name))buffer=60;const a=Math.max(open,t-buffer),b=Math.min(close,t+buffer);if(cursor<a)out.push({type:'green',a:cursor,b:a});out.push({type:e.tier==='red'?'red':'yellow',a,b,event:e});cursor=Math.max(cursor,b)}if(cursor<close)out.push({type:'green',a:cursor,b:close});return out.filter(x=>x.b>x.a)}
function bestMoments(events){
  const days=[...new Set(events.map(e=>e.date))].sort();
  const out=[];
  for(const d of days){
    const es=events.filter(e=>e.date===d);
    const ws=safeWindows(d,es).filter(w=>w.type==='green' && (w.b-w.a)>=20);
    if(!ws.length) continue;
    const best=ws.reduce((a,b)=>(b.b-b.a)>(a.b-a.a)?b:a);
    out.push({date:d, a:best.a, b:best.b});
  }
  return out;
}
function dayPlan(date,events){events.sort((a,b)=>a.time.localeCompare(b.time));const pm=events.find(e=>/FOMC|Powell|Fed Chair/i.test(e.name)&&minute(e.time)>=720);if(pm)return{c:'red',s:'🔴 PM-მდე არ ვაჭრობ',t:`NY Open: ${etToTbilisi(date,'09:30')} თბილისი. ${etToTbilisi(date,pm.time)}-ის PM ნიუსამდე ახალ trade-ს არ ვხსნი. შემდეგ მხოლოდ ბაზრის სტაბილიზაციის შემთხვევაში ვუბრუნდები.`};const major=events.find(e=>['CPI / ინფლაცია','PPI / მწარმოებლის ფასები','NFP / სამუშაო ადგილები','PCE / Core PCE'].includes(e.name));if(major)return{c:'blue',s:'🔵 Post-News დღე',t:`NY Open: ${etToTbilisi(date,'09:30')} თბილისი. მთავარი ნიუსი: ${etToTbilisi(date,major.time)}. პირველ რეაქციას ვტოვებ და შემდეგ ვეძებ სუფთა Liquidity → 5M MSS → FVG setup-ს.`};if(events.some(e=>e.tier==='red'))return{c:'yellow',s:'🟡 ფრთხილი დღე',t:`NY Open: ${etToTbilisi(date,'09:30')} თბილისი. მაღალი გავლენის release არსებობს; ნიუსთან ახლოს ახალ პოზიციას არ ვხსნი.`};return{c:'green',s:'🟢 9:30-ზე ვაჭრობა შეიძლება',t:`NY Open: ${etToTbilisi(date,'09:30')} თბილისი. ველოდები Liquidity Sweep → 5M MSS → Displacement/FVG.`}}

function render(){
  const kpis=$('kpis');if(!kpis)return;
  const ffLink=$('ffLink');if(ffLink){const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'],now=new Date(),sunday=new Date(now);sunday.setDate(now.getDate()-now.getDay());ffLink.href=`https://www.forexfactory.com/calendar?week=${months[sunday.getMonth()]}${sunday.getDate()}.${sunday.getFullYear()}`;}
  const events=[...state.events].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const days=[...new Set(events.map(e=>e.date))],red=events.filter(e=>e.tier==='red').length,yellow=events.filter(e=>e.tier==='yellow').length;
  kpis.innerHTML=`<div class="news-kpi"><span class="news-kpi-icon">✦</span><b>${events.length}</b><small>ამოღებული ნიუსი</small></div><div class="news-kpi"><span class="news-kpi-icon">◷</span><b>${days.length}</b><small>აქტიური დღე</small></div><div class="news-kpi risk-high"><span class="news-kpi-icon">↗</span><b>${red}</b><small>მაღალი რისკი</small></div><div class="news-kpi risk-mid"><span class="news-kpi-icon">⌁</span><b>${yellow}</b><small>საშუალო რისკი</small></div><div class="news-kpi news-kpi-time"><span class="news-kpi-icon">◉</span><b>09:30 ET</b><small>NY Open · თბილისის დრო ავტომატურად</small></div>`;
  const moments=bestMoments(events);
  $('bestMoments').innerHTML=moments.length?moments.map(m=>`<div class="news-window is-clear"><span class="news-window-state">შესაძლო ფანჯარა</span><b>${newsEscape(dateLabel(m.date))}</b><strong>${etToTbilisi(m.date,timeLabel(m.a))} – ${etToTbilisi(m.date,timeLabel(m.b))}</strong><small>თბილისის დრო</small></div>`).join(''):`<div class="news-empty"><span>◌</span><p>${events.length?'ამ კვირაში მკაფიო სუფთა ფანჯარა ვერ მოიძებნა.':'ატვირთე კვირის PDF ან ნახე საცდელი კვირა.'}</p></div>`;
  $('days').innerHTML=days.length?days.map(d=>{const es=events.filter(e=>e.date===d),plan=dayPlan(d,es),windows=safeWindows(d,es);return `<article class="news-day"><div class="news-day-top"><div><span class="news-overline">${weekdayLabel(d)}</span><h3>${newsEscape(dateLabel(d))}</h3></div><span class="news-status risk-${newsEscape(plan.c)}">${newsEscape(plan.s)}</span></div><p class="news-plan">${newsEscape(plan.t)}</p><div class="news-windows">${windows.map(w=>{const start=etToTbilisi(d,timeLabel(w.a)),end=etToTbilisi(d,timeLabel(w.b)),label=w.type==='green'?'შესაძლო setup':w.type==='yellow'?'ფრთხილად':'არ შეხვიდე';return `<div class="news-window-chip is-${newsEscape(w.type)}"><b>${label}</b><span>${start} – ${end}</span>${w.event?`<small>${newsEscape(w.event.name)} · ${etToTbilisi(d,w.event.time)}</small>`:''}</div>`}).join('')}</div><div class="news-footnote">ეს ფანჯრები წესებზეა დაფუძნებული. თუ NQ/ES ქაოსურად მოძრაობს, setup-ს ნუ აიძულებ.</div></article>`}).join(''):`<div class="news-empty"><span>◷</span><p>ნიუსები გამოჩნდება PDF-ის ატვირთვის შემდეგ.</p></div>`;
  $('events').innerHTML=events.length?`<table><thead><tr><th>თარიღი</th><th>ნიუსი</th><th>NY</th><th>თბილისი</th><th>რისკი</th><th>გეგმა</th></tr></thead><tbody>${events.map(e=>{const risk=classify(e);return `<tr><td>${newsEscape(dateLabel(e.date))}</td><td><b>${newsEscape(e.name)}</b></td><td>${newsEscape(e.time)}</td><td><strong>${etToTbilisi(e.date,e.time)}</strong></td><td><span class="news-status risk-${newsEscape(e.tier==='gray'?'gray':e.tier)}">${e.tier==='red'?'მაღალი':e.tier==='yellow'?'საშუალო':'დაბალი'}</span></td><td><span class="news-status risk-${newsEscape(risk.c)}">${newsEscape(risk.s.replace(/^[^ ]+ /,''))}</span><p class="news-cell-note">${newsEscape(risk.t)}</p></td></tr>`}).join('')}</tbody></table>`:`<div class="news-empty"><span>▤</span><p>ატვირთული კალენდრის მოვლენები აქ გამოჩნდება.</p></div>`;
  $('fileInfo').innerHTML=state.message?`<span class="news-message">${state.message}</span>`:'';
}

// ---- Position-aware extraction (handles Forex Factory print-to-PDF layout) ----
const MONTHS_MAP={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
const CUR_RE=/^(USD|EUR|GBP|JPY|CHF|CAD|AUD|NZD|CNY)$/;
const WD_RE=/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/i;
const MON_RE=/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})$/i;
const TIME_TOKEN_RE=/^(\d{1,2}):(\d{2})\s*(am|pm)$/i;
const VAL_RE=/^-?\d+(\.\d+)?[%KMB]?$/i;

function fixBold(s){
  if(s.length>=2 && s.length%2===0){
    let ok=true;
    for(let i=0;i<s.length;i+=2){ if(s[i]!==s[i+1]){ ok=false; break } }
    if(ok){ let r=''; for(let i=0;i<s.length;i+=2) r+=s[i]; return r }
  }
  return s;
}

function refDateFromText(txt){
  const m=txt.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if(!m) return null;
  let y=+m[3]; if(y<100) y+=2000;
  return {year:y, month:+m[1]};
}

async function extractStructured(pdf){
  const found=[], seen=new Set();
  let ref=null;
  for(let p=1;p<=pdf.numPages;p++){
    const page=await pdf.getPage(p);
    const content=await page.getTextContent();
    const raw=content.items.map(it=>({s:fixBold(it.str), x:it.transform[4], y:it.transform[5]})).filter(it=>it.s && it.s.trim());
    if(!raw.length) continue;
    if(!ref) ref=refDateFromText(raw.map(it=>it.s).join(' ')) || {year:new Date().getFullYear(), month:new Date().getMonth()+1};

    const rows=[];
    for(const it of [...raw].sort((a,b)=>b.y-a.y)){
      let row=rows.find(r=>Math.abs(r.y-it.y)<3);
      if(!row){ row={y:it.y, items:[]}; rows.push(row) }
      row.items.push(it);
    }
    rows.sort((a,b)=>b.y-a.y);
    for(const r of rows) r.items.sort((a,b)=>a.x-b.x);

    const curXs=raw.filter(it=>CUR_RE.test(it.s)).map(it=>it.x);
    const curX=curXs.length?Math.min(...curXs):135;

    const wdTokens=raw.filter(it=>WD_RE.test(it.s) && it.x<curX);
    const anchors=[];
    for(const wd of wdTokens){
      const win=raw.filter(it=>it.x<curX && Math.abs(it.y-wd.y)<=30);
      const combo=win.filter(it=>MON_RE.test(it.s)).sort((a,b)=>Math.abs(a.y-wd.y)-Math.abs(b.y-wd.y))[0];
      if(!combo) continue;
      const cm=combo.s.match(MON_RE);
      const mm=MONTHS_MAP[cm[1].slice(0,3).toLowerCase()], dd=+cm[2];
      if(!mm || !dd || dd<1 || dd>31) continue;
      let yy=ref.year; const diff=mm-ref.month; if(diff>6) yy--; else if(diff<-6) yy++;
      anchors.push({y:wd.y, dateStr:`${yy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`});
    }
    function dateForY(y){
      let best=null;
      for(const a of anchors){ if(a.y>=y-4){ if(!best || a.y<best.y) best=a } }
      return best ? best.dateStr : null;
    }

    let lastTime=null;
    for(const row of rows){
      const curTok=row.items.find(it=>CUR_RE.test(it.s));
      const timeTok=row.items.find(it=>TIME_TOKEN_RE.test(it.s));
      if(timeTok) lastTime=timeTok.s.toLowerCase().replace(/\s+/g,'');
      if(!curTok || curTok.s!=='USD') continue;
      if(!lastTime) continue;
      const d=dateForY(row.y);
      if(!d) continue;
      const nameToks=row.items.filter(it=>it.x>curX+5 && it!==curTok && it!==timeTok && !VAL_RE.test(it.s) && !TIME_TOKEN_RE.test(it.s));
      let name=nameToks.map(it=>it.s).join(' ').replace(/\s+/g,' ').trim();
      const nw=name.split(' ');
      if(nw.length%2===0){ const h=nw.length/2; if(nw.slice(0,h).join(' ')===nw.slice(h).join(' ')) name=nw.slice(0,h).join(' '); }
      if(!name) continue;
      const ev=detectEvent(name);
      const finalName=ev?ev.name:name, finalTier=ev?ev.tier:'gray';
      const tm=lastTime.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
      if(!tm) continue;
      let h=+tm[1]; const mi=tm[2], ap=tm[3].toLowerCase();
      if(ap==='pm' && h<12) h+=12; if(ap==='am' && h===12) h=0;
      const timeStr=`${String(h).padStart(2,'0')}:${mi}`;
      const key=`${d}|${timeStr}|${finalName}`;
      if(seen.has(key)) continue;
      seen.add(key);
      found.push({date:d, time:timeStr, name:finalName, tier:finalTier});
    }
  }
  return found;
}

async function extractLegacy(pdf){
  let all='';
  for(let p=1;p<=pdf.numPages;p++){
    const page=await pdf.getPage(p), content=await page.getTextContent();
    all+=content.items.map(x=>x.str).join(' ')+'\n';
  }
  const lines=all.split(/\r?\n/).map(x=>x.trim()).filter(Boolean), found=[], seen=new Set();
  let currentDate=null;
  for(let i=0;i<lines.length;i++){
    const line=lines[i], d=parseDate(line);
    if(d) currentDate=d;
    const ev=detectEvent(line);
    if(!ev) continue;
    const vicinity=lines.slice(Math.max(0,i-3), Math.min(lines.length,i+4)).join(' '), tm=parseTime(vicinity);
    if(!currentDate || !tm) continue;
    const key=`${currentDate}|${tm}|${ev.name}`;
    if(seen.has(key)) continue;
    seen.add(key);
    found.push({date:currentDate, time:tm, name:ev.name, tier:ev.tier});
  }
  return found;
}

async function extractPdf(file){
  state.message='⏳ PDF იკითხება...';render();
  try{
    await ensurePdfjs();
    const buffer=await file.arrayBuffer();
    const pdf=await pdfjsLib.getDocument({data:buffer}).promise;
    let found=await extractStructured(pdf);
    if(!found.length) found=await extractLegacy(pdf);
    if(!found.length){
      state.message='ვერ ვიპოვე საკმარისი სტრუქტურირებული თარიღი/დრო/ნიუსი. PDF შეიძლება სურათი ან სხვა ფორმატი იყოს.';render();
      return;
    }
    state.events=found;
    state.message=`✓ ${newsEscape(file.name)} — ${found.length} მოვლენა ამოვიღე.`;
    render();
  }catch(err){
    console.error(err);
    state.message='PDF-ის დამუშავება ვერ მოხერხდა. შეამოწმე ფაილი და სცადე თავიდან.';render();
  }
}

document.addEventListener('change',event=>{
  if(event.target.id==='weeklyNews-pdfFile'){const file=event.target.files?.[0];if(file)extractPdf(file);}
});
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-news-action]');if(!button)return;
  if(button.dataset.newsAction==='clear'){state.events=[];state.message='';const input=$('pdfFile');if(input)input.value='';render();}
  else if(button.dataset.newsAction==='demo'){
    const monday=new Date();monday.setHours(12,0,0,0);monday.setDate(monday.getDate()+((8-monday.getDay())%7||7));
    const sampleDate=offset=>{const date=new Date(monday);date.setDate(monday.getDate()+offset);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;};
    state.events=[{date:sampleDate(0),time:'10:00',name:'Consumer Confidence',tier:'yellow'},{date:sampleDate(1),time:'08:30',name:'CPI / ინფლაცია',tier:'red'},{date:sampleDate(2),time:'14:00',name:'FOMC / განაკვეთი',tier:'red'},{date:sampleDate(3),time:'08:30',name:'უმუშევრობის განაცხადები',tier:'yellow'},{date:sampleDate(4),time:'08:30',name:'NFP / სამუშაო ადგილები',tier:'red'}];
    state.message='საცდელი კვირა ჩაიტვირთა.';render();
  }
});
document.addEventListener('dragover',event=>{const drop=event.target.closest('#weeklyNews-drop');if(drop){event.preventDefault();drop.classList.add('is-dragging');}});
document.addEventListener('dragleave',event=>{const drop=event.target.closest('#weeklyNews-drop');if(drop&&!drop.contains(event.relatedTarget))drop.classList.remove('is-dragging');});
document.addEventListener('drop',event=>{const drop=event.target.closest('#weeklyNews-drop');if(!drop)return;event.preventDefault();drop.classList.remove('is-dragging');const file=[...(event.dataTransfer?.files||[])].find(item=>item.type==='application/pdf'||item.name.toLowerCase().endsWith('.pdf'));if(file)extractPdf(file);});
(function setFFLink(){const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'],now=new Date(),sunday=new Date(now);sunday.setDate(now.getDate()-now.getDay());const link=$('ffLink');if(link)link.href=`https://www.forexfactory.com/calendar?week=${months[sunday.getMonth()]}${sunday.getDate()}.${sunday.getFullYear()}`;})();
window.CandleXNews={render};
render();

