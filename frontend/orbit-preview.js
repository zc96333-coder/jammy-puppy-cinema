/* Isolated, read-only visual exploration. Local drag changes never call a write API. */
(()=>{
 'use strict';
 const $=s=>document.querySelector(s),G=OrbitGeometry,T=TimelineEngine;
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const icon=k=>'<svg aria-hidden="true"><use href="#pixel-'+(k||'other')+'"/></svg>';
 const palette={movie:'#e7b783',book:'#a4bea5',game:'#c9b17b',other:'#bca5c1',punishment:'#d59b88'};
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const orbit=$('#orbit'),model={center:T.index(today),scale:36,width:1000,height:370},target={center:model.center,scale:model.scale};
 let events=[],works=new Map(),groups=new Map(),pinned=null,hovered=null,drag=null,pan=null,velocity=0,frame=0,last=0,suppress=0;
 const pools={dates:new Map(),events:new Map(),months:new Map()};
 $('#today-number').textContent=today.slice(5).replace('-','.');$('#today-year').textContent=today.slice(0,4);
 function makeSpace(){
  let seed=641;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  let html='';for(let i=0;i<110;i++){const cross=i%19===0,x=rand()*100,y=rand()*100,o=.1+rand()*.35;html+='<i class="space-star '+(cross?'cross':'')+'" style="left:'+x+'%;top:'+y+'%;--o:'+o+'" data-depth="'+(.03+rand()*.06)+'">'+(cross?'<svg><use href="#pixel-star"/></svg>':'')+'</i>';}
  html+='<div class="space-object pixel-constellation" data-depth=".06"><svg viewBox="0 0 160 90"><path d="M8 55L35 25L78 42L112 12L148 29"/><g><rect x="6" y="53" width="4" height="4"/><rect x="32" y="22" width="6" height="6"/><rect x="76" y="40" width="4" height="4"/><rect x="109" y="9" width="6" height="6"/><rect x="146" y="27" width="4" height="4"/></g></svg></div>';
  html+='<div class="space-object pixel-planet" data-depth=".1"><svg><use href="#pixel-planet"/></svg></div>';
  html+='<div class="space-object space-asteroid" data-depth=".08"><svg viewBox="0 0 20 20"><path fill="currentColor" d="M4 2h10v3h4v10h-4v3H4v-4H1V6h3z"/><path fill="#211c17" d="M5 5h4v4H5zm7 6h3v3h-3z"/></svg></div>';
  html+='<div class="space-object space-moon" data-depth=".04"><svg viewBox="0 0 24 28"><path fill="currentColor" d="M9 2h9v3h3v18h-3v3H9v-3H5v-4H2V9h3V5h4z"/><path fill="#282119" d="M13 4h5v3h3v14h-3v3h-5v-4H9V8h4z"/></svg></div>';
  $('#space').innerHTML=html;
 }
 function syncNodes(kind,specs){
  const pool=pools[kind],container=$('#'+kind),keep=new Set();
  for(const s of specs){keep.add(s.key);let node=pool.get(s.key);if(!node){node=document.createElement(s.tag||'button');if(node.tagName==='BUTTON')node.type='button';pool.set(s.key,node);container.append(node);}
   if(node._html!==s.html){node.innerHTML=s.html;node._html=s.html;}node.className=s.className;node.style.transform='translate3d('+s.x+'px,'+s.y+'px,0) scale('+s.size+')';node.style.opacity=s.opacity??1;
   if(s.tone)node.style.setProperty('--tone',s.tone);for(const [key,value]of Object.entries(s.data||{}))node.dataset[key]=value;
   if(s.label)node.setAttribute('aria-label',s.label);if(s.pressed!==undefined)node.setAttribute('aria-pressed',String(s.pressed));
  }
  for(const [key,node]of pool)if(!keep.has(key)){node.remove();pool.delete(key);}
 }
 function groupEvents(){
  const [start,end]=G.bounds(model);groups=T.groups(events,model.scale,start,end-start+1);
 }
 function draw(){
  const {width,height}=model;$('#rail').setAttribute('viewBox','0 0 '+width+' '+height);
  let path='';for(let x=-20;x<=width+20;x+=16){const p=G.project(G.unproject(x,model),model);path+=(path?'L':'M')+p.x.toFixed(2)+' '+p.y.toFixed(2)+' ';}
  document.querySelectorAll('#rail path').forEach(p=>p.setAttribute('d',path));$('#rail .rail-edge').setAttribute('transform','translate(0 3)');
  const [start,end]=G.bounds(model),dateSpecs=[],eventSpecs=[],monthSpecs=[],step=model.scale>=24?1:model.scale>=8?7:0;
  if(step)for(let day=start;day<=end;day++){if(step===7&&new Date(day*86400000).getUTCDay()!==1)continue;
   const date=T.date(day),p=G.project(day,model);dateSpecs.push({key:date,className:'date-node'+(date===today?' today':''),html:date.slice(8).replace(/^0/,''),x:p.x,y:p.y+11,size:p.size,opacity:.65+p.size*.35,data:{date},label:date+'，预览日期'});
  }
  const tp=G.project(T.index(today),model);dateSpecs.push({key:'today',tag:'span',className:'today-beacon',html:'',x:tp.x,y:tp.y,size:tp.size,label:'今天 '+today});
  let future='';if(tp.x<width){for(let x=Math.max(0,tp.x);x<=width+20;x+=12){const p=G.project(G.unproject(x,model),model);future+=(future?'L':'M')+p.x.toFixed(2)+' '+p.y.toFixed(2)+' ';}}$('#rail .rail-future').setAttribute('d',future);
  groupEvents();for(const [key,items]of groups){const p=G.project(T.index(key),model),e=items[0];
   if(p.x<-40||p.x>width+40)continue;eventSpecs.push({key,className:'event-node'+(pinned===key?' pinned':''),tone:palette[e.kind],html:icon(e.kind)+(model.scale>=36?'<span class="event-name">'+esc(e.kind==='punishment'?'惩罚':e.title)+'</span>':'')+(items.length>1?'<span class="event-count">'+items.length+'</span>':''),x:p.x,y:p.y-48*p.size,size:p.size,opacity:.55+p.size*.45,data:{group:key},label:key+'，'+items.map(e=>e.title).join('、'),pressed:pinned===key});
  }
  for(const m of T.months(start,end-start+1)){const first=T.index(m.month+'-01'),middle=first+(m.lastDay-1)/2,p=G.project(middle,model);if(p.x<-120||p.x>width+120)continue;monthSpecs.push({key:m.month,className:'month-node',html:(model.scale<8?m.month.slice(0,4)+' · ':'')+Number(m.month.slice(5))+' 月',x:p.x,y:p.y+78,size:Math.max(.85,p.size),data:{month:m.month},label:m.month+'，移到本月中间'});}
  syncNodes('dates',dateSpecs);syncNodes('events',eventSpecs);syncNodes('months',monthSpecs);
  const shift=G.clamp((model.center-T.index(today))*model.scale,-8000,8000);document.querySelectorAll('[data-depth]').forEach(n=>n.style.setProperty('--parallax',G.clamp(-shift*Number(n.dataset.depth),-70,70)+'px'));
  if(drag)updateDrop();
 }
 function schedule(){if(!frame){last=performance.now();frame=requestAnimationFrame(tick);}}
 function tick(now){
  const dt=Math.min(.032,Math.max(.001,(now-last)/1000));last=now;frame=0;let active=false;
  if(!pan&&!drag&&Math.abs(velocity)>.02){target.center+=velocity*dt;velocity*=Math.exp(-6*dt);active=true;}
  if(drag){const r=orbit.getBoundingClientRect();if(drag.y>=r.top&&drag.y<=r.bottom&&drag.x>=r.left&&drag.x<=r.right){const local=drag.x-r.left,edge=Math.min(65,r.width/4),v=local<edge?-(1-local/edge):local>r.width-edge?1-(r.width-local)/edge:0;if(v){target.center+=v*480/model.scale*dt;active=true;}}}
  const k=reduced.matches?1:1-Math.exp(-18*dt),dc=target.center-model.center,ds=target.scale-model.scale;
  if(Math.abs(dc)>.0001||Math.abs(ds)>.001){model.center+=dc*k;model.scale+=ds*k;active=true;}else{model.center=target.center;model.scale=target.scale;}
  draw();if(active||drag)frame=requestAnimationFrame(tick);
 }
 function resize(){const r=orbit.getBoundingClientRect();model.width=r.width;model.height=r.height;draw();}
 function timing(e){return e.date|| (e.dateIntent==='future'?'未来':'暂不确定');}
 function plans(){return events.filter(e=>e.state==='plan');}
 function showPlans(){
  if(pinned)return;$('#dock-title').textContent='还想做的事';$('#close-detail').hidden=true;
  const list=plans();$('#dock-content').innerHTML=list.length?'<div class="plan-grid">'+list.slice(0,6).map(e=>'<button class="plan-card" data-plan="'+esc(e.id)+'" style="--tone:'+palette[e.kind]+'">'+icon(e.kind)+'<span><strong>'+esc(e.title)+'</strong><small>'+esc(timing(e))+' · '+(e.participants===1?'puppy':e.participants===2?'jammy':'一起')+'</small></span><span class="drag-grip" data-drag="'+esc(e.id)+'" aria-hidden="true">⠿</span></button>').join('')+'</div>':'<p class="empty">暂时没有计划。可悬停或点击轨道上的记录。</p>';
 }
 function detail(list,index=0){
  const e=list[index];if(!e)return;const w=works.get(e.workId);$('#dock-title').textContent=e.title;$('#close-detail').hidden=!pinned;
  const metadata=[timing(e),w?.year,w?.director].filter(Boolean);$('#dock-content').innerHTML='<div class="detail-facts">'+metadata.map(x=>'<span>'+esc(x)+'</span>').join('')+(list.length>1?list.map((x,i)=>'<button data-detail-index="'+i+'" aria-pressed="'+(i===index)+'">'+icon(x.kind)+'</button>').join(''):'')+'</div>'+(w?'<div class="review-pair">'+['puppy','jammy'].map(p=>{const review=w.reviews?.[p];return '<section><label>'+p+'</label><strong>'+(review?.hidden?'· · ·':review?.score!=null?Number(review.score).toFixed(1):'—')+'</strong><p>'+esc(review?.hidden?'尚未揭晓':review?.note||'')+'</p></section>';}).join('')+'</div>':'<p class="empty">'+esc(e.note||'')+'</p>')+'<p class="preview-note">只读预览；评价和作品编辑仍在原版网站中。</p>';
  $('#dock-content')._items=list;
 }
 orbit.addEventListener('pointerover',e=>{const b=e.target.closest('[data-group]');if(b&&!pinned&&!drag&&!pan){hovered=b.dataset.group;detail(groups.get(hovered)||[]);}});
 orbit.addEventListener('pointerleave',()=>{hovered=null;if(!pinned&&!drag)showPlans();});
 orbit.addEventListener('click',e=>{
  if(performance.now()<suppress)return;const group=e.target.closest('[data-group]'),month=e.target.closest('[data-month]'),date=e.target.closest('[data-date]');
  if(group){const key=group.dataset.group;if(pinned===key){pinned=null;showPlans();}else{pinned=key;detail(groups.get(key)||[]);}draw();}
  else if(month){const [year,m]=month.dataset.month.split('-').map(Number),next=new Date(Date.UTC(year,m,1)),lastDay=new Date(next-86400000).getUTCDate();target.center=T.index(month.dataset.month+'-01')+(lastDay-1)/2;schedule();}
  else if(date){$('#notice').textContent=date.dataset.date+' · 日期落点预览；正式添加仍在原版网站中。';}
 });
 $('#close-detail').addEventListener('click',()=>{pinned=null;showPlans();draw();});
 $('#dock-content').addEventListener('click',e=>{if(performance.now()<suppress)return;const item=e.target.closest('[data-detail-index]'),plan=e.target.closest('[data-plan]');if(item)detail($('#dock-content')._items,Number(item.dataset.detailIndex));else if(plan){const event=events.find(x=>x.id===plan.dataset.plan);pinned='plan:'+event.id;detail([event]);}});
 orbit.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button'))return;velocity=0;target.center=model.center;target.scale=model.scale;const x=e.clientX-orbit.getBoundingClientRect().left;pan={id:e.pointerId,start:e.clientX,day:G.unproject(x,model),x:e.clientX,time:e.timeStamp,moved:false};orbit.setPointerCapture(e.pointerId);});
 orbit.addEventListener('pointermove',e=>{if(!pan||pan.id!==e.pointerId)return;const r=orbit.getBoundingClientRect();if(Math.abs(e.clientX-pan.start)>4)pan.moved=true;if(!pan.moved)return;e.preventDefault();orbit.classList.add('is-panning');const center=G.grabCenter(pan.day,e.clientX-r.left,model),dt=Math.max(8,e.timeStamp-pan.time);velocity=.4*velocity+.6*(center-model.center)/dt*1000;model.center=target.center=center;pan.time=e.timeStamp;pan.x=e.clientX;draw();});
 function stopPan(e){if(!pan||pan.id!==e.pointerId)return;const moved=pan.moved;if(e.type==='pointercancel'||e.timeStamp-pan.time>100||reduced.matches)velocity=0;pan=null;orbit.classList.remove('is-panning');if(orbit.hasPointerCapture(e.pointerId))orbit.releasePointerCapture(e.pointerId);if(moved){suppress=performance.now()+180;schedule();}}
 orbit.addEventListener('pointerup',stopPan);orbit.addEventListener('pointercancel',stopPan);
 orbit.addEventListener('wheel',e=>{e.preventDefault();velocity=0;const unit=e.deltaMode===1?16:e.deltaMode===2?model.height:1;target.scale=G.clamp(target.scale*Math.exp(-G.clamp(e.deltaY*unit,-120,120)*.003),2,120);schedule();},{passive:false});
 orbit.addEventListener('keydown',e=>{if(e.target!==orbit)return;if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();velocity=0;target.center+=e.key==='ArrowRight'?2:-2;schedule();}if(['+','=','-'].includes(e.key)){e.preventDefault();target.scale=G.clamp(target.scale*(e.key==='-'?.8:1.25),2,120);schedule();}});
 function goToday(){velocity=0;target.center=T.index(today);schedule();}
 $('#today').addEventListener('click',goToday);$('#previous').addEventListener('click',()=>{velocity=0;target.center-=Math.max(3,model.width/model.scale*.55);schedule();});$('#next').addEventListener('click',()=>{velocity=0;target.center+=Math.max(3,model.width/model.scale*.55);schedule();});
 function updateDrop(){if(!drag)return;const r=orbit.getBoundingClientRect(),valid=drag.x>=r.left&&drag.x<=r.right&&drag.y>=r.top&&drag.y<=r.bottom;drag.day=valid?Math.round(G.unproject(drag.x-r.left,model)):null;drag.ghost.style.transform='translate3d('+(drag.x+12)+'px,'+(drag.y+12)+'px,0)';drag.ghost.textContent=drag.event.title+(valid?' · '+T.date(drag.day):'');const marker=$('#drop-preview');marker.hidden=!valid;if(valid){const p=G.project(drag.day,model);marker.style.transform='translate3d('+p.x+'px,'+(p.y-25)+'px,0)';marker.textContent=T.date(drag.day);}}
 function stopDrag(cancel=false){if(!drag)return;const d=drag;drag=null;d.card.classList.remove('is-dragging');d.ghost.remove();$('#drop-preview').hidden=true;if(d.handle.hasPointerCapture(d.id))d.handle.releasePointerCapture(d.id);suppress=performance.now()+200;
  if(!cancel&&d.day!==null){d.event.date=T.date(d.day);d.event.dateIntent='dated';$('#notice').textContent='预览安排到 '+d.event.date+' · 未写入真实记录';pinned=null;showPlans();draw();}else $('#notice').textContent='未安排日期，真实记录没有改变。';}
 $('#dock-content').addEventListener('pointerdown',e=>{const h=e.target.closest('[data-drag]');if(!h||e.button!==0)return;e.preventDefault();pinned=null;velocity=0;const event=events.find(x=>x.id===h.dataset.drag);if(!event)return;const ghost=document.createElement('div');ghost.className='drag-ghost';ghost.setAttribute('aria-hidden','true');document.body.append(ghost);drag={id:e.pointerId,handle:h,card:h.closest('.plan-card'),event,ghost,x:e.clientX,y:e.clientY,day:null};drag.card.classList.add('is-dragging');h.setPointerCapture(e.pointerId);schedule();});
 document.addEventListener('pointermove',e=>{if(drag&&drag.id===e.pointerId){e.preventDefault();drag.x=e.clientX;drag.y=e.clientY;updateDrop();}},{passive:false});
 document.addEventListener('pointerup',e=>{if(drag&&drag.id===e.pointerId){drag.x=e.clientX;drag.y=e.clientY;updateDrop();stopDrag();}});
 document.addEventListener('pointercancel',()=>stopDrag(true));document.addEventListener('keydown',e=>{if(e.key==='Escape'){stopDrag(true);pinned=null;showPlans();draw();}});
 window.addEventListener('blur',()=>{stopDrag(true);pan=null;velocity=0;orbit.classList.remove('is-panning');});
 const fallback=()=>{const names=['登堂入室','分手的决心','饮食男女','被解救的姜戈'];return names.map((title,i)=>({id:'demo-'+i,kind:'movie',title,date:T.date(T.index(today)-11+i*3),state:'done',participants:3}));};
 async function load(){
  let real=false;try{const response=await fetch('/api/state',{headers:{'X-Preview-Person':'puppy'},credentials:'same-origin'});if(!response.ok)throw Error();const snapshot=await response.json();works=new Map(snapshot.works.filter(w=>!w.deleted).map(w=>[w.id,w]));events=snapshot.events.filter(e=>!e.deleted&&(!e.workId||works.has(e.workId))).map(e=>({...e,title:works.get(e.workId)?.title||e.title}));real=true;}catch{events=fallback();}
  if(!plans().length)events.push({id:'preview-game',kind:'game',title:'杀戮尖塔2',date:'',dateIntent:'future',state:'plan',participants:3,demo:true},{id:'preview-other',kind:'other',title:'看一场流星雨',date:'',dateIntent:'unsure',state:'plan',participants:3,demo:true});
  $('#source-status').textContent=real?'共享记录 · 只读预览':'演示记录 · 未连接共享服务';if(events.some(e=>e.demo))$('#notice').textContent='无计划时提供两条演示计划，可拖上轨道；不会写入真实记录。';showPlans();draw();
 }
 makeSpace();new ResizeObserver(resize).observe(orbit);resize();load();
})();
