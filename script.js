const DEMO_TIMES = Object.freeze({ growEnd: 3, wrapEnd: 5.5, heightEnd: 8, roomEnd: 11, orderEnd: 12, returnEnd: 13 });
const PRICE_POINTS = [[120,3900],[150,4900],[180,5900],[210,7400],[250,9900]];
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
  drawImage(ctx,images[from],w,h,1,1+p*.035);
  drawImage(ctx,images[to],w,h,p,1+(1-p)*.035);
}
function render() {
  drawScene('#canvas-grow','grow',0,1,state.grow);
  drawScene('#canvas-wrap','wrap',1,2,state.wrap);
  drawScene('#canvas-room','room',2,3,state.room);
}
function priceAt(height){for(let i=1;i<PRICE_POINTS.length;i++){let [h,p]=PRICE_POINTS[i],[prevH,prevP]=PRICE_POINTS[i-1];if(height<=h)return Math.round((prevP+(p-prevP)*(height-prevH)/(h-prevH))/100)*100;}return 9900;}
function setHeight(height) {
  height=+height;$('#height-range').value=height;
  $('#current-height').textContent=height+' см';$('#ruler-value').textContent=height+' см';
  $('#current-price').textContent=new Intl.NumberFormat('ru-RU').format(priceAt(height))+' ₽';
  $('#picker-tree').style.height=(74+(height-120)/130*26)+'%';
  $('#height-range').style.setProperty('--fill',((height-120)/130*100)+'%');
}
function setupPicker(){
  $('#height-range').addEventListener('input',e=>setHeight(e.target.value));setHeight(180);
  const paths={nordmann:'assets/img/tree-nordmann.png',blue:'assets/img/tree-blue.png',pine:'assets/img/tree-pine.png'};
  document.querySelectorAll('.species-item').forEach(button=>button.addEventListener('click',()=>{
    document.querySelector('.species-item.active')?.classList.remove('active');button.classList.add('active');
    const img=$('#picker-tree');img.style.opacity='0';img.style.transform='rotateY(20deg)';
    setTimeout(()=>{img.src=paths[button.dataset.species];img.alt=button.querySelector('b').textContent;img.style.opacity='1';img.style.transform='rotateY(0deg)';},180);
  }));
}
function setupDays(){const busy=new Set([22,24,25,28,29,30,31]);$('.delivery-days').innerHTML=Array.from({length:12},(_,i)=>{const day=i+20;return `<span data-day="${day}" class="${busy.has(day)?'busy':''}">${day}</span>`}).join('');}
function order(){if(state.ordered)return;state.ordered=true;const button=$('#order-button');button.innerHTML='Ёлка ваша ✓';$('.delivery-days [data-day="27"]').classList.add('yours');const field=$('#spark-field');for(let i=0;i<28;i++){const spark=document.createElement('i');spark.className='spark';const a=Math.random()*Math.PI*2,r=35+Math.random()*130;spark.style.setProperty('--dx',Math.cos(a)*r+'px');spark.style.setProperty('--dy',Math.sin(a)*r+'px');field.append(spark);setTimeout(()=>spark.remove(),950);}if(!demoMode&&!capture){setTimeout(()=>{$('#order').classList.remove('warm');state.room=0;render();},1250);}}
function showHero(){if(window.gsap){gsap.from('.massive span',{yPercent:110,opacity:0,stagger:.13,duration:1.15,ease:'power3.out'});gsap.from('.hero .callout',{opacity:0,x:i=>i?30:-30,delay:1.45,duration:.65});gsap.from('.hero .corner-card, .hero-cta',{opacity:0,y:25,delay:1.9,stagger:.12,duration:.65});}}
function setupScroll(){
  if(!window.gsap||!window.ScrollTrigger)return;
  gsap.registerPlugin(ScrollTrigger);
  [['#wrap','wrap'],['#order','room']].forEach(([selector,key])=>{
    ScrollTrigger.create({trigger:selector,start:'top top',end:'+=110%',pin:true,scrub:true,onUpdate:self=>{
      if(demoMode)return;state[key]=self.progress;if(key==='room')$(selector).classList.toggle('warm',self.progress>.38);render();
    }});
  });
  gsap.from('.height .species-item, .height .price-panel, .height .range-wrap',{scrollTrigger:{trigger:'#height',start:'top 65%'},opacity:0,y:22,stagger:.09,duration:.7});
}
function setupLenis(){if(!window.Lenis||demoMode)return;const lenis=new Lenis({duration:1.1,smoothWheel:true});function raf(t){lenis.raf(t);requestAnimationFrame(raf)}requestAnimationFrame(raf);}
function demo(){
  document.body.classList.add('demo');scrollTo(0,0);
  const positions={wrap:$('#wrap').offsetTop,height:$('#height').offsetTop,order:$('#order').offsetTop};
  const start=performance.now();let lastSection='',returnStarted=false;
  function tick(now){const t=(now-start)/1000;
    const section=t<DEMO_TIMES.growEnd?'hero':t<DEMO_TIMES.wrapEnd?'wrap':t<DEMO_TIMES.heightEnd?'height':'order';
    if(section!==lastSection){lastSection=section;scrollTo(0,section==='hero'?0:positions[section]);}
    state.grow=clamp(t/DEMO_TIMES.growEnd);
    state.wrap=clamp((t-DEMO_TIMES.growEnd)/(DEMO_TIMES.wrapEnd-DEMO_TIMES.growEnd));
    state.room=clamp((t-DEMO_TIMES.heightEnd)/(DEMO_TIMES.roomEnd-DEMO_TIMES.heightEnd));
    if(t>=DEMO_TIMES.wrapEnd&&t<DEMO_TIMES.heightEnd)setHeight(Math.round(120+90*ease((t-DEMO_TIMES.wrapEnd)/(DEMO_TIMES.heightEnd-DEMO_TIMES.wrapEnd))));
    if(t>=DEMO_TIMES.heightEnd)$('#order').classList.toggle('warm',t<DEMO_TIMES.orderEnd);
    if(t>=DEMO_TIMES.roomEnd&&!state.ordered)order();
    if(t>=DEMO_TIMES.orderEnd&&!returnStarted){returnStarted=true;$('#hero .hero-cta').style.transform='translateX(-50%)';scrollTo({top:0,behavior:'smooth'});$('#order').classList.remove('warm');}
    render();if(t<DEMO_TIMES.returnEnd)requestAnimationFrame(tick);
  }requestAnimationFrame(tick);
}
async function init(){
  setupPicker();setupDays();$('#order-button').addEventListener('click',order);
  const loaded=await Promise.all(POSTERS.map(loadImage));loaded.forEach((img,i)=>images[i]=img);
  await Promise.all(Object.keys(SEQUENCES).map(loadSequence));render();
  if(capture){
    document.body.classList.add('demo');
    document.documentElement.style.scrollBehavior='auto';
    state.grow=1;state.wrap=1;state.room=1;
    if(capture==='3')setHeight(180);
    if(capture==='4'||capture==='5')$('#order').classList.add('warm');
    if(capture==='5')order();
    document.querySelectorAll('.scene').forEach((scene,index)=>{scene.style.display=index===({1:0,2:1,3:2,4:3,5:3})[capture]?'block':'none';});
    render();scrollTo(0,0);
    return;
  }
  showHero();
  if(demoMode)demo();else{setupScroll();setupLenis();let start=performance.now();function grow(now){state.grow=clamp((now-start)/2700);render();if(state.grow<1)requestAnimationFrame(grow)}requestAnimationFrame(grow);}
  addEventListener('resize',render);
}
addEventListener('DOMContentLoaded',init);
