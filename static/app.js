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
let RAW0=[],RAW=[],GR='auto',charts={},colors={},timer,TAB='general',CUR={rows:[]},prevTheme='auto',ldT;
const F={m:'',d:'',h0:0,h1:23,mo:'',p:''};
const CFG=Object.assign({lim:180,cur:'EUR',fx:0.92,theme:'auto',rf:5},(()=>{try{return JSON.parse(LS.get('cfg')||'{}')}catch(e){return{}}})());
const SYM=()=>CFG.cur==='EUR'?'€':'$';
const usd=v=>v.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+SYM();
const num=v=>v>=1e9?(v/1e9).toFixed(2)+' G':v>=1e6?(v/1e6).toFixed(2)+' M':v>=1e3?(v/1e3).toFixed(1)+' K':String(Math.round(v));
const hrs=s=>{const m=Math.round(s/60);return m>=60?Math.floor(m/60)+' h '+(m%60)+' min':m+' min'};
const mn=m=>m.replace('claude-','');
const DOW=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'],DOWL=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const WDC={},wd=d=>WDC[d]??(WDC[d]=(new Date(d+'T12:00:00').getDay()+6)%7);
const tok=r=>r.i+r.o+r.cw+r.cr,sum=(rows,f)=>rows.reduce((a,r)=>a+f(r),0),pad=n=>String(n).padStart(2,'0');
const al=(hex,a)=>{const n=parseInt(hex.slice(1),16);return `rgba(${n>>16},${n>>8&255},${n&255},${a})`};
const tm=rows=>new Set(rows.map(r=>r.p)).size===1?sum(rows,r=>r.s):sum(rows,r=>r.g);
const fm1=(rows,k)=>sum(rows,r=>r[k]||0);

/* ===== Temas ===== */
const THEMES=[
{id:'auto',n:'Automático',sw:['linear-gradient(135deg,#f3f5fb 50%,#0a0f24 50%)','#fff','#6b7bff']},
{id:'light',n:'Claro',sw:['#f3f5fb','#fff','#3b5bdb'],pal:['#4f6bed','#14b8a6','#f59e0b','#ef4468','#38bdf8','#a78bfa']},
{id:'dark',n:'Oscuro',sw:['#0a0f24','#111a38','#7c93ff'],pal:['#7c93ff','#2dd4bf','#fbbf24','#fb7185','#38bdf8','#c4b5fd']},
{id:'midnight',n:'Medianoche',sw:['#050816','#0d1330','#5b8cff'],pal:['#5b8cff','#a78bfa','#22d3ee','#f472b6','#34d399','#fbbf24']},
{id:'ocean',n:'Océano',sw:['#04141a','#0f3340','#22d3ee'],pal:['#22d3ee','#2dd4bf','#60a5fa','#a3e635','#fbbf24','#f472b6']},
{id:'sunset',n:'Atardecer',sw:['#160d1f','#2e1a40','#ff8a4c'],pal:['#ff8a4c','#f472b6','#fbbf24','#c084fc','#fb7185','#2dd4bf']},
{id:'graphite',n:'Grafito',sw:['#121212','#262629','#fbbf24'],pal:['#fbbf24','#94a3b8','#60a5fa','#34d399','#f87171','#c4b5fd']},
{id:'corporate',n:'Corporativo',sw:['#f2f4f8','#0b2545','#0b5cab'],pal:['#0b5cab','#2a9d8f','#e9a23b','#c8553d','#4a90d9','#7a6fb5']},
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
 if(RAW.length)render()}
function toast(m){let t=$('toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t)}t.textContent=m;t.classList.add('on');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('on'),1800)}
function toggleTheme(){const ids=THEMES.filter(t=>t.id!=='auto').map(t=>t.id);CFG.theme=ids[(ids.indexOf(effTheme())+1)%ids.length];LS.set('cfg',JSON.stringify(CFG));applyTheme();toast('Tema: '+THEMES.find(t=>t.id===CFG.theme).n)}
function buildThemes(){$('thg').innerHTML=THEMES.map(t=>`<button type="button" class="thc ${CFG.theme===t.id?'on':''}" onclick="pickTheme('${t.id}')"><span class="sw" style="background:${t.sw[0]}"><i style="background:${t.sw[1]}"></i><u style="background:${t.sw[2]}"></u></span>${t.n}</button>`).join('')}
function pickTheme(id){CFG.theme=id;applyTheme();buildThemes()}
function openCfg(){$('c_lim').value=CFG.lim;$('c_cur').value=CFG.cur;$('c_fx').value=CFG.fx;prevTheme=CFG.theme;buildThemes();$('c_rf').value=CFG.rf;$('cfg').classList.add('on')}
function closeCfg(){$('cfg').classList.remove('on')}
function cancelCfg(){CFG.theme=prevTheme;applyTheme();closeCfg()}
function saveCfg(){CFG.lim=+$('c_lim').value||0;CFG.cur=$('c_cur').value;CFG.fx=+$('c_fx').value||1;CFG.rf=+$('c_rf').value;setTimer();LS.set('cfg',JSON.stringify(CFG));closeCfg();applyFx();applyTheme();if(RAW.length){buildFilters();render()}}
$('cfg').onclick=e=>{if(e.target.id==='cfg')cancelCfg()};
$('dt').onclick=e=>{if(e.target.id==='dt')closeDt()};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDt();if($('cfg').classList.contains('on'))cancelCfg()}});

/* ===== Carga de datos ===== */
function showLoader(){const l=$('ld');l.classList.remove('err');l.classList.add('on');$('ldh').textContent='Cargando datos…';$('ldm').textContent='Leyendo registros de Claude Code…';let s=0;clearInterval(ldT);$('ldt').textContent='0 s';
 ldT=setInterval(()=>{s++;$('ldt').textContent=s+' s';if(s==6)$('ldm').textContent='Procesando mensajes y calculando costes…';if(s==18)$('ldm').textContent='La primera lectura es la más lenta; las siguientes serán casi instantáneas.'},1000)}
function hideLoader(){clearInterval(ldT);$('ld').classList.remove('on')}
function loaderError(e){clearInterval(ldT);$('ld').classList.add('err');$('ldh').textContent='No se pudieron cargar los datos';$('ldm').textContent=String(e)}
function setTimer(){clearInterval(timer);const s=$('st').textContent;$('st').textContent=s.replace(/auto-refresco: .*/,'auto-refresco: '+rfTxt(CFG.rf));if(CFG.rf>0)timer=setInterval(()=>load(true),CFG.rf*60000)}
const rfTxt=m=>m?(m>=60?m/60+' h':m+' min'):'desactivado';
function applyFx(){const f=CFG.cur==='EUR'?CFG.fx:1;RAW=RAW0.map(r=>({...r,c:r.c*f,ki:(r.ki||0)*f,ko:(r.ko||0)*f,kw:(r.kw||0)*f,kr:(r.kr||0)*f}))}
async function load(silent){if(!silent)showLoader();try{const r=await fetch('/api/data');if(!r.ok)throw new Error('HTTP '+r.status);const d=await r.json();RAW0=d.rows||[];applyFx();buildColors();
 $('st').textContent=RAW0.length?`${d.archivos} archivos · ${d.mensajes} mensajes · actualizado ${new Date().toLocaleTimeString()} · auto-refresco: ${rfTxt(CFG.rf)}`:'No se han encontrado datos de uso. Revisa la consola del servidor.';
 buildFilters();render();hideLoader()}catch(e){$('st').textContent='Error: '+e;if(!silent)loaderError(e)}}

/* ===== Filtros ===== */
function filtered(){return RAW.filter(r=>(!F.m||r.d.startsWith(F.m))&&(!F.d||r.d===F.d)&&r.h>=F.h0&&r.h<=F.h1&&(!F.mo||r.m===F.mo)&&(!F.p||r.p===F.p))}
function fillSel(id,opts,val){$(id).innerHTML=opts.map(o=>`<option value="${o[0]}" ${o[0]==val?'selected':''}>${o[1]}</option>`).join('')}
function buildFilters(){
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
 P=grp(rows,r=>r.p),M=grp(rows,r=>r.m),D=grp(rows,r=>r.d).slice(0,8),
 K=(a,b,s)=>`<div class="kpi"><small>${a}</small><b>${b}</b><i>${s||''}</i></div>`;
 $('dtb').innerHTML=`<div class="dh"><div><small>Detalle</small><h2>${title}</h2></div><button class="ic" onclick="closeDt()" title="Cerrar (Esc)">✕</button></div>
 <div class="kpis dk">${K('Gasto',usd(c))}${K('Tokens',num(t),'↓'+num(sum(rows,r=>r.i))+' ↑'+num(sum(rows,r=>r.o))+' · caché '+num(sum(rows,r=>r.cw+r.cr)))}${K('Tiempo de uso',hrs(tm(rows)))}${K('Mensajes',num(n))}${K('Días',days.size,ds[0]+(ds.length>1?' → '+ds[ds.length-1]:''))}</div>
 <h4>Proyectos (${P.length})</h4><div class="scroll"><table><tr><th>Proyecto</th><th>Modelos usados</th><th>Tiempo</th><th>Tokens</th><th>Gasto</th></tr>${P.map(a=>`<tr><td>${a.k}</td><td>${tags(a.m,mn)}</td><td>${hrs(a.s)}</td><td>${num(a.t)}</td><td>${usd(a.c)}</td></tr>`).join('')}</table></div>
 <h4>Modelos (${M.length})</h4><div class="scroll"><table><tr><th>Modelo</th><th>Proyectos</th><th>Tiempo</th><th>Tokens</th><th>Gasto</th></tr>${M.map(a=>`<tr><td>${mn(a.k)}</td><td>${tags(a.p)}</td><td>${hrs(a.g)}</td><td>${num(a.t)}</td><td>${usd(a.c)}</td></tr>`).join('')}</table></div>
 ${D.length>1?`<h4>Días con más gasto</h4><div class="scroll"><table><tr><th>Fecha</th><th>Tiempo</th><th>Tokens</th><th>Gasto</th></tr>${D.map(a=>`<tr><td>${a.k} ${DOW[wd(a.k)]}</td><td>${hrs(tm(rows.filter(r=>r.d===a.k)))}</td><td>${num(a.t)}</td><td>${usd(a.c)}</td></tr>`).join('')}</table></div>`:''}`;
 $('dt').classList.add('on')}
function closeDt(){$('dt').classList.remove('on')}
