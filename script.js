if('scrollRestoration' in history)history.scrollRestoration='manual';
const DEMO_TIMES = Object.freeze({ growEnd: 3.2, wrapEnd: 5.5, roomEnd: 8.5, orderEnd: 9.5, returnEnd: 10.5 });
const POSTERS = ['frames/0-sprout.png','frames/1-tree.png','frames/2-net.png','frames/3-room.png'];
const SEQUENCES = { grow: 'assets/seq/1/manifest.json', wrap: 'assets/seq/2/manifest.json', room: 'assets/seq/3/manifest.json' };
const $ = s => document.querySelector(s);
const clamp = (n,a=0,b=1) => Math.max(a,Math.min(b,n));
const ease = n => 1 - Math.pow(1-clamp(n),3);
const images = {};
const sequences = {};
const state = {grow:0,wrap:0,room:0,ordered:false};
let demoMode = new URLSearchParams(location.search).get('demo') === '1';
const capture = new URLSearchParams(location.search).get('capture');

function loadImage(url) { return new Promise(resolve => { const img = new Image(); img.onload=()=>resolve(img); img.onerror=()=>resolve(null); img.src=url; }); }
async function loadSequence(key) {
  try {
    const response = await fetch(SEQUENCES[key]);
    if (!response.ok) return;
    const manifest = await response.json();
    const names = Array.isArray(manifest) ? manifest : manifest.frames;
    if (!Array.isArray(names) || !names.length) return;
    const base = SEQUENCES[key].replace(/manifest\.json$/, '');
    sequences[key] = (await Promise.all(names.map(name => loadImage(base + name)))).filter(Boolean);
  } catch (_) { /* Poster mode is intentional while video frames are absent. */ }
}
function resizeCanvas(canvas) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = Math.round(rect.width*dpr), h = Math.round(rect.height*dpr);
  if (canvas.width!==w || canvas.height!==h) { canvas.width=w; canvas.height=h; }
  return [w,h];
}
function drawImage(ctx,img,w,h,alpha=1,zoom=1) {
  if (!img) return;
  const iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height;
  const s=Math.min(w/iw,h/ih)*zoom, dw=iw*s, dh=ih*s;
  ctx.globalAlpha=alpha;ctx.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh);ctx.globalAlpha=1;
}
function drawScene(id,key,from,to,progress) {
  const canvas=$(id); if(!canvas)return;
  const [w,h]=resizeCanvas(canvas), ctx=canvas.getContext('2d');ctx.clearRect(0,0,w,h);
  const frames=sequences[key];
  if(frames && frames.length){drawImage(ctx,frames[Math.min(frames.length-1,Math.floor(clamp(progress)*frames.length))],w,h);return;}
  const p=ease(progress);
  if(key==='grow'){drawGrow(ctx,images[from],images[to],w,h,progress);return;}
  drawImage(ctx,images[from],w,h,1,1+p*.035);
  drawImage(ctx,images[to],w,h,p,1+(1-p)*.035);
}
// Запасной рост без ролика: росток гаснет, ёлка поднимается от основания и проявляется снизу вверх.
const growLayer=document.createElement('canvas');
function drawGrow(ctx,sprout,tree,w,h,progress){
  if(!w||!h)return;
  const t=clamp(progress), p=ease(t);
  drawImage(ctx,sprout,w,h,1-clamp(t*1.4));
  if(!tree)return;
  growLayer.width=w;growLayer.height=h;const g=growLayer.getContext('2d');
  const iw=tree.naturalWidth,ih=tree.naturalHeight,s0=Math.min(w/iw,h/ih),dw=iw*s0,dh=ih*s0,x=(w-dw)/2,y=(h-dh)/2;
  const base=y+dh*.9,k=.55+.45*p;
  g.drawImage(tree,(w-dw*k)/2,base-(base-y)*k,dw*k,dh*k);
  const top=base-(base-y)*k, edge=top+(base-top)*(1-clamp(t*1.25)), fade=h*.12;
  g.globalCompositeOperation='destination-in';
  const grad=g.createLinearGradient(0,edge-fade,0,edge+fade);grad.addColorStop(0,'rgba(0,0,0,0)');grad.addColorStop(1,'#000');
  g.fillStyle=grad;g.fillRect(0,0,w,h);g.globalCompositeOperation='source-over';
  ctx.drawImage(growLayer,0,0);
}
function render() {
  drawScene('#canvas-grow','grow',0,1,state.grow);
  drawScene('#canvas-wrap','wrap',1,2,state.wrap);
  drawScene('#canvas-room','room',2,3,state.room);
}
function setupDays(){const busy=new Set([22,24,25,28,29,30,31]);$('.delivery-days').innerHTML=Array.from({length:12},(_,i)=>{const day=i+20;return `<span data-day="${day}" class="${busy.has(day)?'busy':''}">${day}</span>`}).join('');}
function order(){if(state.ordered)return;state.ordered=true;const button=$('#order-button');button.innerHTML='Ёлка ваша ✓';$('.delivery-days [data-day="27"]').classList.add('yours');const field=$('#spark-field');for(let i=0;i<28;i++){const spark=document.createElement('i');spark.className='spark';const a=Math.random()*Math.PI*2,r=35+Math.random()*130;spark.style.setProperty('--dx',Math.cos(a)*r+'px');spark.style.setProperty('--dy',Math.sin(a)*r+'px');field.append(spark);setTimeout(()=>spark.remove(),950);}}
function showHero(){if(window.gsap){
  gsap.from('.massive .w b',{yPercent:115,stagger:.14,duration:1.1,ease:'power3.out',delay:.35});
  // Низ экрана выезжает одним блоком: белая панель и цена, следом ёлка в сетке и кнопка.
  gsap.from('.hero .hero-panel, .hero .price',{yPercent:110,duration:.9,ease:'power3.out',stagger:.12,delay:1.55});
  gsap.from('.hero .price .species-dots img',{scale:0,duration:.45,ease:'back.out(2)',stagger:.08,delay:2.2});
  gsap.from('.hero .delivery img',{y:120,rotate:8,opacity:0,duration:.9,ease:'back.out(1.6)',delay:1.85});
  gsap.from('.hero .delivery a',{opacity:0,duration:.5,delay:2.2});
  gsap.from('.hero-cta',{opacity:0,scale:.7,duration:.6,ease:'back.out(2)',delay:2.05});
  gsap.from('.hero .callout',{opacity:0,x:i=>i?40:-40,delay:2.1,duration:.7});
  gsap.from('.hero .callout i',{scaleX:0,transformOrigin:i=>i?'right center':'left center',delay:2.3,duration:.7});
}document.documentElement.classList.remove('intro');}
// Поэкранный скролл: колесо, свайп и клавиши листают по одному экрану, ролик экрана проигрывается при входе.
const SLIDE_MS=950, WHEEL_COOLDOWN=450;
const SCENE_CLIPS={hero:{key:'grow',duration:3.2,ease:'none'},wrap:{key:'wrap',duration:2.4,ease:'power1.inOut'},order:{key:'room',duration:2.8,ease:'power1.inOut'}};
function playScene(id,instant=false){
  const clip=SCENE_CLIPS[id];if(!clip)return;
  const {key}=clip, warm=()=>{if(key==='room')$('#order').classList.toggle('warm',state.room>.52);};
  if(id==='order'&&state.ordered)return;
  if(!window.gsap){state[key]=1;warm();render();return;}
  gsap.killTweensOf(state,key);
  // Ролик стартует с первого кадра сразу, а играет, когда экран почти доехал.
  state[key]=0;warm();render();
  gsap.to(state,{[key]:1,duration:clip.duration,delay:instant?0:SLIDE_MS/1000*.6,ease:clip.ease,onUpdate:()=>{warm();render();}});
}
function setupFullpage(){
  const root=document.documentElement, main=$('main'), scenes=[...document.querySelectorAll('.scene')];
  let index=0, lockUntil=0;
  root.classList.add('fp');scrollTo(0,0);
  const dots=document.createElement('nav');dots.className='fp-dots';dots.setAttribute('aria-label','Экраны');
  dots.innerHTML=scenes.map((s,i)=>`<button type="button" aria-label="Экран ${i+1}"></button>`).join('');
  document.body.append(dots);
  const dotButtons=[...dots.children];dotButtons.forEach((b,i)=>b.addEventListener('click',()=>goTo(i)));
  const place=instant=>{main.style.transition=instant?'none':'';main.style.transform=`translate3d(0,${-scenes[index].offsetTop}px,0)`;};
  function goTo(i,instant=false){
    i=Math.max(0,Math.min(scenes.length-1,i));
    if(i===index&&!instant)return;
    index=i;lockUntil=performance.now()+(instant?0:SLIDE_MS+WHEEL_COOLDOWN);
    place(instant);
    dotButtons.forEach((b,k)=>b.classList.toggle('on',k===i));
    root.dataset.scene=scenes[i].id;
    if(history.replaceState)history.replaceState(null,'',i?'#'+scenes[i].id:location.pathname+location.search);
    playScene(scenes[i].id,instant);
  }
  const step=dir=>{if(performance.now()<lockUntil)return;goTo(index+dir);};
  addEventListener('wheel',e=>{e.preventDefault();if(Math.abs(e.deltaY)<8)return;step(e.deltaY>0?1:-1);},{passive:false});
  let touchY=null;
  addEventListener('touchstart',e=>{touchY=e.target.closest('input[type=range]')?null:e.touches[0].clientY;},{passive:true});
  addEventListener('touchmove',e=>{if(touchY!==null)e.preventDefault();},{passive:false});
  addEventListener('touchend',e=>{if(touchY===null)return;const dy=touchY-e.changedTouches[0].clientY;touchY=null;if(Math.abs(dy)>45)step(dy>0?1:-1);});
  addEventListener('keydown',e=>{
    if(e.target.closest('input,textarea,select'))return;
    const next=['ArrowDown','PageDown'].includes(e.key)||(e.key===' '&&!e.shiftKey&&!e.target.closest('button,a'));
    const prev=['ArrowUp','PageUp'].includes(e.key)||(e.key===' '&&e.shiftKey);
    if(next||prev){e.preventDefault();step(next?1:-1);}
    else if(e.key==='Home'){e.preventDefault();goTo(0);}
    else if(e.key==='End'){e.preventDefault();goTo(scenes.length-1);}
  });
  document.addEventListener('click',e=>{
    const link=e.target.closest('a[href^="#"]');if(!link)return;
    const target=scenes.findIndex(s=>'#'+s.id===link.getAttribute('href'));
    if(target<0)return;e.preventDefault();goTo(target);
  });
  addEventListener('resize',()=>place(true));
  const start=scenes.findIndex(s=>'#'+s.id===location.hash);
  goTo(start>0?start:0,true);dotButtons[index].classList.add('on');
}
function demo(){
  document.body.classList.add('demo');scrollTo(0,0);
  const positions={wrap:$('#wrap').offsetTop,order:$('#order').offsetTop};
  const start=performance.now();let lastSection='',returnStarted=false;
  function tick(now){const t=(now-start)/1000;
    const section=t<DEMO_TIMES.growEnd?'hero':t<DEMO_TIMES.wrapEnd?'wrap':'order';
    if(section!==lastSection){lastSection=section;scrollTo(0,section==='hero'?0:positions[section]);}
    state.grow=clamp(t/DEMO_TIMES.growEnd);
    state.wrap=clamp((t-DEMO_TIMES.growEnd)/(DEMO_TIMES.wrapEnd-DEMO_TIMES.growEnd));
    state.room=clamp((t-DEMO_TIMES.wrapEnd)/(DEMO_TIMES.roomEnd-DEMO_TIMES.wrapEnd));
    if(t>=DEMO_TIMES.wrapEnd)$('#order').classList.toggle('warm',t<DEMO_TIMES.orderEnd&&state.room>.52);
    if(t>=DEMO_TIMES.roomEnd&&!state.ordered)order();
    if(t>=DEMO_TIMES.orderEnd&&!returnStarted){returnStarted=true;$('#hero .hero-cta').style.transform='translateX(-50%)';scrollTo({top:0,behavior:'smooth'});$('#order').classList.remove('warm');}
    render();if(t<DEMO_TIMES.returnEnd)requestAnimationFrame(tick);
  }requestAnimationFrame(tick);
}
async function init(){
  setupDays();$('#order-button').addEventListener('click',order);
  const loaded=await Promise.all(POSTERS.map(loadImage));loaded.forEach((img,i)=>images[i]=img);
  await Promise.all(Object.keys(SEQUENCES).map(loadSequence));render();
  if(capture){
    document.body.classList.add('demo');
    document.documentElement.style.scrollBehavior='auto';
    state.grow=1;state.wrap=1;state.room=1;
    if(capture==='4'||capture==='5')$('#order').classList.add('warm');
    if(capture==='5')order();
    document.querySelectorAll('.scene').forEach((scene,index)=>{scene.style.display=index===({1:0,2:1,3:2,4:2,5:2})[capture]?'block':'none';});
    render();scrollTo(0,0);
    return;
  }
  showHero();
  if(demoMode)demo();else setupFullpage();
  addEventListener('resize',render);
}
addEventListener('DOMContentLoaded',init);
