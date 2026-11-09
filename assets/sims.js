/* Interactive simulations. Each sim exports mount(el, segmentCode). Pure canvas, no deps. */
const Sims={};
function simShell(el,title,desc,controlsHTML,canvasH){
 el.innerHTML=`<h4>${title}</h4><p>${desc}</p><div class="controls">${controlsHTML}</div><canvas width="860" height="${canvasH||240}" data-base-h="${canvasH||240}" style="aspect-ratio:860/${canvasH||240}"></canvas><div class="readout"></div>`;
 return {canvas:el.querySelector('canvas'),ctx:el.querySelector('canvas').getContext('2d'),readout:el.querySelector('.readout'),q:s=>el.querySelector(s)};
}
function slider(id,label,min,max,step,val,fmt){return `<label class="control">${label} <output id="${id}Out">${fmt(val)}</output><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`}
function bindRange(root,id,fn){const i=root.querySelector('#'+id),o=root.querySelector('#'+id+'Out');const h=()=>{const v=parseFloat(i.value);if(o)o.textContent=i.dataset.fmt?i.dataset.fmt.replace('{}',v):v;fn(v)};i.addEventListener('input',h);h();return i}
function fit(canvas){if(!canvas.dataset.baseH)canvas.dataset.baseH=String(parseInt(canvas.getAttribute('height'))||240);const baseH=Number(canvas.dataset.baseH),r=canvas.getBoundingClientRect(),d=devicePixelRatio||1,w=r.width||860,h=w*baseH/860;canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);canvas.style.height=h+'px';canvas.getContext('2d').setTransform(d,0,0,d,0,0);return{w,h}}
/* Animations are paused by default and auto-pause after this long, so a
   forgotten Play cannot keep requestAnimationFrame burning CPU forever. */
const ANIM_TIMEOUT_MS=30000;
function makeAnim(tick,onState){let playing=false,rafId=null,timer=null;
 const stop=()=>{if(!playing)return;playing=false;if(rafId!==null&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(rafId);rafId=null;if(timer!==null&&typeof clearTimeout==='function')clearTimeout(timer);timer=null;if(onState)onState(false)};
 const frame=()=>{rafId=null;if(!playing)return;tick();if(playing&&typeof requestAnimationFrame==='function')rafId=requestAnimationFrame(frame)};
 const start=()=>{if(playing)return;playing=true;if(typeof setTimeout==='function')timer=setTimeout(stop,ANIM_TIMEOUT_MS);if(onState)onState(true);if(typeof requestAnimationFrame==='function')rafId=requestAnimationFrame(frame);else frame()};
 return{start,stop,toggle:()=>{playing?stop():start()},isPlaying:()=>playing}}
/* ---- Polarizer + single photon counting ---- */
Sims.polarizer=function(el){const s=simShell(el,"Simulation — Malus's law, one photon at a time","Drag α. The bar is the classical intensity fraction cos²α; the dots are individual photons — each one wholly passes or is absorbed. Watch the fraction settle to cos²α only after many photons.",slider('alpha','Polarisation angle α',0,90,1,35,v=>v+'°')+`<button class="btn btn-dark" id="fire">Fire 200 photons</button><button class="btn" id="clearDots">Clear</button>`,260);
 let alpha=35*Math.PI/180,passed=0,total=0,dots=[];
 const draw=()=>{const{w,h}=fit(s.canvas),c=s.ctx;c.clearRect(0,0,w,h);
  c.fillStyle='#18202b';c.font='13px sans-serif';c.fillText('photon source',14,28);c.fillText('polarizer (x)',w*0.42,28);c.fillText('detector',w-90,28);
  c.strokeStyle='#b7791f';c.lineWidth=3;c.beginPath();c.moveTo(30,60);c.lineTo(w*0.4,60);c.stroke();
  const ex=Math.cos(alpha),ey=Math.sin(alpha);c.strokeStyle='#145da0';c.beginPath();c.moveTo(60,110);c.lineTo(60+120*ex,110-0);c.lineTo(60+120*ex,110-70*ey);c.stroke();c.fillStyle='#145da0';c.fillText('E = E₀cosα x̂ + E₀sinα ŷ',60,200);
  c.fillStyle='#fdf3e0';c.fillRect(w*0.42,45,14,120);c.strokeStyle='#b7791f';c.strokeRect(w*0.42,45,14,120);
  const p=Math.cos(alpha)**2;c.fillStyle='#e6f4f1';c.fillRect(w*0.62,50,180,22);c.fillStyle='#0f766e';c.fillRect(w*0.62,50,180*p,22);c.fillStyle='#18202b';c.fillText('transmitted fraction cos²α = '+p.toFixed(3),w*0.62,92);
  dots.slice(-400).forEach(d=>{c.fillStyle=d?'#0f766e':'#b42318';c.beginPath();c.arc(w*0.62+Math.random()*0+ (d?20:20),0,0,0,0)}); // placeholder no-op
  // dot grid
  const cols=25;dots.slice(-250).forEach((d,i)=>{const x=w*0.62+(i%cols)*7,y=110+Math.floor(i/cols)*9;c.fillStyle=d?'#0f766e':'#f3c2bd';c.beginPath();c.arc(x,y,3,0,7);c.fill()});
  s.readout.innerHTML=`<div>α <b>${(alpha*180/Math.PI).toFixed(0)}°</b></div><div>P(pass) <b>${p.toFixed(3)}</b></div><div>photons <b>${total}</b></div><div>passed <b>${passed} (${total?(passed/total).toFixed(3):'—'})</b></div>`};
 bindRange(el,'alpha',v=>{alpha=v*Math.PI/180;draw()});
 el.querySelector('#fire').onclick=()=>{const p=Math.cos(alpha)**2;for(let i=0;i<200;i++){const ok=Math.random()<p;dots.push(ok);total++;if(ok)passed++}draw()};
 el.querySelector('#clearDots').onclick=()=>{dots=[];passed=0;total=0;draw()};draw();};
/* ---- Phasor / complex plane ---- */
Sims.phasor=function(el){const s=simShell(el,"Simulation — a complex amplitude is an arrow","A probability amplitude ψ = |ψ|e^{iθ} lives on the complex plane. Probabilities use only the length squared; interference (Lecture 2) uses the angle. Animate the phase and watch Re, Im and |ψ|². Paused by default; playback auto-pauses after 30 s.",slider('theta','Phase θ',0,360,1,40,v=>v+'°')+`<button class="btn btn-dark" id="playPh">▶ Rotate phase</button>`,260);
 let th=40*Math.PI/180;
 const draw=()=>{const{w,h}=fit(s.canvas),c=s.ctx;c.clearRect(0,0,w,h);const cx=w*0.32,cy=h/2,R=Math.min(w,h)*0.36;
  c.strokeStyle='#d9e0e8';c.beginPath();c.arc(cx,cy,R,0,7);c.stroke();c.beginPath();c.moveTo(cx-R-20,cy);c.lineTo(cx+R+20,cy);c.moveTo(cx,cy-R-20);c.lineTo(cx,cy+R+20);c.stroke();
  c.fillStyle='#5b6b7d';c.font='12px sans-serif';c.fillText('Re',cx+R+22,cy);c.fillText('Im',cx+6,cy-R-8);
  const x=cx+R*Math.cos(th),y=cy-R*Math.sin(th);c.strokeStyle='#b7791f';c.lineWidth=3;c.beginPath();c.moveTo(cx,cy);c.lineTo(x,y);c.stroke();c.fillStyle='#b7791f';c.beginPath();c.arc(x,y,5,0,7);c.fill();
  c.setLineDash([4,4]);c.strokeStyle='#145da0';c.lineWidth=1;c.beginPath();c.moveTo(x,y);c.lineTo(x,cy);c.moveTo(x,y);c.lineTo(cx,y);c.stroke();c.setLineDash([]);
  const re=Math.cos(th),im=Math.sin(th);c.fillStyle='#18202b';c.font='14px sans-serif';c.fillText(`ψ = cosθ + i sinθ = e^{iθ}`,w*0.58,60);c.fillText(`Re ψ = ${re.toFixed(3)}`,w*0.58,90);c.fillText(`Im ψ = ${im.toFixed(3)}`,w*0.58,115);c.fillText(`|ψ|² = ψψ* = ${(re*re+im*im).toFixed(3)}  ← the measurable probability weight`,w*0.58,150);c.fillText('Rotating θ changes nothing measurable — until ψ interferes with another amplitude.',w*0.58,185);
  s.readout.innerHTML=`<div>θ <b>${(th*180/Math.PI%360).toFixed(0)}°</b></div><div>|ψ| <b>1.000</b></div><div>|ψ|² <b>1.000</b></div>`};
 bindRange(el,'theta',v=>{th=v*Math.PI/180;draw()});
 const playPhBtn=el.querySelector('#playPh');
 const animPh=makeAnim(()=>{th+=0.03;const i=el.querySelector('#theta');if(i)i.value=String((th*180/Math.PI)%360);const o=el.querySelector('#thetaOut');if(o)o.textContent=String((th*180/Math.PI)%360);draw()},playing=>{if(playPhBtn)playPhBtn.textContent=playing?'⏸ Pause':'▶ Rotate phase'});
 if(playPhBtn)playPhBtn.onclick=()=>animPh.toggle();
 draw();};
/* ---- Superposition measurement ---- */
Sims.superposition=function(el){const s=simShell(el,"Simulation — measuring αA + βB never gives an average","Choose |α|. Each 'Measure' collapses the state to A (prob |α|²) or B (prob |β|²). Run many trials: the histogram converges to |α|² : |β|² — and no bar ever appears in between.",slider('ab','|α| (amplitude of A)',0,1,0.01,0.6,v=>Number(v).toFixed(2))+`<button class="btn btn-dark" id="meas1">Measure ×1</button><button class="btn" id="meas100">Measure ×200</button><button class="btn" id="measClear">Clear</button>`,240);
 let a=0.6,nA=0,nB=0,last='';
 const draw=()=>{const{w,h}=fit(s.canvas),c=s.ctx;c.clearRect(0,0,w,h);const pA=a*a,pB=1-pA,tot=nA+nB;
  c.font='13px sans-serif';c.fillStyle='#18202b';c.fillText(`|ψ⟩ = ${a.toFixed(2)}|A⟩ + ${Math.sqrt(pB).toFixed(2)}|B⟩`,20,25);
  const bw=90,bx=w*0.3,by=h-50,mh=h-110;
  c.fillStyle='#eef1f4';c.fillRect(bx,by-mh,bw,mh);c.fillRect(bx+180,by-mh,bw,mh);
  c.fillStyle='#0f766e';c.fillRect(bx,by-mh*pA,bw,mh*pA);c.fillStyle='#b7791f';c.fillRect(bx+180,by-mh*pB,bw,mh*pB);
  if(tot){c.fillStyle='#0f766e';c.fillRect(bx,by-4,bw*(nA/tot),0);c.fillStyle='#18202b';c.fillText(`observed A: ${(nA/tot).toFixed(3)} (theory ${pA.toFixed(3)})`,bx,by+22);c.fillText(`observed B: ${(nB/tot).toFixed(3)} (theory ${pB.toFixed(3)})`,bx+180,by+22)}
  c.fillStyle='#18202b';c.fillText('A',bx+38,by-mh-8);c.fillText('B',bx+218,by-mh-8);if(last)c.fillText('last outcome: '+last,w*0.62,60);
  s.readout.innerHTML=`<div>P(A)=|α|² <b>${pA.toFixed(3)}</b></div><div>P(B)=|β|² <b>${pB.toFixed(3)}</b></div><div>trials <b>${tot}</b></div>`};
 bindRange(el,'ab',v=>{a=v;draw()});
 const run=n=>{const pA=a*a;for(let i=0;i<n;i++){if(Math.random()<pA){nA++;last='A'}else{nB++;last='B'}}draw()};
 el.querySelector('#meas1').onclick=()=>run(1);el.querySelector('#meas100').onclick=()=>run(200);el.querySelector('#measClear').onclick=()=>{nA=nB=0;last='';draw()};draw();};
/* ---- Mach-Zehnder ---- */
Sims.machzehnder=function(el){const s=simShell(el,"Simulation — Mach–Zehnder interferometer","One photon, two paths. Tune the phase φ in the upper arm, block an arm to add which-path information, and fire photons one at a time. With both paths open, D₁ goes dark at φ = 0 — amplitude cancellation, not photon collisions.",slider('phi','Phase φ in upper arm',0,360,1,0,v=>v+'°')+`<label class="control">Lower arm <select id="blockSel"><option value="open">Open</option><option value="blocked">Blocked (which-path)</option></select></label><button class="btn btn-dark" id="mzFire">Fire 100 photons</button><button class="btn" id="mzClear">Clear</button>`,300);
 let phi=0,blocked=false,d0=0,d1=0,abs=0,hist=[];
 const probs=()=> blocked?{p0:0.25,p1:0.25,pAbs:0.5}:{p0:Math.cos(phi/2)**2,p1:Math.sin(phi/2)**2,pAbs:0};
 const draw=()=>{const{w,h}=fit(s.canvas),c=s.ctx;c.clearRect(0,0,w,h);const{ p0,p1}=probs();
  // optical table
  c.strokeStyle='#94a3b8';c.lineWidth=2;c.strokeRect(w*0.06,30,w*0.62,h-70);
  const sx=w*0.10,sy=h*0.52,bx1=w*0.28,bx2=w*0.56;
  const path=(pts,col)=>{c.strokeStyle=col;c.lineWidth=3;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke()};
  path([[sx,sy],[bx1,sy],[bx1,60],[bx2,60],[bx2,sy]],'#145da0');path([[sx,sy],[bx1,sy],[bx1,h-70],[bx2,h-70],[bx2,sy]],blocked?'#f3c2bd':'#0f766e');
  c.fillStyle='#141b26';[[bx1,sy],[bx2,sy]].forEach(p=>c.fillRect(p[0]-7,p[1]-22,14,44));c.fillStyle='#fff';c.font='10px sans-serif';c.fillText('BS',bx1-8,sy+3);c.fillText('BS',bx2-8,sy+3);
  c.fillStyle='#18202b';c.font='12px sans-serif';c.fillText('source',sx-8,sy-28);c.fillText('φ phase',bx1+18,52);c.fillText(blocked?'✕ BLOCKED':'mirror',bx1+18,h-52);
  c.fillStyle='#fdf3e0';c.fillRect(w*0.72,h*0.28,110,34);c.fillRect(w*0.72,h*0.62,110,34);c.strokeStyle='#b7791f';c.strokeRect(w*0.72,h*0.28,110,34);c.strokeRect(w*0.72,h*0.62,110,34);
  c.fillStyle='#18202b';c.fillText('D₀  P='+p0.toFixed(3),w*0.72+10,h*0.28+21);c.fillText('D₁  P='+p1.toFixed(3),w*0.72+10,h*0.62+21);
  // live phase term
  c.fillStyle='#5b6b7d';c.fillText(`P(D₀)=cos²(φ/2)=${Math.cos(phi/2)**2 .toFixed(3)}   P(D₁)=sin²(φ/2)=${Math.sin(phi/2)**2 .toFixed(3)}${blocked?'  (blocked: interference off)':''}`,20,h-12);
  s.readout.innerHTML=`<div>D₀ <b>${d0}</b></div><div>D₁ <b>${d1}</b></div><div>absorbed <b>${abs}</b></div><div>total <b>${d0+d1+abs}</b></div>`};
 bindRange(el,'phi',v=>{phi=v*Math.PI/180;draw()});
 el.querySelector('#blockSel').addEventListener('change',e=>{blocked=e.target.value==='blocked';draw()});
 el.querySelector('#mzFire').onclick=()=>{const{p0,p1,pAbs}=probs();for(let i=0;i<100;i++){const r=Math.random();if(r<pAbs)abs++;else if(r<pAbs+p0)d0++;else d1++}draw()};
 el.querySelector('#mzClear').onclick=()=>{d0=d1=abs=0;draw()};draw();};
/* ---- Elitzur-Vaidman bomb ---- */
Sims.bomb=function(el){const s=simShell(el,"Simulation — Elitzur–Vaidman bomb tester","The bomb sits in the lower arm. A dud leaves interference intact (all photons → D₀). A good bomb blocks the arm: ½ explode, ¼ → D₀ (learn nothing), ¼ → D₁ (certified good, unexploded).",`<label class="control">Bomb <select id="bombSel"><option value="good">Good (live detector)</option><option value="dud">Dud (detector dead)</option></select></label><button class="btn btn-dark" id="bombFire">Send 1 photon</button><button class="btn" id="bomb100">Send 100 photons</button><button class="btn" id="bombClear">Clear</button>`,220);
 let good=true,boom=0,cd0=0,cd1=0,cert=0;
 const draw=()=>{const{w,h}=fit(s.canvas),c=s.ctx;c.clearRect(0,0,w,h);c.font='13px sans-serif';c.fillStyle='#18202b';
  c.fillText(good?'Bomb: GOOD — arm is blocked by its detector':'Bomb: DUD — photons pass through freely',20,30);
  c.fillText('Theory  '+(good?'P(boom)=1/2 · P(D₀)=1/4 · P(D₁)=1/4 → D₁ certifies a live bomb':'P(D₀)=1 · P(D₁)=0 · P(boom)=0'),20,58);
  const tot=boom+cd0+cd1;c.fillText(`Observed (${tot} photons):  boom ${boom} · D₀ ${cd0} · D₁ ${cd1} · certified live & unexploded: ${cert}`,20,92);
  c.fillStyle='#fef2f2';c.fillRect(20,115,w-40,26);c.fillStyle='#b42318';if(tot)c.fillRect(20,115,(w-40)*boom/tot,26);
  c.fillStyle='#e6f4f1';c.fillRect(20,148,w-40,26);c.fillStyle='#0f766e';if(tot)c.fillRect(20,148,(w-40)*cd1/tot,26);
  c.fillStyle='#18202b';c.fillText('exploded fraction',24,132);c.fillText('certified (D₁) fraction',24,165);
  s.readout.innerHTML=`<div>exploded <b>${boom}</b></div><div>D₀ inconclusive <b>${cd0}</b></div><div>D₁ certified <b>${cd1}</b></div>`};
 el.querySelector('#bombSel').addEventListener('change',e=>{good=e.target.value==='good';boom=cd0=cd1=cert=0;draw()});
 const fire=n=>{for(let i=0;i<n;i++){if(!good){cd0++}else{const r=Math.random();if(r<0.5)boom++;else if(r<0.75)cd0++;else{cd1++;cert++}}}draw()};
 el.querySelector('#bombFire').onclick=()=>fire(1);el.querySelector('#bomb100').onclick=()=>fire(100);el.querySelector('#bombClear').onclick=()=>{boom=cd0=cd1=cert=0;draw()};draw();};
/* ---- Photoelectric ---- */
Sims.photoelectric=function(el){const s=simShell(el,"Simulation — photoelectric effect","Frequency prices each photon (E = hν); intensity only counts them. Below ν₀ = W/h nothing is emitted, however intense. Stopping voltage reads K_max directly: eV_stop = K_max.",slider('lam','Wavelength λ',150,800,5,290,v=>v+' nm')+slider('inten','Intensity (photon flux)',0,100,1,60,v=>v+'%')+`<label class="control">Metal (work function W) <select id="metal"><option value="2.28">Caesium · 2.28 eV</option><option value="4.05" selected>Zinc-like · 4.05 eV</option><option value="4.70">Copper · 4.70 eV</option><option value="5.10">Platinum · 5.10 eV</option></select></label>`,260);
 let lam=290,inten=60,W=4.05;
 const draw=()=>{const{w,h}=fit(s.canvas),c=s.ctx;c.clearRect(0,0,w,h);const E=1240/lam,K=E-W,on=K>0;
  // K vs nu plot
  const x0=w*0.08,y0=h-42,pw=w*0.52,ph=h-90;c.strokeStyle='#94a3b8';c.beginPath();c.moveTo(x0,y0);c.lineTo(x0+pw,y0);c.moveTo(x0,y0);c.lineTo(x0,y0-ph);c.stroke();c.fillStyle='#5b6b7d';c.font='11px sans-serif';c.fillText('ν →',x0+pw-20,y0+16);c.fillText('K_max',x0-34,y0-ph+8);
  c.strokeStyle='#b7791f';c.lineWidth=2;c.beginPath();for(let i=0;i<=100;i++){const nu=i/100*8,Ee=nu*1.0;const Kk=Ee-W;const x=x0+pw*i/100,y=y0-ph*Math.max(0,Kk)/5;if(i===0)c.moveTo(x,y);else c.lineTo(x,y)}c.stroke();c.lineWidth=1;
  const nu=E;const px=x0+pw*(nu/8),py=y0-ph*Math.max(0,K)/5;c.fillStyle=on?'#0f766e':'#b42318';c.beginPath();c.arc(px,py,6,0,7);c.fill();c.fillText(on?`K_max = ${K.toFixed(2)} eV`:'below threshold: K_max < 0',px-30,py-12);
  // electron stream
  c.fillStyle='#18202b';c.font='13px sans-serif';c.fillText(on?`Electrons emitted — current ∝ intensity (${inten}%) · each with up to ${K.toFixed(2)} eV`:'No emission at any intensity — photons too cheap (hν < W)',w*0.64,50);
  if(on){c.fillStyle='#145da0';for(let i=0;i<Math.round(inten/4);i++){c.beginPath();c.arc(w*0.66+(i%8)*22,90+Math.floor(i/8)*24,4,0,7);c.fill()}}
  s.readout.innerHTML=`<div>λ <b>${lam} nm</b></div><div>E = hc/λ <b>${E.toFixed(2)} eV</b></div><div>W <b>${W.toFixed(2)} eV</b></div><div>K<sub>max</sub> <b>${on?K.toFixed(2)+' eV':'—'}</b></div><div>V<sub>stop</sub> <b>${on?K.toFixed(2)+' V':'—'}</b></div>`};
 bindRange(el,'lam',v=>{lam=v;draw()});bindRange(el,'inten',v=>{inten=v;draw()});el.querySelector('#metal').addEventListener('change',e=>{W=parseFloat(e.target.value);draw()});draw();};
/* ---- Compton ---- */
Sims.compton=function(el){const s=simShell(el,"Simulation — Compton scattering","An X-ray photon billiard-collides with a (nearly) free electron. The scattered photon pays for the electron's recoil, so λ′ > λ by λ_C(1−cosθ). At θ = 0 nothing changes; at 180° the shift maxes at 2λ_C = 4.85 pm.",slider('thetaC','Scattering angle θ',0,180,1,90,v=>v+'°')+slider('lamC','Incident λ',5,100,1,30,v=>v+' pm'),260);
 let th=90*Math.PI/180,lamI=30;
 const draw=()=>{const{w,h}=fit(s.canvas),c=s.ctx;c.clearRect(0,0,w,h);const dL=2.426*(1-Math.cos(th)),lamF=lamI+dL;
  const cx=w*0.3,cy=h*0.5;c.fillStyle='#18202b';c.font='13px sans-serif';c.fillText('e⁻ at rest',cx-24,cy+34);
  c.strokeStyle='#b7791f';c.lineWidth=3;c.beginPath();c.moveTo(20,cy);c.lineTo(cx-14,cy);c.stroke();c.fillText(`γ  λ=${lamI} pm`,30,cy-12);
  c.beginPath();c.moveTo(cx+14,cy);c.lineTo(cx+14+150*Math.cos(th),cy-150*Math.sin(th));c.stroke();c.fillText(`γ′  λ′=${lamF.toFixed(2)} pm`,cx+30+120*Math.cos(th),cy-120*Math.sin(th)-8);
  c.fillStyle='#145da0';c.beginPath();c.arc(cx,cy,9,0,7);c.fill();
  // shift curve
  const x0=w*0.58,y0=h-36,pw=w*0.36,ph=h-80;c.strokeStyle='#94a3b8';c.beginPath();c.moveTo(x0,y0);c.lineTo(x0+pw,y0);c.moveTo(x0,y0);c.lineTo(x0,y0-ph);c.stroke();c.fillStyle='#5b6b7d';c.font='11px sans-serif';c.fillText('θ',x0+pw-8,y0+15);c.fillText('Δλ (pm)',x0-8,y0-ph);
  c.strokeStyle='#0f766e';c.lineWidth=2;c.beginPath();for(let i=0;i<=180;i++){const t=i*Math.PI/180,x=x0+pw*i/180,y=y0-ph*(2.426*(1-Math.cos(t)))/5;i?c.lineTo(x,y):c.moveTo(x,y)}c.stroke();c.lineWidth=1;
  const px=x0+pw*(th*180/Math.PI)/180,py=y0-ph*dL/5;c.fillStyle='#b42318';c.beginPath();c.arc(px,py,5,0,7);c.fill();
  s.readout.innerHTML=`<div>θ <b>${(th*180/Math.PI).toFixed(0)}°</b></div><div>Δλ <b>${dL.toFixed(3)} pm</b></div><div>λ′ <b>${lamF.toFixed(2)} pm</b></div><div>E<sub>γ</sub> <b>${(1240/(lamI/1000)).toFixed(0)} eV</b></div>`};
 bindRange(el,'thetaC',v=>{th=v*Math.PI/180;draw()});bindRange(el,'lamC',v=>{lamI=v;draw()});draw();};
/* ---- de Broglie ---- */
Sims.debroglie=function(el){const s=simShell(el,"Simulation — de Broglie wavelength λ = h/p","Give any particle a momentum and it carries a wave. Electrons at lab energies land near atomic spacings (hence diffraction); a thrown baseball's wavelength is ~10⁻³⁴ m — no slit will ever reveal it. (Non-relativistic.)",slider('ev','Electron energy',1,1000,1,100,v=>v+' eV')+`<button class="btn" id="dbBase">Compare: baseball (0.15 kg, 40 m/s)</button><span id="dbMsg" style="font-size:13px"></span>`,240);
 let eV=100;
 const draw=()=>{const{w,h}=fit(s.canvas),c=s.ctx;c.clearRect(0,0,w,h);const lamNm=1.227/Math.sqrt(eV); // nm for electrons
  const u=h/240; // vertical scale so the layout survives narrow widths (h shrinks with w)
  c.font='13px sans-serif';c.fillStyle='#18202b';c.fillText(`Electron, ${eV} eV →  λ = h/√(2mₑE) ≈ ${lamNm.toFixed(3)} nm`,20,Math.max(14,28*u));c.fillText('Atomic spacing ≈ 0.1–0.4 nm  ·  X-ray λ ≈ 0.01–1 nm  ·  visible light 400–700 nm',20,Math.max(28,52*u));
  // log scale ruler
  const x0=30,x1=w-30,y=120*u;const lo=-3,hi=3;const X=v=>x0+(Math.log10(v)-lo)/(hi-lo)*(x1-x0);
  c.strokeStyle='#94a3b8';c.beginPath();c.moveTo(x0,y);c.lineTo(x1,y);c.stroke();c.fillStyle='#5b6b7d';c.font='11px sans-serif';
  const ticks=w<560?[[0.001,'0.001 nm'],[0.1,'0.1'],[1,'1 nm'],[10,'10'],[1000,'1000 nm']]:[[0.001,'0.001 nm'],[0.01,'0.01'],[0.1,'0.1'],[1,'1 nm'],[10,'10'],[100,'100'],[1000,'1000 nm']];
  ticks.forEach(([v,t])=>{c.beginPath();c.moveTo(X(v),y-5*u);c.lineTo(X(v),y+5*u);c.stroke();c.fillText(t,Math.min(Math.max(X(v)-14,2),w-52),y+22*u)});
  const mk=(v,col,label,yy)=>{c.fillStyle=col;c.beginPath();c.arc(X(v),yy,Math.max(4,6*u),0,7);c.fill();c.fillText(label,Math.min(Math.max(X(v)-30,4),w-72),yy-12*u)};
  mk(lamNm,'#0f766e','electron λ',y-28*u);mk(0.2,'#b7791f','lattice',y+42*u);mk(550,'#b42318','visible light',y-58*u);
  // wave sketch (kept clear of the tick labels by construction: tick labels end at y+22u, wave starts at yw-amp)
  const yw=190*u,amp=16*u,periodPx=Math.max(4,lamNm*200);
  c.fillStyle='#5b6b7d';c.font='11px sans-serif';c.fillText('wave sketch — crest spacing ∝ λ (200 px per nm)',30,Math.min(h-4,222*u));
  c.strokeStyle='#145da0';c.lineWidth=2;c.beginPath();for(let x=0;x<w-60;x++){const yy=yw+amp*Math.sin(2*Math.PI*x/periodPx);x?c.lineTo(30+x,yy):c.moveTo(30+x,yy)}c.stroke();
  s.readout.innerHTML=`<div>E <b>${eV} eV</b></div><div>λ<sub>dB</sub> <b>${lamNm.toFixed(3)} nm</b></div><div>p <b>${(Math.sqrt(2*9.11e-31*eV*1.602e-19)).toExponential(2)} kg·m/s</b></div>`};
 bindRange(el,'ev',v=>{eV=v;draw()});
 el.querySelector('#dbBase').onclick=()=>{const lam=6.626e-34/(0.15*40);el.querySelector('#dbMsg').textContent=` Baseball λ = h/(mv) ≈ ${lam.toExponential(1)} m — about 10²⁴ times smaller than an atom. No diffraction, ever.`};
 draw();};
/* ---- Wavepacket: beats, group velocity, rigid motion + spreading ---- */
const WP_PRESETS={
 'L4.3':{k0:1.6,dk:0.35,spread:false,note:'Preset for L4.3: spreading off, so phase vs group velocity is the whole story.'},
 'L4.4':{k0:1.6,dk:0.25,spread:false,stationary:true,note:'Preset for L4.4: narrow Δk and spreading off, with the stationary-phase panel on top.'},
 'L4.5':{k0:1.6,dk:0.35,spread:false,note:"Preset for L4.5: spreading off — this clip's rigid first-order motion. Check the box to add the quadratic term."},
 'L7.1':{k0:1.6,dk:0.5,spread:false,note:'Preset for L7.1: wider Δk (narrower packet) and spreading off, to focus on Fourier construction.'},
 'L7.5':{k0:1.6,dk:0.35,spread:true,note:'Preset for L7.5: spreading on — a free packet travels and broadens.'}};
Sims.wavepacket=function(el,seg){const preset=WP_PRESETS[seg]||{k0:1.6,dk:0.35,spread:true,note:''};
 const s=simShell(el,"Simulation — beats make a packet: phase vs group velocity","Two nearby plane waves with matter dispersion ω = k²/2 (units ħ = m = 1) beat into an envelope. The ripples slide at phase velocity v_ph = k/2 while the envelope — and the Gaussian packet below — travel at group velocity v_g = k. Toggle spreading to add the quadratic-term distortion. Paused by default; playback auto-pauses after 30 s."+(preset.note?' '+preset.note:''),slider('k0','Central wave number k₀',0.6,2.6,0.05,preset.k0,v=>Number(v).toFixed(2))+slider('dk','Spread Δk',0.1,0.9,0.05,preset.dk,v=>Number(v).toFixed(2))+`<label class="control"><input type="checkbox" id="spread"${preset.spread?' checked':''}> spreading (quadratic term)</label><button class="btn btn-dark" id="wpPlay">▶ Play</button>`,340);
 let k0=preset.k0,dk=preset.dk,spread=preset.spread,t=0;const stationary=!!preset.stationary;
 const Xmax=24;
 const draw=()=>{const{w,h}=fit(s.canvas),c=s.ctx;c.clearRect(0,0,w,h);
  const k1=Math.max(0.05,k0-dk/2),k2=k0+dk/2,w1=k1*k1/2,w2=k2*k2/2,wb=(w1+w2)/2,kb=(k1+k2)/2,vg=k0,vph=wb/kb;
  const pad=30,X=x=>pad+(x/Xmax)*(w-2*pad);
  c.font='12px sans-serif';
  // --- top: two-wave beat + envelope (or stationary-phase panel for L4.4) ---
  const yT=h*0.26,A=h*0.12;
  if(stationary){
  c.fillStyle='#18202b';c.fillText('stationary phase: φ(k) weights the packet (left) · phase slope d/dk (kx − ω(k)t) vanishes at k₀ (right)',pad,18);
  const kMin=Math.max(0.05,k0-1.2),kMax=k0+1.2,yPhi=yT+A*0.75;
  const K1=k=>pad+((k-kMin)/(kMax-kMin))*(w*0.36-pad),K2=k=>w*0.54+((k-kMin)/(kMax-kMin))*(w-pad-w*0.54);
  c.strokeStyle='#d9e0e8';c.beginPath();c.moveTo(pad,yPhi);c.lineTo(w*0.36,yPhi);c.moveTo(w*0.54,yT);c.lineTo(w-pad,yT);c.stroke();
  c.strokeStyle='#0f766e';c.lineWidth=2;c.beginPath();for(let i=0;i<=120;i++){const k=kMin+(kMax-kMin)*i/120,e=Math.exp(-((k-k0)*(k-k0))/(2*dk*dk));i?c.lineTo(K1(k),yPhi-e*A*0.95):c.moveTo(K1(k),yPhi-e*A*0.95)}c.stroke();c.lineWidth=1;
  c.setLineDash([4,4]);c.strokeStyle='#b7791f';c.beginPath();c.moveTo(K1(k0),yPhi);c.lineTo(K1(k0),yPhi-A);c.moveTo(K2(k0),yT-A*0.8);c.lineTo(K2(k0),yT+A*0.8);c.stroke();c.setLineDash([]);
  const tilt=Math.max(t,0.001),norm=1.2*Math.max(t,1);
  c.strokeStyle='#145da0';c.lineWidth=2;c.beginPath();for(let i=0;i<=120;i++){const k=kMin+(kMax-kMin)*i/120,sv=Math.max(-1,Math.min(1,((k0-k)*tilt)/norm));i?c.lineTo(K2(k),yT-sv*A*0.75):c.moveTo(K2(k),yT-sv*A*0.75)}c.stroke();c.lineWidth=1;
  c.fillStyle='#0f766e';c.beginPath();c.arc(K2(k0),yT,4,0,7);c.fill();c.fillText('φ(k)',K1(k0)+8,yPhi-A*0.75);c.fillText('k₀',K1(k0)-4,yPhi+14);
  c.fillStyle='#18202b';c.fillText('d/dk (kx − ω(k)t)',w*0.54,yT-A*0.95);c.fillText('stationary at k₀: slope = 0 → hump at x = v_g t',w*0.54,yT+A*1.05);
  if(t<0.01)c.fillText('(t = 0: slope is flat — play, and the line tilts while its zero stays at k₀)',w*0.54,yT+A*1.3);
  }else{
  c.fillStyle='#18202b';c.fillText('beat of two plane waves k₁, k₂ — sum (blue), envelope (green)',pad,18);
  c.strokeStyle='#d9e0e8';c.beginPath();c.moveTo(pad,yT);c.lineTo(w-pad,yT);c.stroke();
  c.setLineDash([4,4]);c.strokeStyle='#0f766e';c.beginPath();for(let i=0;i<=240;i++){const x=i/240*Xmax,e=2*Math.cos(dk*(x-vg*t)/2);i?c.lineTo(X(x),yT-e*A*0.5):c.moveTo(X(x),yT-e*A*0.5)}c.stroke();c.beginPath();for(let i=0;i<=240;i++){const x=i/240*Xmax,e=2*Math.cos(dk*(x-vg*t)/2);i?c.lineTo(X(x),yT+e*A*0.5):c.moveTo(X(x),yT+e*A*0.5)}c.stroke();c.setLineDash([]);
  c.strokeStyle='#145da0';c.lineWidth=2;c.beginPath();for(let i=0;i<=240;i++){const x=i/240*Xmax,y=Math.cos(k1*x-w1*t)+Math.cos(k2*x-w2*t);i?c.lineTo(X(x),yT-y*A*0.5):c.moveTo(X(x),yT-y*A*0.5)}c.stroke();c.lineWidth=1;
  const xe=((vg*t)%Xmax+Xmax)%Xmax;
  const n=Math.round((kb*Xmax/2-wb*t)/(2*Math.PI)),xc=(wb*t+2*Math.PI*n)/kb;
  c.strokeStyle='#0f766e';c.beginPath();c.moveTo(X(xe),yT-A*0.8);c.lineTo(X(xe),yT+A*0.8);c.stroke();
  c.fillStyle='#0f766e';c.fillText('envelope peak → v_g',Math.min(X(xe)+6,w-150),yT-A*0.8);
  if(xc>=0&&xc<=Xmax){c.strokeStyle='#b7791f';c.setLineDash([3,3]);c.beginPath();c.moveTo(X(xc),yT-A*0.8);c.lineTo(X(xc),yT+A*0.8);c.stroke();c.setLineDash([]);c.fillStyle='#b7791f';c.fillText('carrier crest → ω̄/k̄',Math.min(X(xc)+6,w-140),yT+A*0.95)}
  }
  // --- bottom: Gaussian packet with carrier ---
  const yB=h*0.74,B=h*0.16,C=Xmax+8,tLoc=((vg*t)%C+C)%C/vg,xp=(vg*tLoc)-4;
  const s0=2/dk,sig=spread?Math.sqrt(s0*s0+(tLoc/(2*s0))**2):s0,ampScale=sig>0?Math.sqrt(s0/sig):1;
  c.fillStyle='#18202b';c.fillText('Gaussian packet: ripples slide inside an envelope that rides at v_g'+(spread?' (spreading on)':' (rigid: first-order motion)'),pad,h*0.47);
  c.strokeStyle='#d9e0e8';c.beginPath();c.moveTo(pad,yB);c.lineTo(w-pad,yB);c.stroke();
  c.fillStyle='rgba(15,118,110,0.15)';c.beginPath();
  for(let i=0;i<=240;i++){const x=i/240*Xmax,e=Math.exp(-((x-xp)*(x-xp))/(2*sig*sig));i?c.lineTo(X(x),yB-e*e*B*ampScale*ampScale):c.moveTo(X(x),yB-e*e*B*ampScale*ampScale)}
  for(let i=240;i>=0;i--){const x=i/240*Xmax;c.lineTo(X(x),yB)}
  c.closePath();c.fill();
  c.setLineDash([4,4]);c.strokeStyle='#0f766e';c.beginPath();for(let i=0;i<=240;i++){const x=i/240*Xmax,e=Math.exp(-((x-xp)*(x-xp))/(2*sig*sig));i?c.lineTo(X(x),yB-e*B*ampScale):c.moveTo(X(x),yB-e*B*ampScale)}c.stroke();c.setLineDash([]);
  const w0=k0*k0/2;
  c.strokeStyle='#145da0';c.lineWidth=2;c.beginPath();for(let i=0;i<=240;i++){const x=i/240*Xmax,e=Math.exp(-((x-xp)*(x-xp))/(2*sig*sig)),y=e*ampScale*Math.cos(k0*x-w0*t);i?c.lineTo(X(x),yB-y*B):c.moveTo(X(x),yB-y*B)}c.stroke();c.lineWidth=1;
  s.readout.innerHTML=`<div>v_ph = k₀/2 <b>${(k0/2).toFixed(3)}</b></div><div>beat carrier ω̄/k̄ <b>${vph.toFixed(3)}</b></div><div>v_g = k₀ <b>${vg.toFixed(3)}</b></div><div>envelope width σ <b>${sig.toFixed(2)} (σ₀ ${s0.toFixed(2)})</b></div><div>t <b>${t.toFixed(1)}</b></div>`};
 bindRange(el,'k0',v=>{k0=v;draw()});
 bindRange(el,'dk',v=>{dk=v;draw()});
 el.querySelector('#spread').addEventListener('change',e=>{spread=e.target.checked;draw()});
 const wpPlayBtn=el.querySelector('#wpPlay');
 const animWp=makeAnim(()=>{t+=0.06;const cyc=(Xmax+8)/k0;if(t>=cyc)t-=cyc;draw()},playing=>{if(wpPlayBtn)wpPlayBtn.textContent=playing?'⏸ Pause':'▶ Play'});
 if(wpPlayBtn)wpPlayBtn.onclick=()=>animWp.toggle();
 draw();};
/* ---- Galilean boost: ordinary wave vs matter wave (L4.2) ---- */
Sims.boost=function(el){const s=simShell(el,"Simulation — running past a wave: what changes, λ or ω?","Photograph the crests from a frame S′ moving at V. An ordinary wave (sound, water) keeps its crest spacing — only its frequency shifts, because its phase Φ = kx − ωt is the same event for every observer and k′ = k. A matter wave is different: the boost sends p → p − mV, so k′ and λ′ = h/p′ change too. Both start from the same lab λ; speeds are in units of the wave/particle speed in S.",slider('V','Observer speed V',-0.8,0.95,0.05,0.4,v=>Number(v).toFixed(2))+`<label class="control">Wave <select id="boostMode"><option value="ordinary">Ordinary (sound / water)</option><option value="matter">Matter wave (de Broglie)</option></select></label>`,280);
 let V=0.4,mode='ordinary';const lam=4,Xmax=24;
 const draw=()=>{const{w,h}=fit(s.canvas),c=s.ctx;c.clearRect(0,0,w,h);
  const ordinary=mode==='ordinary',denom=1-V;
  const lamP=ordinary?lam:lam/denom,kRatio=ordinary?1:denom,wRatio=ordinary?1-V:denom*denom;
  const pad=30,X=x=>pad+(x/Xmax)*(w-2*pad),amp=h*0.11;
  const row=(y,lamRow,label)=>{c.strokeStyle='#d9e0e8';c.beginPath();c.moveTo(pad,y);c.lineTo(w-pad,y);c.stroke();
   c.strokeStyle='#145da0';c.lineWidth=2;c.beginPath();for(let i=0;i<=240;i++){const x=i/240*Xmax,yy=y-amp*Math.cos(2*Math.PI*x/lamRow);i?c.lineTo(X(x),yy):c.moveTo(X(x),yy)}c.stroke();c.lineWidth=1;
   c.strokeStyle='#b7791f';for(let cxr=lamRow;cxr<Xmax;cxr+=lamRow){c.beginPath();c.moveTo(X(cxr),y-amp*1.25);c.lineTo(X(cxr),y+amp*0.4);c.stroke()}
   if(lamRow*2<=Xmax){c.strokeStyle='#0f766e';c.beginPath();c.moveTo(X(lamRow),y+amp*1.45);c.lineTo(X(lamRow*2),y+amp*1.45);c.stroke()}
   c.fillStyle='#18202b';c.fillText(label+'   (λ = '+lamRow.toFixed(2)+')',pad,y-amp*1.5)};
  c.font='12px sans-serif';
  row(h*0.30,lam,'S (lab frame)');
  row(h*0.72,lamP,"S′ (moving at V = "+V.toFixed(2)+')');
  c.fillStyle='#18202b';c.font='13px sans-serif';
  c.fillText(ordinary?'Ordinary wave: crests are physical events — every frame photographs the same spacing. Only ω (the pitch) shifts.':"Matter wave: p′ = p − mV, so the moving observer's crests genuinely spread out or squeeze together.",pad,h-10);
  s.readout.innerHTML=`<div>λ (lab) <b>${lam.toFixed(2)}</b></div><div>λ′ (moving) <b>${lamP.toFixed(2)}</b></div><div>k′/k <b>${kRatio.toFixed(3)}</b></div><div>ω′/ω <b>${wRatio.toFixed(3)}</b></div>`};
 bindRange(el,'V',v=>{V=v;draw()});
 el.querySelector('#boostMode').addEventListener('change',e=>{mode=e.target.value;draw()});
 draw();};
/* ---- Which wave may a free particle be? (L4.6) ---- */
Sims.freewave=function(el){const s=simShell(el,"Simulation — which wave may a free particle be?","Try each candidate for a right-moving free-particle wave, then add its left-moving partner. Sine and cosine mixtures periodically become zero at every x at once — the particle would vanish. The complex-exponential mixture becomes 2cos(kx)e^{−iωt}: |ψ|² = 4cos²(kx), which never vanishes everywhere — it only has nodes. Scrub ωt, or play it. Paused by default; playback auto-pauses after 30 s.",`<label class="control">Candidate wave <select id="fwCand"><option value="exp">e^{i(kx−ωt)} (complex)</option><option value="sin">sin(kx−ωt)</option><option value="cos">cos(kx−ωt)</option></select></label><label class="control"><input type="checkbox" id="fwBoth" checked> add the left-moving partner</label>`+slider('wt','Phase ωt',0,360,1,0,v=>v+'°')+`<button class="btn btn-dark" id="fwPlay">▶ Play</button>`,320);
 let cand='exp',both=true,deg=0;
 const psi=x=>{const tr=deg*Math.PI/180;let re,im=0;
  if(cand==='exp'){re=Math.cos(x-tr);im=Math.sin(x-tr);if(both){re+=Math.cos(x+tr);im-=Math.sin(x+tr)}}
  else if(cand==='sin'){re=Math.sin(x-tr);if(both)re+=Math.sin(x+tr)}
  else{re=Math.cos(x-tr);if(both)re+=Math.cos(x+tr)}
  return[re,im]};
 const draw=()=>{const{w,h}=fit(s.canvas),c=s.ctx;c.clearRect(0,0,w,h);
  const pad=30,Xmax=4*Math.PI,X=x=>pad+(x/Xmax)*(w-2*pad),y0=h*0.34,amp=h*0.2,scale=both?2:1;
  let maxP=0;const pts=[];
  for(let i=0;i<=240;i++){const x=i/240*Xmax,[re,im]=psi(x),p=re*re+im*im;if(p>maxP)maxP=p;pts.push([x,re,im,p])}
  c.font='12px sans-serif';c.fillStyle='#18202b';
  c.fillText('Re ψ (blue) · Im ψ (amber dashed) — amplitude vs x, k = 1',pad,18);
  c.strokeStyle='#d9e0e8';c.beginPath();c.moveTo(pad,y0);c.lineTo(w-pad,y0);c.stroke();
  c.strokeStyle='#145da0';c.lineWidth=2;c.beginPath();pts.forEach(([x,re],i)=>i?c.lineTo(X(x),y0-re/scale*amp):c.moveTo(X(x),y0-re/scale*amp));c.stroke();c.lineWidth=1;
  c.setLineDash([4,4]);c.strokeStyle='#b7791f';c.beginPath();pts.forEach(([x,re,im],i)=>i?c.lineTo(X(x),y0-im/scale*amp):c.moveTo(X(x),y0-im/scale*amp));c.stroke();c.setLineDash([]);
  const yP=h*0.9,pScale=both?4:1;
  c.fillStyle='#18202b';c.fillText('|ψ|² (green) — where the particle can be found',pad,h*0.58);
  c.strokeStyle='#d9e0e8';c.beginPath();c.moveTo(pad,yP);c.lineTo(w-pad,yP);c.stroke();
  c.strokeStyle='#0f766e';c.lineWidth=2;c.beginPath();pts.forEach(([x,re,im,p],i)=>i?c.lineTo(X(x),yP-p/pScale*h*0.26):c.moveTo(X(x),yP-p/pScale*h*0.26));c.stroke();c.lineWidth=1;
  const vanishes=maxP<0.01;
  c.fillStyle=vanishes?'#b42318':'#0f766e';c.font='13px sans-serif';
  c.fillText(vanishes?'✗ ψ = 0 at every x right now — the particle disappears':(both?'✓ |ψ|² is never identically zero — at most it has nodes (dark spots)':'A single travelling wave: |ψ|² is smooth and never identically zero'),pad,38);
  s.readout.innerHTML=`<div>ωt <b>${deg.toFixed(0)}°</b></div><div>max |ψ|² <b>${maxP.toFixed(2)}</b></div><div>${vanishes?'✗ zero everywhere — particle disappears':'✓ not identically zero'}</div>`};
 bindRange(el,'wt',v=>{deg=v;draw()});
 el.querySelector('#fwCand').addEventListener('change',e=>{cand=e.target.value;draw()});
 el.querySelector('#fwBoth').addEventListener('change',e=>{both=e.target.checked;draw()});
 const fwPlayBtn=el.querySelector('#fwPlay');
 const animFw=makeAnim(()=>{deg=(deg+3)%360;const i=el.querySelector('#wt');if(i)i.value=String(deg);const o=el.querySelector('#wtOut');if(o)o.textContent=deg+'°';draw()},playing=>{if(fwPlayBtn)fwPlayBtn.textContent=playing?'⏸ Pause':'▶ Play'});
 if(fwPlayBtn)fwPlayBtn.onclick=()=>animFw.toggle();
 draw();};
