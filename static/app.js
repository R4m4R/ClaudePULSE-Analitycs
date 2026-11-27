'use strict';
/* ===== Núcleo ===== */
const $=id=>document.getElementById(id);
function showErr(m){const b=$('err');if(b){b.textContent='⚠ '+m;b.classList.add('on')}const l=$('ld');if(l)l.classList.remove('on')}
window.addEventListener('error',e=>showErr('Error de JavaScript: '+e.message));
window.addEventListener('unhandledrejection',e=>showErr('Error: '+((e.reason&&e.reason.message)||e.reason)));
if(typeof Chart==='undefined')showErr('No se pudo cargar static/chart.umd.js. Comprueba que el archivo existe en la carpeta static.');
else Chart.defaults.font.family="Inter,'Segoe UI',system-ui,sans-serif";
const LS={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const COL=['#4f6bed','#14b8a6','#f59e0b','#ef4468','#38bdf8','#a78bfa','#84cc16','#fb923c','#22d3ee','#e879f9','#eab308','#94a3b8'];
const BASE=['#84cc16','#fb923c','#22d3ee','#e879f9','#eab308','#94a3b8'];
let prevBrand='[]',RAW0=[],RAW=[],GR='auto',charts={},colors={},timer,TAB='general',CUR={rows:[]},prevTheme='auto',ldT,PLAN={pct:null,fecha:null};
const CATN={procesar:'Procesamiento general',agentes:'Agentes (sub-tareas)',skills:'Skills',mcp:'Herramientas MCP',loops:'Loops / auto-tareas'};
const catn=c=>CATN[c]||c;
const F={m:'',d:'',h0:0,h1:23,mo:'',p:''};
const CFG=Object.assign({lim:180,cur:'EUR',fx:0.92,theme:'auto',rf:5,exP:[],exM:[],logo:{t:'p',v:'diamond'},fav:{t:'same'}},(()=>{try{return JSON.parse(LS.get('cfg')||'{}')}catch(e){return{}}})());
const SYM=()=>CFG.cur==='EUR'?'€':'$';
const usd=v=>v.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+SYM();
const num=v=>v>=1e9?(v/1e9).toFixed(2)+' G':v>=1e6?(v/1e6).toFixed(2)+' M':v>=1e3?(v/1e3).toFixed(1)+' K':String(Math.round(v));
const hrs=s=>{const m=Math.round(s/60);return m>=60?Math.floor(m/60)+' h '+(m%60)+' min':m+' min'};
const mn=m=>{const x=m.replace('claude-','').replace(/-\d{8}$/,''),k=x.match(/^(opus|sonnet|haiku)-(\d+)(?:-(\d+))?$/);return k?k[1][0].toUpperCase()+k[1].slice(1)+' '+k[2]+(k[3]?'.'+k[3]:''):x};
const DOW=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'],DOWL=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const WDC={},wd=d=>WDC[d]??(WDC[d]=(new Date(d+'T12:00:00').getDay()+6)%7);
const tok=r=>r.i+r.o+r.cw+r.cr,sum=(rows,f)=>rows.reduce((a,r)=>a+f(r),0),pad=n=>String(n).padStart(2,'0');
const al=(hex,a)=>{const n=parseInt(hex.slice(1),16);return `rgba(${n>>16},${n>>8&255},${n&255},${a})`};
const fdia=d=>d.slice(8)+'/'+d.slice(5,7)+' '+DOW[wd(d)];
const tm=rows=>new Set(rows.map(r=>r.p)).size===1?sum(rows,r=>r.s):sum(rows,r=>r.g);
const fm1=(rows,k)=>sum(rows,r=>r[k]||0);

/* ===== Temas ===== */
const THEMES=[
{id:'auto',n:'Automático',sw:['linear-gradient(135deg,#f3f5fb 50%,#0a0f24 50%)','#fff','#6b7bff']},
{id:'light',n:'Profesional',sw:['#f3f5fb','#fff','#3b5bdb'],pal:['#4f6bed','#14b8a6','#f59e0b','#ef4468','#38bdf8','#a78bfa']},
{id:'corporate',n:'Corporativo',sw:['#e9edf1','#0a2540','#0b4f8a'],pal:['#0b4f8a','#b03a2e','#2e7d32','#d68910','#566574','#7d3c98']},
{id:'modern',n:'Moderno',sw:['#080a18','#2a1f5c','#8b6cff'],pal:['#8b6cff','#00e5c8','#ff5ca8','#ffc247','#38bdf8','#a3e635']},
{id:'dark',n:'Oscuro',sw:['#0a0f24','#111a38','#7c93ff'],pal:['#7c93ff','#2dd4bf','#fbbf24','#fb7185','#38bdf8','#c4b5fd']},
{id:'midnight',n:'Medianoche',sw:['#050816','#0d1330','#5b8cff'],pal:['#5b8cff','#a78bfa','#22d3ee','#f472b6','#34d399','#fbbf24']},
{id:'ocean',n:'Océano',sw:['#04141a','#0f3340','#22d3ee'],pal:['#22d3ee','#2dd4bf','#60a5fa','#a3e635','#fbbf24','#f472b6']},
{id:'sunset',n:'Atardecer',sw:['#160d1f','#2e1a40','#ff8a4c'],pal:['#ff8a4c','#f472b6','#fbbf24','#c084fc','#fb7185','#2dd4bf']},
{id:'graphite',n:'Grafito',sw:['#121212','#262629','#fbbf24'],pal:['#fbbf24','#94a3b8','#60a5fa','#34d399','#f87171','#c4b5fd']},
{id:'forest',n:'Bosque',sw:['#f0f6f1','#1b4332','#1f8a4c'],pal:['#1f8a4c','#2a9d8f','#e9a23b','#c8553d','#6aa84f','#7a6fb5']},
{id:'lavender',n:'Lavanda',sw:['#f6f3fb','#3b2370','#7c4dff'],pal:['#7c4dff','#14b8a6','#f59e0b','#ec4899','#38bdf8','#a78bfa']},
{id:'contrast',n:'Alto contraste',sw:['#000','#171717','#ffe600'],pal:['#ffe600','#00e5ff','#ff4081','#00ff9c','#ff9100','#b388ff']}];
const sysDark=()=>!!(window.matchMedia&&matchMedia('(prefers-color-scheme:dark)').matches);
const effTheme=()=>CFG.theme==='auto'?(sysDark()?'dark':'light'):CFG.theme;
function buildColors(){Object.keys(colors).forEach(k=>delete colors[k]);[...new Set(RAW.map(r=>r.m))].sort().forEach((m,i)=>{colors[m]=colors[mn(m)]=COL[i%COL.length]});[...new Set(RAW.map(r=>r.p))].sort().forEach((p,i)=>{if(!colors[p])colors[p]=COL[i%COL.length]})}
function col(k){if(!colors[k]){let x=0;for(const ch of String(k))x=(x*31+ch.charCodeAt(0))>>>0;colors[k]=COL[x%COL.length]}return colors[k]}
function applyTheme(){const r=document.documentElement;if(!THEMES.some(t=>t.id===CFG.theme))CFG.theme='auto';CFG.theme==='auto'?r.removeAttribute('data-theme'):r.dataset.theme=CFG.theme;
 const t=THEMES.find(x=>x.id===effTheme());COL.splice(0,COL.length,...t.pal,...BASE);buildColors();
 if(typeof Chart!=='undefined'){const cs=getComputedStyle(r);Chart.defaults.color=cs.getPropertyValue('--mu').trim();Chart.defaults.borderColor=cs.getPropertyValue('--bd').trim()}
 applyBrand();if(RAW.length)render()}
function toast(m){let t=$('toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t)}t.textContent=m;t.classList.add('on');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('on'),1800)}
function toggleTheme(){const ids=THEMES.filter(t=>t.id!=='auto').map(t=>t.id);CFG.theme=ids[(ids.indexOf(effTheme())+1)%ids.length];LS.set('cfg',JSON.stringify(CFG));applyTheme();toast('Tema: '+THEMES.find(t=>t.id===CFG.theme).n)}
function buildThemes(){$('thg').innerHTML=THEMES.map(t=>`<button type="button" class="thc ${CFG.theme===t.id?'on':''}" onclick="pickTheme('${t.id}')"><span class="sw" style="background:${t.sw[0]}"><i style="background:${t.sw[1]}"></i><u style="background:${t.sw[2]}"></u></span>${t.n}</button>`).join('')}
function pickTheme(id){CFG.theme=id;applyTheme();buildThemes()}
function openCfg(){$('c_lim').value=CFG.lim;$('c_cur').value=CFG.cur;$('c_fx').value=CFG.fx;prevTheme=CFG.theme;prevBrand=JSON.stringify([CFG.logo,CFG.fav]);buildThemes();buildLists();buildIcons();$('c_rf').value=CFG.rf;$('cfg').classList.add('on')}
function closeCfg(){$('cfg').classList.remove('on')}
function cancelCfg(){CFG.theme=prevTheme;try{const b=JSON.parse(prevBrand);CFG.logo=b[0]||{t:'p',v:'diamond'};CFG.fav=b[1]||{t:'same'}}catch(e){}applyTheme();closeCfg()}
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
function buildLists(){const fx=CFG.cur==='EUR'?CFG.fx:1,eP=new Set(CFG.exP||[]),eM=new Set(CFG.exM||[]),P=grp(RAW0,r=>r.p),M=grp(RAW0,r=>r.m);
 $('lp').innerHTML=P.map(a=>`<label class="ck2" data-n="${esc(a.k.toLowerCase())}"><input type="checkbox" value="${esc(a.k)}" ${eP.has(a.k)?'':'checked'}><span>${esc(a.k)}</span><small>${usd(a.c*fx)}</small></label>`).join('')||'<div class="empty">Sin proyectos</div>';
 $('lm').innerHTML=M.map(a=>`<label class="ck2"><input type="checkbox" value="${esc(a.k)}" ${eM.has(a.k)?'':'checked'}><span title="${esc(a.k)}">${esc(mn(a.k))}</span><small>${usd(a.c*fx)}</small></label>`).join('')||'<div class="empty">Sin modelos</div>';$('lpf').value=''}
function setAll(id,v){document.querySelectorAll('#'+id+' label').forEach(l=>{if(l.style.display!=='none')l.querySelector('input').checked=v})}
function filtProj(){const q=$('lpf').value.toLowerCase();document.querySelectorAll('#lp label').forEach(l=>l.style.display=(l.dataset.n||'').includes(q)?'':'none')}
function saveCfg(){CFG.lim=+$('c_lim').value||0;CFG.cur=$('c_cur').value;CFG.fx=+$('c_fx').value||1;CFG.rf=+$('c_rf').value;
 const ex=id=>[...document.querySelectorAll('#'+id+' input')].filter(i=>!i.checked).map(i=>i.value);if(RAW0.length){CFG.exP=ex('lp');CFG.exM=ex('lm')}
 if(F.p&&CFG.exP.includes(F.p))F.p='';if(F.mo&&CFG.exM.includes(F.mo))F.mo='';
 setTimer();LS.set('cfg',JSON.stringify(CFG));closeCfg();applyFx();applyTheme();if(RAW.length){buildFilters();render()}}
$('cfg').onclick=e=>{if(e.target.id==='cfg')cancelCfg()};
$('dt').onclick=e=>{if(e.target.id==='dt')closeDt()};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDt();if($('cfg').classList.contains('on'))cancelCfg()}});

/* ===== Iconos del dashboard y de la pestaña ===== */
const ICONS={
 diamond:{n:'Diamante',f:1,p:'<path d="M12 2l8 10-8 10-8-10z"/>'},
 chart:{n:'Línea',p:'<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>'},
 bars:{n:'Barras',p:'<path d="M5 20V10M12 20V4M19 20v-7"/>'},
 pie:{n:'Circular',p:'<path d="M12 3v9h9"/><path d="M20.5 15A9 9 0 1 1 9 3.5"/>'},
 bolt:{n:'Rayo',p:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'},
 cube:{n:'Cubo',p:'<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 12l9-5M12 12L3 7M12 12v10"/>'},
 layers:{n:'Capas',p:'<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'},
 target:{n:'Diana',p:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>'},
 gauge:{n:'Medidor',p:'<path d="M4 18a9 9 0 1 1 16 0"/><path d="M12 14l4-5"/><circle cx="12" cy="14" r="1.2"/>'},
 clock:{n:'Reloj',p:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'},
 terminal:{n:'Terminal',p:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M13 15h4"/>'},
 code:{n:'Código',p:'<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>'},
 cpu:{n:'Chip',p:'<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>'},
 spark:{n:'Destello',p:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'},
 shield:{n:'Escudo',p:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>'},
 flame:{n:'Llama',p:'<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 2.5 1.5 2.5C10 9 10.5 6 12 3z"/>'}};
const iconSvg=(id,sz)=>{const o=ICONS[id]||ICONS.diamond;return `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="${o.f?'currentColor':'none'}" stroke="currentColor" stroke-width="${o.f?1.4:2}" stroke-linecap="round" stroke-linejoin="round">${o.p}</svg>`};
const lum=h=>{const m=/^#?([0-9a-f]{6})$/i.exec((h||'').trim());if(!m)return .3;const n=parseInt(m[1],16);return(.299*(n>>16)+.587*(n>>8&255)+.114*(n&255))/255};
function applyBrand(){const lg=CFG.logo||{t:'p',v:'diamond'},l=document.querySelector('.logo');
 if(l){if(lg.t==='i'){l.classList.add('img');l.innerHTML=`<img src="${lg.v}" alt="">`}else{l.classList.remove('img');l.innerHTML=iconSvg(lg.v,22)}}
 const f=(CFG.fav&&CFG.fav.t!=='same')?CFG.fav:lg;let href,type='image/svg+xml';
 if(f.t==='i'){href=f.v;type='image/png'}else{const cs=getComputedStyle(document.documentElement),a=cs.getPropertyValue('--ac').trim()||'#4f6bed',b=cs.getPropertyValue('--ac2').trim()||'#a06bff',o=ICONS[f.v]||ICONS.diamond,st=(lum(a)+lum(b))/2>.62?'#0b1020':'#ffffff';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="32" height="32" rx="8" fill="url(#g)"/><g transform="translate(5 5) scale(.917)" fill="${o.f?st:'none'}" stroke="${st}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${o.p}</g></svg>`;href='data:image/svg+xml,'+encodeURIComponent(svg)}
 let k=document.getElementById('fav');if(!k){k=document.createElement('link');k.id='fav';k.rel='icon';document.head.appendChild(k)}k.type=type;k.href=href}
function buildIcons(){['logo','fav'].forEach(k=>{const c=CFG[k]||{};$('ig_'+k).innerHTML=Object.keys(ICONS).map(id=>`<button type="button" class="icb ${c.t==='p'&&c.v===id?'on':''}" title="${ICONS[id].n}" onclick="pickIcon('${k}','${id}')">${iconSvg(id,20)}</button>`).join('')+(c.t==='i'?`<button type="button" class="icb on" title="Imagen propia"><img src="${c.v}" alt=""></button>`:'')});
 $('fav_same').classList.toggle('on',!CFG.fav||CFG.fav.t==='same')}
function pickIcon(k,id){CFG[k]={t:'p',v:id};applyBrand();buildIcons()}
function resetBrand(k){CFG[k]=k==='logo'?{t:'p',v:'diamond'}:{t:'same'};applyBrand();buildIcons()}
function loadImg(k,file){if(!file)return;if(file.size>3e6){toast('Imagen demasiado grande (máx. 3 MB)');return}
 const fr=new FileReader();fr.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas'),S=128;c.width=c.height=S;const x=c.getContext('2d'),r=Math.min(S/im.width,S/im.height),w=im.width*r,h=im.height*r;x.drawImage(im,(S-w)/2,(S-h)/2,w,h);CFG[k]={t:'i',v:c.toDataURL('image/png')};applyBrand();buildIcons()};im.onerror=()=>toast('No se pudo leer la imagen');im.src=fr.result};fr.readAsDataURL(file)}
['logo','fav'].forEach(k=>{$('up_'+k).onchange=e=>{loadImg(k,e.target.files[0]);e.target.value=''}});

/* ===== Carga de datos ===== */
function showLoader(){const l=$('ld');l.classList.remove('err');l.classList.add('on');$('ldh').textContent='Cargando datos…';$('ldm').textContent='Leyendo registros de Claude Code…';let s=0;clearInterval(ldT);$('ldt').textContent='0 s';
 ldT=setInterval(()=>{s++;$('ldt').textContent=s+' s';if(s==6)$('ldm').textContent='Procesando mensajes y calculando costes…';if(s==18)$('ldm').textContent='La primera lectura es la más lenta; las siguientes serán casi instantáneas.'},1000)}
function hideLoader(){clearInterval(ldT);$('ld').classList.remove('on')}
function loaderError(e){clearInterval(ldT);$('ld').classList.add('err');$('ldh').textContent='No se pudieron cargar los datos';$('ldm').textContent=String(e)}
function setTimer(){clearInterval(timer);const s=$('st').textContent;$('st').textContent=s.replace(/auto-refresco: .*/,'auto-refresco: '+rfTxt(CFG.rf));if(CFG.rf>0)timer=setInterval(()=>load(true),CFG.rf*60000)}
const rfTxt=m=>m?(m>=60?m/60+' h':m+' min'):'desactivado';
function applyFx(){const f=CFG.cur==='EUR'?CFG.fx:1,eP=new Set(CFG.exP||[]),eM=new Set(CFG.exM||[]);RAW=RAW0.filter(r=>!eP.has(r.p)&&!eM.has(r.m)).map(r=>({...r,c:r.c*f,ki:(r.ki||0)*f,ko:(r.ko||0)*f,kw:(r.kw||0)*f,kr:(r.kr||0)*f}))}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function setProg(p){const bi=document.querySelector('#ld .ldbar i');if(bi)bi.style.cssText=p==null?'':`width:${p}%;animation:none;transform:none;transition:width .3s`}
let busy=false;
async function load(silent){if(busy)return;busy=true;if(!silent){showLoader();setProg(null)}
 try{await fetch('/api/refresh');
  for(;;){const r0=await fetch('/api/estado');if(!r0.ok)throw new Error('HTTP '+r0.status);const e=await r0.json();if(e.error)throw new Error(e.error);
   if(!silent){const calc=/^Calcul/.test(e.fase||'');setProg(e.cargando&&e.total&&!calc?Math.round(100*e.hechos/e.total):null);
    $('ldm').textContent=e.cargando?((e.fase||'Leyendo')+(e.total?` · ${e.hechos} de ${e.total} archivos · ${num(e.mensajes)} mensajes`:'')):'Preparando gráficos…'}
   if(e.listo&&!e.cargando)break;await sleep(e.cargando?350:150)}
  const r=await fetch('/api/data');if(!r.ok)throw new Error('HTTP '+r.status);const d=await r.json();RAW0=d.rows||[];applyFx();buildColors();
  try{const rp=await fetch('/api/plan');if(rp.ok)PLAN=await rp.json()}catch(e){}
  $('st').textContent=RAW0.length?`${d.archivos} archivos · ${num(d.mensajes)} mensajes · actualizado ${new Date().toLocaleTimeString()} · auto-refresco: ${rfTxt(CFG.rf)}`:'No se han encontrado datos de uso. Revisa la consola del servidor.';
  buildFilters();render();hideLoader()}catch(e){$('st').textContent='Error: '+e;if(!silent)loaderError(e)}finally{busy=false}}

/* ===== Filtros ===== */
function filtered(){return RAW.filter(r=>(!F.m||r.d.startsWith(F.m))&&(!F.d||r.d===F.d)&&r.h>=F.h0&&r.h<=F.h1&&(!F.mo||r.m===F.mo)&&(!F.p||r.p===F.p))}
function fillSel(id,opts,val){$(id).innerHTML=opts.map(o=>`<option value="${o[0]}" ${o[0]==val?'selected':''}>${o[1]}</option>`).join('')}
function buildFilters(){initMonths();
 const ms=[...new Set(RAW.map(r=>r.d.slice(0,7)))].sort().reverse();fillSel('fm',[['','Todos los meses'],...ms.map(m=>[m,m])],F.m);
 const ds=[...new Set(RAW.filter(r=>!F.m||r.d.startsWith(F.m)).map(r=>r.d))].sort().reverse();if(F.d&&!ds.includes(F.d))F.d='';
 fillSel('fd',[['','Todos los días'],...ds.map(d=>[d,d])],F.d);
 const hs=[...Array(24).keys()].map(h=>[h,pad(h)+':00']);fillSel('fh0',hs,F.h0);fillSel('fh1',hs,F.h1);
 fillSel('fmo',[['','Todos los modelos'],...[...new Set(RAW.map(r=>r.m))].sort().map(m=>[m,mn(m)])],F.mo);
 fillSel('fp',[['','Todos los proyectos'],...[...new Set(RAW.map(r=>r.p))].sort().map(p=>[p,p])],F.p)}
const FMAP={fm:'m',fd:'d',fh0:'h0',fh1:'h1',fmo:'mo',fp:'p'};
Object.keys(FMAP).forEach(id=>$(id).onchange=e=>{const k=FMAP[id];F[k]=(k==='h0'||k==='h1')?+e.target.value:e.target.value;if(F.h0>F.h1){if(k==='h0')F.h1=F.h0;else F.h0=F.h1}buildFilters();render()});
$('fg').onchange=e=>{GR=e.target.value;render()};
function reset(){Object.assign(F,{m:'',d:'',h0:0,h1:23,mo:'',p:''});GR='auto';$('fg').value='auto';buildFilters();render()}
const gran=()=>GR!=='auto'?GR:(F.d?'h':'d');
const grKey=(r,g)=>g==='m'?r.d.slice(0,7):g==='d'?r.d:pad(r.h)+':00';

/* ===== Agrupaciones y ventana de detalle ===== */
function grp(rows,k){const m=new Map();rows.forEach(r=>{const x=k(r);let a=m.get(x);if(!a){a={k:x,c:0,s:0,g:0,t:0,n:0,i:0,o:0,cw:0,cr:0,d:new Set,m:new Set,p:new Set};m.set(x,a)}
 a.c+=r.c;a.s+=r.s;a.g+=r.g;a.t+=tok(r);a.n+=r.n;a.i+=r.i;a.o+=r.o;a.cw+=r.cw;a.cr+=r.cr;a.d.add(r.d);a.m.add(r.m);a.p.add(r.p)});return[...m.values()].sort((a,b)=>b.c-a.c)}
const tags=(set,f)=>[...set].slice(0,8).map(x=>`<span class="tg">${f?f(x):x}</span>`).join('')+(set.size>8?` <span class="tg">+${set.size-8}</span>`:'');
function openDetail(title,rows){
 if(!rows||!rows.length)return;
 const c=sum(rows,r=>r.c),t=sum(rows,tok),n=sum(rows,r=>r.n),days=new Set(rows.map(r=>r.d)),ds=[...days].sort(),
 P=grp(rows,r=>r.p),M=grp(rows,r=>r.m),D=grp(rows,r=>r.d).slice(0,8),C=grp(rows,r=>r.ct),
 H=grp(rows.filter(r=>r.ct!=='procesar'||r.sb),r=>r.ct+'|'+r.sb).sort((a,b)=>b.c-a.c).slice(0,10),
 K=(a,b,s)=>`<div class="kpi"><small>${a}</small><b>${b}</b><i>${s||''}</i></div>`;
 $('dtb').innerHTML=`<div class="dh"><div><small>Detalle</small><h2>${title}</h2></div><button class="ic" onclick="closeDt()" title="Cerrar (Esc)">✕</button></div>
 <div class="kpis dk">${K('Gasto',usd(c))}${K('Tokens',num(t),'↓'+num(sum(rows,r=>r.i))+' ↑'+num(sum(rows,r=>r.o))+' · caché '+num(sum(rows,r=>r.cw+r.cr)))}${K('Tiempo de uso',hrs(tm(rows)))}${K('Mensajes',num(n))}${K('Días',days.size,ds[0]+(ds.length>1?' → '+ds[ds.length-1]:''))}</div>
 <h4>Proyectos (${P.length})</h4><div class="scroll"><table><tr><th>Proyecto</th><th>Modelos usados</th><th>Tiempo</th><th>Tokens</th><th>Gasto</th></tr>${P.map(a=>`<tr><td>${a.k}</td><td>${tags(a.m,mn)}</td><td>${hrs(a.s)}</td><td>${num(a.t)}</td><td>${usd(a.c)}</td></tr>`).join('')}</table></div>
 <h4>Modelos (${M.length})</h4><div class="scroll"><table><tr><th>Modelo</th><th>Proyectos</th><th>Tiempo</th><th>Tokens</th><th>Gasto</th></tr>${M.map(a=>`<tr><td>${mn(a.k)}</td><td>${tags(a.p)}</td><td>${hrs(a.g)}</td><td>${num(a.t)}</td><td>${usd(a.c)}</td></tr>`).join('')}</table></div>
 ${C.length>1?`<h4>En qué se ha consumido</h4><div class="scroll"><table><tr><th>Categoría</th><th>Tiempo</th><th>Tokens</th><th>Gasto</th></tr>${C.map(a=>`<tr><td>${catn(a.k)}</td><td>${hrs(a.s)}</td><td>${num(a.t)}</td><td>${usd(a.c)}</td></tr>`).join('')}</table></div>`:''}
 ${H.length?`<h4>Skills, MCP, agentes y loops usados</h4><div class="scroll"><table><tr><th>Categoría</th><th>Nombre</th><th>Usos</th><th>Gasto</th></tr>${H.map(a=>{const[ct,sb]=a.k.split('|');return `<tr><td>${catn(ct)}</td><td>${sb||'<i>general</i>'}</td><td>${a.n}</td><td>${usd(a.c)}</td></tr>`}).join('')}</table></div>`:''}
 ${D.length>1?`<h4>Días con más gasto</h4><div class="scroll"><table><tr><th>Fecha</th><th>Tiempo</th><th>Tokens</th><th>Gasto</th></tr>${D.map(a=>`<tr><td>${a.k} ${DOW[wd(a.k)]}</td><td>${hrs(tm(rows.filter(r=>r.d===a.k)))}</td><td>${num(a.t)}</td><td>${usd(a.c)}</td></tr>`).join('')}</table></div>`:''}`;
 $('dt').classList.add('on')}
function closeDt(){$('dt').classList.remove('on')}

/* ===== Métricas y constructores de gráficos ===== */
const MET={c:{l:'Gasto',v:r=>r.c,f:v=>usd(v),y:v=>v+' '+SYM()},s:{l:'Tiempo',v:r=>r.s/3600,f:v=>hrs(v*3600),y:v=>v+' h'},t:{l:'Tokens',v:tok,f:num,y:num},n:{l:'Mensajes',v:r=>r.n,f:num,y:num}};
const MM=(k,byP)=>k==='s'?{...MET.s,v:r=>(byP||F.p?r.s:r.g)/3600}:MET[k];
const MALL=['c','s','t','n'];
const MODES={stack:'Apiladas',side:'Agrupadas',line:'Líneas',sep:'Separadas',donut:'Circular',bar:'Barras',col:'Columnas',gauge:'Medidor'};
function xl(rows,skip){const o=[];if(skip!=='c')o.push('Gasto: '+usd(sum(rows,r=>r.c)));if(skip!=='s')o.push('Tiempo: '+hrs(tm(rows)));if(skip!=='t')o.push('Tokens: '+num(sum(rows,tok)));if(skip!=='n')o.push('Mensajes: '+num(sum(rows,r=>r.n)));return o}
function descSplit(rows,split,M,lab){const tot={};rows.forEach(r=>{const k=split(r);tot[k]=(tot[k]||0)+M.v(r)});return Object.keys(tot).sort((a,b)=>tot[b]-tot[a]).map(k=>({id:k,label:lab?lab(k):k,color:col(k),pred:r=>split(r)===k,val:M.v}))}
const tokD=()=>[['Entrada','i',0],['Salida','o',1],['Caché escritura','cw',2],['Caché lectura','cr',4]].map(([l,k,c])=>({id:k,label:l,color:COL[c],pred:()=>true,val:r=>r[k]}));

function tsSpec(rows,mode,M,D,o){o=o||{};const g=o.g||gran(),xk=o.xk||(r=>grKey(r,g));let L;
 if(o.order)L=o.order.slice();else{L=[...new Set(rows.map(xk))];if(o.sortX){const t={};rows.forEach(r=>{const k=xk(r);t[k]=(t[k]||0)+M.v(r)});L.sort((a,b)=>t[b]-t[a])}else L.sort()}
 if(o.maxX)L=L.slice(0,o.maxX);const idx=new Map(L.map((l,i)=>[l,i])),xlab=o.xlab||(x=>x);
 const data=D.map(d=>{const a=new Array(L.length).fill(0);rows.forEach(r=>{if(d.pred(r)){const i=idx.get(xk(r));if(i!==undefined)a[i]+=d.val(r)}});return a.map(v=>+v.toFixed(4))});
 const sub=(d,i)=>rows.filter(r=>xk(r)===L[i]&&d.pred(r)),pick=(di,i)=>({title:D[di].label+' · '+xlab(L[i]),rows:sub(D[di],i)});
 if(mode==='sep')return{multi:D.slice(0,12).map((d,k)=>({label:d.label,color:d.color,type:'bar',data:{labels:L.map(xlab),datasets:[{label:d.label,data:data[k],backgroundColor:d.color,borderRadius:3}]},
  options:{plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>M.f(c.parsed.y),afterLabel:c=>xl(sub(d,c.dataIndex),o.skip||'')}}},scales:{x:{ticks:{maxTicksLimit:6}},y:{beginAtZero:true,ticks:{callback:M.y,maxTicksLimit:5}}}},
  pick:(di,i)=>({title:d.label+' · '+xlab(L[i]),rows:sub(d,i)})}))};
 const ds=D.map((d,k)=>mode==='line'?{label:d.label,data:data[k],borderColor:d.color,backgroundColor:al(d.color,.15),tension:.25,pointRadius:3,pointHoverRadius:6,fill:false}:{label:d.label,data:data[k],backgroundColor:d.color,borderRadius:3,stack:mode==='stack'?'a':undefined});
 const cb={label:c=>c.dataset.label+': '+M.f(c.parsed.y),afterLabel:c=>xl(sub(D[c.datasetIndex],c.dataIndex),o.skip||'')};
 if(mode==='stack')cb.footer=it=>'Total: '+M.f(it.reduce((a,x)=>a+x.parsed.y,0));
 const sc=mode==='stack'?{x:{stacked:true},y:{stacked:true,ticks:{callback:M.y}}}:{y:{beginAtZero:true,ticks:{callback:M.y}}};
 return{type:mode==='line'?'line':'bar',data:{labels:L.map(xlab),datasets:ds},options:{interaction:mode==='line'?{mode:'nearest',intersect:false}:{mode:'nearest',intersect:true},plugins:{legend:{position:'bottom',labels:{boxWidth:10}},tooltip:{callbacks:cb}},scales:sc},pick}}

function distSpec(rows,mode,metric,key,lab,byP){const G=grp(rows,key),M=MET[metric],val=a=>metric==='c'?a.c:metric==='s'?(byP||F.p?a.s:a.g)/3600:metric==='t'?a.t:a.n;
 G.sort((a,b)=>val(b)-val(a));const Gs=G.slice(0,mode==='donut'?12:20),labs=Gs.map(a=>lab?lab(a.k):a.k),vals=Gs.map(a=>+val(a).toFixed(4)),tot=vals.reduce((a,b)=>a+b,0)||1,cols=Gs.map(a=>col(a.k)),
 sub=i=>rows.filter(r=>key(r)===Gs[i].k),pick=(di,i)=>({title:labs[i],rows:sub(i)}),
 tip={callbacks:{label:c=>{const v=mode==='donut'?c.parsed:mode==='bar'?c.parsed.x:c.parsed.y;return labs[c.dataIndex]+': '+M.f(v)+' ('+Math.round(100*v/tot)+'%)'},afterLabel:c=>xl(sub(c.dataIndex),metric)}};
 if(mode==='donut')return{type:'doughnut',data:{labels:labs,datasets:[{data:vals,backgroundColor:cols,borderWidth:0}]},options:{cutout:'60%',plugins:{legend:{position:'right',labels:{boxWidth:10}},tooltip:tip}},pick};
 const hz=mode==='bar',ax={beginAtZero:true,ticks:{callback:M.y}};
 return{type:'bar',data:{labels:labs,datasets:[{data:vals,backgroundColor:cols,borderRadius:5}]},options:{indexAxis:hz?'y':'x',plugins:{legend:{display:false},tooltip:tip},scales:hz?{x:ax}:{y:ax}},pick}}

function simpleSpec(rows,mode,o){const g=o.g||gran(),xk=o.xk||(r=>grKey(r,g)),by={};rows.forEach(r=>{(by[xk(r)]=by[xk(r)]||[]).push(r)});
 const L=o.order?(typeof o.order==='function'?o.order(by):o.order):Object.keys(by).sort(),data=L.map(l=>+o.fy(by[l]||[]).toFixed(4)),color=o.color||COL[0],hz=mode==='bar',ln=mode==='line',ax={beginAtZero:true,ticks:{callback:o.y}};if(o.max)ax.max=o.max;
 return{type:ln?'line':'bar',data:{labels:L.map(o.lab||(x=>x)),datasets:[{label:o.label,data,borderColor:color,backgroundColor:ln?al(color,.15):color,fill:ln,tension:.3,pointRadius:3,borderRadius:4}]},
 options:{indexAxis:hz?'y':'x',interaction:ln?{mode:'nearest',intersect:false}:{mode:'nearest',intersect:true},plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>o.label+': '+o.f(hz?c.parsed.x:c.parsed.y),afterLabel:c=>xl(by[L[c.dataIndex]]||[],o.skip||'')}}},scales:hz?{x:ax}:{y:ax}},
 pick:(di,i)=>({title:(o.tlab||o.lab||(x=>x))(L[i]),rows:by[L[i]]||[]})}}

/* ===== Marco de gráficos: modos, métricas, clic ===== */
const CH={};
function def(o){o.mode=o.modes?o.modes[0]:'';o.metric=o.metrics?(o.m0||o.metrics[0]):'';CH[o.id]=o;return o}
const ctlHtml=d=>(d.extra?d.extra(d):'')+(d.metrics?`<div class="seg">${d.metrics.map(k=>`<button class="${d.metric===k?'on':''}" onclick="setMetric('${d.id}','${k}')">${MET[k].l}</button>`).join('')}</div>`:'')+(d.modes&&d.modes.length>1?`<div class="seg">${d.modes.map(m=>`<button class="${d.mode===m?'on':''}" onclick="setMode('${d.id}','${m}')">${MODES[m]}</button>`).join('')}</div>`:'');
const boxHtml=id=>{const d=CH[id];return `<div class="box ${d.w2?'w2':''}"><div class="bh"><h3>${d.title}</h3><div class="ctl" id="ctl_${id}"></div></div><div class="cv ${d.tall?'t':''}" id="w_${id}"></div></div>`};
const setMode=(id,m)=>{CH[id].mode=m;drawOne(id)},setMetric=(id,k)=>{CH[id].metric=k;drawOne(id)};
function destroyCh(id){Object.keys(charts).filter(k=>k==='cv_'+id||k.startsWith('cv_'+id+'_')).forEach(k=>{try{charts[k].destroy()}catch(e){}delete charts[k]})}
function destroyPref(p){Object.keys(charts).filter(k=>k.startsWith(p)).forEach(k=>{try{charts[k].destroy()}catch(e){}delete charts[k]})}
function mkc(cid,spec){if(charts[cid])charts[cid].destroy();const o=spec.options=spec.options||{};o.responsive=true;o.maintainAspectRatio=false;
 o.onClick=(e,els)=>{if(!els.length||!spec.pick)return;const p=spec.pick(els[0].datasetIndex,els[0].index);if(p&&p.rows&&p.rows.length)openDetail(p.title,p.rows)};
 o.onHover=(e,els)=>{if(e.native&&e.native.target)e.native.target.style.cursor=els.length?'pointer':'default'};
 charts[cid]=new Chart($(cid),{type:spec.type,data:spec.data,options:o})}
function drawOne(id){const d=CH[id],w=$('w_'+id);if(!w)return;destroyCh(id);$('ctl_'+id).innerHTML=ctlHtml(d);
 const rows=d.src?d.src():CUR.rows;if(!rows.length){w.className='cv';w.innerHTML='<div class="empty">Sin datos</div>';return}
 const spec=d.build(rows,d.mode,d.metric);
 if(spec.multi){w.className='cv multi';w.innerHTML='<div class="sepgrid">'+spec.multi.map((s,i)=>`<div class="sepc"><h5><i style="background:${s.color}"></i>${s.label}</h5><div class="cv2"><canvas id="cv_${id}_${i}"></canvas></div></div>`).join('')+'</div>';spec.multi.forEach((s,i)=>mkc(`cv_${id}_${i}`,s))}
 else{w.className='cv '+(d.tall?'t':'');w.innerHTML=`<canvas id="cv_${id}"></canvas>`;mkc('cv_'+id,spec)}}

/* ===== Datos del mes (presupuesto) ===== */
const curYm=()=>{const n=new Date();return n.getFullYear()+'-'+pad(n.getMonth()+1)};
const monthName=ym=>{const p=ym.split('-'),n=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][+p[1]-1];return n+' '+p[0]};
function mesDe(ym){const p=ym.split('-').map(Number),Y=p[0],Mo=p[1],dim=new Date(Y,Mo,0).getDate(),n=new Date(),cur=curYm(),dn=ym===cur?n.getDate():(ym<cur?dim:0),rs=RAW.filter(r=>r.d.startsWith(ym)),tot=sum(rs,r=>r.c),
 pm=new Date(Y,Mo-2,1),pym=pm.getFullYear()+'-'+pad(pm.getMonth()+1),prev=sum(RAW.filter(r=>r.d.startsWith(pym)&&+r.d.slice(8)<=Math.max(dn,1)),r=>r.c),rate=dn?tot/dn:0;
 return{prev,ym,dim,dn,rs,tot,pct:CFG.lim?tot/CFG.lim*100:0,rest:Math.max(CFG.lim-tot,0),rate,proy:rate*dim,cur:ym===cur}}
let BM='',GM='';
const mes=()=>mesDe(BM||curYm());
const monthList=()=>[...new Set([...RAW.map(r=>r.d.slice(0,7)),curYm()])].sort();
function initMonths(){const L=monthList(),dm=[...new Set(RAW.map(r=>r.d.slice(0,7)))].sort(),cur=curYm(),d=dm.includes(cur)?cur:(dm[dm.length-1]||cur);if(!BM||!L.includes(BM))BM=d;if(!GM||!L.includes(GM))GM=d}
function budget(){const m=mesDe(curYm()),real=PLAN.pct!=null,pct=real?PLAN.pct:m.pct,cl=pct>90?'bad':pct>70?'warn':'';
 $('bud').innerHTML=`${real?'Uso del plan (Claude Code)':'Presupuesto del mes'}<b>${pct.toFixed(0)}%</b><div class="bar"><i class="${cl}" style="width:${Math.min(pct,100)}%"></i></div><div style="margin-top:6px">Gasto estimado: <b>${usd(m.tot)}</b> / ${usd(CFG.lim)}</div>`}
function budgetBar(){const m=mes(),real=PLAN.pct!=null,pct=real?PLAN.pct:m.pct,cl=pct>90?'bad':pct>70?'warn':'ok',over=m.cur&&CFG.lim>0&&m.proy>CFG.lim,L=monthList().reverse();
 $('bgt').innerHTML=`<div class="bgt-h"><div><small>${real?'Uso del plan (Claude Code)':'Presupuesto del mes'}</small><b>${pct.toFixed(0)}% <span>${real?'de uso del periodo'+(PLAN.fecha?' · act. '+PLAN.fecha:''):'de '+usd(CFG.lim)}</span></b></div><select class="msel" onchange="setBM(this.value)" title="Elegir mes">${L.map(x=>`<option value="${x}" ${x===m.ym?'selected':''}>${monthName(x)}</option>`).join('')}</select></div>
 <div class="bgt-bar"><i class="${cl}" style="width:${Math.min(pct,100)}%"></i>${m.cur&&CFG.lim?`<u style="left:${Math.min(100*m.proy/CFG.lim,100)}%" title="Proyección a fin de mes"></u>`:''}</div>
 <div class="bgt-f"><span>Presupuesto estimado: <b>${usd(m.tot)}</b> de ${usd(CFG.lim)}</span><span>Quedan <b>${usd(m.rest)}</b></span>${m.cur?`<span>Proyección fin de mes <b class="${over?'bad':''}">${usd(m.proy)}</b></span><span>Ritmo <b>${usd(m.rate)}</b> / día</span>`:`<span>Media diaria <b>${usd(m.tot/m.dim)}</b></span>`}${m.pct>100?`<span class="bad">Superado en <b>${usd(m.tot-CFG.lim)}</b></span>`:''}</div>`}
function setBM(v){BM=v;budgetBar();if(TAB==='consumo')DRAW.consumo(CUR.rows)}
function setGM(v){GM=v;drawOne('gMes')}
function setGr(id,v){CH[id].gr=v;drawOne(id)}

/* ===== Definición de todos los gráficos ===== */
const tsBy=(split,byP,lab,o)=>(rows,mode,k)=>{const M=MM(k,byP);return tsSpec(rows,mode,M,descSplit(rows,split,M,lab),Object.assign({skip:k},o))};
const HOURS=[...Array(24).keys()].map(h=>pad(h)+'h');
// General
def({id:'wk',title:'Uso por día de la semana y proyecto',w2:1,tall:1,modes:['side','line','stack','sep'],metrics:MALL,m0:'s',build:tsBy(r=>r.p,true,null,{xk:r=>DOW[wd(r.d)],order:DOW})});
def({id:'gM',title:'Evolución por modelo',w2:1,modes:['sep','stack','side','line'],metrics:MALL,m0:'c',build:tsBy(r=>r.m,false,mn)});
def({id:'gP',title:'Evolución por proyecto',w2:1,modes:['stack','side','line','sep'],metrics:MALL,m0:'s',build:tsBy(r=>r.p,true)});
def({id:'dM',title:'Reparto por modelo',modes:['donut','bar','col'],metrics:MALL,build:(rows,mode,k)=>distSpec(rows,mode,k,r=>r.m,mn,false)});
def({id:'dP',title:'Reparto por proyecto',modes:['donut','bar','col'],metrics:MALL,build:(rows,mode,k)=>distSpec(rows,mode,k,r=>r.p,null,true)});
def({id:'gTok',title:'Tokens por tipo en el tiempo',modes:['stack','side','line','sep'],build:(rows,mode)=>tsSpec(rows,mode,MET.t,tokD(),{skip:'t'})});
def({id:'gHd',title:'Tiempo de uso en el periodo',modes:['col','line'],build:(rows,mode)=>simpleSpec(rows,mode,{label:'Tiempo',fy:rs=>(F.p?sum(rs,r=>r.s):sum(rs,r=>r.g))/3600,f:v=>hrs(v*3600),y:v=>v+' h',color:COL[1],skip:'s'})});
def({id:'dCat',title:'En qué se ha consumido (categoría)',modes:['donut','bar','col'],metrics:MALL,build:(rows,mode,k)=>distSpec(rows,mode,k,r=>r.ct,catn,false)});
def({id:'gCat',title:'Evolución por categoría de consumo',w2:1,modes:['sep','stack','side','line'],metrics:MALL,m0:'t',build:tsBy(r=>r.ct,false,catn)});
// Modelos
def({id:'mSum',title:'Resumen por modelo',w2:1,modes:['donut','bar','col'],metrics:MALL,build:(rows,mode,k)=>distSpec(rows,mode,k,r=>r.m,mn,false)});
def({id:'mTs',title:'Evolución por modelo',w2:1,modes:['stack','side','line','sep'],metrics:MALL,m0:'c',build:tsBy(r=>r.m,false,mn)});
def({id:'mCross',title:'Proyectos en los que se usa cada modelo',modes:['stack','side','sep'],metrics:MALL,build:(rows,mode,k)=>{const M=MM(k,false);return tsSpec(rows,mode,M,descSplit(rows,r=>r.p,M),{xk:r=>r.m,sortX:1,xlab:mn,skip:k})}});
def({id:'mTok',title:'Tokens por tipo y modelo',modes:['stack','side','sep'],build:(rows,mode)=>tsSpec(rows,mode,MET.t,tokD(),{xk:r=>r.m,sortX:1,xlab:mn,skip:'t'})});
def({id:'mCat',title:'En qué se ha consumido cada modelo',modes:['stack','side','sep'],metrics:MALL,build:(rows,mode,k)=>{const M=MM(k,false);return tsSpec(rows,mode,M,descSplit(rows,r=>r.ct,M,catn),{xk:r=>r.m,sortX:1,xlab:mn,skip:k})}});
// Proyectos
def({id:'pSum',title:'Resumen por proyecto',w2:1,modes:['donut','bar','col'],metrics:MALL,build:(rows,mode,k)=>distSpec(rows,mode,k,r=>r.p,null,true)});
def({id:'pTs',title:'Evolución por proyecto',w2:1,modes:['stack','side','line','sep'],metrics:MALL,build:tsBy(r=>r.p,true)});
def({id:'pCross',title:'Modelos usados en cada proyecto',modes:['stack','side','sep'],metrics:MALL,build:(rows,mode,k)=>{const M=MM(k,true);return tsSpec(rows,mode,M,descSplit(rows,r=>r.m,M,mn),{xk:r=>r.p,sortX:1,skip:k})}});
def({id:'pTok',title:'Tokens por tipo y proyecto',modes:['stack','side','sep'],build:(rows,mode)=>tsSpec(rows,mode,MET.t,tokD(),{xk:r=>r.p,sortX:1,skip:'t'})});
def({id:'pCat',title:'En qué se ha consumido cada proyecto',modes:['stack','side','sep'],metrics:MALL,build:(rows,mode,k)=>{const M=MM(k,true);return tsSpec(rows,mode,M,descSplit(rows,r=>r.ct,M,catn),{xk:r=>r.p,sortX:1,skip:k})}});
// Consumo
def({id:'cGauge',title:'Presupuesto del mes',modes:['gauge','bar'],src:()=>RAW,build:(rows,mode)=>{const m=mes(),c=m.pct>90?'#e03131':m.pct>70?'#f59f00':COL[0],pick=()=>({title:'Mes '+m.ym,rows:m.rs});
 if(mode==='bar')return{type:'bar',data:{labels:['Consumido','Proyección','Presupuesto'],datasets:[{data:[m.tot,m.proy,CFG.lim].map(v=>+v.toFixed(2)),backgroundColor:[c,al(COL[2],.8),'rgba(148,163,184,.5)'],borderRadius:6}]},options:{plugins:{legend:{display:false},tooltip:{callbacks:{label:x=>usd(x.parsed.y)}}},scales:{y:{beginAtZero:true,ticks:{callback:v=>v+' '+SYM()}}}},pick};
 return{type:'doughnut',data:{labels:['Consumido','Disponible'],datasets:[{data:[+m.tot.toFixed(2),+m.rest.toFixed(2)],backgroundColor:[c,'rgba(148,163,184,.25)'],borderWidth:0}]},options:{cutout:'72%',circumference:240,rotation:-120,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:x=>x.label+': '+usd(x.parsed)}}}},pick}}});
def({id:'cProj',title:'Consumo del mes por proyecto',modes:['bar','donut','col'],metrics:MALL,src:()=>mes().rs,build:(rows,mode,k)=>distSpec(rows,mode,k,r=>r.p,null,true)});
def({id:'cAcum',title:'Acumulado vs ritmo de presupuesto y proyección',w2:1,tall:1,src:()=>RAW,build:()=>{const m=mes(),D=[...Array(m.dim).keys()].map(i=>i+1),by={};m.rs.forEach(r=>{const d=+r.d.slice(8);by[d]=(by[d]||0)+r.c});let c=0;
 const real=D.map(d=>{c+=by[d]||0;return d<=m.dn?+c.toFixed(2):null}),proy=D.map(d=>d>=m.dn?+(m.rate*d).toFixed(2):null),ideal=D.map(d=>+(CFG.lim*d/m.dim).toFixed(2));
 return{type:'line',data:{labels:D,datasets:[{label:'Real',data:real,borderColor:COL[0],backgroundColor:al(COL[0],.15),fill:true,tension:.25,pointRadius:3},{label:'Proyección',data:proy,borderColor:COL[2],borderDash:[6,4],pointRadius:0},{label:'Ritmo de presupuesto',data:ideal,borderColor:'#94a3b8',borderDash:[2,4],pointRadius:0}]},
 options:{interaction:{mode:'nearest',intersect:false},plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:x=>x.dataset.label+': '+usd(x.parsed.y)}}},scales:{y:{ticks:{callback:v=>v+' '+SYM()}}}},pick:(di,i)=>({title:'Día '+(i+1)+' · '+m.ym,rows:m.rs.filter(r=>+r.d.slice(8)===i+1)})}}});
def({id:'cDaily',title:'Consumo diario del mes por modelo',w2:1,modes:['stack','side','line','sep'],metrics:MALL,src:()=>mes().rs,build:(rows,mode,k)=>{const M=MM(k,false);return tsSpec(rows,mode,M,descSplit(rows,r=>r.m,M,mn),{g:'d',skip:k})}});
def({id:'cModel',title:'Consumo del mes por modelo',modes:['donut','bar','col'],metrics:MALL,src:()=>mes().rs,build:(rows,mode,k)=>distSpec(rows,mode,k,r=>r.m,mn,false)});
// Eficiencia
def({id:'eTipo',title:'Resumen: coste por tipo de token',modes:['donut','bar'],build:(rows,mode)=>{const S=k=>fm1(rows,k),vals=[S('ki'),S('ko'),S('kw'),S('kr')].map(v=>+v.toFixed(2)),labs=['Entrada','Salida','Caché escritura','Caché lectura'],cols=[COL[0],COL[1],COL[2],COL[4]],pick=(di,i)=>({title:'Coste de '+labs[i].toLowerCase(),rows}),tip={callbacks:{label:c=>labs[c.dataIndex]+': '+usd(mode==='donut'?c.parsed:c.parsed.x)}};
 return mode==='donut'?{type:'doughnut',data:{labels:labs,datasets:[{data:vals,backgroundColor:cols,borderWidth:0}]},options:{cutout:'60%',plugins:{legend:{position:'right',labels:{boxWidth:10}},tooltip:tip}},pick}:{type:'bar',data:{labels:labs,datasets:[{data:vals,backgroundColor:cols,borderRadius:5}]},options:{indexAxis:'y',plugins:{legend:{display:false},tooltip:tip},scales:{x:{beginAtZero:true,ticks:{callback:v=>v+' '+SYM()}}}},pick}}});
def({id:'eCache',title:'Eficiencia de caché (% de lecturas)',modes:['line','col'],build:(rows,mode)=>simpleSpec(rows,mode,{label:'% caché',max:100,color:COL[4],fy:rs=>{const d=sum(rs,r=>r.cr+r.cw+r.i);return d?100*sum(rs,r=>r.cr)/d:0},f:v=>v.toFixed(1)+'%',y:v=>v+'%',skip:'t'})});
def({id:'eCpm',title:'Coste medio por mensaje',modes:['line','col'],build:(rows,mode)=>simpleSpec(rows,mode,{label:'Coste/mensaje',color:COL[3],fy:rs=>{const n=sum(rs,r=>r.n);return n?sum(rs,r=>r.c)/n:0},f:usd,y:v=>v+' '+SYM(),skip:'c'})});
def({id:'eMod',title:'Coste por mensaje y modelo',modes:['col','bar'],build:(rows,mode)=>simpleSpec(rows,mode,{xk:r=>r.m,order:by=>Object.keys(by).sort((a,b)=>sum(by[b],r=>r.c)-sum(by[a],r=>r.c)),lab:mn,label:'Coste/mensaje',color:COL[5],fy:rs=>{const n=sum(rs,r=>r.n);return n?sum(rs,r=>r.c)/n:0},f:usd,y:v=>v+' '+SYM(),skip:'c'})});
def({id:'ePar',title:'Pareto de proyectos · gasto acumulado',w2:1,tall:1,build:rows=>{const G=grp(rows,r=>r.p).slice(0,15),tot=sum(rows,r=>r.c)||1;let a=0;const pc=G.map(x=>{a+=x.c;return +(100*a/tot).toFixed(1)});
 return{type:'bar',data:{labels:G.map(x=>x.k),datasets:[{type:'line',label:'% acumulado',yAxisID:'y1',data:pc,borderColor:COL[2],pointRadius:4,tension:.2},{label:'Gasto',data:G.map(x=>+x.c.toFixed(2)),backgroundColor:G.map(x=>col(x.k)),borderRadius:5}]},options:{plugins:{legend:{position:'bottom'}},scales:{y:{ticks:{callback:v=>v+' '+SYM()}},y1:{position:'right',min:0,max:100,grid:{drawOnChartArea:false},ticks:{callback:v=>v+'%'}}}},pick:(di,i)=>({title:G[i].k,rows:rows.filter(r=>r.p===G[i].k)})}}});
def({id:'eTop',title:'Top 10 días con más gasto',w2:1,modes:['col','bar'],build:(rows,mode)=>simpleSpec(rows,mode,{xk:r=>r.d,order:by=>Object.keys(by).sort((a,b)=>sum(by[b],r=>r.c)-sum(by[a],r=>r.c)).slice(0,10),label:'Gasto',color:COL[5],fy:rs=>sum(rs,r=>r.c),f:usd,y:v=>v+' '+SYM(),skip:'c'})});
// Matrices y tiempo
def({id:'xSum',title:'Resumen: evolución por modelo',w2:1,modes:['stack','side','line','sep'],metrics:MALL,build:tsBy(r=>r.m,false,mn)});
const catDef=(id,title,xk,order,m0,modes)=>def({id,title,modes:modes||['col','line'],metrics:MALL,m0,build:(rows,mode,k)=>{const M=MM(k,false);return simpleSpec(rows,mode,{xk,order,label:M.l,color:COL[k==='s'?1:k==='t'?4:0],fy:rs=>sum(rs,M.v),f:M.f,y:M.y,skip:k})}});
catDef('tHour','Resumen: actividad por hora del día',r=>pad(r.h)+'h',HOURS,'c');
catDef('tWeek','Actividad por día de la semana',r=>DOW[wd(r.d)],DOW,'c');
catDef('tMonth','Actividad por mes',r=>r.d.slice(0,7),null,'s');
def({id:'tAct',title:'Minutos activos por hora del día',modes:['line','col'],build:(rows,mode)=>simpleSpec(rows,mode,{xk:r=>pad(r.h)+'h',order:HOURS,label:'Minutos',color:COL[3],fy:rs=>(F.p?sum(rs,r=>r.s):sum(rs,r=>r.g))/60,f:v=>Math.round(v)+' min',y:v=>v+' min',skip:'s'})});

def({id:'gMes',title:'Consumo del mes por día',w2:1,modes:['line','col'],metrics:['c','t'],src:()=>RAW.filter(r=>r.d.startsWith(GM)&&(!F.mo||r.m===F.mo)&&(!F.p||r.p===F.p)),
 extra:()=>`<select class="msel" onchange="setGM(this.value)" title="Elegir mes">${monthList().reverse().map(x=>`<option value="${x}" ${x===GM?'selected':''}>${monthName(x)}</option>`).join('')}</select>`,
 build:(rows,mode,k)=>{const M=MM(k,false),p=GM.split('-').map(Number),dim=new Date(p[0],p[1],0).getDate(),days=[...Array(dim).keys()].map(i=>GM+'-'+pad(i+1));
  return simpleSpec(rows,mode,{xk:r=>r.d,order:days,lab:d=>d.slice(8),tlab:fdia,label:M.l,color:k==='t'?COL[4]:COL[0],fy:rs=>sum(rs,M.v),f:M.f,y:M.y,skip:k})}});
def({id:'cEvo',title:'Evolución del consumo por meses / años',w2:1,tall:1,modes:['col','line','stack'],metrics:MALL,gr:'m',src:()=>RAW.filter(r=>(!F.mo||r.m===F.mo)&&(!F.p||r.p===F.p)),
 extra:d=>`<div class="seg">${[['m','Meses'],['y','Años']].map(x=>`<button class="${d.gr===x[0]?'on':''}" onclick="setGr('cEvo','${x[0]}')">${x[1]}</button>`).join('')}</div>`,
 build:(rows,mode,k)=>{const y=CH.cEvo.gr==='y',xk=r=>y?r.d.slice(0,4):r.d.slice(0,7),ks=[...new Set(rows.map(xk))].sort();let L=ks;
  if(!y&&ks.length){const out=[];let Y=+ks[0].slice(0,4),Mo=+ks[0].slice(5);for(;;){const m=Y+'-'+pad(Mo);out.push(m);if(m>=ks[ks.length-1])break;Mo++;if(Mo>12){Mo=1;Y++}}L=out}
  const M=MM(k,false);return mode==='stack'?tsSpec(rows,'stack',M,descSplit(rows,r=>r.m,M,mn),{xk,order:L,skip:k}):simpleSpec(rows,mode,{xk,order:L,label:M.l,color:COL[k==='s'?1:k==='t'?4:0],fy:rs=>sum(rs,M.v),f:M.f,y:M.y,skip:k})}});

/* ===== KPIs, insights, calendario, matrices, fichas ===== */
const K=(a,b,c,k='')=>`<div class="kpi ${k}"><small>${a}</small><b>${b}</b><i>${c||''}</i></div>`;
function kpis(rows){const t=grp(rows,()=>1)[0]||{c:0,t:0,i:0,o:0,cw:0,cr:0,n:0,d:new Set},secs=tm(rows),dias=t.d.size,md=F.m?new Date(+F.m.slice(0,4),+F.m.slice(5),0).getDate():null,
 cache=(t.cr+t.cw+t.i)?Math.round(100*t.cr/(t.cr+t.cw+t.i)):0,np=new Set(rows.map(r=>r.p)).size,nm=new Set(rows.map(r=>r.m)).size,
 byD=grp(rows,r=>r.d),dvv=a=>a.p.size===1?a.s:a.g,pk=f=>{let b=null,bv=-1;byD.forEach(a=>{const v=f(a);if(v>bv){bv=v;b=a}});return b?{d:b.k,v:bv}:null},
 pl=(p,f,l)=>p?`<br>${l}: <b>${fdia(p.d)}</b> (${f(p.v)})`:'',W=grp(rows,r=>wd(r.d)).sort((a,b)=>dvv(b)-dvv(a))[0];
 $('kg').innerHTML=K('Gasto estimado',usd(t.c),(dias?usd(t.c/dias)+' / día activo':'')+pl(pk(a=>a.c),usd,'Más gasto'))+K('Tokens totales',num(t.t),`↓${num(t.i)} ↑${num(t.o)} · caché ${cache}%`+pl(pk(a=>a.t),num,'Más tokens'))+
 K('Horas de uso',hrs(secs),(F.p?'tiempo del proyecto':'tiempo activo real')+pl(pk(dvv),v=>hrs(v),'Día de más uso'))+K('Días activos',dias,(md?`de ${md} días del mes`:'en el filtro')+(W?`<br>Semana: <b>${DOWL[W.k]}</b> más activo`:''))+
 K('Mensajes',num(t.n),(t.n&&dias?Math.round(t.n/dias)+' / día':'')+pl(pk(a=>a.n),num,'Más mensajes'))+K('Proyectos',np,'activos')+K('Modelos',nm,'usados')+K('Coste / hora',secs>60?usd(t.c/(secs/3600)):'-','medio')+K('Tiempo razonando',hrs(sum(rows,r=>r.rz||0)),'thinking / extended reasoning')}
function insights(rows){const el=$('ins');if(!rows.length){el.innerHTML='';return}
 const t=grp(rows,()=>1)[0],b=m=>grp(rows,m)[0],pc=(a,c)=>c?Math.round(100*a/c)+'% del gasto':'',
 H=grp(rows,r=>r.h).sort((x,y)=>y.c-x.c)[0],W=grp(rows,r=>wd(r.d))[0],D=b(r=>r.d),P=b(r=>r.p),M=b(r=>r.m),
 ahorro=fm1(rows,'kr')*9-fm1(rows,'kw')*0.2,days=[...new Set(RAW.map(r=>r.d))].sort();let racha=days.length?1:0;
 for(let i=days.length-1;i>0;i--){const a=new Date(days[i]+'T12:00:00'),c=new Date(days[i-1]+'T12:00:00');if(Math.round((a-c)/864e5)===1)racha++;else break}
 const m=mesDe(curYm()),dv=m.prev>0?(m.tot-m.prev)/m.prev*100:null,hh=n=>pad(n)+':00',C=(c,a,v,d)=>`<div class="ins"><span class="dot" style="background:${c}"></span><div><small>${a}</small><b>${v}</b><i>${d}</i></div></div>`;
 el.innerHTML=C(COL[0],'Hora pico',hh(H.k)+' – '+hh((+H.k+1)%24),pc(H.c,t.c))+C(COL[1],'Día más activo',DOWL[W.k],pc(W.c,t.c))+C(COL[2],'Proyecto líder',P.k,pc(P.c,t.c)+' · '+usd(P.c))+C(COL[3],'Modelo dominante',mn(M.k),pc(M.c,t.c)+' · '+usd(M.c))+
 C(COL[5],'Día más caro',D.k,usd(D.c))+C(COL[4],'Racha de uso',racha+(racha==1?' día':' días')+' seguidos','hasta el último día con actividad')+C('#12b886','Ahorro neto por caché',usd(ahorro),'frente a pagar todo como entrada')+C(dv>0?'#e03131':'#12b886','Vs mes anterior',dv===null?'—':(dv>0?'▲ ':'▼ ')+Math.abs(dv).toFixed(0)+'%','mismo periodo del mes anterior')}
function consumoKpis(){const m=mes(),over=m.proy>CFG.lim&&CFG.lim>0,left=m.dim-m.dn;let agota='No se agota este mes';if(m.rate>0&&over){const d=Math.ceil(CFG.lim/m.rate);if(d<=m.dim)agota='Día '+d+' del mes'}
 $('kc').innerHTML=K('Consumido en el mes',usd(m.tot),m.pct.toFixed(1)+'% del presupuesto',m.pct>90?'bad':m.pct>70?'warn':'ok')+K('Presupuesto',usd(CFG.lim),CFG.cur)+K('Disponible',usd(m.rest),m.cur?(left>0?usd(m.rest/left)+' / día restante':'último día'):'mes cerrado')+K('Proyección fin de mes',usd(m.proy),over?'Supera el presupuesto':'Dentro del presupuesto',over?'bad':'ok')+K('Ritmo diario',usd(m.rate),'media del mes')+K('Agotamiento estimado',agota,'al ritmo actual',over?'warn':'')+(m.prev>0?K('Vs mes anterior',(m.tot>=m.prev?'▲ ':'▼ ')+Math.abs((m.tot-m.prev)/m.prev*100).toFixed(0)+'%','mismo periodo: '+usd(m.prev),m.tot>m.prev?'warn':'ok'):'')}
function eficienciaKpis(rows){const t=grp(rows,()=>1)[0]||{c:0,t:0,i:0,o:0,cw:0,cr:0,n:0},ahorro=fm1(rows,'kr')*9-fm1(rows,'kw')*0.2,hit=(t.cr+t.cw+t.i)?100*t.cr/(t.cr+t.cw+t.i):0,secs=tm(rows);
 $('ke').innerHTML=K('Ahorro neto por caché',usd(ahorro),'sin caché costaría '+usd(t.c+ahorro),'ok')+K('Eficiencia de caché',hit.toFixed(1)+'%','tokens leídos desde caché',hit>70?'ok':'warn')+K('Coste por mensaje',usd(t.n?t.c/t.n:0),t.n+' mensajes')+K('Coste por 1M tokens',usd(t.t?t.c/t.t*1e6:0),'mezcla de todos los tipos')+K('Salida por mensaje',num(t.n?t.o/t.n:0),'tokens generados')+K('Mensajes por hora',secs>60?(t.n/(secs/3600)).toFixed(0):'-','ritmo de trabajo activo')}
function calendar(rows){const el=$('cal'),by={};rows.forEach(r=>by[r.d]=(by[r.d]||0)+r.c);const ds=Object.keys(by).sort();if(!ds.length){el.innerHTML='<div class="empty">Sin datos</div>';return}
 const end=new Date(ds[ds.length-1]+'T12:00:00'),st=new Date(end);st.setDate(end.getDate()-((end.getDay()+6)%7)-25*7);const max=Math.max(...Object.values(by)),iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
 let h='<div class="cal">';for(let w=0;w<26;w++){h+='<div class="calw">';for(let d=0;d<7;d++){const dt=new Date(st);dt.setDate(st.getDate()+w*7+d);const k=iso(dt),v=by[k]||0;h+=`<i ${v?`data-hm="1" data-d="${k}"`:''} title="${k} · ${usd(v)}" style="${dt>end?'visibility:hidden':v?`background:rgba(var(--acrgb),${(.2+.8*v/max).toFixed(2)})`:''}"></i>`}h+='</div>'}
 el.innerHTML=h+'</div><div class="callegend">Menos '+[.2,.4,.6,.8,1].map(a=>`<i style="background:rgba(var(--acrgb),${a})"></i>`).join('')+' Más · cada columna es una semana (lunes a domingo)</div>'}
const MXR={};
function mtx(el,R,C,pred,vf,f){MXR[el]={R,C,pred};const rows=CUR.rows;let max=0;const V=R.map(r=>C.map(c=>{const v=rows.reduce((s,x)=>pred(x,r[0],c[0])?s+vf(x):s,0);if(v>max)max=v;return v}));
 let h=`<table class="mx"><tr><th>&nbsp;</th>${C.map(c=>`<th>${c[1]}</th>`).join('')}<th>Total</th></tr>`;
 R.forEach((r,i)=>{h+=`<tr><td>${r[1]}</td>${V[i].map((v,j)=>`<td ${v?`class="ck" data-mx="${el}" data-i="${i}" data-j="${j}"`:''} style="background:${v?`rgba(var(--acrgb),${(.08+.6*v/max).toFixed(2)})`:'transparent'}">${v?f(v):'·'}</td>`).join('')}<td><b>${f(V[i].reduce((a,b)=>a+b,0))}</b></td></tr>`});
 $(el).innerHTML=R.length?h+'</table>':'<div class="empty">Sin datos</div>'}
function heat(el,R,C,get,fmt,attr){let max=0;const V=R.map(r=>C.map(c=>{const v=get(r[0],c[0]);if(v>max)max=v;return v}));
 let h=`<div class="hm" style="grid-template-columns:auto repeat(${C.length},1fr)"><div class="l"></div>${C.map(c=>`<div class="l" style="justify-content:center">${c[1]}</div>`).join('')}`;
 R.forEach((r,i)=>{h+=`<div class="l">${r[1]}</div>`+V[i].map((v,j)=>`<div ${v?attr(r[0],C[j][0]):''} title="${fmt(v)}" style="background:${v?`rgba(var(--acrgb),${(.12+.88*v/max).toFixed(2)})`:''}"></div>`).join('')});$(el).innerHTML=h+'</div>'}
document.addEventListener('click',e=>{const x=e.target.closest('[data-mx]');
 if(x){const m=MXR[x.dataset.mx],i=+x.dataset.i,j=+x.dataset.j;openDetail(m.R[i][1]+' × '+m.C[j][1],CUR.rows.filter(r=>m.pred(r,m.R[i][0],m.C[j][0])));return}
 const h=e.target.closest('[data-hm]');if(h){const D=h.dataset,rs=CUR.rows.filter(r=>(D.w===undefined||wd(r.d)===+D.w)&&(D.d===undefined||r.d===D.d)&&(D.h===undefined||r.h===+D.h));
 openDetail([D.w!==undefined?DOWL[D.w]:'',D.d||'',D.h!==undefined?pad(D.h)+':00':''].filter(Boolean).join(' · '),rs)}});
function entity(rows,keyFn,by,sec,host){destroyPref('ec_'+sec);const G=grp(rows,keyFn).slice(0,sec==='p'?8:20),oth=by==='p'?r=>r.p:r=>r.m;
 $(host).innerHTML=G.map((a,i)=>{const B=grp(rows.filter(r=>keyFn(r)===a.k),oth).slice(0,5);
 return `<div class="box"><h3 style="color:${col(a.k)}">● ${sec==='m'?mn(a.k):a.k}</h3><div class="kpis" style="grid-template-columns:repeat(2,1fr);margin-bottom:8px">${K('Gasto',usd(a.c))}${K('Tiempo',hrs(sec==='p'?a.s:a.g))}${K('Tokens',num(a.t),a.n+' msgs')}${K('Días',a.d.size)}</div><div class="cv"><canvas id="ec_${sec}${i}"></canvas></div><div class="scroll"><table><tr><th>${by==='p'?'Proyecto':'Modelo'}</th><th>Gasto</th><th>%</th></tr>${B.map(b=>`<tr><td>${by==='p'?b.k:mn(b.k)}</td><td>${usd(b.c)}</td><td>${Math.round(100*b.c/(a.c||1))}%</td></tr>`).join('')}</table></div></div>`}).join('')||'<div class="empty">Sin datos</div>';
 G.forEach((a,i)=>{const sub=rows.filter(r=>keyFn(r)===a.k);mkc('ec_'+sec+i,tsSpec(sub,'stack',MET.c,descSplit(sub,oth,MET.c,by==='m'?mn:null),{skip:'c'}))})}

/* ===== Paneles ===== */
const B=ids=>ids.map(boxHtml).join(''),SEC=t=>`<h2 class="sec">${t}</h2>`;
const PANES={
 general:()=>`<div class="kpis" id="kg"></div><div class="grid">${B(['gMes'])}</div><div class="ins-grid" id="ins"></div><div class="grid">${B(['wk','gM','gP','dM','dP','dCat','gTok','gHd'])}<div class="box w2"><h3>Matriz Modelo × Proyecto (clic en una celda)</h3><div class="scroll" id="mx"></div></div></div>`,
 modelos:()=>SEC('Resumen')+`<div class="grid">${B(['mSum'])}</div>`+SEC('Detalle')+`<div class="grid">${B(['mTs','mCross','mCat','mTok'])}</div>`+SEC('Ficha de cada modelo')+`<div class="grid" id="cm"></div>`,
 proyectos:()=>SEC('Resumen')+`<div class="grid">${B(['pSum'])}<div class="box w2"><h3>Todos los proyectos (clic = filtrar)</h3><div class="scroll" id="tp"></div></div></div>`+SEC('Detalle')+`<div class="grid">${B(['pTs','pCross','pCat','pTok'])}</div>`+SEC('Ficha de cada proyecto')+`<div class="grid" id="cp"></div>`,
 herramientas:()=>`<div class="kpis" id="kh"></div>`+SEC('Resumen por categoría')+`<div class="grid">${B(['dCat','gCat'])}</div>`+SEC('Detalle por skill, MCP, agente y loop')+`<div class="box w2"><h3>Desglose detallado (clic en una fila para ver el detalle)</h3><div class="scroll" id="htDet"></div></div>`,
 consumo:()=>`<div class="kpis" id="kc"></div>`+SEC('Resumen')+`<div class="grid">${B(['cGauge','cProj'])}</div>`+SEC('Detalle')+`<div class="grid">${B(['cEvo','cAcum','cDaily','cModel'])}</div>`,
 eficiencia:()=>`<div class="kpis" id="ke"></div>`+SEC('Resumen')+`<div class="grid">${B(['eTipo'])}</div>`+SEC('Detalle')+`<div class="grid">${B(['eCache','eCpm','eMod','ePar','eTop'])}</div>`,
 tiempo:()=>SEC('Resumen')+`<div class="grid">${B(['tHour'])}</div>`+SEC('Detalle')+`<div class="grid">${B(['tWeek','tMonth','tAct'])}<div class="box w2"><h3>Calendario de actividad · gasto por día</h3><div class="scroll" id="cal"></div></div><div class="box w2"><h3>Matriz día de la semana × hora (USD)</h3><div class="scroll" id="hw"></div></div><div class="box w2"><h3>Matriz día × hora (USD)</h3><div class="scroll" id="hd"></div></div><div class="box w2"><h3>Detalle por día</h3><div class="scroll" id="td"></div></div></div>`,
 matrices:()=>SEC('Resumen')+`<div class="grid">${B(['xSum'])}</div>`+SEC('Matrices (clic en una celda)')+`<div class="grid">${[['m1','Tiempo × Modelo · Gasto'],['m2','Proyecto × Modelo · Horas de uso'],['m3','Tiempo × Proyecto · Tokens'],['m4','Tiempo × Modelo · Tokens']].map(x=>`<div class="box w2"><h3>${x[1]}</h3><div class="scroll" id="${x[0]}"></div></div>`).join('')}</div>`};
function herramientas(rows){const G=grp(rows,r=>r.ct+'|'+r.sb).filter(a=>{const[ct,sb]=a.k.split('|');return ct!=='procesar'||sb});
 const top=G.length?G.slice().sort((a,b)=>b.n-a.n)[0]:null,topN=top?top.k.split('|'):null;
 $('kh').innerHTML=(top?K('Herramienta más usada',topN[1]||catn(topN[0]),catn(topN[0])+' · '+top.n+' usos · '+usd(top.c)):K('Herramienta más usada','—','sin datos'))+K('Skills usadas',new Set(rows.filter(r=>r.ct==='skills').map(r=>r.sb)).size,'skills distintas')+K('Servidores MCP',new Set(rows.filter(r=>r.ct==='mcp').map(r=>r.sb)).size,'herramientas MCP usadas')+K('Agentes lanzados',new Set(rows.filter(r=>r.ct==='agentes').map(r=>r.sb)).size,'tipos de subagente')+K('Gasto en herramientas',usd(sum(G,a=>a.c)),'skills + MCP + agentes + loops')+K('Tiempo de razonamiento',hrs(sum(rows,r=>r.rz||0)),'thinking / extended reasoning');
 $('htDet').innerHTML=G.length?'<table><tr><th>Categoría</th><th>Nombre</th><th>Usos</th><th>Tiempo</th><th>Tokens</th><th>Gasto</th></tr>'+G.sort((a,b)=>b.c-a.c).map(a=>{const[ct,sb]=a.k.split('|');return `<tr class="cl" data-ct="${esc(ct)}" data-sb="${esc(sb)}"><td>${catn(ct)}</td><td>${sb?esc(sb):'<i>general</i>'}</td><td>${a.n}</td><td>${hrs(a.s)}</td><td>${num(a.t)}</td><td>${usd(a.c)}</td></tr>`}).join('')+'</table>':'<div class="empty">Sin datos de skills, MCP, agentes o loops en el periodo filtrado</div>';
 document.querySelectorAll('#htDet tr.cl').forEach(tr=>tr.onclick=()=>openDetail(catn(tr.dataset.ct)+(tr.dataset.sb?' · '+tr.dataset.sb:''),rows.filter(r=>r.ct===tr.dataset.ct&&r.sb===tr.dataset.sb)))}
const DRAW={
 general:rows=>{['gMes','wk','gM','gP','dM','dP','dCat','gTok','gHd'].forEach(drawOne);const M=grp(rows,r=>r.m).map(a=>[a.k,mn(a.k)]),P=grp(rows,r=>r.p).map(a=>[a.k,a.k]);mtx('mx',P,M,(r,p,m)=>r.p===p&&r.m===m,r=>r.c,usd)},
 modelos:rows=>{['mSum','mTs','mCross','mCat','mTok'].forEach(drawOne);entity(rows,r=>r.m,'p','m','cm')},
 proyectos:rows=>{['pSum','pTs','pCross','pCat','pTok'].forEach(drawOne);const m=grp(rows,r=>r.p);$('tp').innerHTML=m.length?'<table><tr><th>Proyecto</th><th>Gasto</th><th>Tokens</th><th>Tiempo</th><th>Días</th><th>Msgs</th><th>Modelo principal</th></tr>'+m.map(a=>`<tr class="cl" data-proj="${a.k}"><td>${a.k}</td><td>${usd(a.c)}</td><td>${num(a.t)}</td><td>${hrs(a.s)}</td><td>${a.d.size}</td><td>${a.n}</td><td>${mn(grp(rows.filter(r=>r.p===a.k),r=>r.m)[0].k)}</td></tr>`).join('')+'</table>':'<div class="empty">Sin datos</div>';
  document.querySelectorAll('#tp tr.cl').forEach(tr=>tr.onclick=()=>{F.p=tr.dataset.proj;buildFilters();render()});entity(rows,r=>r.p,'m','p','cp')},
 herramientas:rows=>{['dCat','gCat'].forEach(drawOne);herramientas(rows)},
 consumo:()=>{consumoKpis();['cGauge','cProj','cEvo','cAcum','cDaily','cModel'].forEach(drawOne)},
 eficiencia:rows=>{eficienciaKpis(rows);['eTipo','eCache','eCpm','eMod','ePar','eTop'].forEach(drawOne)},
 tiempo:rows=>{['tHour','tWeek','tMonth','tAct'].forEach(drawOne);calendar(rows);
  const H=[...Array(24).keys()].map(h=>[h,pad(h)]),hw={},dh={};rows.forEach(r=>{const a=wd(r.d)+'_'+r.h,b=r.d+'_'+r.h;hw[a]=(hw[a]||0)+r.c;dh[b]=(dh[b]||0)+r.c});
  heat('hw',DOW.map((d,i)=>[i,d]),H,(i,h)=>hw[i+'_'+h]||0,usd,(i,h)=>`data-hm="1" data-w="${i}" data-h="${h}"`);
  const days=[...new Set(rows.map(r=>r.d))].sort().reverse().slice(0,31).map(d=>[d,d]);heat('hd',days,H,(d,h)=>dh[d+'_'+h]||0,usd,(d,h)=>`data-hm="1" data-d="${d}" data-h="${h}"`);
  $('td').innerHTML='<table><tr><th>Fecha</th><th>Gasto</th><th>Tokens</th><th>Tiempo</th><th>Horas activas</th><th>Modelo</th><th>Proyecto</th></tr>'+grp(rows,r=>r.d).sort((a,b)=>a.k<b.k?1:-1).map(a=>`<tr class="cl" data-day="${a.k}"><td>${a.k} ${DOW[wd(a.k)]}</td><td>${usd(a.c)}</td><td>${num(a.t)}</td><td>${hrs(tm(rows.filter(r=>r.d===a.k)))}</td><td>${new Set(rows.filter(r=>r.d===a.k).map(r=>r.h)).size}</td><td>${mn(grp(rows.filter(r=>r.d===a.k),r=>r.m)[0].k)}</td><td>${grp(rows.filter(r=>r.d===a.k),r=>r.p)[0].k}</td></tr>`).join('')+'</table>';
  document.querySelectorAll('#td tr.cl').forEach(tr=>tr.onclick=()=>openDetail(tr.dataset.day+' '+DOW[wd(tr.dataset.day)],rows.filter(r=>r.d===tr.dataset.day)))},
 matrices:rows=>{drawOne('xSum');const tk=r=>F.m||F.d?r.d:r.d.slice(0,7),T=[...new Set(rows.map(tk))].sort().reverse().slice(0,40).map(x=>[x,x]),M=[...new Set(rows.map(r=>r.m))].sort().map(x=>[x,mn(x)]),pt=grp(rows,r=>r.p).slice(0,8).map(x=>[x.k,x.k]);
  mtx('m1',T,M,(r,t,m)=>tk(r)===t&&r.m===m,r=>r.c,usd);mtx('m2',pt,M,(r,p,m)=>r.p===p&&r.m===m,r=>r.s,v=>hrs(v));mtx('m3',T,pt,(r,t,p)=>tk(r)===t&&r.p===p,tok,num);mtx('m4',T,M,(r,t,m)=>tk(r)===t&&r.m===m,tok,num)}};
function render(){const rows=filtered();CUR={rows};kpis(rows);insights(rows);budget();budgetBar();DRAW[TAB](rows)}

/* ===== Navegación e inicio ===== */
const IC={general:'<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',modelos:'<rect x="5" y="7" width="14" height="11" rx="2"/><path d="M12 7V4M9 12h.01M15 12h.01"/>',proyectos:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',consumo:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',eficiencia:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',tiempo:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/>',matrices:'<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>',herramientas:'<path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 1 5.4-5.4l-2.6 2.6-2-2z"/>'};
const TITLES={general:'Visión general',modelos:'Análisis por modelo',proyectos:'Análisis por proyecto',consumo:'Consumo y presupuesto',eficiencia:'Eficiencia y ahorro',tiempo:'Análisis por tiempo',matrices:'Matrices cruzadas',herramientas:'Skills, MCP, agentes y loops'};
Object.keys(PANES).forEach(k=>{$('p-'+k).innerHTML=PANES[k]()});
[['general','General'],['modelos','Por modelo'],['proyectos','Por proyecto'],['herramientas','Herramientas'],['consumo','Consumo'],['eficiencia','Eficiencia'],['tiempo','Por tiempo'],['matrices','Matrices']].forEach(([k,l])=>{const b=document.createElement('button');b.innerHTML=`<svg viewBox="0 0 24 24">${IC[k]}</svg><span>${l}</span>`;b.className=k==TAB?'on':'';
 b.onclick=()=>{TAB=k;$('ttl').textContent=TITLES[k];document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x==b));document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('on',p.id=='p-'+k));if(RAW.length)render()};$('tabs').appendChild(b)});
applyTheme();setTimer();load();
