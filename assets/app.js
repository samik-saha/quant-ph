/* App rendering: lectures, quizzes, progress, modes, flashcards, equation sheet. */
const $=s=>document.querySelector(s);
const done=new Set(JSON.parse(localStorage.getItem('qm804-done')||'[]'));
function saveDone(){localStorage.setItem('qm804-done',JSON.stringify([...done]));renderProgress()}
function renderProgress(){const total=LECTURES.reduce((n,l)=>n+l.segments.length,0);$('#progressBar').style.width=(done.size/total*100)+'%';$('#progressLabel').textContent=`${done.size} / ${total}`;document.querySelectorAll('.nav-seg').forEach(a=>{const c=a.dataset.seg;if(c)a.classList.toggle('done',done.has(c))})}
function yt(id){return `https://www.youtube-nocookie.com/embed/${id}?rel=0`}
function render(){
 // nav
 $('#lectureNav').innerHTML=LECTURES.map(l=>`<div class="nav-lecture"><a href="#lecture-${l.id}">Lecture ${l.id} — ${l.title}</a>${l.segments.map(s=>`<a class="nav-seg" data-seg="${s.code}" href="#seg-${s.code}"><span>${s.code}</span><span>${s.title}</span><span class="tick">${done.has(s.code)?'✓':''}</span></a>`).join('')}</div>`).join('');
 // lectures
 $('#lectures').innerHTML=LECTURES.map(l=>`<section class="lecture" id="lecture-${l.id}">
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
 // equation sheet
 $('#sheetGrid').innerHTML=`<div class="sheet-grid">${SHEET.map(s=>`<div class="sheet-card"><h3>${s[0]}</h3><div class="eq">${s[1]}</div></div>`).join('')}</div>`;
 // flashcards
 $('#flashGrid').innerHTML=FLASHCARDS.map((f,i)=>`<button class="flash" data-card="${i}"><span class="front">${f[0]}</span><span class="back">${f[1]}</span></button>`).join('');
 $('#cardCount').textContent=FLASHCARDS.length+' cards';
 // mount sims
 document.querySelectorAll('[data-sim]').forEach(el=>{const fn=Sims[el.dataset.sim];if(fn)try{fn(el)}catch(e){el.innerHTML='<p>Simulation failed to load: '+e.message+'</p>'}});
 // events
 document.querySelectorAll('[data-done]').forEach(cb=>cb.addEventListener('change',()=>{cb.checked?done.add(cb.dataset.done):done.delete(cb.dataset.done);saveDone();renderNavTicks()}));
 document.querySelectorAll('.quiz').forEach(qz=>{const code=qz.dataset.quiz;qz.querySelectorAll('.q').forEach(qEl=>{const q=QUIZZES[code][+qEl.dataset.q];qEl.querySelectorAll('.opt').forEach(btn=>btn.addEventListener('click',()=>{const fb=qEl.querySelector('.feedback');const ok=+btn.dataset.opt===q.a;qEl.querySelectorAll('.opt').forEach(b=>b.classList.remove('correct','wrong'));btn.classList.add(ok?'correct':'wrong');if(!ok)qEl.querySelectorAll('.opt')[q.a].classList.add('correct');fb.hidden=false;fb.className='feedback '+(ok?'ok':'no');fb.textContent=(ok?'✓ Correct. ':'✗ Not quite. ')+q.why}))})});
 document.querySelectorAll('.flash').forEach(c=>c.addEventListener('click',()=>c.classList.toggle('flipped')));
 if(window.MathJax&&MathJax.typesetPromise)MathJax.typesetPromise().catch(()=>{});
 renderProgress();
}
function renderNavTicks(){document.querySelectorAll('.nav-seg').forEach(a=>{const t=a.querySelector('.tick');if(t)t.textContent=done.has(a.dataset.seg)?'✓':''})}
// modes
document.querySelectorAll('.mode-btn').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.mode-btn').forEach(x=>x.classList.remove('is-active'));b.classList.add('is-active');document.body.className='mode-'+b.dataset.mode;if(b.dataset.mode==='equations')document.getElementById('equationSheet').scrollIntoView({behavior:'smooth'});if(b.dataset.mode==='revise')document.getElementById('flashcards').scrollIntoView({behavior:'smooth'})}));
$('#resetProgress').addEventListener('click',()=>{done.clear();saveDone();document.querySelectorAll('[data-done]').forEach(c=>c.checked=false);renderNavTicks()});
$('#shuffleCards').addEventListener('click',()=>{const g=$('#flashGrid');[...g.children].sort(()=>Math.random()-0.5).forEach(n=>g.appendChild(n))});
$('#flipAll').addEventListener('click',()=>document.querySelectorAll('.flash').forEach(c=>c.classList.toggle('flipped')));
render();
