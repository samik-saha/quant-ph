/* App rendering: lectures, quizzes, progress, modes, flashcards, equation sheet.
   Page model: index.html is home (lecture cards + equation sheet + flashcards).
   lecture-N.html pages render one lecture each (N = 1..4),
   selected by <body data-lecture="N">. Without data-lecture, no lecture is rendered. */
const $=s=>document.querySelector(s);
const done=new Set(JSON.parse(localStorage.getItem('qm804-done')||'[]'));
const PAGE_LECTURE=document.body.dataset.lecture?parseInt(document.body.dataset.lecture,10):null;
function lectureHref(l){return `lecture-${l.id}.html`}
function saveDone(){localStorage.setItem('qm804-done',JSON.stringify([...done]));renderProgress()}
function renderProgress(){const total=LECTURES.reduce((n,l)=>n+l.segments.length,0);const bar=$('#progressBar'),label=$('#progressLabel');if(bar)bar.style.width=(done.size/total*100)+'%';if(label)label.textContent=`${done.size} / ${total}`;document.querySelectorAll('.nav-seg').forEach(a=>{const c=a.dataset.seg;if(c)a.classList.toggle('done',done.has(c))})}
function yt(id){return `https://www.youtube-nocookie.com/embed/${id}?rel=0`}
function render(){
 const nav=$('#lectureNav');
 if(nav)nav.innerHTML=`<div class="nav-lecture"><a href="index.html">Home — all lectures</a></div>`+LECTURES.map(l=>`<div class="nav-lecture"><a href="${lectureHref(l)}" ${PAGE_LECTURE===l.id?'aria-current="page" class="is-current"':''}>Lecture ${l.id} — ${l.title}</a>${l.segments.map(s=>`<a class="nav-seg" data-seg="${s.code}" href="${lectureHref(l)}#seg-${s.code}"><span>${s.code}</span><span>${s.title}</span><span class="tick">${done.has(s.code)?'✓':''}</span></a>`).join('')}</div>`).join('');
 const cards=$('#lectureCards');
 if(cards)cards.innerHTML=LECTURES.map(l=>`<a class="lecture-card" href="${lectureHref(l)}"><span class="lec-label">${l.code} · ${l.runtime}</span><strong>${l.title}</strong><span>${l.sub}</span><span class="card-segs">${l.segments.map(s=>s.code).join(' · ')}</span><span class="card-go">Open Lecture ${l.id} →</span></a>`).join('');
 const host=$('#lectures');
 if(host){
  const list=PAGE_LECTURE?LECTURES.filter(l=>l.id===PAGE_LECTURE):[];
  host.innerHTML=list.map(l=>`<section class="lecture" id="lecture-${l.id}">
  <div class="lecture-head"><span class="lec-label">${l.code} · MIT 8.04</span><h2>${l.title}</h2><p>${l.sub}</p>
  <div class="lec-meta"><span class="chip">${l.runtime}</span><span class="chip">${l.segments.length} clips</span><a class="chip" href="${l.ocw}" target="_blank" rel="noreferrer">MIT OCW ↗</a><a class="chip" href="https://www.youtube.com/watch?v=${l.segments[0].id}&list=PLUl4u3cNGP60cspQn3N9dYRPiyVWDd80G" target="_blank" rel="noreferrer">Watch on YouTube ↗</a></div></div>
  ${l.segments.map(s=>`<article class="segment" id="seg-${s.code}">
    <div class="seg-head"><span class="seg-code">${s.code}</span><h3>${s.title}</h3><span class="chip">${s.mins}</span>
    <label class="done-toggle"><input type="checkbox" data-done="${s.code}" ${done.has(s.code)?'checked':''}> Mark done</label></div>
    <div class="collapsible">
    <div class="video-wrap"><iframe src="${yt(s.id)}" title="${s.code} ${s.title}" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>
    <p class="video-fallback">Video: <a href="https://www.youtube.com/watch?v=${s.id}&list=PLUl4u3cNGP60cspQn3N9dYRPiyVWDd80G" target="_blank" rel="noreferrer">youtube.com/watch?v=${s.id}</a> · follow along, then use the notes below to revise.</p>
    <div class="cols">
      <div class="box"><h4>Summary — what happens in this clip</h4><ul>${s.summary.map(x=>`<li>${x}</li>`).join('')}</ul></div>
      <div class="box eq-box"><h4>Full equations</h4>${s.equations.map(e=>`<div class="eq"><div class="eq-label">${e[0]}</div>${e[1]}</div>`).join('')}</div>
    </div>
    <div class="callout callout-key"><strong>Takeaway.</strong> ${s.takeaway}</div>
    ${s.sim?`<div class="sim" data-sim="${s.sim}" data-seg="${s.code}"></div>`:''}
    ${(QUIZZES[s.code]||[]).length?`<div class="quiz" data-quiz="${s.code}"><h4>Checkpoint — ${s.code}</h4>${QUIZZES[s.code].map((q,qi)=>`<div class="q" data-q="${qi}"><p>${qi+1}. ${q.q}</p>${q.opts.map((o,oi)=>`<button class="opt" data-opt="${oi}">${o}</button>`).join('')}<div class="feedback" hidden></div></div>`).join('')}</div>`:''}
    </div></article>`).join('')}
 </section>`).join('');
  const pn=$('#pageNav');
  if(pn&&PAGE_LECTURE){const prev=LECTURES.find(l=>l.id===PAGE_LECTURE-1),next=LECTURES.find(l=>l.id===PAGE_LECTURE+1);
   pn.innerHTML=`<nav class="page-nav">${prev?`<a class="btn" href="${lectureHref(prev)}">← Lecture ${prev.id}: ${prev.title}</a>`:`<a class="btn" href="index.html">← All lectures</a>`}<a class="btn" href="index.html">All lectures</a>${next?`<a class="btn btn-dark" href="${lectureHref(next)}">Lecture ${next.id}: ${next.title} →</a>`:`<a class="btn btn-dark" href="index.html#equationSheet">Equation sheet →</a>`}</nav>`}
 }
 const sheet=$('#sheetGrid');
 if(sheet)sheet.innerHTML=`<div class="sheet-grid">${SHEET.map(s=>`<div class="sheet-card"><h3>${s[0]}</h3><div class="eq">${s[1]}</div></div>`).join('')}</div>`;
 const flash=$('#flashGrid');
 if(flash){flash.innerHTML=FLASHCARDS.map((f,i)=>`<button class="flash" data-card="${i}"><span class="front">${f[0]}</span><span class="back">${f[1]}</span></button>`).join('');const cc=$('#cardCount');if(cc)cc.textContent=FLASHCARDS.length+' cards'}
 document.querySelectorAll('[data-sim]').forEach(el=>{const fn=Sims[el.dataset.sim];if(fn)try{fn(el)}catch(e){el.innerHTML='<p>Simulation failed to load: '+e.message+'</p>'}});
 document.querySelectorAll('[data-done]').forEach(cb=>cb.addEventListener('change',()=>{cb.checked?done.add(cb.dataset.done):done.delete(cb.dataset.done);saveDone();renderNavTicks()}));
 document.querySelectorAll('.quiz').forEach(qz=>{const code=qz.dataset.quiz;qz.querySelectorAll('.q').forEach(qEl=>{const q=QUIZZES[code][+qEl.dataset.q];qEl.querySelectorAll('.opt').forEach(btn=>btn.addEventListener('click',()=>{const fb=qEl.querySelector('.feedback');const ok=+btn.dataset.opt===q.a;qEl.querySelectorAll('.opt').forEach(b=>b.classList.remove('correct','wrong'));btn.classList.add(ok?'correct':'wrong');if(!ok)qEl.querySelectorAll('.opt')[q.a].classList.add('correct');fb.hidden=false;fb.className='feedback '+(ok?'ok':'no');fb.textContent=(ok?'✓ Correct. ':'✗ Not quite. ')+q.why}))})});
 document.querySelectorAll('.flash').forEach(c=>c.addEventListener('click',()=>c.classList.toggle('flipped')));
 if(window.MathJax&&MathJax.typesetPromise)MathJax.typesetPromise().catch(()=>{});
 renderProgress();
}
function renderNavTicks(){document.querySelectorAll('.nav-seg').forEach(a=>{const t=a.querySelector('.tick');if(t)t.textContent=done.has(a.dataset.seg)?'✓':''})}
const WIDTHS=['standard','wide','full'];
function applyWidth(w){if(!WIDTHS.includes(w))w='standard';document.body.dataset.width=w;try{localStorage.setItem('qm804-width',w)}catch(e){}document.querySelectorAll('.width-switch button').forEach(x=>x.classList.toggle('is-active',x.dataset.width===w))}
let savedWidth='standard';try{savedWidth=localStorage.getItem('qm804-width')||'standard'}catch(e){}
applyWidth(savedWidth);
document.querySelectorAll('.width-switch button').forEach(b=>b.addEventListener('click',()=>applyWidth(b.dataset.width)));
document.querySelectorAll('.mode-btn').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.mode-btn').forEach(x=>x.classList.remove('is-active'));b.classList.add('is-active');document.body.classList.remove('mode-follow','mode-revise','mode-equations');document.body.classList.add('mode-'+b.dataset.mode);const t=b.dataset.mode==='equations'?document.getElementById('equationSheet'):b.dataset.mode==='revise'?document.getElementById('flashcards'):null;if(t)t.scrollIntoView({behavior:'smooth'})}));
const resetBtn=$('#resetProgress');if(resetBtn)resetBtn.addEventListener('click',()=>{done.clear();saveDone();document.querySelectorAll('[data-done]').forEach(c=>c.checked=false);renderNavTicks()});
const shuffleBtn=$('#shuffleCards');if(shuffleBtn)shuffleBtn.addEventListener('click',()=>{const g=$('#flashGrid');if(g)[...g.children].sort(()=>Math.random()-0.5).forEach(n=>g.appendChild(n))});
const flipBtn=$('#flipAll');if(flipBtn)flipBtn.addEventListener('click',()=>document.querySelectorAll('.flash').forEach(c=>c.classList.toggle('flipped')));
render();
