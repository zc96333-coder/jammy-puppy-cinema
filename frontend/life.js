const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={movie:'电影',book:'图书',game:'游戏',other:'日常',punishment:'惩罚'},icons={movie:'▣',book:'▤',game:'⌘',other:'○',punishment:'◇'},colors={movie:'#6d5acb',book:'#469470',game:'#cb8c2e',other:'#74808e',punishment:'#b57780'};
const statusLabel=(kind,s)=>s==='want'?kind==='game'?'想玩':'想看':s==='active'?kind==='book'?'在读':kind==='game'?'在玩':'在看':kind==='book'?'已读':kind==='game'?'已玩':'看过';
const localDate=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const today=()=>localDate(new Date()),shift=(date,n)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return localDate(d);};
let page=['schedule','movie','book','game','punishment','stats'].includes(location.hash.slice(1))?location.hash.slice(1):({home:'schedule',want:'movie',watched:'movie'}[location.hash.slice(1)]||'schedule');
let state={works:[],events:[],chances:[],demands:[]},person='puppy',preview=false,libraryFilter='all',librarySearch='',libraryYear='all',libraryGenre='all',libraryScore='all',sort='default',selected=new Set(),selectMode=false,showTrash=false,showColumns=false,busy=false;
let hiddenColumns=new Set(['type','language']),quickKind='movie',quickPeople=3,quickDate=today(),quickState='done',candidateSource=null,candidates=[],searchAbort=null,searchSequence=0,requestId=null,selectedDouban=null;
try{const stored=JSON.parse(localStorage.getItem('life.hiddenColumns'));if(Array.isArray(stored))hiddenColumns=new Set(stored);}catch{}
async function api(path,method='GET',body){const r=await fetch(path,{method,headers:{...(method!=='GET'?{'Content-Type':'application/json'}:{}),...(preview?{'X-Preview-Person':person}:{})},credentials:'same-origin',...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok){if(r.status===401){person=null;renderLogin();}throw Error(data.error||'请求失败');}return data;}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
async function refresh(renderPage=true){state=await api('/api/state');$('#sync-status').textContent='已连接共享服务';if(renderPage&&!planDrag&&!axisPan&&!motionFrame&&!zoomFrame&&!activeDay&&!pinnedDay&&!LifeComposer.isOpen())render();}
async function mutate(path,method,body,close=true){if(busy)return;busy=true;document.querySelectorAll('#modal [type=submit]').forEach(b=>b.disabled=true);try{const result=await api(path,method,body);if(close)$('#modal').close();await refresh();toast('已保存');return result;}catch(error){const node=LifeComposer.isOpen()?$('#quick-form .form-error'):$('#modal')?.open?$('#modal .form-error'):null;if(node)node.textContent=error.message;else toast(error.message);}finally{busy=false;document.querySelectorAll('#modal [type=submit]').forEach(b=>b.disabled=false);}}
function navigation(){document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));$('#identity').innerHTML=`<span class="avatar ${person==='jammy'?'j':''}">${person==='jammy'?'J':'P'}</span><span>${esc(person)}</span>${preview?`<button class="tiny-button" id="switch-person">切换</button>`:`<button class="tiny-button" id="logout">退出</button>`}`;$('#preview').innerHTML=preview?'<div class="preview-strip"><span>本地预览身份 · 数据已保存到本机共享数据库</span><span>正式上线须设置 puppy / jammy 密码</span></div>':'';}
function go(next){cancelPlanDrag();LifeComposer.leave();stopAxisMotion();stopZoomMotion();hideEventHover(true);page=next;libraryFilter='all';librarySearch='';libraryYear='all';libraryGenre='all';libraryScore='all';selectMode=false;selected.clear();showTrash=false;history.replaceState(null,'','#'+next);render();}
function heading(symbol,title,subtitle,action=''){return `<div class="page-heading"><div><h1><span class="symbol">${symbol}</span>${title}</h1><p>${subtitle}</p></div>${action}</div>`;}
let eventViewState=null,eventViewCache=[];
function visibleEvents(){
 if(eventViewState!==state){const works=new Map(state.works.map(w=>[w.id,w]));eventViewCache=state.events.filter(e=>!e.deleted&&(!e.workId||!works.get(e.workId)?.deleted)).map(e=>({...e,title:works.get(e.workId)?.title||e.title}));eventViewState=state;}
 return eventViewCache.slice();
}
function peopleText(mask){return mask===3?'一起':mask===1?'puppy':'jammy';}
function eventDateLabel(e){return e.date?e.date.replaceAll('-','.'):e.dateIntent==='future'?'未来':'暂不确定';}
function canDragPlan(e){return e.state==='plan'&&!e.chanceId&&(!e.demandId||state.demands.find(d=>d.id===e.demandId)?.owner===person);}
function render(){if(!person)return renderLogin();document.body?.classList.toggle('visual-schedule-page',page==='schedule');navigation();if(page==='schedule')renderSchedule();else if(['movie','book','game'].includes(page))renderLibrary();else if(page==='punishment')renderPunishments();else renderStats();}
const T=TimelineEngine;
let visualScale=36,visualFocus=null,visualScrollLeft=null,axisShift=0,recyclingAxis=false,planDrag=null,planDragFrame=null,planDropClickUntil=0;
let axisGroups=new Map(),pinnedEventIds=[],selectedDetailId=null;
let axisPaintRange=null;
let nearbyNode=null,densityGhost=null;
function clearAxisProximity(){if(nearbyNode){nearbyNode.style.removeProperty?.('--near');nearbyNode.classList.remove('is-near');nearbyNode=null;}}
function updateAxisProximity(event){
 if(reducedMotion()||axisPan?.moved||!Number.isFinite(event.clientY)||!event.target.closest('.visual-scroll'))return clearAxisProximity();
 let nearest=null,distance=58;
 document.querySelectorAll('.visual-node:not(.axis-ghost .visual-node)').forEach(node=>{const b=node.getBoundingClientRect(),dx=event.clientX-b.left-b.width/2,dy=event.clientY-b.top-b.height/2,d=Math.hypot(dx,dy);if(Math.abs(dy)<28&&d<distance){nearest=node;distance=d;}});
 if(nearest!==nearbyNode)clearAxisProximity();
 if(nearest){nearbyNode=nearest;nearest.style.setProperty('--near',String(1-distance/58));nearest.classList.add('is-near');}
}
function setAxisFlight(speed){
 const scroll=$('.visual-scroll');if(!scroll?.style?.setProperty)return;
 const strength=reducedMotion()?0:Math.min(1,Math.max(0,(Math.abs(speed)-350)/1600));
 scroll.style.setProperty('--flight',strength);scroll.classList.toggle('is-flying',strength>.12);
}
function clearDensityGhost(){if(densityGhost){densityGhost.getAnimations?.().forEach(a=>a.cancel());densityGhost.remove();densityGhost=null;}}
function captureAxisMorph(track){
 clearDensityGhost();if(reducedMotion()||!track.cloneNode)return null;
 const positions=new Map();track.querySelectorAll('[data-day-group]').forEach(node=>{const b=node.getBoundingClientRect();for(const e of axisGroups.get(node.dataset.dayGroup)||[])positions.set(e.id,b.left+b.width/2);});
 const ghost=track.cloneNode(true);ghost.classList.add('axis-ghost');ghost.setAttribute('aria-hidden','true');ghost.inert=true;
 return {ghost,positions};
}
function playAxisMorph(track,morph,delta){
 if(!morph)return;const {ghost,positions}=morph;
 ghost.style.left=delta+'px';track.append(ghost);densityGhost=ghost;
 const fade=ghost.animate([{opacity:.65},{opacity:0}],{duration:240,easing:'ease-out'});
 fade.finished.then(()=>{ghost.remove();if(densityGhost===ghost)densityGhost=null;}).catch(()=>{});
 const viewport=$('.visual-scroll').getBoundingClientRect();
 track.querySelectorAll(':scope > [data-day-group]').forEach(node=>{
  const box=node.getBoundingClientRect();if(box.right<viewport.left||box.left>viewport.right)return;
  const old=(axisGroups.get(node.dataset.dayGroup)||[]).map(e=>positions.get(e.id)).filter(Number.isFinite);
  const origin=old.length?old.reduce((n,x)=>n+x,0)/old.length:box.left+box.width/2,offset=Math.max(-140,Math.min(140,origin-box.left-box.width/2));
  node.animate([{opacity:0,translate:offset+'px 0',scale:'.8'},{opacity:1,translate:'0px 0',scale:'1'}],{duration:360,easing:'cubic-bezier(.16,1,.3,1)'});
 });
}
let scheduleEntranceShown=false,entranceAnimations=[];
function finishScheduleEntrance(){
 const running=entranceAnimations;entranceAnimations=[];
 for(const animation of running){try{animation.finish();animation.cancel();}catch{animation.cancel();}}
}
function animateScheduleEntrance(){
 if(scheduleEntranceShown)return;scheduleEntranceShown=true;
 const scroll=$('.visual-scroll');if(!scroll?.animate||reducedMotion())return;
 const viewport=scroll.getBoundingClientRect(),center=viewport.left+viewport.width/2,easing='cubic-bezier(.22,1,.36,1)';
 function play(node,frames,options){
  const animation=node.animate(frames,{easing,fill:'backwards',...options});entranceAnimations.push(animation);
  animation.finished.then(()=>{animation.cancel();entranceAnimations=entranceAnimations.filter(a=>a!==animation);}).catch(()=>{});
 }
 function sweep(node,delay,duration){
  const box=node.getBoundingClientRect();if(!box.width||box.right<viewport.left||box.left>viewport.right)return;
  const origin=Math.max(0,Math.min(box.width,center-box.left)),left=Math.max(0,viewport.left-box.left),right=Math.max(0,box.right-viewport.right);
  play(node,[{opacity:.15,clipPath:'inset(0 '+(box.width-origin)+'px 0 '+origin+'px)'},{opacity:1,clipPath:'inset(0 '+right+'px 0 '+left+'px)'}],{delay,duration});
 }
 const rail=$('.single-axis');if(rail)sweep(rail,0,1500);
 document.querySelectorAll('.axis-date,.visual-node,.node-connector,.today-marker').forEach(node=>{
  const box=node.getBoundingClientRect();if(box.right<viewport.left||box.left>viewport.right)return;
  const distance=Math.min(1,Math.abs(box.left+box.width/2-center)/(viewport.width/2));
  // Keep existing hover transforms and the today marker's centering intact.
  play(node,[{opacity:0,scale:'.86'},{opacity:1,scale:'1'}],{delay:700+distance*500,duration:1000});
 });
 document.querySelectorAll('.axis-month').forEach(node=>sweep(node,800,1450));
 document.querySelectorAll('.axis-year').forEach(node=>play(node,[{opacity:0},{opacity:1}],{delay:1400,duration:700}));
 // Upper section completes by 2250ms; only then reveal the lower section.
 const panel=$('.event-detail-space');if(panel)play(panel,[{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{delay:2400,duration:1100});
 document.querySelectorAll('.schedule-plan').forEach((node,i)=>play(node,[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{delay:2600+Math.min(i,4)*100,duration:1100}));
}
// Any intentional interaction reveals the complete page immediately.
document.addEventListener('pointerdown',finishScheduleEntrance,{capture:true});
document.addEventListener('wheel',finishScheduleEntrance,{capture:true,passive:true});
document.addEventListener('keydown',finishScheduleEntrance,{capture:true});
function visualIcon(name){
 if(typeof window!=='undefined'&&window.CinemaPixel&&page==='schedule')return window.CinemaPixel.icon(name);
 const paths={
  plus:'<path d="M12 5v14M5 12h14"/>',
  edit:'<path d="m4 16 11-11 4 4L8 20H4Zm9-9 4 4"/>',
  left:'<path d="m14 6-6 6 6 6"/>',right:'<path d="m10 6 6 6-6 6"/>',
  target:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
  calendar:'<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4m8-4v4M4 10h16"/><circle cx="12" cy="15" r="1"/>',
  trash:'<path d="M4 7h16M9 4h6m-9 3 1 13h10l1-13M10 10v7m4-7v7"/>',
  zoom:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5M7 10h6m-3-3v6"/>',
  film:'<path d="m9 5 10 7-10 7Z"/>',
  book:'<path d="M12 6c-3-3-7-2-9-1v14c3-1 6-2 9 0 3-2 6-1 9 0V5c-3-1-6-2-9 1Zm0 0v13"/>',
  game:'<path d="M8 7h8c3 0 5 9 4 11-1 2-4-2-5-3H9c-1 1-4 5-5 3-1-2 1-11 4-11Z"/><path d="M8 9v5m-2-2h4"/><circle cx="16" cy="10" r="1"/><circle cx="18" cy="13" r="1"/>',
  gift:'<path d="m12 3 8 9-8 9-8-9Z"/>',
  other:'<circle cx="12" cy="12" r="7"/><path d="m9 12 2 2 4-4"/>',
  check:'<path d="m5 12 4 4 10-10"/>',
  clock:'<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>'
 };
 return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.other)+'</svg>';
}
let activeDay=null,pinnedDay=null;
let axisPan=null,suppressAxisClickUntil=0,hoverHideTimer=null,motionFrame=0,zoomFrame=0,zoomTarget=36;
const reducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||typeof requestAnimationFrame!=='function';
const clampScale=v=>Math.max(.25,Math.min(160,v));
const axisVisualZoom=v=>Math.max(.78,Math.min(1.7,Math.sqrt(v/36)));
function stopAxisMotion(){if(motionFrame)cancelAnimationFrame(motionFrame);motionFrame=0;setAxisFlight(0);}
function stopZoomMotion(){if(zoomFrame)cancelAnimationFrame(zoomFrame);zoomFrame=0;zoomTarget=visualScale;}
function setAxisScale(value,centerDay,absoluteDay,deferDetail=false){
 const scroll=$('.visual-scroll'),track=$('.visual-track');if(!scroll||!track)return;
 const center=absoluteDay??(T.index(track.dataset.start)+centerDay),width=scroll.clientWidth||1000;
 visualScale=clampScale(value);
 track.dataset.hideTitles=visualScale<36?'true':'false';
const changingDetail=track.dataset.detail!==T.density(visualScale)||(track.dataset.aggregate==='year')!==(visualScale<.65)||(track.dataset.titles==='true')!==(visualScale>=36);
 if(Number(track.dataset.days)&&(Number(track.dataset.days)*visualScale<width*3||Number(track.dataset.days)*visualScale>width*12||((!deferDetail||window.CinemaPixel)&&changingDetail)))rebuildAxisWindow(scroll,track,center,false);
 track.style.setProperty('--time-scale',visualScale+'px');
 track.style.setProperty('--visual-zoom',axisVisualZoom(visualScale));
 if(!deferDetail){track.style.setProperty('--title-space',visualScale>=36?'100px':'0px');track.dataset.textSize=visualScale>=80?'large':'normal';}
 scroll.scrollLeft=80+(center-T.index(track.dataset.start))*visualScale-scroll.clientWidth/2;visualScrollLeft=scroll.scrollLeft;
 refreshAxisPaint(scroll,track,center);
 if(densityGhost)densityGhost.style.left=(scroll.scrollLeft-Number(densityGhost.dataset.originScroll))+'px';
 track.dataset.density=visualScale<29?'compact':'normal';
 const slider=$('#visual-density');if(slider)slider.value=visualScale;updateVisualRange();
}
function zoomAxis(value){
 clearDensityGhost();
 clearAxisProximity();
 const scroll=$('.visual-scroll');if(!scroll)return;stopAxisMotion();if(!window.CinemaPixel||activeDay)hideEventHover();
 const centerDay=(scroll.scrollLeft+scroll.clientWidth/2-80)/visualScale,absoluteDay=T.index($('.visual-track').dataset.start)+centerDay;
 zoomTarget=clampScale(value);if(zoomFrame)cancelAnimationFrame(zoomFrame);
 if(reducedMotion()){setAxisScale(zoomTarget,centerDay,absoluteDay);zoomFrame=0;return;}
 let velocity=0,last=performance.now();
 function tick(now){const dt=Math.min(.032,(now-last)/1000);last=now;
  velocity+=(190*(zoomTarget-visualScale)-25*velocity)*dt;
  const next=visualScale+velocity*dt;
  if(Math.abs(zoomTarget-next)<.03&&Math.abs(velocity)<.2){setAxisScale(zoomTarget,centerDay,absoluteDay);zoomFrame=0;return;}
  setAxisScale(next,centerDay,absoluteDay,true);zoomFrame=requestAnimationFrame(tick);
 }zoomFrame=requestAnimationFrame(tick);
}
function glideAxis(target,velocity=0){
 const scroll=$('.visual-scroll');if(!scroll)return;stopAxisMotion();hideEventHover();
 const limit=Math.max(0,scroll.scrollWidth-scroll.clientWidth);target=Math.max(0,Math.min(limit,target));
 if(reducedMotion()){scroll.scrollLeft=target;return;}
 let last=performance.now(),lastShift=axisShift;
 function tick(now){target+=axisShift-lastShift;lastShift=axisShift;const dt=Math.min(.032,(now-last)/1000);last=now;
  velocity+=(110*(target-scroll.scrollLeft)-21*velocity)*dt;
  const before=scroll.scrollLeft;scroll.scrollLeft=Math.max(0,Math.min(Math.max(0,scroll.scrollWidth-scroll.clientWidth),before+velocity*dt));
  visualScrollLeft=scroll.scrollLeft;updateVisualRange();recycleAxisIfNeeded();
  if(Math.abs(target-scroll.scrollLeft)<.5&&Math.abs(velocity)<3){scroll.scrollLeft=target;motionFrame=0;return;}
  motionFrame=requestAnimationFrame(tick);
 }motionFrame=requestAnimationFrame(tick);
}
function coastAxis(velocity){
 const scroll=$('.visual-scroll');if(!scroll)return;stopAxisMotion();
 if(reducedMotion())return;
 let last=performance.now(),position=scroll.scrollLeft;
 function tick(now){
  const dt=Math.min(.032,(now-last)/1000);last=now;position=scroll.scrollLeft;
  const decay=Math.exp(-5*dt),limit=Math.max(0,scroll.scrollWidth-scroll.clientWidth);
  position+=velocity*(1-decay)/5;velocity*=decay;setAxisFlight(velocity);
  position=Math.max(0,Math.min(limit,position));scroll.scrollLeft=position;visualScrollLeft=scroll.scrollLeft;
  updateVisualRange();recycleAxisIfNeeded();
  if(Math.abs(velocity)<4||position===0||position===limit){motionFrame=0;setAxisFlight(0);return;}
  motionFrame=requestAnimationFrame(tick);
 }motionFrame=requestAnimationFrame(tick);
}
function centerAxisMonth(month){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return;
 const next=shift(month+'-01',32).slice(0,7)+'-01',lastDay=Number(shift(next,-1).slice(8));
 centerAxisDate(month+'-'+String(Math.ceil(lastDay/2)).padStart(2,'0'));
}
function centerAxisDate(date){
 stopZoomMotion();
 const track=$('.visual-track'),scroll=$('.visual-scroll');if(!track||!scroll)return;
 const day=Math.round((new Date(date+'T12:00:00')-new Date(track.dataset.start+'T12:00:00'))/86400000);
 if(day<0||day>Number(track.dataset.days)){visualFocus=date;visualScrollLeft=null;renderSchedule(true);return;}
 glideAxis(80+(day+.5)*visualScale-scroll.clientWidth/2);
}
function eventArtwork(event){return visualIcon(event.kind==='movie'?'film':event.kind==='punishment'?'gift':event.kind);}
function visualCenterDate(){const scroll=$('.visual-scroll'),track=$('.visual-track');return scroll&&track?.dataset.start?shift(track.dataset.start,Math.round((scroll.scrollLeft+scroll.clientWidth/2-80)/visualScale-.5)):visualFocus||today();}
function updateVisualRange(){const scroll=$('.visual-scroll'),track=$('.visual-track'),label=$('#visual-range');if(!scroll||!track?.dataset.start||!label)return;const first=shift(track.dataset.start,Math.max(0,Math.ceil((scroll.scrollLeft-80)/visualScale-.5))),last=shift(track.dataset.start,Math.floor((scroll.scrollLeft+scroll.clientWidth-80)/visualScale-.5));const includeYear=first.slice(0,4)!==last.slice(0,4)||visualScale<8;label.textContent=(includeYear?first:first.slice(5)).replaceAll('-','.')+' — '+(includeYear?last:last.slice(5)).replaceAll('-','.');}
function hideEventHover(force=false,preservePlans=false){
 if(force){pinnedDay=null;pinnedEventIds=[];}activeDay=null;clearTimeout(hoverHideTimer);
 document.querySelectorAll('[data-day-group]').forEach(el=>{el.setAttribute('aria-expanded','false');if(force){el.classList.remove('is-pinned');el.setAttribute('aria-pressed','false');}});
 const palette=$('#event-hover-card');if(palette){palette.getAnimations?.().forEach(a=>a.cancel());const close=()=>{if(!activeDay){palette.hidden=true;palette.innerHTML='';palette.inert=false;}};
  if(!palette.hidden&&!force&&!axisPan?.moved&&!zoomFrame&&!reducedMotion()&&palette.animate){palette.inert=true;const shrink=palette.animate([{opacity:1,scale:'1'},{opacity:0,scale:'.94'}],{duration:150,easing:'ease-out'});shrink.finished.then(close).catch(()=>{});}else close();}
 if(!pinnedDay){selectedDetailId=null;const row=$('#event-detail-row');if(row){row.hidden=true;row.innerHTML='';}if(!preservePlans&&!planDrag)renderSchedulePlans();}
}
function pinDay(date,node,eventId=null){
 pinnedEventIds=eventsForAxisNode(date).map(e=>e.id);if(eventId)selectedDetailId=eventId;pinnedDay=date;const anchor=$('[data-day-group="'+date+'"]');showDayHover(date,typeof anchor?.getBoundingClientRect==='function'?anchor:node,true);
 document.querySelectorAll('[data-day-group]').forEach(el=>{el.classList.toggle('is-pinned',el.dataset.dayGroup===date);el.setAttribute('aria-pressed',String(el.dataset.dayGroup===date));});
}
function toggleDayPin(date,node){if(LifeComposer.isOpen())return;if(pinnedDay===date)hideEventHover(true);else pinDay(date,node);}
function renderSchedulePlans(){
 if(page!=='schedule')return;const panel=$('#schedule-plans');if(!panel)return;
 if(LifeComposer.isOpen()){LifeComposer.render(panel);return;}
 const plans=visibleEvents().filter(e=>e.state==='plan').sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
 panel.hidden=false;panel.innerHTML=LifeComposer.tabsHTML(plans.length)+
 (plans.length?'<div class="schedule-plan-list">'+plans.map(e=>'<article class="schedule-plan" data-plan-id="'+e.id+'">'+(canDragPlan(e)?'<button type="button" class="plan-drag-handle" data-plan-drag="'+e.id+'" aria-label="拖到时间轴为'+esc(e.title)+'选择日期" title="拖到时间轴">⠿</button>':'')+'<button class="plan-main" data-event="'+e.id+'"><span class="plan-glyph" style="color:'+colors[e.kind]+'">'+eventArtwork(e)+'</span><span class="plan-title">'+esc(e.title)+'<small>'+eventDateLabel(e)+' · '+peopleText(e.participants)+'</small></span></button>'+(canDragPlan(e)?'<button class="plan-date-edit" data-plan-date="'+e.id+'" aria-label="选择日期" title="选择日期">'+visualIcon('calendar')+'</button>':'')+(!e.demandId?'<button class="plan-done" data-mark-done="'+e.id+'" aria-label="标记'+esc(e.title)+'做了" title="做了">'+visualIcon('check')+'</button>':'')+'</article>').join('')+'</div>':'<p class="plans-empty">暂时没有计划</p>');
}
function showDayHover(date,node,force=false){
 if(planDrag||LifeComposer.isOpen())return;
 if(pinnedDay&&!force)return;
 if(axisPan?.moved)return;clearTimeout(hoverHideTimer);
 const events=eventsForAxisNode(date).sort((a,b)=>a.id.localeCompare(b.id)),card=$('#event-hover-card');if(!events.length||!card)return;
 const changed=activeDay!==date;activeDay=date;document.querySelectorAll('[data-day-group]').forEach(el=>el.setAttribute('aria-expanded',String(el.dataset.dayGroup===date)));
 if(events.length===1){
  card.getAnimations?.().forEach(a=>a.cancel());card.hidden=true;card.inert=false;card.innerHTML='';
  if(changed||force||selectedDetailId!==events[0].id)showEventDetail(events[0]);
  return;
 }
 card.innerHTML=events.map(e=>'<button class="day-event-icon" data-visual-event="'+e.id+'" data-event="'+e.id+'" data-drag-event="'+(e.demandId||e.chanceId?'':e.id)+'" draggable="'+(!e.demandId&&!e.chanceId)+'" style="--node-color:'+colors[e.kind]+'" aria-label="'+esc(e.title)+'，'+peopleText(e.participants)+'，'+(e.state==='plan'?'计划':'已做')+'" title="'+esc(e.title)+'">'+eventArtwork(e)+'</button>').join('');
 card.getAnimations?.().forEach(a=>a.cancel());card.hidden=false;card.inert=false;const box=node.getBoundingClientRect(),width=Math.min(window.innerWidth-24,events.length*44+16);
 card.style.width=width+'px';card.style.left=Math.max(12,Math.min(window.innerWidth-width-12,box.left+box.width/2-width/2))+'px';card.style.top=Math.max(12,box.top-60)+'px';
 const chosen=events.find(e=>e.id===selectedDetailId)||events[0];
 if(changed||force||chosen.id!==selectedDetailId)showEventDetail(chosen);
 if(changed&&!reducedMotion()){
  card.animate?.([{opacity:0,transform:'translateY(5px) scale(.94)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:380,easing:'cubic-bezier(.16,1,.3,1)'});
  card.querySelectorAll?.('.day-event-icon').forEach((icon,i)=>icon.animate?.([{opacity:0,translate:((events.length-1)/2-i)*12+'px 5px',scale:'.7'},{opacity:1,translate:'0px 0',scale:'1'}],{duration:420,delay:Math.min(i,8)*22,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'}));
 }
}
function highlightDayEvent(id){
 document.querySelectorAll('[data-detail-event]').forEach(el=>el.classList.toggle('is-highlighted',el.dataset.detailEvent===id));
 document.querySelectorAll('.day-event-icon').forEach(el=>el.classList.toggle('active',el.dataset.visualEvent===id));
}
function showEventHover(id,node){
 const event=visibleEvents().find(e=>e.id===id);if(!event)return;clearTimeout(hoverHideTimer);
 if(pinnedDay){if(selectedDetailId===id)highlightDayEvent(id);return;}
 if(!activeDay||!eventsForAxisNode(activeDay).some(e=>e.id===id))showDayHover(event.date,node);
 if(selectedDetailId!==id)showEventDetail(event);else highlightDayEvent(id);
}
function movieRatingBar(review,p,editable){
 const score=!review?.hidden&&review?.score!=null?Number(review.score):null,percent=score===null?0:score*10;
 return '<div class="movie-rating '+p+'" data-empty="'+(score===null)+'" style="--rating-fraction:'+percent/100+';--rating-percent:'+percent+'%"><div class="rating-value"><output>'+ (score===null?'':score.toFixed(1))+'</output>'+(editable?'<button type="button" data-clear-rating aria-label="清空评分" '+(score===null?'hidden':'')+'>×</button>':'')+'</div>'+
 (editable?'<input name="score" type="hidden" value="'+(score??'')+'"><div class="rating-control"><input class="rating-range" data-rating-range aria-label="'+p+' 分数" type="range" min="0" max="10" step="0.1" value="'+(score??0)+'" aria-valuetext="'+(score===null?'尚未填写':score.toFixed(1))+'"><span class="rating-visual-thumb" aria-hidden="true"></span></div>':'<div class="rating-static" role="progressbar" aria-label="'+p+' 分数" aria-valuemin="0" aria-valuemax="10" '+(score!==null?'aria-valuenow="'+score+'"':'')+' aria-valuetext="'+(review?.hidden?'待揭晓':score===null?'尚未填写':score.toFixed(1))+'"></div>')+'</div>';
}
function updateMovieRating(range){
 const rating=range.closest('.movie-rating'),score=Math.max(0,Math.min(10,Math.round(Number(range.value)*10)/10));
 setRatingTarget(rating,score*10);if(rating.dataset)rating.dataset.empty='false';rating.querySelector('[name=score]').value=score;
 rating.querySelector('output').textContent=score.toFixed(1);range.setAttribute('aria-valuetext',score.toFixed(1));rating.querySelector('[data-clear-rating]').hidden=false;
}
const ratingMotions=new Map();
function paintRating(rating,percent){
 const bounded=Math.max(0,Math.min(100,percent));
 rating.style.setProperty('--rating-fraction',bounded/100);rating.style.setProperty('--rating-percent',bounded+'%');
}
function stopRatingMotion(rating){const motion=ratingMotions.get(rating);if(motion){cancelAnimationFrame(motion.frame);ratingMotions.delete(rating);}}
function setRatingTarget(rating,percent){
 const target=Math.max(0,Math.min(100,percent));
 if(reducedMotion()){stopRatingMotion(rating);paintRating(rating,target);return;}
 let motion=ratingMotions.get(rating);if(motion){motion.target=target;return;}
 const start=parseFloat(rating.style.getPropertyValue?.('--rating-percent'))||0;
 motion={position:start,target,velocity:0,last:performance.now(),frame:0};ratingMotions.set(rating,motion);
 function tick(now){
  if(rating.isConnected===false){ratingMotions.delete(rating);return;}
  if(reducedMotion()){paintRating(rating,motion.target);ratingMotions.delete(rating);return;}
  const dt=Math.max(.001,Math.min(.032,(now-motion.last)/1000));motion.last=now;
  motion.velocity+=(400*(motion.target-motion.position)-32*motion.velocity)*dt;
  motion.position+=motion.velocity*dt;paintRating(rating,motion.position);
  if(Math.abs(motion.target-motion.position)<.025&&Math.abs(motion.velocity)<.15){paintRating(rating,motion.target);ratingMotions.delete(rating);return;}
  motion.frame=requestAnimationFrame(tick);
 }motion.frame=requestAnimationFrame(tick);
}
function clearMovieRating(rating){
 stopRatingMotion(rating);paintRating(rating,0);if(rating.dataset)rating.dataset.empty='true';
 rating.querySelector('[name=score]').value='';const range=rating.querySelector('[data-rating-range]');range.value=0;range.setAttribute('aria-valuetext','尚未填写');
 rating.querySelector('output').textContent='';rating.querySelector('[data-clear-rating]').hidden=true;
}
function personPoster(work,p=person){return work.posters?.[p]||null;}
function posterBackdrop(work,p){const image=personPoster(work,p);return image?.url?'<img class="review-poster" src="'+esc(image.url)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'';}
let posterCandidates=[],posterWorkId=null;
async function openPosterPicker(id){
 const work=state.works.find(w=>w.id===id);if(!work||work.kind!=='movie')return;
 posterWorkId=id;posterCandidates=[];const current=personPoster(work);
 modal('<h2>'+esc(person)+' 的海报</h2><p class="modal-subtitle">'+esc(work.title)+(work.year?' · '+work.year:'')+'</p><div class="poster-search"><input id="poster-query" aria-label="海报搜索片名" value="'+esc(work.title)+'" maxlength="100"><button id="poster-search" class="secondary">搜索</button></div><p id="poster-status" class="form-status"></p><div id="poster-candidates" class="poster-candidates"></div>'+(current?'<div class="current-poster"><img src="'+esc(current.url)+'" alt="当前海报" referrerpolicy="no-referrer"><a href="'+esc(current.sourceUrl)+'" target="_blank" rel="noopener">当前海报来源 ↗</a><button id="poster-remove" class="tiny-button">移除背景</button></div>':''));
 await searchPosterCandidates();
}
async function searchPosterCandidates(){
 const q=$('#poster-query')?.value.trim();if(!q)return;
 const sequence=++searchSequence;posterCandidates=[];$('#poster-candidates').innerHTML='';$('#poster-status').textContent='查找海报中…';
 try{const result=await api('/api/posters/search?q='+encodeURIComponent(q));if(sequence!==searchSequence||!$('#modal').open)return;
  const work=state.works.find(w=>w.id===posterWorkId),rank=p=>(work?.year&&p.label.includes(String(work.year))?10:0)+(p.source==='TMDB'?2:0);
  posterCandidates=(result.results||[]).sort((a,b)=>rank(b)-rank(a));$('#poster-status').textContent=(posterCandidates.length?'':'未找到候选，可以试试电影原名。 ')+(result.notice||'');
  $('#poster-candidates').innerHTML=posterCandidates.map((p,i)=>'<article><button data-poster-choice="'+i+'" aria-label="选择 '+esc(p.label)+' 的海报"><img src="'+esc(p.url)+'" alt="'+esc(p.label)+'" loading="lazy" referrerpolicy="no-referrer"><strong>'+esc(p.label)+'</strong><small>'+esc(p.description||'')+'</small></button><a href="'+esc(p.sourceUrl)+'" target="_blank" rel="noopener">'+esc(p.source)+' ↗</a></article>').join('');
 }catch(error){if(sequence===searchSequence&&$('#modal').open)$('#poster-status').textContent=error.message;}
}
async function savePosterChoice(poster){
 const work=state.works.find(w=>w.id===posterWorkId);if(!work||busy)return;busy=true;
 try{await api('/api/works/'+work.id,'PATCH',{version:work.version,poster});$('#modal').close();await refresh(false);render();toast(poster?'海报已同步到电影档案':'已移除背景');}catch(error){$('#poster-status').textContent=error.message;}finally{busy=false;}
}
function partnerReviewCard(work,p){
 const review=work.reviews?.[p];
 return '<section class="partner-review"><div class="review-flip"><div class="review-flip-inner"><div class="review-face review-cover">'+posterBackdrop(work,p)+'<button type="button" data-flip-review aria-label="翻面查看 '+p+' 的评价" aria-expanded="false"><span class="review-cover-symbol">'+visualIcon('film')+'</span><span>'+p+'</span><small>点击翻面</small></button></div><div class="review-face review-front" aria-hidden="true" inert><div class="review-front-heading"><span>'+p+'</span><button type="button" data-flip-review aria-label="翻回卡片背面">↶</button></div>'+movieRatingBar(review,p,false)+'<p class="movie-review-note">'+esc(review?.hidden?'待揭晓':review?.note||'')+'</p></div></div></div></section>';
}
function ensureDetailPinned(target){
 if(pinnedDay)return;const article=target.closest('[data-detail-event]'),e=visibleEvents().find(item=>item.id===article?.dataset.detailEvent);if(!e)return;
 pinnedEventIds=eventsForAxisNode(activeDay||e.date).map(item=>item.id);pinnedDay=activeDay||e.date;clearTimeout(hoverHideTimer);
 $('#event-detail-row').insertAdjacentHTML('afterbegin','<div class="pinned-heading"><span>'+esc(pinnedDay)+' · 已固定</span><button id="unpin-day">取消固定</button></div>');
 document.querySelectorAll('[data-day-group]').forEach(el=>{el.classList.toggle('is-pinned',el.dataset.dayGroup===pinnedDay);el.setAttribute('aria-pressed',String(el.dataset.dayGroup===pinnedDay));});
}
function flipPartnerReview(button){
 ensureDetailPinned(button);const card=button.closest('.review-flip'),flipped=card.classList.toggle('is-flipped'),front=card.querySelector('.review-front'),cover=card.querySelector('.review-cover');
 front.inert=!flipped;cover.inert=flipped;front.setAttribute('aria-hidden',String(!flipped));cover.setAttribute('aria-hidden',String(flipped));
 cover.querySelector('button').setAttribute('aria-expanded',String(flipped));(flipped?front:cover).querySelector('button')?.focus();
}
function simpleMovieDetail(work){
const title=pinnedDay?'<form class="movie-title-form" data-inline-work="'+work.id+'" data-version="'+work.version+'"><span class="title-autosize"><span class="movie-title-measure" aria-hidden="true">'+esc(work.title)+'</span><input name="title" aria-label="电影名" value="'+esc(work.title)+'" maxlength="200" required>'+titleEditOutline()+'</span><button type="submit" aria-label="保存电影名" title="保存电影名">'+visualIcon('check')+'</button><p class="form-error" role="alert"></p></form>':'<h2>'+esc(work.title)+'</h2>';
 const metadata='<div class="movie-meta">'+(work.year?'<span>'+esc(work.year)+'</span>':'')+(work.director?'<span>导演 '+esc(work.director)+'</span>':'')+(work.douban?.id?'<a target="_blank" rel="noopener" href="https://movie.douban.com/subject/'+esc(work.douban.id)+'/">豆瓣'+(work.douban.rating!=null?' '+Number(work.douban.rating).toFixed(1):'')+' ↗</a>':'')+'<button class="poster-picker-button" data-poster-picker="'+work.id+'">'+esc(person)+' 海报</button></div>';
 return '<div class="simple-movie-detail"><div class="movie-header">'+title+metadata+'</div><div class="movie-person-reviews">'+['puppy','jammy'].map(p=>{
  const review=work.reviews?.[p],editable=p===person;
  if(!editable)return partnerReviewCard(work,p);
  return '<section class="own-review"><span class="detail-label">'+p+'</span>'+
   (editable?'<form class="movie-review-form" data-inline-review="'+work.id+'" data-version="'+(review?.version||'')+'">'+movieRatingBar(review,p,true)+'<textarea name="note" aria-label="'+p+' 感受" rows="3" maxlength="2000" placeholder="感受">'+esc(review?.note||'')+'</textarea>'+(work.reveal?'<label class="inline-submit"><input type="checkbox" name="submitted" '+(review?.submitted?'checked':'')+'> 提交揭晓</label>':'')+'<p class="form-error" role="alert"></p><button type="submit" class="secondary">保存</button></form>':movieRatingBar(review,p,false)+'<p class="movie-review-note">'+esc(review?.hidden?'待揭晓':review?.note||'')+'</p>')+'</section>';
 }).join('')+'</div></div>';
}
function eventDetailHTML(event){
 const work=state.works.find(w=>w.id===event.workId),chance=state.chances.find(c=>c.id===event.chanceId),demand=state.demands.find(d=>d.id===event.demandId);
 if(work?.kind==='movie')return simpleMovieDetail(work);
 const facts=[event.date,labels[event.kind],peopleText(event.participants),event.state==='plan'?'计划':'已做'];
 if(work){if(work.year)facts.push(work.year);if(work.director)facts.push((work.kind==='book'?'作者：':work.kind==='game'?'开发者：':'导演：')+work.director);for(const k of ['genre','country','language','type'])if(work[k])facts.push(work[k]);}
 return '<div class="detail-heading"><span class="detail-glyph">'+eventArtwork(event)+'</span><div><h2>'+esc(event.title)+'</h2>'+(work?.en?'<p class="detail-original">'+esc(work.en)+'</p>':'')+'</div><div class="detail-facts">'+facts.map(f=>'<span>'+esc(f)+'</span>').join('')+'</div></div>'+
 (work?'<div class="detail-reviews">'+['puppy','jammy'].map(p=>{const review=work.reviews?.[p];return '<section><span class="detail-label">'+p+' 的评分与感受</span><strong>'+(review?.hidden?'待揭晓':review?.score!=null?Number(review.score).toFixed(1):'未评分')+'</strong><p>'+esc(review?.hidden?'双方提交后展示':review?.note||'暂无感受')+'</p></section>';}).join('')+
 (work.douban?.id?'<section><span class="detail-label">豆瓣评分</span><a target="_blank" rel="noopener" href="https://movie.douban.com/subject/'+esc(work.douban.id)+'/">'+(work.douban.rating!=null?Number(work.douban.rating).toFixed(1):'查看条目')+' ↗</a></section>':'')+'</div>':'')+
 (event.note?'<p class="detail-note"><span class="detail-label">这次的备注</span>'+esc(event.note)+'</p>':'')+
 (chance?'<p class="detail-note">'+esc(chance.owner)+' 获得 '+esc(chance.count)+' 次机会 · 已使用 '+esc(chance.spent)+' 次'+(chance.reason?' · '+esc(chance.reason):'')+'</p>':'')+
 (demand?'<p class="detail-note">'+esc(demand.owner)+' → '+esc(demand.target)+' · '+(demand.state==='done'?'已完成':'已提出要求')+'</p>':'');
}
function showEventDetail(event,highlight=true){
 const row=$('#event-detail-row');if(!row)return;
 const plans=$('#schedule-plans');if(plans)plans.hidden=true;
 selectedDetailId=event.id;
 row.innerHTML=(pinnedDay?'<div class="pinned-heading"><span>'+esc(pinnedDay)+' · 已固定</span><button id="unpin-day">取消固定</button></div>':'')+'<article class="day-detail-item" data-detail-event="'+event.id+'">'+eventDetailHTML(event)+(pinnedDay?inlineDayEditor(event):'')+'<button class="day-detail-edit" data-pin-event="'+event.id+'" aria-label="在下方编辑'+esc(event.title)+'">'+visualIcon('edit')+'</button></article>';
 row.hidden=false;if(highlight)highlightDayEvent(event.id);if(!reducedMotion())row.animate?.([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'ease-out'});
}
function inlineDayEditor(e){
 const work=state.works.find(w=>w.id===e.workId),mine=work?.reviews?.[person];
 if(work?.kind==='movie')return '';
 const eventForm=e.demandId||e.chanceId?'<button data-event="'+e.id+'" class="tiny-button">管理这条惩罚记录</button>':
 '<details class="inline-editor" open><summary>修改这次日程</summary><form data-inline-event="'+e.id+'" data-version="'+e.version+'"><div class="inline-fields"><label>日期<input name="date" type="date" value="'+e.date+'" required></label><label>参与人<select name="participants">'+[[3,'一起'],[1,'puppy'],[2,'jammy']].map(([v,l])=>'<option value="'+v+'" '+(e.participants===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label><label>状态<select name="state"><option value="plan" '+(e.state==='plan'?'selected':'')+'>想做</option><option value="done" '+(e.state==='done'?'selected':'')+'>做了</option></select></label></div><label>这次的备注<textarea name="note" rows="2" maxlength="2000">'+esc(e.note)+'</textarea></label><p class="form-error" role="alert"></p><button type="submit" class="secondary">保存日程</button></form></details>';
 const reviewForm=work?'<details class="inline-editor"><summary>修改 '+esc(person)+' 的评分与感受</summary><form data-inline-review="'+work.id+'" data-version="'+(mine?.version||'')+'"><label>评分<input name="score" type="number" min="0" max="10" step="0.1" value="'+(mine?.score??'')+'" placeholder="0–10"></label><label>感受<textarea name="note" rows="3" maxlength="2000">'+esc(mine?.note||'')+'</textarea></label>'+(work.reveal?'<label class="inline-submit"><input name="submitted" type="checkbox" '+(mine?.submitted?'checked':'')+'> 写完了，提交揭晓</label>':'')+'<p class="form-error" role="alert"></p><button type="submit" class="secondary">保存我的评价</button></form></details>':'';
 return eventForm+reviewForm;
}
function titleEditOutline(){return '<svg class="title-edit-outline" aria-hidden="true" focusable="false"><rect x="1" y="1" rx="7" width="100%" height="100%"/></svg>';}
function showTitleSaved(id){
 const form=$('[data-inline-work="'+id+'"]');if(!form)return;
 form.classList.add('is-title-saved');
 const button=form.querySelector?.('[type=submit]');button?.setAttribute?.('aria-label','电影名已保存');
 if(!reducedMotion())button?.animate?.([{opacity:0,scale:'.7'},{opacity:1,scale:'1'}],{duration:420,easing:'cubic-bezier(.16,1,.3,1)'});
 setTimeout(()=>{form.classList.remove('is-title-saved');button?.setAttribute?.('aria-label','保存电影名');},1500);
}
async function saveInlineDay(form){
 if(busy)return;busy=true;const button=form.querySelector('[type=submit]');if(button)button.disabled=true;
 try{
  const values=Object.fromEntries(new FormData(form));
  if(form.dataset.inlineEvent){const payload={...values,participants:Number(values.participants),version:Number(form.dataset.version)};await api('/api/events/'+form.dataset.inlineEvent,'PATCH',payload);pinnedDay=values.date;}
  else if(form.dataset.inlineWork){await api('/api/works/'+form.dataset.inlineWork,'PATCH',{title:values.title,version:Number(form.dataset.version)});}
  else{const payload={score:values.score,note:values.note,submitted:!!values.submitted,...(form.dataset.version?{version:Number(form.dataset.version)}:{})};await api('/api/reviews/'+form.dataset.inlineReview,'PATCH',payload);}
  await refresh(false);renderSchedule();if(form.dataset.inlineWork)showTitleSaved(form.dataset.inlineWork);toast('已保存，其他页面已同步');
 }catch(error){form.querySelector('.form-error').textContent=error.message;}finally{busy=false;if(button)button.disabled=false;}
}

function eventsForAxisNode(date){
 const visible=visibleEvents();
 if(date===pinnedDay&&pinnedEventIds.length)return visible.filter(e=>pinnedEventIds.includes(e.id));
 return axisGroups.get(date)?.map(e=>visible.find(v=>v.id===e.id)).filter(Boolean)||visible.filter(e=>e.date===date);
}
function axisMarkup(startDate,days,center=null){
 const start=T.index(startDate),detail=T.density(visualScale),paint=window.CinemaPixel?T.paintWindow(start,days,center??start+days/2,visualScale,$('.visual-scroll')?.clientWidth||1000):{start,days},paintEnd=paint.start+paint.days,months=T.months(paint.start,paint.days),end=start+days;
 axisPaintRange=window.CinemaPixel?{...paint,logicalStart:start}:null;
 axisGroups=T.groups(visibleEvents(),visualScale,start,days);
 const names=['一','二','三','四','五','六','七','八','九','十','十一','十二'];
 let html='<div class="single-axis" style="--today-x:calc(56px + '+(T.index(today())-start+.5)+' * var(--time-scale))" aria-hidden="true"></div>';
 html+=months.map((m,i)=>{const n=Number(m.month.slice(5)),name=names[n-1]+'月',label=visualScale<1.8?(n+'月'):name,short=visualScale<1.8?'month-compact':'';
  return '<button type="button" class="axis-month '+(n%2?'month-odd':'month-even')+' '+short+(i===0?' month-first':'')+(i===months.length-1?' month-last':'')+'" data-month="'+m.month+'" title="'+m.month+'" aria-label="'+m.month.slice(0,4)+'年'+name+'，点击居中显示本月" style="left:calc(80px + '+(m.start-start)+' * var(--time-scale));width:calc('+m.length+' * var(--time-scale))"><span class="'+(visualScale<.65&&n%3!==1?'quiet-month':'')+'">'+label+'<small>1 – '+m.lastDay+'</small></span></button>';
 }).join('');
 const years=[...new Set(months.map(m=>m.month.slice(0,4)))];
 html+=years.map(year=>{const first=Math.max(paint.start,T.index(year+'-01-01')),last=Math.min(paintEnd,T.index((Number(year)+1)+'-01-01'));return '<div class="axis-year" style="left:calc(80px + '+(first-start)+' * var(--time-scale));width:calc('+(last-first)+' * var(--time-scale))"><span>'+year+'</span></div>';}).join('');
 if(visualScale>=8)for(let i=paint.start-start;i<paintEnd-start;i++){
  const d=T.date(start+i),day=Number(d.slice(8)),major=day===1||day%5===0||d===today();
  html+='<button class="axis-date '+(d===today()?'is-today':d<today()?'is-past':'is-future')+(major?' major-day':' minor-day')+'" data-day="'+d+'" data-quick="'+d+'" style="left:calc(80px + '+(i+.5)+' * var(--time-scale) - min(var(--time-scale), 44px) / 2);width:min(var(--time-scale), 44px)" aria-label="在 '+d+' 添加日程"><span class="axis-tick" aria-hidden="true"></span><span class="axis-dot" aria-hidden="true"></span><span class="axis-numeral" aria-hidden="true">'+day+'</span></button>';
 }
 html+=[...axisGroups].map(([date,items])=>{
  const e=items[0],index=T.index(date)-start+.5,planned=items.every(item=>item.state==='plan'),simplified=visualScale<8;
  return (date===today()?'':'<span class="event-anchor" style="left:calc(80px + '+index+' * var(--time-scale));--node-color:'+colors[e.kind]+'" aria-hidden="true"></span>')+'<span class="node-connector" style="left:calc(80px + '+index+' * var(--time-scale));top:calc(var(--axis-y) - 20px * var(--visual-zoom));height:calc(20px * var(--visual-zoom))" aria-hidden="true"></span>'+
'<button class="visual-node day-group '+(planned?'is-plan':'is-done')+(simplified?' simplified-node':'')+(pinnedDay===date?' is-pinned':'')+'" style="left:calc(62px + '+index+' * var(--time-scale));top:calc(var(--axis-y) - 34px * var(--visual-zoom) - 18px);--node-color:'+colors[e.kind]+'" data-day-group="'+date+'" data-kind="'+e.kind+'" aria-label="'+esc(items.map(item=>item.title).join('、'))+'，'+date+'，'+items.length+'条记录" aria-expanded="false" aria-pressed="'+(pinnedDay===date)+'">'+nodeTitleMarkup(items)+eventArtwork(e)+'<svg class="pin-orbit" viewBox="0 0 48 48" fill="none" aria-hidden="true"><circle cx="24" cy="24" r="21"/></svg>'+(items.length>1?'<span class="day-count">'+items.length+'</span>':'')+'</button>';
 }).join('');
 return html+'<span class="today-marker" style="left:calc(80px + '+(T.index(today())-start+.5)+' * var(--time-scale))" aria-hidden="true"></span>';
}
function nodeTitleMarkup(items){
 if(visualScale<36)return '';
 const names=[...new Set(items.map(e=>e.kind==='punishment'?'惩罚':e.title))];
 return '<span class="node-titles" aria-hidden="true">'+names.slice(0,3).map(name=>'<span>'+esc(name)+'</span>').join('')+(names.length>3?'<span class="node-title-more">＋'+(names.length-3)+'</span>':'')+'</span>';
}
function rebuildAxisWindow(scroll,track,center,transition=false){
 const morph=transition?captureAxisMorph(track):null;clearAxisProximity();
 const w=T.windowFor(center,visualScale,scroll.clientWidth),before=scroll.scrollLeft;
 recyclingAxis=true;track.dataset.start=T.date(w.start);track.dataset.days=String(w.days);track.dataset.detail=T.density(visualScale);track.dataset.aggregate=visualScale<.65?'year':'normal';track.dataset.titles=visualScale>=36?'true':'false';
 track.style.setProperty?.('--time-scale',visualScale+'px');track.style.setProperty?.('--visual-zoom',axisVisualZoom(visualScale));
 track.style.width='calc('+w.days+' * var(--time-scale) + 160px)';track.innerHTML=axisMarkup(track.dataset.start,w.days,center);
 scroll.scrollLeft=80+(center-w.start)*visualScale-scroll.clientWidth/2;
 const delta=scroll.scrollLeft-before;axisShift+=delta;if(axisPan?.scroll===scroll)axisPan.left+=delta;
 visualScrollLeft=scroll.scrollLeft;recyclingAxis=false;if(morph){morph.ghost.dataset.originScroll=String(before);playAxisMorph(track,morph,delta);}return delta;
}
function refreshAxisPaint(scroll,track,center=null){
 if(!window.CinemaPixel||!Number(track?.dataset.days)||!scroll?.clientWidth)return;
 const start=T.index(track.dataset.start),days=Number(track.dataset.days),first=start+(scroll.scrollLeft-80)/visualScale,last=first+scroll.clientWidth/visualScale,margin=scroll.clientWidth/visualScale*.15;
 if(!axisPaintRange||axisPaintRange.logicalStart!==start||(first<axisPaintRange.start+margin&&axisPaintRange.start>start)||(last>axisPaintRange.start+axisPaintRange.days-margin&&axisPaintRange.start+axisPaintRange.days<start+days)){
  clearAxisProximity();track.innerHTML=axisMarkup(track.dataset.start,days,center??(first+last)/2);
 }
}
function recycleAxisIfNeeded(){
 const scroll=$('.visual-scroll'),track=$('.visual-track');if(recyclingAxis||zoomFrame||!Number(track?.dataset.days)||!scroll?.clientWidth)return;
 const margin=scroll.clientWidth*1.2;
 if(scroll.scrollLeft<margin||scroll.scrollWidth-scroll.scrollLeft-scroll.clientWidth<margin){
  const center=T.index(track.dataset.start)+(scroll.scrollLeft+scroll.clientWidth/2-80)/visualScale;
  rebuildAxisWindow(scroll,track,center);
 }
}

function renderSchedule(reset=false){
 LifeComposer.capture();
 clearDensityGhost();clearAxisProximity();
 finishScheduleEntrance();
 stopAxisMotion();stopZoomMotion();hideEventHover();
 const prior=$('.visual-scroll');if(!reset&&prior&&typeof prior.scrollLeft==='number')visualScrollLeft=prior.scrollLeft;
 const events=visibleEvents().sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
 const anchor=visualFocus||today(),priorTrack=$('.visual-track'),priorCenter=!reset&&priorTrack?.dataset.start&&prior?.clientWidth?T.index(priorTrack.dataset.start)+(prior.scrollLeft+prior.clientWidth/2-80)/visualScale:null;
 const center=priorCenter??(T.index(anchor)+.5),window=T.windowFor(center,visualScale,prior?.clientWidth||1000),start=T.date(window.start),days=window.days;
 const maxLane=0,monthOffset=90;
 $('#main').innerHTML='<section class="visual-schedule" aria-label="所有内容的混合时间轴"><div class="visual-toolbar">'+
  '<button class="current-date" id="visual-today" aria-label="回到今天 '+today()+'"><span>今天</span><strong>'+today().slice(5).replace('-','.')+'</strong><small>'+today().slice(0,4)+'</small></button>'+
  '<div class="visual-controls"><button class="icon-control" data-visual-pan="-1" aria-label="向过去移动">'+visualIcon('left')+'</button>'+
  '<button class="icon-control" data-visual-pan="1" aria-label="向未来移动">'+visualIcon('right')+'</button>'+
  '<label class="icon-control date-control" aria-label="选择日期">'+visualIcon('calendar')+'<input id="visual-date" type="date" aria-label="跳转日期" value="'+anchor+'"></label>'+
  '<button class="icon-control" id="event-trash" aria-label="日程回收站">'+visualIcon('trash')+'</button>'+
  '</div></div>'+
  '<div class="visual-scroll" tabindex="0" aria-label="按住空白处左右拖动时间轴"><div class="visual-track" data-start="'+start+'" data-days="'+days+'" data-density="'+(visualScale<29?'compact':'normal')+'" data-detail="'+T.density(visualScale)+'" style="--visual-zoom:'+axisVisualZoom(visualScale)+';--time-scale:'+visualScale+'px;--month-offset:'+monthOffset+'px;width:calc('+days+' * var(--time-scale) + 160px);height:calc(var(--axis-y) + '+(monthOffset+46)+'px * var(--visual-zoom) + 24px);--axis-y:calc(188px + var(--title-space, 0px) + '+(maxLane*46)+'px * var(--visual-zoom))">'+
  axisMarkup(start,days,center)+'</div></div>'+
  '<div id="event-hover-card" class="event-hover-card" role="tooltip" hidden></div><div class="event-detail-space"><section id="event-detail-row" class="event-detail-row" aria-label="这条日程的完整信息" hidden></section><section id="schedule-plans" aria-label="尚未完成的计划"></section></div></section>';
 $('.visual-track').dataset.aggregate=visualScale<.65?'year':'normal';
 $('.visual-track').dataset.titles=visualScale>=36?'true':'false';
 $('.visual-track').dataset.textSize=visualScale>=80?'large':'normal';
 $('.visual-track').style.setProperty?.('--title-space',visualScale>=36?'100px':'0px');
 if(pinnedDay){const candidates=eventsForAxisNode(pinnedDay),pinnedEvent=candidates.find(e=>e.id===selectedDetailId)||candidates[0];if(pinnedEvent)showEventDetail(pinnedEvent);else{pinnedDay=null;selectedDetailId=null;renderSchedulePlans();}}else renderSchedulePlans();const scroller=$('.visual-scroll');if(scroller&&typeof scroller.scrollLeft==='number'){
  scroller.scrollLeft=Math.max(0,80+(center-window.start)*visualScale-scroller.clientWidth/2);
  scroller.addEventListener('scroll',()=>{if(!recyclingAxis){recycleAxisIfNeeded();refreshAxisPaint(scroller,$('.visual-track'));updateVisualRange();if(!window.CinemaPixel||activeDay)hideEventHover();visualScrollLeft=scroller.scrollLeft;}},{passive:true});updateVisualRange();
 }
 animateScheduleEntrance();
}
const columns=[['title','片名',270],['poster','海报',108],['type','内容',85],['genre','类型',140],['status','状态',90],['puppy','puppy的评分',110],['jammy','Jammy 评分',110],['douban','豆瓣评分',95],['year','年份',75],['dates','日程记录',170],['language','语言',100],['people','参与人',100]];
function libraryItems(){return state.works.filter(w=>w.kind===page&&!!w.deleted===showTrash&&(libraryFilter==='all'||w.status===libraryFilter)&&(!librarySearch||(w.title+' '+w.en).toLowerCase().includes(librarySearch.toLowerCase()))&&(libraryYear==='all'||(libraryYear==='new'?w.year>=2010:w.year<2010&&w.year!=null))&&(libraryGenre==='all'||w.genre===libraryGenre)&&(libraryScore==='all'||(w.reviews?.[person]?.score!=null&&w.reviews[person].score>=Number(libraryScore)))).sort((a,b)=>sort==='year'?(b.year||0)-(a.year||0):sort==='title'?a.title.localeCompare(b.title,'zh'):0);}
function renderLibrary(){const entries=libraryItems(),all=state.works.filter(w=>w.kind===page&&!w.deleted);selected=new Set([...selected].filter(id=>entries.some(w=>w.id===id)));const col=columns.filter(c=>!hiddenColumns.has(c[0])&&(page==='movie'||!['douban','language','type','poster'].includes(c[0])));const genres=[...new Set(all.map(w=>w.genre).filter(Boolean))];
 $('#main').innerHTML=heading(icons[page],labels[page],page==='movie'?'电影、剧集与动漫 · 同一个片单，独立评分':page==='book'?'一起读，也可以各自读。每本书只记一份。':'玩过不必通关，感受不用写长。',`<button class="dark-button" data-quick-kind="${page}">＋ 添加${labels[page]}</button>`)+`<div class="tools"><div class="chips">${['all','want','active','done'].map(s=>`<button data-library-filter="${s}" class="${s===libraryFilter?'active':''}">${s==='all'?'全部':statusLabel(page,s)}</button>`).join('')}</div><span class="spacer"></span><input id="library-search" aria-label="搜索${labels[page]}" placeholder="搜索名称" value="${esc(librarySearch)}"><select id="library-year" aria-label="年份筛选"><option value="all">全部年份</option><option value="new" ${libraryYear==='new'?'selected':''}>2010 年后</option><option value="old" ${libraryYear==='old'?'selected':''}>2010 年前</option></select><select id="library-genre" aria-label="类型筛选"><option value="all">全部类型</option>${genres.map(g=>`<option ${g===libraryGenre?'selected':''}>${esc(g)}</option>`).join('')}</select><select id="library-score" aria-label="个人评分筛选"><option value="all">我的评分</option>${[6,7,8,9].map(n=>`<option value="${n}" ${libraryScore===String(n)?'selected':''}>${n} 分以上</option>`).join('')}</select><select id="library-sort" aria-label="排序"><option value="default">排序</option><option value="year" ${sort==='year'?'selected':''}>年份 ↓</option><option value="title" ${sort==='title'?'selected':''}>名称 A–Z</option></select><button id="columns-toggle" class="tiny-button">☷ 显示列</button><button id="trash-toggle" class="tiny-button">${showTrash?'返回片单':'回收站'}</button></div>${showColumns?`<div class="column-menu">${columns.filter(c=>c[0]!=='title').map(c=>`<label><input type="checkbox" data-column="${c[0]}" ${hiddenColumns.has(c[0])?'':'checked'}> ${c[1]}</label>`).join('')}</div>`:''}<div class="selection-tools"><button id="selection-toggle">${selectMode?'取消选择':'☑ 选择'}</button><button class="danger" id="bulk-delete" ${selected.size?'':'disabled'}>${showTrash?'批量恢复':'批量删除'} (${selected.size})</button>${selectMode?'<button data-select="all">全选</button><button data-select="invert">反选</button><button data-select="clear">清空</button>':'<span class="muted">点评分填写，点作品查看资料和日程</span>'}</div>${entries.length?`<div class="table-wrap"><table class="library-table"><colgroup>${selectMode?'<col style="width:36px">':''}${col.map(c=>`<col style="width:${c[2]}px">`).join('')}</colgroup><thead><tr>${selectMode?'<th>选</th>':''}${col.map(c=>`<th>${c[0]==='title'?(page==='movie'?'Aa　片名':page==='book'?'Aa　书名':'Aa　游戏'):esc(c[1])}</th>`).join('')}</tr></thead><tbody>${entries.map(w=>`<tr>${selectMode?`<td><input type="checkbox" data-select-work="${w.id}" aria-label="选择${esc(w.title)}" ${selected.has(w.id)?'checked':''}></td>`:''}${col.map(c=>`<td class="${c[0]==='title'?'name-cell':''}">${libraryCell(w,c[0])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:`<div class="empty-state"><h3>${showTrash?'回收站是空的':all.length?'没有匹配的作品':page==='book'?'下一本想一起读什么？':page==='game'?'下一局，一起玩什么？':'还没有作品'}</h3><p>${showTrash?'删除的作品可在这里恢复。':'在日程里记一次，这里就会出现，不用重复填写。'}</p>${!showTrash?`<button class="secondary" data-quick-kind="${page}">＋ 记一笔${labels[page]}</button>`:''}</div>`}<div class="summary"><span>计数 ${entries.length}</span><span>评分满分 10 分 · 精确到 0.1</span><span>作品档案与日程共用数据</span></div>`;
}
function libraryCell(w,key){const dates=visibleEvents().filter(e=>e.workId===w.id).sort((a,b)=>a.date.localeCompare(b.date));if(key==='poster')return '<div class="library-poster-pair">'+['puppy','jammy'].map(p=>{const image=personPoster(w,p);return '<span><small>'+p+'</small><button class="library-poster" '+(p===person?'data-poster-picker="'+w.id+'"':'disabled')+' aria-label="'+p+' 的'+esc(w.title)+'海报">'+(image?.url?'<img src="'+esc(image.url)+'" alt="'+p+' 海报" loading="lazy" referrerpolicy="no-referrer">':visualIcon('plus'))+'</button></span>';}).join('')+'</div>';if(key==='title')return `<button class="work-name" data-work="${w.id}">${esc(w.title)}<span class="original-name">${esc(w.en)}</span></button>`;if(key==='status')return `<button class="cell-button" data-work="${w.id}"><span class="badge ${w.status}">${statusLabel(w.kind,w.status)}${w.finished?' · 已结束':''}</span></button>`;if(key==='puppy'||key==='jammy'){const r=w.reviews[key];return `<button class="cell-button ${r.score==null?'empty-score':''}" data-work="${w.id}" data-review-focus="${key}">${r.hidden?'待揭晓':r.score!=null?r.score.toFixed(1):'—'}</button>`;}if(key==='douban')return w.douban?.id?`<a title="${esc(w.douban.ratingNote||'来源快照，非实时')}" href="https://movie.douban.com/subject/${w.douban.id}/" target="_blank" rel="noopener">${w.douban.rating!=null?w.douban.rating.toFixed(1):'查看豆瓣'} ↗</a>`:'<span class="muted">未关联</span>';if(key==='dates')return `<button class="cell-button" data-work="${w.id}">${dates.map(e=>e.date.slice(5)+(e.state==='plan'?' ○':'')).join('、')||'—'}</button>`;if(key==='people')return peopleText(w.participants);if(key==='genre')return w.genre?`<span class="genre-text">${esc(w.genre)}</span>`:'<span class="muted">—</span>';return `<button class="cell-button" data-work="${w.id}">${esc(w[key]||'—')}</button>`;}
function balance(p){return state.chances.filter(c=>c.owner===p).reduce((n,c)=>n+c.count-c.spent,0);}
function renderPunishments(){const pending=state.demands.filter(d=>d.state==='requested'),done=state.demands.filter(d=>d.state==='done');$('#main').innerHTML=heading('◇','惩罚','你们约定的小账本。机会不过期，使用后留记录。','<button class="dark-button" id="grant-open">＋ 记一次机会</button>')+`<div class="punishment-balance">${['puppy','jammy'].map(p=>`<section class="balance-panel"><div><h3>${p} → ${p==='puppy'?'jammy':'puppy'}</h3><p>未使用的机会 · 不过期、不取消</p><button class="secondary tiny-button" data-use-chance="${p}" ${p!==person||!balance(p)?'disabled':''}>提出要求</button>${p!==person?'<span class="muted"> 切换本人身份后使用</span>':''}</div><div class="number">${balance(p)}<span class="muted"> 次</span></div></section>`).join('')}</div><h3 class="section-heading">已提出要求 <span class="muted">${pending.length}</span></h3><div class="demands">${pending.map(d=>demandCard(d)).join('')||'<p class="muted">还没有待完成的要求。</p>'}</div><h3 class="section-heading">已完成 <span class="muted">${done.length}</span></h3><div class="demands">${done.map(d=>demandCard(d)).join('')||'<p class="muted">完成后会留在这里，也会出现在日程。</p>'}</div><h3 class="section-heading">机会获得记录</h3>${state.chances.length?state.chances.map(c=>`<div class="plan-row"><span class="muted">${c.date}</span><span class="title">${c.owner} 获得 ${c.count} 次机会${c.reason?' · '+esc(c.reason):''}</span><span class="muted">已用 ${c.spent} 次</span></div>`).join(''):'<p class="muted">点右上角记一次即可，不需要写原因。</p>'}`;}
function demandCard(d){return `<section class="demand-card"><span class="badge ${d.state==='done'?'done':'active'}">${d.state==='done'?'已完成':'已提出要求'}</span><span class="muted">　${d.owner} → ${d.target}</span><p>${esc(d.title)}</p><footer><span>${d.date} · 消耗 1 次机会</span>${d.state==='requested'?`<button class="secondary" data-complete-demand="${d.id}" ${d.target!==person?'disabled':''}>${d.target===person?'✓ 完成了':'等待 '+d.target+' 完成'}</button>`:''}</footer></section>`;}
function renderStats(){const year=new Date().getFullYear(),events=visibleEvents().filter(e=>e.state==='done'&&e.date.startsWith(String(year))),works=state.works.filter(w=>!w.deleted),unique=new Set(events.map(e=>e.workId).filter(Boolean));$('#main').innerHTML=heading('▥',year+' 年度回顾','依据实际做过的日程记录，不把计划算作完成。')+`<div class="stats-grid">${[['已做记录',events.length],['一起做过',events.filter(e=>e.participants===3).length],['不同作品',unique.size],['完成要求',state.demands.filter(d=>d.state==='done'&&d.completedAt?.startsWith(String(year))).length]].map(([label,n])=>`<section class="stat-panel"><span class="muted">${label}</span><strong>${n}</strong></section>`).join('')}</div><h3>每个月留下的记录</h3><div class="stats-bars">${Array.from({length:12},(_,i)=>{const count=events.filter(e=>Number(e.date.slice(5,7))===i+1).length;return `<div class="bar"><span>${count}</span><i style="height:${Math.max(2,count*12)}px"></i>${i+1}月</div>`;}).join('')}</div><div class="summary">${['movie','book','game','other'].map(k=>`<span>${icons[k]} ${labels[k]} ${events.filter(e=>e.kind===k).length} 次</span>`).join('')}</div><h3 class="section-heading">我们给过的评分</h3><div class="punishment-balance">${['puppy','jammy'].map(p=>{const scores=works.map(w=>w.reviews[p]).filter(r=>!r.hidden&&r.score!=null);return `<section class="balance-panel"><div><h3>${p}</h3><p>${scores.length} 个当前可见评分 · 未揭晓不计入</p></div><div class="number">${scores.length?(scores.reduce((n,r)=>n+r.score,0)/scores.length).toFixed(1):'—'}</div></section>`;}).join('')}</div><h3 class="section-heading">这一年的作品</h3>${works.filter(w=>unique.has(w.id)).map(w=>`<div class="plan-row"><span style="color:${colors[w.kind]}">${icons[w.kind]}</span><button class="title" data-work="${w.id}">${esc(w.title)}</button><span class="muted">${labels[w.kind]}</span></div>`).join('')}`;}
function modal(content){hideEventHover();$('#modal').innerHTML=`<div class="modal-body"><button class="close-modal" id="close-modal" aria-label="关闭">×</button>${content}</div>`;$('#modal').showModal();}
function participantsButtons(){return `<div class="segmented">${[['puppy',1],['jammy',2]].map(([p,n])=>`<button type="button" class="participant-button ${quickPeople&n?'active':''}" data-person-bit="${n}" aria-pressed="${!!(quickPeople&n)}">${p==='puppy'?'P':'J'}　${p}</button>`).join('')}<span class="muted" style="padding:7px">默认一起，可点头像切换</span></div>`;}
function openQuickCategory(d=today()){
 searchAbort?.abort();searchSequence++;quickDate=d;quickKind=null;
 modal('<h2>做什么？</h2><p class="modal-subtitle">'+esc(d)+'</p><div class="quick-category-grid">'+
 ['movie','book','game','other','punishment'].map(k=>'<button type="button" data-quick-category="'+k+'"><span>'+eventArtwork({kind:k})+'</span>'+labels[k]+'</button>').join('')+'</div>');
}
function openQuick(kind=page==='book'||page==='game'?page:'movie',d=today(),workId=''){searchAbort?.abort();searchSequence++;candidateSource=null;selectedDouban=null;candidates=[];quickKind=kind;quickPeople=3;quickDate=d;quickState=d>today()?'plan':'done';if(kind==='punishment'){modal(`<button type="button" class="quick-back" id="quick-back">‹ 返回选择</button><h2>惩罚</h2><p class="modal-subtitle">${esc(d)}</p><div class="segmented"><button type="button" id="quick-grant">＋ 获得一次机会</button><button type="button" id="quick-demand" ${balance(person)?'':'disabled'}>提出要求（剩 ${balance(person)} 次）</button></div>`);return;}modal(`<button type="button" class="quick-back" id="quick-back">‹ 返回选择</button><h2>${labels[kind]}</h2><p class="modal-subtitle">只选必要的，感受以后再写。</p><form id="quick-form"><div id="quick-content"></div><div class="form-group"><label>哪一天</label><div class="segmented">${[[-1,'昨天'],[0,'今天'],[1,'明天']].map(([n,l])=>`<button type="button" data-date-preset="${n}" class="${shift(today(),n)===d?'active':''}">${l}</button>`).join('')}</div><input name="date" id="quick-date" aria-label="记录日期" type="date" value="${d}" required style="margin-top:10px"></div><div class="form-group"><label>一起还是各自</label><div id="participant-options">${participantsButtons()}</div></div><div id="quick-state-options" class="form-group"><label>计划 / 已做</label><div class="segmented"><button type="button" data-event-state="plan" class="${quickState==='plan'?'active':''}">○ 想做</button><button type="button" data-event-state="done" class="${quickState==='done'?'active':''}">✓ 做了</button></div></div><details id="quick-note"><summary>再写一点（可不填）</summary><textarea name="note" rows="2" maxlength="2000" placeholder="一句话备注" style="width:100%;margin-top:10px"></textarea></details><p class="form-error" role="alert"></p><div class="form-footer"><span class="muted">一份记录，多处展示</span><button type="submit" class="dark-button">保存</button></div></form>`);quickContent(workId);}
function quickContent(workId=''){candidateSource=null;selectedDouban=null;const kind=quickKind;if(kind==='punishment'){$('#quick-content').innerHTML=`<div class="form-group"><label>记录机会或要求</label><div class="segmented"><button type="button" id="quick-grant">＋ 获得一次机会</button><button type="button" id="quick-demand" ${balance(person)?'':'disabled'}>提出要求（剩 ${balance(person)} 次）</button></div><p class="muted" style="margin-top:12px">点击后只填必要信息，完成的要求自动显示在日程。</p></div>`;$('#quick-form [type=submit]').hidden=true;$('#quick-state-options').hidden=true;return;}$('#quick-form [type=submit]').hidden=false;$('#quick-state-options').hidden=false;
 const options=state.works.filter(w=>w.kind===kind&&!w.deleted);if(kind==='game'){const recent=id=>visibleEvents().filter(e=>e.workId===id).map(e=>e.date).sort().at(-1)||'';options.sort((a,b)=>recent(b.id).localeCompare(recent(a.id)));}$('#quick-content').innerHTML=kind==='other'?'<div class="form-group"><label for="event-title">什么事</label><input id="event-title" name="title" required maxlength="160" placeholder="例如：散步、做饭、出门逛逛"></div>':`<div class="form-group"><label for="work-select">选一个${labels[kind]}</label>${kind==='game'?`<div class="game-reuse-tags">${options.map(w=>`<button type="button" data-reuse-game="${esc(w.id)}" aria-pressed="${w.id===workId}" class="game-reuse-tag ${w.id===workId?'active':''}">${esc(w.title)}</button>`).join('')}<button type="button" class="game-reuse-tag ${!workId?'active':''}" data-reuse-game="" aria-pressed="${!workId}">＋ 新游戏</button></div>`:''}<select id="work-select" name="workId" ${kind==='game'?'hidden':''}><option value="">＋ 新${kind==='book'?'书':kind==='game'?'游戏':'作品'}</option>${options.map(w=>`<option value="${w.id}" ${w.id===workId?'selected':''}>${esc(w.title)}${w.year?' · '+w.year:''}　${statusLabel(kind,w.status)}</option>`).join('')}</select></div><div id="new-work-fields" ${workId?'hidden':''}><div class="form-group"><label for="new-work-title">${kind==='book'?'书名':kind==='game'?'游戏名':'片名'}</label><input id="new-work-title" name="workTitle" maxlength="160" ${workId?'':'required'} placeholder="只需填名称，其他可稍后补充"></div>${kind==='movie'?'<div class="segmented"><button type="button" data-source-search="douban">豆瓣查找版本</button><button type="button" data-source-search="wiki">查找并补全资料</button></div><p class="form-status" id="lookup-status">查找后点选正确版本；找不到也能直接保存。</p><div id="source-candidates" class="candidate-list"></div>':''}<details><summary>作品资料（可不填）</summary><div class="metadata-grid" style="margin-top:12px">${[['en','原名 / 英文名'],['year','年份'],['director',kind==='book'?'作者':kind==='game'?'开发者':'导演'],['genre','类型标签'],['language','语言'],['country','地区']].map(([key,label])=>`<label>${label}<input name="${key}" ${key==='year'?'type="number" min="1000" max="2100"':'maxlength="200"'}></label>`).join('')}<label>内容类型<select name="type"><option>${labels[kind]}</option>${kind==='movie'?'<option>剧集</option><option>动漫</option><option>纪录片</option>':''}</select></label></div></details></div>`;
}
function selectQuickGame(id){
 const work=state.works.find(w=>w.id===id&&w.kind==='game'&&!w.deleted);if(id&&!work)return;
 $('#work-select').value=work?.id||'';$('#new-work-fields').hidden=!!work;$('#new-work-title').required=!work;
 document.querySelectorAll('[data-reuse-game]').forEach(b=>{const active=b.dataset.reuseGame===(work?.id||'');b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 candidateSource=null;selectedDouban=null;
}
async function searchSource(mode){const q=$('#new-work-title').value.trim();if(!q)return $('#lookup-status').textContent='先填片名，再点击查找。';searchAbort?.abort();searchAbort=new AbortController();const version=++searchSequence;candidateSource=null;candidates=[];$('#source-candidates').innerHTML='';$('#lookup-status').textContent='查找中…';try{const r=await fetch((mode==='douban'?'/api/douban/search?q=':'/api/metadata/search?q=')+encodeURIComponent(q),{signal:searchAbort.signal,headers:preview?{'X-Preview-Person':person}:{}});const data=await r.json();if(version!==searchSequence)return;if(!r.ok)throw Error(data.error);candidates=(data.results||[]).map(c=>({...c,source:mode}));$('#lookup-status').textContent=data.notice||'请选择正确版本。';$('#source-candidates').innerHTML=candidates.map((c,i)=>`<button type="button" class="candidate" data-source-candidate="${i}"><strong>${esc(c.title)} · ${esc(c.year||'年份待补充')}</strong><small>${esc(c.en||'')}　${esc(c.director||'导演暂未获取')}</small></button>`).join('');}catch(e){if(e.name!=='AbortError'&&version===searchSequence)$('#lookup-status').textContent='暂时查不到，可以手动保存；不代表影片不存在。';}}
function chooseSource(index){const c=candidates[index];if(!c)return;const form=$('#quick-form'),n=normalizeFilmMetadata(c);const currentYear=form.elements.year.value;if(currentYear&&n.year&&Number(currentYear)!==n.year){$('#lookup-status').textContent='年份不一致，请先核对版本。';return;}candidateSource={...c};if(c.source==='douban')selectedDouban={...c};for(const key of ['en','year','director','genre','language','country'])if(!form.elements[key].value&&n[key]!=null)form.elements[key].value=n[key];if(c.type&&form.elements.type)form.elements.type.value=c.type;$('#source-candidates').innerHTML='';$('#lookup-status').textContent=c.source==='douban'?'已关联这个豆瓣版本，缺失资料可继续补全。':'已填入空白资料，不改变豆瓣关联。';}
async function saveQuick(form){const values=Object.fromEntries(new FormData(form)),payload={kind:quickKind,date:values.date,participants:quickPeople,state:quickState,note:values.note||''};if(values.workId)payload.workId=values.workId;else if(quickKind==='other')payload.title=values.title;else{payload.workTitle=values.workTitle;for(const key of ['en','year','director','genre','language','country','type'])payload[key]=values[key];if(selectedDouban)payload.douban={id:selectedDouban.id,rating:selectedDouban.rating??null,checkedAt:selectedDouban.checkedAt||'',ratingNote:selectedDouban.notice||'豆瓣资料快照，非实时'};if(candidateSource?.nameSourceUrl)payload.nameSourceUrl=candidateSource.nameSourceUrl;}await mutate('/api/events','POST',payload);}
function openEvent(id){const e=state.events.find(e=>e.id===id);if(!e)return;if(e.demandId)return openDemand(e.demandId);if(e.chanceId){const c=state.chances.find(c=>c.id===e.chanceId);return modal(`<h2>${esc(e.title)}</h2><p class="modal-subtitle">${e.date} · 机会不会过期或取消</p><p class="muted">${esc(c?.reason||'没有额外备注')} · 已使用 ${c?.spent||0} 次</p><button class="secondary" data-page="punishment">查看机会账本</button>`);}quickPeople=e.participants;modal(`<h2>${esc(e.title)}</h2><p class="modal-subtitle">${icons[e.kind]} ${labels[e.kind]} · ${peopleText(e.participants)} · ${e.state==='plan'?'仍是计划，不自动完成':'做过的记录'}</p><form id="event-form" data-id="${id}"><div class="form-group"><label>日期</label><input name="date" type="date" required value="${e.date}"></div><div class="form-group"><label>参与人</label><div id="participant-options">${participantsButtons()}</div></div><div class="form-group"><label>状态</label><select name="state"><option value="plan" ${e.state==='plan'?'selected':''}>○ 想做</option><option value="done" ${e.state==='done'?'selected':''}>✓ 做了</option></select></div><div class="form-group"><label>备注（可选）</label><textarea name="note" rows="2" maxlength="2000">${esc(e.note)}</textarea></div><p class="form-error" role="alert"></p><div class="form-footer"><button type="button" class="danger tiny-button" data-delete-event="${id}">移到回收站</button><button class="dark-button" type="submit">保存修改</button></div></form>${e.workId?`<button class="tiny-button" data-work="${e.workId}">查看作品与评分 ↗</button>`:''}`);}
function openWork(id,focus){const w=state.works.find(w=>w.id===id);if(!w)return;const mine=w.reviews[person],partner=person==='puppy'?'jammy':'puppy',other=w.reviews[partner];modal(`<h2>${esc(w.title)}</h2><p class="modal-subtitle">${esc(w.en)}${w.year?' · '+w.year:''} · ${labels[w.kind]}</p>${w.douban?.id?`<a class="work-detail-link" href="https://movie.douban.com/subject/${w.douban.id}/" target="_blank" rel="noopener">豆瓣 ${w.douban.rating!=null?w.douban.rating.toFixed(1)+' 分':'查看条目'} ↗</a><p class="muted">${esc(w.douban.ratingNote||'资料快照，非实时')}</p>`:''}<div class="tools"><select id="work-status" data-work-id="${id}" aria-label="作品状态">${['want','active','done'].map(s=>`<option value="${s}" ${s===w.status?'selected':''}>${statusLabel(w.kind,s)}</option>`).join('')}</select>${w.kind==='game'?`<label class="muted"><input type="checkbox" id="work-finished" data-work-id="${id}" ${w.finished?'checked':''}> 已结束（不一定通关）</label>`:''}<button class="secondary tiny-button" data-record-work="${id}">＋ 再记一次</button></div><label class="reveal-switch"><input type="checkbox" id="work-reveal" data-work-id="${id}" ${w.reveal?'checked':''}> 评分和感受先隐藏，双方提交后揭晓</label><div class="review-grid"><section class="review-panel"><h3>${person} 的评价</h3><form id="review-form" data-work-id="${id}"><label class="muted" for="my-score">评分 · 可不填</label><input id="my-score" name="score" type="number" min="0" max="10" step="0.1" placeholder="0–10 分" value="${mine.score??''}"><textarea name="note" rows="3" maxlength="2000" placeholder="一句也可以，留空也可以">${esc(mine.note||'')}</textarea>${w.reveal?`<label class="muted" style="display:block;margin-top:12px"><input name="submitted" type="checkbox" ${mine.submitted?'checked':''}> 我写完了，提交揭晓</label>`:''}<p class="form-error" role="alert"></p><button class="secondary" type="submit">保存我的评价</button></form></section><section class="review-panel"><h3>${partner} 的评价</h3>${other.hidden?`<div class="locked">◇ ${other.submitted?'已提交，等待你写完':'还没提交，暂不展示内容'}</div>`:`<div class="rating">${other.score!=null?other.score.toFixed(1):'—'} <span class="muted">/ 10</span></div><p>${esc(other.note||'还没写感受。')}</p>`}</section></div><details><summary>修改作品资料</summary><form id="work-form" data-work-id="${id}"><div class="metadata-grid" style="margin-top:12px">${[['title','名称'],['en','原名 / 英文名'],['year','年份'],['director',w.kind==='book'?'作者':'导演 / 开发者'],['genre','类型'],['language','语言']].map(([k,l])=>`<label>${l}<input name="${k}" value="${esc(w[k]??'')}" ${k==='year'?'type="number" min="1000" max="2100"':'maxlength="200"'} ${k==='title'?'required':''}></label>`).join('')}</div><p class="form-error" role="alert"></p><button class="secondary" type="submit">保存资料</button></form>${w.nameSourceUrl?`<a class="muted" href="${esc(w.nameSourceUrl)}" target="_blank" rel="noopener">名称资料来源 ↗</a>`:''}</details><div class="record-history"><h3>关联日程</h3>${visibleEvents().filter(e=>e.workId===id).map(e=>`<button data-event="${e.id}">${e.date}　${e.state==='plan'?'○ 计划':'✓ 做了'}　${peopleText(e.participants)}</button>`).join('')||'<p class="muted">还没有记录。</p>'}</div>`);if(focus===person)$('#my-score').focus();}
function openGrant(){requestId=null;modal(`<h2>记一次机会</h2><p class="modal-subtitle">机会不会过期，使用时才扣除。</p><form id="grant-form"><div class="form-row"><div class="form-group"><label>谁获得</label><select name="owner"><option ${person==='puppy'?'selected':''}>puppy</option><option ${person==='jammy'?'selected':''}>jammy</option></select></div><div class="form-group"><label>几次</label><input name="count" type="number" min="1" max="20" step="1" value="1" required></div></div><div class="form-group"><label>日期</label><input name="date" type="date" value="${quickDate||today()}" required></div><details><summary>原因（可不填）</summary><input name="reason" maxlength="500" placeholder="例如：约定、小游戏输了"></details><p class="form-error" role="alert"></p><div class="form-footer"><span class="muted">默认对另一人使用</span><button class="dark-button" type="submit">记下机会</button></div></form>`);}
function openDemand(id){if(id){const d=state.demands.find(d=>d.id===id);if(!d)return;modal(`<h2>这次的要求</h2><p class="modal-subtitle">${d.owner} → ${d.target} · ${d.date}</p>${demandCard(d)}<p class="muted" style="margin-top:20px">提出时已消耗 1 次机会，完成不会再次扣除。</p>`);return;}requestId=crypto.randomUUID();modal(`<h2>提出一个要求</h2><p class="modal-subtitle">${person} → ${person==='puppy'?'jammy':'puppy'} · 目前有 ${balance(person)} 次机会</p><form id="demand-form"><div class="form-group"><label>希望做什么</label><input name="title" maxlength="500" required placeholder="写一句具体要求"></div><div class="form-group"><label>哪一天</label><input name="date" type="date" value="${quickDate||today()}" required></div><p class="form-error" role="alert"></p><div class="form-footer"><span class="muted">提出后消耗 1 次，并显示在日程</span><button class="dark-button" type="submit">提出要求</button></div></form>`);}
function renderLogin(){navigationLogin();$('#main').innerHTML=`<section class="login-panel"><h1>我们的记录</h1><p class="muted">仅 puppy 和 jammy 可以进入。</p><form id="login-form"><div class="form-group"><label>账号</label><select name="person"><option>puppy</option><option>jammy</option></select></div><div class="form-group"><label>密码</label><input name="password" type="password" required autocomplete="current-password" maxlength="200"></div><p class="form-error" role="alert"></p><button class="dark-button" type="submit">登录</button><p class="muted" style="margin-top:12px">登录后保持 30 天，不开放注册。</p></form></section>`;}
function navigationLogin(){$('#identity').innerHTML='';$('#preview').innerHTML='';}
async function runAction(fn){try{await fn();}catch(e){toast(e.message);}}
document.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;runAction(async()=>{
 if(b.hasAttribute('data-composer'))return LifeComposer.click(b);
 if(b.hasAttribute('data-clear-rating')){clearMovieRating(b.closest('.movie-rating'));return;}
 if(b.id==='unpin-day'){hideEventHover(true);document.querySelectorAll('[data-day-group]').forEach(el=>el.classList.remove('is-pinned'));return;}
 if(b.dataset.dayGroup)return toggleDayPin(b.dataset.dayGroup,b);
 if(b.dataset.visualEvent||b.dataset.pinEvent){const e=visibleEvents().find(e=>e.id===(b.dataset.visualEvent||b.dataset.pinEvent));if(e){const group=pinnedDay||activeDay;pinDay(group&&eventsForAxisNode(group).some(item=>item.id===e.id)?group:e.date,b,e.id);highlightDayEvent(e.id);}return;}
 if(b.dataset.page){$('#modal').close();return go(b.dataset.page);}
 if(b.id==='switch-person'){LifeComposer.reset();hideEventHover(true);person=person==='puppy'?'jammy':'puppy';$('#modal').close();return refresh();}
 if(b.id==='logout'){await api('/api/logout','POST',{});person=null;return renderLogin();}
 if(b.id==='close-modal')return $('#modal').close();
 if(b.dataset.posterPicker)return openPosterPicker(b.dataset.posterPicker);
 if(b.id==='poster-search')return searchPosterCandidates();
 if(b.hasAttribute('data-poster-choice'))return savePosterChoice(posterCandidates[Number(b.dataset.posterChoice)]);
 if(b.id==='poster-remove')return savePosterChoice(null);
 if(b.hasAttribute('data-flip-review'))return flipPartnerReview(b);
 if(b.hasAttribute('data-quick'))return page==='schedule'?LifeComposer.start(b.dataset.quick||today()):openQuickCategory(b.dataset.quick||today());
 if(b.dataset.quickKind)return openQuick(b.dataset.quickKind,today());
 if(b.hasAttribute('data-reuse-game'))return selectQuickGame(b.dataset.reuseGame);
 if(b.id==='quick-back')return openQuickCategory(quickDate);
 if(b.dataset.quickCategory)return openQuick(b.dataset.quickCategory,quickDate);
 if(b.dataset.datePreset){quickDate=shift(today(),Number(b.dataset.datePreset));$('#quick-date').value=quickDate;document.querySelectorAll('[data-date-preset]').forEach(el=>el.classList.toggle('active',el===b));return;}
 if(b.dataset.personBit){const next=quickPeople^Number(b.dataset.personBit);if(!next)return toast('至少留一位参与人');quickPeople=next;$('#participant-options').innerHTML=participantsButtons();return;}
 if(b.dataset.eventState){quickState=b.dataset.eventState;document.querySelectorAll('[data-event-state]').forEach(el=>el.classList.toggle('active',el===b));return;}
 if(b.dataset.visualPan){const scroll=$('.visual-scroll');if(scroll)glideAxis(scroll.scrollLeft+Number(b.dataset.visualPan)*Math.max(320,scroll.clientWidth*.75));return;}
 if(b.dataset.month)return centerAxisMonth(b.dataset.month);
 if(b.id==='visual-today')return centerAxisDate(today());
 if(b.dataset.zoomStep)return zoomAxis((zoomFrame?zoomTarget:visualScale)*Math.pow(1.4,Number(b.dataset.zoomStep)));
 if(b.id==='event-trash'){const deleted=state.events.filter(e=>e.deleted&&!e.demandId&&!e.chanceId);modal(`<h2>日程回收站</h2><p class="modal-subtitle">作品和评分保持不变，记录可恢复。</p>${deleted.map(e=>`<div class="plan-row"><span class="title">${esc(e.title)} · ${e.date}</span><button class="secondary tiny-button" data-restore-event="${e.id}">恢复</button></div>`).join('')||'<p class="muted">回收站为空。</p>'}<p class="form-error"></p>`);return;}
 if(b.dataset.restoreEvent){const e=state.events.find(e=>e.id===b.dataset.restoreEvent);return mutate('/api/events/'+e.id,'PATCH',{version:e.version,deleted:false});}
 if(b.dataset.event)return openEvent(b.dataset.event);
 if(b.dataset.work)return openWork(b.dataset.work,b.dataset.reviewFocus);
 if(b.dataset.recordWork){const w=state.works.find(w=>w.id===b.dataset.recordWork);return openQuick(w.kind,today(),w.id);}
 if(b.dataset.planDate){const e=state.events.find(e=>e.id===b.dataset.planDate);return modal('<h2>哪一天？</h2><div class="composer-choices"><button data-plan-intent="future" data-id="'+e.id+'">未来</button><button data-plan-intent="unsure" data-id="'+e.id+'">暂不确定</button></div><form id="plan-date-form" data-id="'+e.id+'"><input type="date" name="date" required value="'+e.date+'"><p class="form-error" role="alert"></p><button type="submit" class="dark-button">确定</button></form>');}
 if(b.dataset.planIntent){const e=state.events.find(e=>e.id===b.dataset.id);return mutate('/api/events/'+e.id,'PATCH',{version:e.version,date:'',dateIntent:b.dataset.planIntent});}
 if(b.dataset.markDone){const e=state.events.find(e=>e.id===b.dataset.markDone);return mutate('/api/events/'+e.id,'PATCH',{version:e.version,state:'done',date:e.date||today(),dateIntent:'dated'},false);}
 if(b.dataset.deleteEvent){const e=state.events.find(e=>e.id===b.dataset.deleteEvent);modal(`<h2>移除这条日程？</h2><p class="modal-subtitle">${esc(e.title)} · ${e.date}</p><p class="muted">作品档案和评分不会删除，可以在日程回收站恢复。</p><p class="form-error"></p><div class="form-footer"><button id="close-modal">取消</button><button class="dark-button" data-confirm-event-delete="${e.id}">移到回收站</button></div>`);return;}
 if(b.dataset.confirmEventDelete){const e=state.events.find(e=>e.id===b.dataset.confirmEventDelete);return mutate('/api/events/'+e.id,'PATCH',{version:e.version,deleted:true});}
 if(b.dataset.libraryFilter){libraryFilter=b.dataset.libraryFilter;return renderLibrary();}
 if(b.id==='columns-toggle'){showColumns=!showColumns;return renderLibrary();}
 if(b.id==='trash-toggle'){showTrash=!showTrash;selected.clear();return renderLibrary();}
 if(b.id==='selection-toggle'){selectMode=!selectMode;selected.clear();return renderLibrary();}
 if(b.dataset.select){const ids=libraryItems().map(w=>w.id);selected=b.dataset.select==='all'?new Set(ids):b.dataset.select==='invert'?new Set(ids.filter(id=>!selected.has(id))):new Set();return renderLibrary();}
 if(b.id==='bulk-delete'){const items=libraryItems().filter(w=>selected.has(w.id));modal(`<h2>${showTrash?'恢复':'删除'} ${items.length} 个作品？</h2><p class="modal-subtitle">${items.map(w=>esc(w.title)).join('、')}</p><p class="muted">${showTrash?'恢复后关联日程和评分一起回来。':'移到回收站，评分和日程保留，不永久删除。'}</p><p class="form-error"></p><div class="form-footer"><button id="close-modal">取消</button><button class="dark-button" id="confirm-bulk">确认${showTrash?'恢复':'删除'}</button></div>`);return;}
 if(b.id==='confirm-bulk'){if(busy)return;busy=true;try{await api('/api/works/batch','POST',{items:libraryItems().filter(w=>selected.has(w.id)).map(w=>({id:w.id,version:w.version})),deleted:!showTrash});$('#modal').close();selected.clear();await refresh();toast('已保存');}finally{busy=false;}return;}
 if(b.dataset.sourceSearch)return searchSource(b.dataset.sourceSearch);
 if(b.dataset.sourceCandidate)return LifeComposer.isOpen()?LifeComposer.chooseSourceCandidate(Number(b.dataset.sourceCandidate)):chooseSource(Number(b.dataset.sourceCandidate));
 if(b.id==='grant-open'||b.id==='quick-grant'){if(b.id==='grant-open')quickDate=today();return openGrant();}
 if(b.dataset.useChance||b.id==='quick-demand'){if(b.dataset.useChance)quickDate=today();return openDemand();}
 if(b.dataset.demandOpen)return openDemand(b.dataset.demandOpen);
 if(b.dataset.completeDemand){const d=state.demands.find(d=>d.id===b.dataset.completeDemand);return mutate('/api/demands/'+d.id,'PATCH',{version:d.version});}
 if(b.id==='export-shared'){const data=await api('/api/export'),blob=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=blob;a.download='shared-life-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(blob),1000);return;}
 if(b.id==='import-old'){const storage=Object.fromEntries(['gongying.addedFilms.v1','gongying.filmEdits.v1','gongying.deletedFilms.v1','gongying.hiddenColumns'].map(k=>[k,localStorage.getItem(k)]));if(!storage['gongying.addedFilms.v1']&&!storage['gongying.filmEdits.v1']&&!storage['gongying.deletedFilms.v1'])return toast('当前浏览器没有额外的旧记录，十部电影已保留。');modal('<h2>迁移旧浏览器记录</h2><p class="modal-subtitle">把当前浏览器的电影新增记录、评分编辑和回收站状态迁到共享服务。旧数据不会清除；建议先打开 /backup.html 导出备份。</p><p class="form-error"></p><div class="form-footer"><button id="close-modal">取消</button><button id="confirm-import" class="dark-button">确认迁移</button></div>');return;}
 if(b.id==='confirm-import'){const storage=Object.fromEntries(['gongying.addedFilms.v1','gongying.filmEdits.v1','gongying.deletedFilms.v1','gongying.hiddenColumns'].map(k=>[k,localStorage.getItem(k)]));return mutate('/api/import-legacy','POST',{storage});}
 });});
document.addEventListener('submit',event=>{event.preventDefault();const f=event.target;runAction(async()=>{
 if(f.dataset.inlineEvent||f.dataset.inlineReview||f.dataset.inlineWork)return saveInlineDay(f);
 if(f.id==='quick-form')return f.hasAttribute('data-composer-form')?LifeComposer.save(f):saveQuick(f);
 if(f.id==='event-form'){const e=state.events.find(e=>e.id===f.dataset.id);return mutate('/api/events/'+e.id,'PATCH',{...Object.fromEntries(new FormData(f)),participants:quickPeople,version:e.version});}
 if(f.id==='plan-date-form'){const e=state.events.find(e=>e.id===f.dataset.id);return mutate('/api/events/'+e.id,'PATCH',{version:e.version,date:new FormData(f).get('date'),dateIntent:'dated'});}
 if(f.id==='review-form'){const w=state.works.find(w=>w.id===f.dataset.workId),r=w.reviews[person],values=Object.fromEntries(new FormData(f));const saved=await mutate('/api/reviews/'+w.id,'PATCH',{score:values.score,note:values.note,submitted:!!values.submitted,...(r.version?{version:r.version}:{})},false);if(saved)return openWork(w.id);}
 if(f.id==='work-form'){const w=state.works.find(w=>w.id===f.dataset.workId);const saved=await mutate('/api/works/'+w.id,'PATCH',{version:w.version,...Object.fromEntries(new FormData(f))},false);if(saved)return openWork(w.id);}
 if(f.id==='grant-form')return mutate('/api/chances','POST',Object.fromEntries(new FormData(f)));
 if(f.id==='demand-form')return mutate('/api/demands','POST',{...Object.fromEntries(new FormData(f)),requestId});
 if(f.id==='login-form'){try{const result=await api('/api/login','POST',Object.fromEntries(new FormData(f)));person=result.person;return refresh();}catch(e){f.querySelector('.form-error').textContent=e.message;}}
 });});
document.addEventListener('change',event=>{const e=event.target;runAction(async()=>{
 if(e.id==='visual-date')return centerAxisDate(e.value||today());
 if(e.id==='work-select'){$('#new-work-fields').hidden=!!e.value;$('#new-work-title').required=!e.value;candidateSource=null;selectedDouban=null;searchAbort?.abort();searchSequence++;return;}
 if(e.id==='quick-date'){quickDate=e.value;document.querySelectorAll('[data-date-preset]').forEach(b=>b.classList.toggle('active',shift(today(),Number(b.dataset.datePreset))===quickDate));return;}
 if(e.id==='library-year'){libraryYear=e.value;return renderLibrary();}if(e.id==='library-genre'){libraryGenre=e.value;return renderLibrary();}if(e.id==='library-score'){libraryScore=e.value;return renderLibrary();}if(e.id==='library-sort'){sort=e.value;return renderLibrary();}
 if(e.dataset.column){if(e.checked)hiddenColumns.delete(e.dataset.column);else hiddenColumns.add(e.dataset.column);localStorage.setItem('life.hiddenColumns',JSON.stringify([...hiddenColumns]));return renderLibrary();}
 if(e.dataset.selectWork){if(e.checked)selected.add(e.dataset.selectWork);else selected.delete(e.dataset.selectWork);return renderLibrary();}
 if(['work-status','work-finished','work-reveal'].includes(e.id)){const w=state.works.find(w=>w.id===e.dataset.workId),key=e.id==='work-status'?'status':e.id==='work-finished'?'finished':'reveal';await mutate('/api/works/'+w.id,'PATCH',{version:w.version,[key]:key==='status'?e.value:e.checked},false);return openWork(w.id);}
 });});
document.addEventListener('input',event=>{if(event.target.matches('[data-rating-range]'))return updateMovieRating(event.target);if(event.target.matches('.title-autosize input'))event.target.previousElementSibling.textContent=event.target.value||' ';if(event.target.id==='visual-density')return zoomAxis(Number(event.target.value));if(event.target.id==='library-search'){librarySearch=event.target.value;const pos=event.target.selectionStart;renderLibrary();$('#library-search').focus();$('#library-search').setSelectionRange(pos,pos);}if(event.target.id==='new-work-title'){candidateSource=null;selectedDouban=null;searchAbort?.abort();searchSequence++;if($('#source-candidates'))$('#source-candidates').innerHTML='';}});
document.addEventListener('dragstart',event=>{const card=event.target.closest('[data-drag-event]');if(card?.dataset.dragEvent){event.dataTransfer.setData('text/plain',card.dataset.dragEvent);event.dataTransfer.effectAllowed='move';}});
document.addEventListener('dragover',event=>{const day=event.target.closest('[data-day]');if(day){event.preventDefault();day.classList.add('drag-over');}});
document.addEventListener('dragleave',event=>{event.target.closest('[data-day]')?.classList.remove('drag-over');});
document.addEventListener('wheel',event=>{const scroll=event.target.closest('.visual-scroll');if(!scroll)return;
 event.preventDefault();
 const unit=event.deltaMode===1?16:event.deltaMode===2?scroll.clientHeight:1;
 const delta=Math.max(-160,Math.min(160,event.deltaY*unit));
 if(delta)zoomAxis((zoomFrame?zoomTarget:visualScale)*Math.exp(-delta*.003));
},{passive:false});
document.addEventListener('drop',event=>{const day=event.target.closest('[data-day]');if(!day)return;event.preventDefault();day.classList.remove('drag-over');const e=state.events.find(e=>e.id===event.dataTransfer.getData('text/plain'));if(e&&!e.demandId&&!e.chanceId)runAction(()=>mutate('/api/events/'+e.id,'PATCH',{version:e.version,date:day.dataset.day},false));});
$('#modal').addEventListener('close',()=>{searchAbort?.abort();searchSequence++;});
function planDropDate(scroll,track,x,y){
 const rect=scroll.getBoundingClientRect();if(x<rect.left||x>rect.right||y<rect.top||y>rect.bottom)return null;
 const index=T.index(track.dataset.start)+Math.floor((x-rect.left+scroll.scrollLeft-80)/visualScale);
 return Number.isFinite(index)?T.date(index):null;
}
function cancelPlanDrag(returnHome=false,reason='取消'){
 if(planDragFrame!==null){cancelAnimationFrame(planDragFrame);planDragFrame=null;}
 if(!planDrag)return;const drag=planDrag;planDrag=null;drag.fx?.report?.('结束：'+reason);clearTimeout(drag.holdTimer);drag.fx?.clear?.(drag);drag.card.classList.remove('is-plan-dragging');if(returnHome&&drag.fx&&drag.moved)drag.fx.finish(drag,false);else drag.ghost?.remove();drag.marker?.remove();
 if(drag.fx&&drag.moved)planDropClickUntil=Date.now()+300;
 if(drag.handle.hasPointerCapture?.(drag.id))drag.handle.releasePointerCapture(drag.id);
}
function beginPlanDrag(event){
 if(event.isPrimary===false)return false;
 const fx=page==='schedule'?window.CinemaConsole?.planDragUI:null,grip=event.target.closest('[data-plan-drag]'),handle=grip||(fx?event.target.closest('.plan-main'):null);if(!handle||event.button!==0||busy)return false;
 const card=handle.closest('.schedule-plan'),id=grip?.dataset.planDrag||card?.dataset.planId;
 const e=visibleEvents().find(e=>e.id===id);if(!e||!canDragPlan(e))return false;
 // The pressed card/handle must survive hover cleanup: rebuilding plans here
 // detaches them before charge, geometry measurement and pointer capture.
 cancelPlanDrag();stopAxisMotion();stopZoomMotion();hideEventHover(true,true);
 planDrag={id:event.pointerId,event:e,handle,card,startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY,moved:false,date:null,last:0,fx,pointerType:event.pointerType};
 if(fx){const drag=planDrag;fx.hold(drag);drag.holdTimer=setTimeout(()=>{if(planDrag!==drag)return;activatePlanDrag(drag);updatePlanDropTarget();},500);}
 else handle.setPointerCapture?.(event.pointerId);return true;
}
function activatePlanDrag(drag){
 if(drag.moved||planDrag!==drag)return;
 clearTimeout(drag.holdTimer);drag.moved=true;drag.card.classList.add('is-plan-dragging');drag.ghost=document.createElement('div');drag.ghost.className='plan-drag-ghost';drag.ghost.setAttribute('aria-hidden','true');drag.marker=document.createElement('div');drag.marker.className='plan-drop-marker';drag.marker.setAttribute('aria-hidden','true');document.body.append(drag.ghost,drag.marker);
 drag.fx?.pick(drag);drag.handle.setPointerCapture?.(drag.id);planDragFrame=requestAnimationFrame(tickPlanDrag);
}
function updatePlanDropTarget(){
 const drag=planDrag,scroll=$('.visual-scroll'),track=$('.visual-track');if(!drag?.moved||!scroll||!track)return;
 drag.date=planDropDate(scroll,track,drag.x,drag.y);
 if(drag.fx)drag.fx.move(drag);
 else{drag.ghost.style.transform='translate3d('+(drag.x+14)+'px,'+(drag.y+14)+'px,0)';drag.ghost.textContent=drag.event.title+' · '+(drag.date||'拖到时间轴');}
 drag.marker.hidden=!drag.date;
 if(drag.date){const rect=scroll.getBoundingClientRect(),axis=$('.single-axis')?.getBoundingClientRect(),left=rect.left+80+(T.index(drag.date)-T.index(track.dataset.start)+.5)*visualScale-scroll.scrollLeft;drag.marker.textContent=drag.date;drag.marker.style.transform='translate3d('+left+'px,'+((axis?.top||rect.bottom-60)-24)+'px,0) translateX(-50%)';}
}
function tickPlanDrag(now){
 planDragFrame=null;const drag=planDrag;if(!drag?.moved)return;
 const dt=drag.last?Math.min(.032,(now-drag.last)/1000):.016;drag.last=now;
 if(drag.fx&&typeof window.scrollBy==='function'&&window.innerHeight){const h=window.innerHeight,edge=56,speed=drag.y>=0&&drag.y<edge?-650*(1-drag.y/edge):drag.y<=h&&drag.y>h-edge?650*(1-(h-drag.y)/edge):0;if(speed){window.scrollBy(0,speed*dt);drag.highlightDate=null;}}
 const scroll=$('.visual-scroll');if(scroll){const r=scroll.getBoundingClientRect();
  if(drag.y>=r.top&&drag.y<=r.bottom&&drag.x>=r.left&&drag.x<=r.right){const edge=Math.min(70,r.width/4),speed=drag.x<r.left+edge?-700*(1-(drag.x-r.left)/edge):drag.x>r.right-edge?700*(1-(r.right-drag.x)/edge):0;if(speed){scroll.scrollLeft+=speed*dt;visualScrollLeft=scroll.scrollLeft;recycleAxisIfNeeded();}}
 }
 updatePlanDropTarget();planDragFrame=requestAnimationFrame(tickPlanDrag);
}
function movePlanDrag(event){
 const drag=planDrag;if(!drag||drag.id!==event.pointerId)return false;drag.x=event.clientX;drag.y=event.clientY;
 if(!drag.moved&&Math.hypot(drag.x-drag.startX,drag.y-drag.startY)>(drag.fx?10:6)){if(drag.fx){cancelPlanDrag(false,'长按前移动超过10px');return false;}activatePlanDrag(drag);}
 if(drag.moved){event.preventDefault();updatePlanDropTarget();}return true;
}
function endPlanDrag(event){
 const drag=planDrag;if(!drag||drag.id!==event.pointerId)return false;
 if(drag.moved){drag.x=event.clientX;drag.y=event.clientY;updatePlanDropTarget();planDropClickUntil=Date.now()+300;}
 const target=event.type==='pointercancel'?null:drag.date,id=drag.event.id,moved=drag.moved,parcel=drag.fx&&moved?drag.ghost:null;
 if(parcel)drag.ghost=null;cancelPlanDrag(false,event.type);if(parcel)drag.ghost=parcel;
 if(target)runAction(async()=>{let saved=null;try{const e=state.events.find(e=>e.id===id);if(!e||!canDragPlan(e))return;saved=await mutate('/api/events/'+id,'PATCH',{version:e.version,date:target,dateIntent:'dated'},false);if(saved&&page==='schedule')toast('已安排到 '+target);}finally{if(parcel)await drag.fx.finish(drag,!!saved);}});
 else{if(parcel)drag.fx.finish(drag,false);if(moved&&event.type!=='pointercancel')toast('未放到时间轴，日期保持不变');}return true;
}
function beginAxisPan(event){const scroll=event.target.closest('.visual-scroll');if(!scroll||event.button!==0||event.pointerType==='touch'||event.target.closest('.visual-node'))return;stopAxisMotion();stopZoomMotion();axisPan={id:event.pointerId,startX:event.clientX,left:scroll.scrollLeft,scroll,moved:false,lastX:event.clientX,lastTime:event.timeStamp||Date.now(),velocity:0};}
function moveAxisPan(event){if(!axisPan||axisPan.id!==event.pointerId)return;const delta=event.clientX-axisPan.startX;if(!axisPan.moved&&Math.abs(delta)>5){axisPan.moved=true;axisPan.scroll.classList.add('is-panning');axisPan.scroll.setPointerCapture?.(event.pointerId);hideEventHover();}if(axisPan.moved){event.preventDefault();const now=event.timeStamp||Date.now(),dt=Math.max(8,now-axisPan.lastTime);axisPan.velocity=.35*axisPan.velocity+.65*(axisPan.lastX-event.clientX)/dt*1000;axisPan.lastX=event.clientX;axisPan.lastTime=now;axisPan.scroll.scrollLeft=axisPan.left-delta;visualScrollLeft=axisPan.scroll.scrollLeft;recycleAxisIfNeeded();updateVisualRange();}}
function endAxisPan(event){if(!axisPan||axisPan.id!==event.pointerId)return;const pan=axisPan;axisPan=null;if(pan.moved){suppressAxisClickUntil=Date.now()+250;pan.scroll.classList.remove('is-panning');if(pan.scroll.hasPointerCapture?.(event.pointerId))pan.scroll.releasePointerCapture(event.pointerId);const age=(event.timeStamp||Date.now())-pan.lastTime;const speed=event.type==='pointercancel'||age>100?0:Math.max(-2400,Math.min(2400,pan.velocity));if(speed&&!reducedMotion())coastAxis(speed);}}

document.addEventListener('error',event=>{const img=event.target;if(img.matches?.('#poster-candidates img')){const button=img.closest('button');button.disabled=true;button.classList.add('poster-unavailable');img.hidden=true;const label=document.createElement('span');label.className='poster-failure';label.textContent='图片暂不可用';button.prepend(label);}else if(img.matches?.('.review-poster'))img.hidden=true;},true);
document.addEventListener('pointerdown',event=>{if(beginPlanDrag(event))return;if(event.target.closest('.visual-scroll')){clearAxisProximity();clearDensityGhost();}beginAxisPan(event);});
document.addEventListener('pointermove',event=>{if(movePlanDrag(event))return;moveAxisPan(event);if(axisPan?.moved)setAxisFlight(axisPan.velocity);else updateAxisProximity(event);},{passive:false});
document.addEventListener('touchmove',event=>{if(planDrag?.fx&&planDrag.moved)event.preventDefault();},{passive:false});
document.addEventListener('contextmenu',event=>{if(planDrag?.fx&&event.target.closest('.schedule-plan'))event.preventDefault();});
document.addEventListener('pointerup',event=>{if(endPlanDrag(event))return;endAxisPan(event);if(!motionFrame)setAxisFlight(0);if(event.target.matches('[data-rating-range]'))updateMovieRating(event.target);});document.addEventListener('pointercancel',event=>{endPlanDrag(event);endAxisPan(event);setAxisFlight(0);clearAxisProximity();});
document.addEventListener('click',event=>{if(Date.now()<planDropClickUntil||Date.now()<suppressAxisClickUntil&&event.target.closest('.visual-scroll')){event.preventDefault();event.stopImmediatePropagation();}},{capture:true});
function hoverDayTarget(target){
 const item=target.closest('[data-visual-event]'),group=target.closest('[data-day-group]');
 if(item)return showEventHover(item.dataset.visualEvent,item);
 if(group)return showDayHover(group.dataset.dayGroup,group);
 if(target.closest('.event-hover-card,.event-detail-row'))clearTimeout(hoverHideTimer);
}
const dayHoverSelector='[data-day-group],[data-visual-event],.event-hover-card,.event-detail-row';
document.addEventListener('pointerover',event=>hoverDayTarget(event.target));
document.addEventListener('pointerout',event=>{if(event.target.closest(dayHoverSelector)&&!event.relatedTarget?.closest(dayHoverSelector))hoverHideTimer=setTimeout(hideEventHover,240);});
document.addEventListener('focusin',event=>{
 hoverDayTarget(event.target);
 if(!pinnedDay&&event.target.closest('.movie-review-form')){
  const article=event.target.closest('[data-detail-event]'),e=visibleEvents().find(item=>item.id===article?.dataset.detailEvent);if(!e)return;
  pinnedDay=e.date;activeDay=e.date;clearTimeout(hoverHideTimer);
  const row=$('#event-detail-row');row.insertAdjacentHTML('afterbegin','<div class="pinned-heading"><span>'+esc(pinnedDay)+' · 已固定</span><button id="unpin-day">取消固定</button></div>');
  document.querySelectorAll('[data-day-group]').forEach(el=>{el.classList.toggle('is-pinned',el.dataset.dayGroup===pinnedDay);el.setAttribute('aria-pressed',String(el.dataset.dayGroup===pinnedDay));});
 }
});
document.addEventListener('focusout',event=>{if(event.target.closest(dayHoverSelector)&&!event.relatedTarget?.closest(dayHoverSelector))hoverHideTimer=setTimeout(hideEventHover,240);});
document.addEventListener('input',event=>{const form=event.target.closest?.('.movie-title-form');if(form){form.classList.remove('is-title-saved');form.querySelector('[type=submit]')?.setAttribute('aria-label','保存电影名');}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){cancelPlanDrag(true);hideEventHover(true);}});
document.addEventListener('lostpointercapture',event=>{if(planDrag?.id===event.pointerId)cancelPlanDrag(false,'lostpointercapture');});
window.addEventListener('blur',()=>cancelPlanDrag(false,'窗口失焦'));
window.addEventListener('pagehide',()=>cancelPlanDrag());
window.addEventListener('hashchange',()=>{const p=location.hash.slice(1);if(['schedule','movie','book','game','punishment','stats'].includes(p))go(p);});
window.addEventListener('focus',()=>{if(person&&!$('#modal').open&&!busy)refresh().catch(()=>$('#sync-status').textContent='连接中断，当前显示上次读取的数据');});
setInterval(()=>{if(person&&!document.hidden&&!$('#modal').open&&!busy)refresh().catch(()=>$('#sync-status').textContent='连接中断，当前显示上次读取的数据');},30000);
(async()=>{try{const session=await api('/api/session');preview=session.preview;person=session.person;if(!person)return renderLogin();await refresh();}catch(e){$('#main').innerHTML=`<div class="page-error">无法连接共享服务：${esc(e.message)}。请启动本地服务器后刷新。</div>`;}})();
