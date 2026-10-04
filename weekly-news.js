let pdfjsLib = null;
let pdfjsPromise = null;
function ensurePdfjs(){
  if(!pdfjsPromise) pdfjsPromise=import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs').then(lib=>{lib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';pdfjsLib=lib;return lib;});
  return pdfjsPromise;
}
const $ = id => document.getElementById('weeklyNews-'+id);
const state = { events: [], message: '' };
let selectedPdfFile=null;
const newsEscape = value => String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Match specific releases before broad speaker names. Keep the PDF's event title
// as the displayed name; these rules only drive risk and the playbook.
const PATTERNS = [
{re:/\bconsumer price index\b|\bCPI\b/i,name:'CPI / ინფლაცია',tier:'red',kind:'major'},
{re:/\bproducer price index\b|\bPPI\b/i,name:'PPI / მწარმოებლის ფასები',tier:'red',kind:'major'},
{re:/\bnon[- ]?farm payrolls?\b|\bNFP\b/i,name:'NFP / სამუშაო ადგილები',tier:'red',kind:'major'},
{re:/\bunemployment rate\b/i,name:'უმუშევრობის მაჩვენებელი',tier:'red',kind:'major'},
{re:/\b(core )?PCE\b|personal consumption expenditures/i,name:'PCE / Core PCE',tier:'red',kind:'major'},
{re:/federal funds rate|interest rate decision|FOMC statement|FOMC meeting minutes|FOMC press conference/i,name:'FOMC / განაკვეთის გადაწყვეტილება',tier:'red',kind:'fed-decision'},
{re:/\bPowell\b|\bFed Chair\b|Federal Reserve Chair/i,name:'Fed-ის თავმჯდომარის გამოსვლა',tier:'red',kind:'fed-speech'},
{re:/\bFOMC member\b|\bFederal Reserve\b|\bFed President\b|\bFed Governor\b/i,name:'Fed-ის წევრის გამოსვლა',tier:'yellow',kind:'fed-speech'},
{re:/treasury sec|treasury secretary|\bBessent\b/i,name:'Treasury Secretary გამოსვლა',tier:'yellow',kind:'speaker'},
{re:/\bTrump\b/i,name:'პრეზიდენტის გამოსვლა',tier:'yellow',kind:'speaker'},
{re:/retail sales/i,name:'Retail Sales',tier:'yellow',kind:'release'},
{re:/initial jobless claims|jobless claims|unemployment claims/i,name:'უმუშევრობის განაცხადები',tier:'yellow',kind:'release'},
{re:/gross domestic product|\bGDP\b/i,name:'GDP',tier:'yellow',kind:'release'},
{re:/\bISM\b/i,name:'ISM',tier:'yellow',kind:'release'},
{re:/S&P global PMI|\bPMI\b/i,name:'PMI',tier:'yellow',kind:'release'},
{re:/Philly Fed|Philadelphia Fed/i,name:'Philly Fed Manufacturing',tier:'yellow',kind:'release'},
{re:/\bJOLTS\b/i,name:'JOLTS',tier:'yellow',kind:'release'},
{re:/\bADP\b.*employment|employment.*\bADP\b/i,name:'ADP Employment',tier:'yellow',kind:'release'},
{re:/consumer confidence/i,name:'Consumer Confidence',tier:'yellow',kind:'release'},
{re:/University of Michigan|Michigan/i,name:'Michigan Sentiment',tier:'yellow',kind:'release'},
{re:/durable goods/i,name:'Durable Goods',tier:'yellow',kind:'release'}];

function parseDate(s){let m=s.match(/\b(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})\b/);if(m)return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;m=s.match(/\b(\d{1,2})[-\/](\d{1,2})[-\/](20\d{2})\b/);if(m)return `${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;const months={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};m=s.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(20\d{2})\b/i);if(m)return `${m[3]}-${String(months[m[1].slice(0,3).toLowerCase()]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;return null}
function parseTime(s){let m=s.match(/\b(1[0-2]|0?[1-9]):([0-5]\d)\s*(AM|PM)\b/i);if(m){let h=+m[1],mi=m[2],ap=m[3].toUpperCase();if(ap==='PM'&&h<12)h+=12;if(ap==='AM'&&h===12)h=0;return `${String(h).padStart(2,'0')}:${mi}`}m=s.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);return m?`${m[1]}:${m[2]}`:null}
function detectEvent(s){return PATTERNS.find(p=>p.re.test(s))||null}
function weekdayLabel(d){const[y,m,day]=d.split('-').map(Number);return ['კვირა','ორშაბათი','სამშაბათი','ოთხშაბათი','ხუთშაბათი','პარასკევი','შაბათი'][new Date(y,m-1,day,12).getDay()]}
function isTradingDay(d){const[y,m,day]=d.split('-').map(Number),weekday=new Date(y,m-1,day,12).getDay();return weekday>=1&&weekday<=5}
function dateLabel(d){const[y,m,day]=d.split('-').map(Number),months=['იანვარი','თებერვალი','მარტი','აპრილი','მაისი','ივნისი','ივლისი','აგვისტო','სექტემბერი','ოქტომბერი','ნოემბერი','დეკემბერი'];return `${weekdayLabel(d)}, ${day} ${months[m-1]}, ${y}`}
function wallTimeToInstant(dateStr,timeStr,zone){const[y,m,d]=dateStr.split('-').map(Number),[hh,mm]=timeStr.split(':').map(Number),target=Date.UTC(y,m-1,d,hh,mm);if(typeof zone==='number')return new Date(target-zone*60000);let instant=target;for(let i=0;i<3;i++){const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant)),get=k=>Number(parts.find(x=>x.type===k)?.value),asUtc=Date.UTC(get('year'),get('month')-1,get('day'),get('hour'),get('minute'));instant+=target-asUtc}return new Date(instant)}
function dateTimeAt(instant,zone){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(instant),get=k=>parts.find(x=>x.type===k)?.value;return{date:`${get('year')}-${get('month')}-${get('day')}`,time:`${get('hour')}:${get('minute')}`}}
function sourceToNewYork(dateStr,timeStr,zone){return dateTimeAt(wallTimeToInstant(dateStr,timeStr,zone),'America/New_York')}
function tbilisiDateTime(dateStr,timeStr){return dateTimeAt(wallTimeToInstant(dateStr,timeStr,'America/New_York'),'Asia/Tbilisi')}
function etToTbilisi(dateStr,timeStr){return tbilisiDateTime(dateStr,timeStr).time}
function rangeLabel(dateStr,startMin,endMin){const start=tbilisiDateTime(dateStr,timeLabel(startMin)),end=tbilisiDateTime(dateStr,timeLabel(endMin));return `${start.time} – ${end.time}${start.date!==end.date?' (+1 დღე)':''}`}
function minute(t){const[h,m]=t.split(':').map(Number);return h*60+m}
function timeLabel(m){return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`}
function classify(e){if(e.kind==='fed-decision')return{c:'red',s:'🔴 FOMC გადაწყვეტილება',t:'განაკვეთის გადაწყვეტილებას ან წუთებს ველოდები. ნიუსამდე ახალ პოზიციას არ ვხსნი, შემდეგ კი ბაზრის დამშვიდებას ვაცდი.'};if(e.kind==='fed-speech'&&e.tier==='red')return{c:'red',s:'🔴 Fed-ის თავმჯდომარე',t:'თავმჯდომარის გამოსვლის გარშემო ახალ პოზიციას არ ვხსნი და ბაზრის დამშვიდებას ველოდები.'};if(e.kind==='major')return{c:'blue',s:'🔵 მხოლოდ Post-News',t:'პირველ რეაქციას არ გავეკიდები. ველოდები სტაბილიზაციას, შემდეგ Liquidity Sweep → 5M MSS → FVG.'};if(e.tier==='yellow')return{c:'yellow',s:'🟡 ფრთხილად',t:'ნიუსთან ახლოს entry არ გავაკეთებ. release-ის მოახლოებისას ველოდები და მერე თავიდან ვაფასებ.'};if(e.tier==='gray')return{c:'gray',s:'⚪ დაბალი გავლენა',t:'დაბალი გავლენის ან ინფორმაციული ნიუსია — ცალკე ბუფერს არ ვაწესებ.'};return{c:'green',s:'🟢 ჩვეულებრივი რეჟიმი',t:'ვიყენებ Liquidity → Sweep → 5M MSS → Displacement/FVG → Entry პროცესს.'}}
function safeWindows(date,events){if(!isTradingDay(date))return[];const open=570,close=960,relevant=events.filter(e=>e.tier!=='gray'&&minute(e.time)>=open&&minute(e.time)<=close).sort((a,b)=>a.time.localeCompare(b.time)),blocks=[];for(const e of relevant){const t=minute(e.time);let buffer=e.tier==='red'?30:15;if(e.kind==='fed-decision'||e.kind==='fed-speech')buffer=e.tier==='red'?60:30;const a=Math.max(open,t-buffer),b=Math.min(close,t+buffer),type=e.tier==='red'?'red':'yellow',last=blocks[blocks.length-1];if(last&&a<=last.b){last.b=Math.max(last.b,b);if(type==='red')last.type='red';last.events.push(e)}else blocks.push({type,a,b,events:[e]})}const out=[];let cursor=open+10;for(const block of blocks){if(cursor<block.a)out.push({type:'green',a:cursor,b:block.a});out.push(block);cursor=Math.max(cursor,block.b)}if(cursor<close)out.push({type:'green',a:cursor,b:close});return out.filter(x=>x.b>x.a)}
function bestMoments(events){
  const days=[...new Set(events.map(e=>e.date))].filter(isTradingDay).sort();
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
function dayPlan(date,events){if(!isTradingDay(date))return{c:'gray',s:'⚪ NY ბირჟა დახურულია',t:'ეს თარიღი შაბათ-კვირაა. სავაჭრო ფანჯრები მხოლოდ ორშაბათი–პარასკევის NY 09:30–16:00 სესიისთვის ითვლება.'};const open=570,close=960,inSession=events.filter(e=>minute(e.time)>=open&&minute(e.time)<=close).sort((a,b)=>a.time.localeCompare(b.time)),fed=inSession.find(e=>e.kind==='fed-decision'||(e.kind==='fed-speech'&&e.tier==='red'));if(fed)return{c:'red',s:fed.kind==='fed-decision'?'🔴 FOMC ნიუსამდე ფრთხილად':'🔴 Fed-ის თავმჯდომარის გამოსვლა',t:`NY სესია 09:30–16:00 ET · ${etToTbilisi(date,fed.time)} თბილისი. ${fed.kind==='fed-decision'?'განაკვეთის გადაწყვეტილებამდე':'გამოსვლამდე'} ახალ trade-ს არ ვხსნი; შემდეგ ბაზრის სტაბილიზაციას ველოდები.`};const major=inSession.find(e=>e.kind==='major');if(major)return{c:'blue',s:'🔵 Post-News დღე',t:`NY Open: ${etToTbilisi(date,'09:30')} თბილისი. ${major.name} — ${etToTbilisi(date,major.time)}. პირველ რეაქციას ვტოვებ და შემდეგ ვეძებ სუფთა Liquidity → 5M MSS → FVG setup-ს.`};if(inSession.some(e=>e.tier==='red'))return{c:'yellow',s:'🟡 ფრთხილი დღე',t:`NY Open: ${etToTbilisi(date,'09:30')} თბილისი. ამ სესიაში მაღალი გავლენის ნიუსია; მის გარშემო ახალ პოზიციას არ ვხსნი.`};if(inSession.some(e=>e.tier==='yellow'))return{c:'yellow',s:'🟡 ფრთხილი დღე',t:`NY Open: ${etToTbilisi(date,'09:30')} თბილისი. საშუალო გავლენის ნიუსთან entry-ს ვერიდები და შემდეგ თავიდან ვაფასებ.`};const outside=events.some(e=>e.tier!=='gray');return{c:'green',s:'🟢 NY სესიაში ნიუსის რისკი არ არის',t:`NY Open: ${etToTbilisi(date,'09:30')} თბილისი. ${outside?'კალენდრის მნიშვნელოვანი ნიუსები 09:30–16:00 ET სესიის გარეთაა. ':''}ველოდები Liquidity Sweep → 5M MSS → Displacement/FVG.`}}

function render(){
  const kpis=$('kpis');if(!kpis)return;
  const ffLink=$('ffLink');if(ffLink){const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'],now=new Date(),sunday=new Date(now);sunday.setDate(now.getDate()-now.getDay());ffLink.href=`https://www.forexfactory.com/calendar?week=${months[sunday.getMonth()]}${sunday.getDate()}.${sunday.getFullYear()}`;}
  const events=[...state.events].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const days=[...new Set(events.map(e=>e.date))],red=events.filter(e=>e.tier==='red').length,yellow=events.filter(e=>e.tier==='yellow').length;
  kpis.innerHTML=`<div class="news-kpi"><span class="news-kpi-icon">✦</span><b>${events.length}</b><small>ამოღებული ნიუსი</small></div><div class="news-kpi"><span class="news-kpi-icon">◷</span><b>${days.length}</b><small>აქტიური დღე</small></div><div class="news-kpi risk-high"><span class="news-kpi-icon">↗</span><b>${red}</b><small>მაღალი რისკი</small></div><div class="news-kpi risk-mid"><span class="news-kpi-icon">⌁</span><b>${yellow}</b><small>საშუალო რისკი</small></div><div class="news-kpi news-kpi-time"><span class="news-kpi-icon">◉</span><b>09:30 ET</b><small>NY Open · თბილისის დრო ავტომატურად</small></div>`;
  const moments=bestMoments(events);
  $('bestMoments').innerHTML=moments.length?moments.map(m=>`<div class="news-window is-clear"><span class="news-window-state">შესაძლო ფანჯარა</span><b>${newsEscape(dateLabel(m.date))}</b><strong>${rangeLabel(m.date,m.a,m.b)}</strong><small>თბილისის დრო · NY 09:30–16:00</small></div>`).join(''):`<div class="news-empty"><span>◌</span><p>${events.length?'ამ კვირაში მკაფიო სუფთა ფანჯარა ვერ მოიძებნა.':'ატვირთე კვირის PDF ან ნახე საცდელი კვირა.'}</p></div>`;
  $('days').innerHTML=days.length?days.map(d=>{const es=events.filter(e=>e.date===d),plan=dayPlan(d,es),windows=safeWindows(d,es);return `<article class="news-day"><div class="news-day-top"><div><span class="news-overline">${weekdayLabel(d)}</span><h3>${newsEscape(dateLabel(d))}</h3></div><span class="news-status risk-${newsEscape(plan.c)}">${newsEscape(plan.s)}</span></div><p class="news-plan">${newsEscape(plan.t)}</p><div class="news-windows">${windows.map(w=>{const label=w.type==='green'?'შესაძლო setup':w.type==='yellow'?'ფრთხილად':'არ შეხვიდე',names=(w.events||[]).map(e=>`${e.name} · ${etToTbilisi(d,e.time)}`).join(' · ');return `<div class="news-window-chip is-${newsEscape(w.type)}"><b>${label}</b><span>${rangeLabel(d,w.a,w.b)}</span>${names?`<small>${newsEscape(names)}</small>`:''}</div>`}).join('')}</div><div class="news-footnote">ფანჯრები NY 09:30–16:00 სესიაზე ეფუძნება. თუ NQ/ES ქაოსურად მოძრაობს, setup-ს ნუ აიძულებ.</div></article>`}).join(''):`<div class="news-empty"><span>◷</span><p>ნიუსები გამოჩნდება PDF-ის ატვირთვის შემდეგ.</p></div>`;
  $('events').innerHTML=events.length?`<table><thead><tr><th>თარიღი (NY)</th><th>ნიუსი</th><th>NY</th><th>თბილისი</th><th>რისკი</th><th>გეგმა</th></tr></thead><tbody>${events.map(e=>{const risk=classify(e),local=tbilisiDateTime(e.date,e.time);return `<tr><td>${newsEscape(dateLabel(e.date))}</td><td><b>${newsEscape(e.name)}</b>${e.category&&e.category!==e.name?`<p class="news-cell-note">${newsEscape(e.category)}</p>`:''}</td><td>${newsEscape(e.time)}</td><td><strong>${local.time}</strong>${local.date!==e.date?`<p class="news-cell-note">${newsEscape(dateLabel(local.date))}</p>`:''}</td><td><span class="news-status risk-${newsEscape(e.tier==='gray'?'gray':e.tier)}">${e.tier==='red'?'მაღალი':e.tier==='yellow'?'საშუალო':'დაბალი'}</span></td><td><span class="news-status risk-${newsEscape(risk.c)}">${newsEscape(risk.s.replace(/^[^ ]+ /,''))}</span><p class="news-cell-note">${newsEscape(risk.t)}</p></td></tr>`}).join('')}</tbody></table>`:`<div class="news-empty"><span>▤</span><p>ატვირთული კალენდრის მოვლენები აქ გამოჩნდება.</p></div>`;
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

function cleanEventName(value){
  let name=value.replace(/\s+-?\d[\d,.]*(?:\s?[KMB%])?(?:(?:\s*[|/]\s*|\s+)-?\d[\d,.]*(?:\s?[KMB%])?)*$/i,'').replace(/\s+/g,' ').trim();
  const words=name.split(' ');
  for(let size=Math.floor(words.length/2);size>0;size--){
    if(words.length%size)continue;
    const first=words.slice(0,size).join(' ');
    if(words.slice(size).join(' ')===Array(words.length/size-1).fill(first).join(' '))return first;
  }
  return name;
}

function refDateFromText(txt){
  const m=txt.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if(!m) return null;
  let y=+m[3]; if(y<100) y+=2000;
  return {year:y, month:+m[1]};
}

function sourceTimezone(text){
  const choice=$('sourceZone')?.value||'auto';
  const zones={'America/New_York':'New York (ET)','Asia/Tbilisi':'თბილისი','UTC':'UTC'};
  if(choice!=='auto')return{zone:choice,label:zones[choice]||choice};
  if(/(?:time\s*zone|timezone|times?\s+(?:are|shown|set)\s+(?:in\s+)?|GMT).{0,40}\bNew York\b|\bEastern (?:Standard|Daylight) Time\b/i.test(text))return{zone:'America/New_York',label:'New York (ET)'};
  if(/\bTbilisi\b/i.test(text))return{zone:'Asia/Tbilisi',label:'თბილისი'};
  const offset=text.match(/\b(?:GMT|UTC)\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?\b/i);
  if(offset){const mins=(Number(offset[2])*60+Number(offset[3]||0))*(offset[1]==='-'?-1:1),label=`GMT${offset[1]}${String(offset[2]).padStart(2,'0')}:${offset[3]||'00'}`;return{zone:mins,label};}
  if(/\bUTC\b|\bGMT\b/i.test(text))return{zone:'UTC',label:'UTC'};
  const device=Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Tbilisi';
  return{zone:device,label:zones[device]||device};
}

async function extractStructured(pdf,sourceZone){
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

    let lastTime=null,lastTimeDate=null;
    for(const row of rows){
      const curTok=row.items.find(it=>CUR_RE.test(it.s));
      const timeTok=row.items.find(it=>TIME_TOKEN_RE.test(it.s));
      const d=dateForY(row.y);
      if(d&&lastTimeDate&&d!==lastTimeDate)lastTime=null;
      if(d)lastTimeDate=d;
      if(timeTok) lastTime=timeTok.s.toLowerCase().replace(/\s+/g,'');
      else if(row.items.some(it=>/^(all day|tentative)$/i.test(it.s)))lastTime=null;
      if(!curTok || curTok.s!=='USD') continue;
      if(!lastTime) continue;
      if(!d) continue;
      const nameToks=row.items.filter(it=>it.x>curX+5 && it!==curTok && it!==timeTok && !VAL_RE.test(it.s) && !TIME_TOKEN_RE.test(it.s));
      const name=cleanEventName(nameToks.map(it=>it.s).join(' '));
      if(!name) continue;
      const ev=detectEvent(name);
      const tm=lastTime.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
      if(!tm) continue;
      let h=+tm[1]; const mi=tm[2], ap=tm[3].toLowerCase();
      if(ap==='pm' && h<12) h+=12; if(ap==='am' && h===12) h=0;
      const timeStr=`${String(h).padStart(2,'0')}:${mi}`;
      const key=`${d}|${timeStr}|${name}`;
      if(seen.has(key)) continue;
      seen.add(key);
      const ny=sourceToNewYork(d,timeStr,sourceZone);
      found.push({date:ny.date, time:ny.time, name, category:ev?.name||'', kind:ev?.kind||'other', tier:ev?.tier||'gray'});
    }
  }
  return found;
}

async function extractLegacy(pdf,sourceZone){
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
    const ny=sourceToNewYork(currentDate,tm,sourceZone),key=`${ny.date}|${ny.time}|${line}`;
    if(seen.has(key)) continue;
    seen.add(key);
    found.push({date:ny.date, time:ny.time, name:line, category:ev.name, kind:ev.kind, tier:ev.tier});
  }
  return found;
}

async function extractPdf(file){
  state.message='⏳ PDF იკითხება...';render();
  try{
    await ensurePdfjs();
    const buffer=await file.arrayBuffer();
    const pdf=await pdfjsLib.getDocument({data:buffer}).promise;
    let text='';
    for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p),content=await page.getTextContent();text+=content.items.map(x=>fixBold(x.str)).join(' ')+' ';}
    const source=sourceTimezone(text);
    let found=await extractStructured(pdf,source.zone);
    if(!found.length) found=await extractLegacy(pdf,source.zone);
    if(!found.length){
      state.message='ვერ ვიპოვე საკმარისი სტრუქტურირებული თარიღი/დრო/ნიუსი. PDF შეიძლება სურათი ან სხვა ფორმატი იყოს.';render();
      return;
    }
    state.events=found;
    state.message=`✓ ${newsEscape(file.name)} — ${found.length} მოვლენა · PDF-ის დრო: ${newsEscape(source.label)}.`;
    render();
  }catch(err){
    console.error(err);
    state.message='PDF-ის დამუშავება ვერ მოხერხდა. შეამოწმე ფაილი და სცადე თავიდან.';render();
  }
}

document.addEventListener('change',event=>{
  if(event.target.id==='weeklyNews-pdfFile'){const file=event.target.files?.[0];if(file){selectedPdfFile=file;extractPdf(file);}}
  if(event.target.id==='weeklyNews-sourceZone'&&selectedPdfFile)extractPdf(selectedPdfFile);
});
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-news-action]');if(!button)return;
  if(button.dataset.newsAction==='clear'){state.events=[];state.message='';selectedPdfFile=null;const input=$('pdfFile'),zone=$('sourceZone');if(input)input.value='';if(zone)zone.value='auto';render();}
  else if(button.dataset.newsAction==='demo'){
    const monday=new Date();monday.setHours(12,0,0,0);monday.setDate(monday.getDate()+((8-monday.getDay())%7||7));
    const sampleDate=offset=>{const date=new Date(monday);date.setDate(monday.getDate()+offset);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;};
    state.events=[{date:sampleDate(0),time:'10:00',name:'Consumer Confidence',category:'Consumer Confidence',kind:'release',tier:'yellow'},{date:sampleDate(1),time:'08:30',name:'Consumer Price Index',category:'CPI / ინფლაცია',kind:'major',tier:'red'},{date:sampleDate(2),time:'14:00',name:'Federal Funds Rate Decision',category:'FOMC / განაკვეთის გადაწყვეტილება',kind:'fed-decision',tier:'red'},{date:sampleDate(3),time:'08:30',name:'Initial Jobless Claims',category:'უმუშევრობის განაცხადები',kind:'release',tier:'yellow'},{date:sampleDate(4),time:'08:30',name:'Nonfarm Payrolls',category:'NFP / სამუშაო ადგილები',kind:'major',tier:'red'}];
    state.message='საცდელი კვირა ჩაიტვირთა.';render();
  }
});
document.addEventListener('dragover',event=>{const drop=event.target.closest('#weeklyNews-drop');if(drop){event.preventDefault();drop.classList.add('is-dragging');}});
document.addEventListener('dragleave',event=>{const drop=event.target.closest('#weeklyNews-drop');if(drop&&!drop.contains(event.relatedTarget))drop.classList.remove('is-dragging');});
document.addEventListener('drop',event=>{const drop=event.target.closest('#weeklyNews-drop');if(!drop)return;event.preventDefault();drop.classList.remove('is-dragging');const file=[...(event.dataTransfer?.files||[])].find(item=>item.type==='application/pdf'||item.name.toLowerCase().endsWith('.pdf'));if(file){selectedPdfFile=file;extractPdf(file);}});
(function setFFLink(){const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'],now=new Date(),sunday=new Date(now);sunday.setDate(now.getDate()-now.getDay());const link=$('ffLink');if(link)link.href=`https://www.forexfactory.com/calendar?week=${months[sunday.getMonth()]}${sunday.getDate()}.${sunday.getFullYear()}`;})();
window.CandleXNews={render};
render();
