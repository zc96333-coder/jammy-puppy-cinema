/* Lower console choreography only; no form handlers, API calls or timeline work. */
(()=>{
 'use strict';
 const shouldSwitch=(previous,next)=>previous!==null&&previous!==next;
 const text=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const stepIndex=step=>['date','confirm','state'].includes(step)?1:0;
 function parcelTiles(width,height){
  const cols=Math.max(4,Math.min(12,Math.ceil(width/24))),rows=Math.max(2,Math.min(6,Math.ceil(height/(width/cols))));
  return Array.from({length:cols*rows},(_,i)=>{const col=i%cols,row=Math.floor(i/cols);return {x:col*width/cols,y:row*height/rows,w:width/cols,h:height/rows,tx:col*24/cols,ty:row*24/rows,sx:24/width,sy:24/height,delay:((col*3+row*5)%5)*12};});
 }
 function stepsHTML({step,content='',contentStep='work',dateLabel='暂不确定',ready=false,dateReady=false}){
  const active=stepIndex(step),items=[{label:'内容',value:contentStep,note:content||'选择内容',done:ready},{label:'日期',value:'date',note:dateLabel,done:dateReady}];
  // Future questions stay absent, rather than appearing as disabled choices.
  return items.slice(0,active+1).map((item,i)=>'<button type="button" class="'+(i===active?'console-step-port is-active':'console-step-crumb is-complete')+'" data-composer="back" data-value="'+text(item.value)+'" aria-current="'+(i===active?'step':'false')+'"><i aria-hidden="true"></i><span>'+ (i===active?item.label+'<small>'+text(item.note)+'</small>':text(item.note))+'</span></button>').join('');
 }
 const channelsHTML=(active,labels,artwork)=>'<nav class="console-channel-bus" aria-label="活动通道"><h3 class="console-channel-heading"'+(active?' hidden':'')+'>做什么？</h3>'+['movie','book','game','other','punishment'].map(kind=>'<button type="button" class="console-channel" data-composer="kind" data-value="'+kind+'" aria-pressed="'+(kind===active)+'"'+(active&&kind!==active?' hidden':'')+'><span class="console-port" aria-hidden="true">'+artwork({kind})+'</span><span>'+labels[kind]+'</span><i class="console-port-light" aria-hidden="true"></i></button>').join('')+'<button type="button" class="console-change-channel" data-composer="back" data-value="category"'+(!active?' hidden':'')+'>更换</button></nav><svg class="console-channel-link" aria-hidden="true"><path pathLength="100"/></svg>';
 window.CinemaConsole={shouldSwitch,channelsHTML,stepsHTML,stepIndex,parcelTiles};
 if(typeof document==='undefined')return;
 const root=document.querySelector('#main');if(!root)return;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 let parcelMotionOverride=false;
 const parcelMotionEnabled=()=>!reduced.matches||parcelMotionOverride;
 let diagnosticNode=null,diagnosticPhase='待长按',diagnosticSample='';
 function reportParcel(phase){diagnosticPhase=phase;if(diagnosticNode)diagnosticNode.textContent='动效诊断 R4 · '+(reduced.matches?'减少动态':'普通动态')+' · '+diagnosticPhase+(diagnosticSample?' · '+diagnosticSample:'');}
 function sampleParcel(drag){
  if(typeof setTimeout!=='function')return;
  drag.diagnosticTimer=setTimeout(()=>{
   const motions=drag.pickMotions||[],running=motions.filter(m=>m.playState==='running'),first=motions.find(m=>m.effect?.target?.classList?.contains('pixel-parcel-cell'))||motions[0];
   const cell=drag.foldMesh?.children?.[0],paint=cell&&typeof getComputedStyle==='function'?getComputedStyle(cell):null;
   diagnosticSample=(drag.sourceGeometry||'')+' / 动画 '+motions.length+' / 运行 '+running.length+' / 计时 '+Math.round(Number(first?.currentTime)||0)+'ms'+(paint?' / 像素 '+paint.width+'×'+paint.height+' 透明度 '+paint.opacity:'');reportParcel(diagnosticPhase);
  },240);
 }
 const parcels=new Set(),parcelMotions=new Set();
 function parcelAnimate(node,frames,duration,delay=0,easing='cubic-bezier(.23,1,.32,1)'){
  if(!node?.animate||!parcelMotionEnabled())return null;
  let motion;try{motion=node.animate(frames,{duration,delay,easing,fill:'both'});}catch(error){reportParcel('动画报错：'+error.message);throw error;}parcelMotions.add(motion);
  Promise.resolve(motion.finished).then(()=>parcelMotions.delete(motion),()=>parcelMotions.delete(motion));return motion;
 }
 function parcelIcon(kind){return window.CinemaPixel?.icon?.(({movie:'film',book:'book',game:'game',other:'other',punishment:'gift'})[kind]||'other')||'';}
 function clearHold(drag){drag.card.classList.remove('is-plan-holding');drag.charge?.remove();drag.charge=null;for(const m of drag.chargeMotions||[])m.cancel?.();drag.chargeMotions=[];}
 const planDragUI={
  report:reportParcel,
  motionState(){return {systemReduced:reduced.matches,explicitlyEnabled:parcelMotionOverride,enabled:parcelMotionEnabled()};},
  hold(drag){
   diagnosticSample='';reportParcel('已触发长按 · 动画接口 '+(typeof drag.card.animate));
   drag.card.classList.add('is-plan-holding');const charge=document.createElement('span');charge.className='pixel-plan-charge';charge.setAttribute('aria-hidden','true');drag.charge=charge;drag.chargeMotions=[];
   for(let i=0;i<6;i++){const dot=document.createElement('i');charge.append(dot);const m=parcelAnimate(dot,[{opacity:.15},{opacity:1}],70,i*70);if(m)drag.chargeMotions.push(m);}drag.card.append(charge);
  },
  pick(drag){
   reportParcel('开始收合');
   clearHold(drag);drag.ghost.classList.add('pixel-plan-parcel');drag.marker.classList.add('pixel-plan-date');const core=document.createElement('span');core.className='pixel-parcel-core';core.innerHTML=parcelIcon(drag.event.kind);drag.ghost.append(core);parcels.add(drag.ghost);
   drag.pickMotions=[];drag.grains=[];
   const rect=drag.card.getBoundingClientRect(),anchor=drag.pointerType==='touch'?{x:drag.x-12,y:drag.y-48}:{x:drag.x+14,y:drag.y-28};
   drag.sourceGeometry='原卡 '+Math.round(rect.width)+'×'+Math.round(rect.height)+' / '+(drag.card.isConnected===false?'已脱离页面':'仍在页面');
   drag.parcelX=anchor.x;drag.parcelY=anchor.y;
   drag.ghost.style.transform='translate3d('+anchor.x+'px,'+anchor.y+'px,0)';
   if(parcelMotionEnabled()){
    // Crossfade the real record into a full-footprint pixel mesh, then gather
    // every cell into the SAME 24px parcel. No clipping/wiping or layout edits.
    drag.folding=true;drag.cardPaint={visibility:drag.card.style.visibility||'',transformOrigin:drag.card.style.transformOrigin||''};
    drag.card.style.transformOrigin=(drag.x-rect.left)+'px '+(drag.y-rect.top)+'px';drag.card.classList.add('is-plan-folding');
    const fold=parcelAnimate(drag.card,[{transform:'scale(1)',opacity:1},{transform:'scale(.94)',opacity:.8,offset:.45},{transform:'scale(.84)',opacity:0}],220);
    if(fold)drag.pickMotions.push(fold);
    const mesh=document.createElement('span');mesh.className='pixel-parcel-mesh';drag.ghost.append(mesh);drag.foldMesh=mesh;
    for(const tile of parcelTiles(rect.width,rect.height)){
     const cell=document.createElement('i');cell.className='pixel-parcel-cell';Object.assign(cell.style,{width:tile.w+'px',height:tile.h+'px'});mesh.append(cell);
     const start='translate('+Math.round(rect.left-anchor.x+tile.x)+'px,'+Math.round(rect.top-anchor.y+tile.y)+'px) scale(1)',end='translate('+tile.tx+'px,'+tile.ty+'px) scale('+tile.sx+','+tile.sy+')';
     const m=parcelAnimate(cell,[{transform:start,opacity:0},{transform:start,opacity:.95,offset:.2},{transform:end,opacity:1,offset:.92},{transform:end,opacity:0}],640,tile.delay,'cubic-bezier(.65,0,.25,1)');if(m)drag.pickMotions.push(m);
    }
    const m=parcelAnimate(core,[{opacity:0,transform:'scale(.8)'},{opacity:1,transform:'scale(1)'}],120,540);if(m)drag.pickMotions.push(m);
   }
   reportParcel('收合已创建 '+drag.pickMotions.length+' 段');sampleParcel(drag);
  },
  move(drag){
   const x=drag.x+(drag.pointerType==='touch'?-12:14),y=drag.y-(drag.pointerType==='touch'?48:28);
   drag.parcelX=!parcelMotionEnabled()?x:(drag.parcelX??x)+(x-(drag.parcelX??x))*.55;drag.parcelY=!parcelMotionEnabled()?y:(drag.parcelY??y)+(y-(drag.parcelY??y))*.55;
   drag.ghost.style.transform='translate3d('+drag.parcelX+'px,'+drag.parcelY+'px,0)';drag.ghost.classList.toggle('is-over-axis',!!drag.date);
   if(drag.highlightDate!==drag.date){drag.highlight?.classList.remove('is-plan-drop-target');drag.highlightDate=drag.date;drag.highlight=drag.date?root.querySelector('.axis-date[data-day="'+drag.date+'"]'):null;drag.highlight?.classList.add('is-plan-drop-target');
    const tick=drag.highlight?.querySelector('.axis-tick')?.getBoundingClientRect();drag.dropPoint=tick?{x:tick.left+tick.width/2,y:tick.top+tick.height/2}:null;
   }
  },
  clear(drag){
   if(typeof clearTimeout==='function')clearTimeout(drag.diagnosticTimer);
   clearHold(drag);if(drag.ghost)parcels.delete(drag.ghost);drag.highlight?.classList.remove('is-plan-drop-target');drag.folding=false;for(const m of drag.pickMotions||[])m.cancel?.();drag.foldMesh?.remove();const core=drag.ghost?.querySelector('.pixel-parcel-core');if(core)core.style.opacity='1';if(drag.cardPaint)Object.assign(drag.card.style,drag.cardPaint);drag.card.classList.remove('is-plan-folding');
  },
  async finish(drag,saved){
   const ghost=drag.ghost;if(!ghost)return;
   const home=root.querySelector('[data-plan-id="'+drag.event.id+'"]')||drag.card,node=saved&&root.querySelector('[data-day-group="'+drag.date+'"]');
   const rect=(node||(!saved&&home))?.getBoundingClientRect?.(),point=rect?{x:node?rect.left+rect.width/2:rect.left+38,y:rect.top+rect.height/2}:saved?drag.dropPoint:null;
   try{
    if(point&&parcelMotionEnabled()&&document.body.classList.contains('visual-schedule-page')){
     const to='translate3d('+(point.x-12)+'px,'+(point.y-12)+'px,0)',m=parcelAnimate(ghost,[{transform:ghost.style.transform,opacity:1},{transform:to+' scale('+(saved?'.3':'1')+')',opacity:0}],saved?200:240);
     if(m)try{await m.finished;}catch{}
     if(saved&&node){const glyph=node.querySelector('svg:not(.pin-orbit)');const glow=parcelAnimate(glyph,[{opacity:.4},{opacity:1}],200);if(glow)Promise.resolve(glow.finished).then(()=>glow.cancel?.(),()=>{});}
     else if(!saved&&home?.isConnected){const restore=parcelAnimate(home,[{opacity:.6},{opacity:1}],160);if(restore)Promise.resolve(restore.finished).then(()=>restore.cancel?.(),()=>{});}
    }
   }finally{ghost.remove();parcels.delete(ghost);}
  }
 };
 window.CinemaConsole.planDragUI=planDragUI;
 const pixelJobs=new Set();let transitionId=0;
 function cancelPixels(){for(const job of [...pixelJobs])job.cancel();}
 function pixelMotion(target,exit=false,delay=0){
  if(!target?.animate||reduced.matches)return null;
  const animation=target.animate(exit?[{opacity:1},{opacity:0}]:[{opacity:.35,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:exit?80:180,delay,easing:'cubic-bezier(.23,1,.32,1)',fill:'both'});
  const job={animation,cancel(){animation.cancel?.();pixelJobs.delete(job);}};pixelJobs.add(job);
  Promise.resolve(animation.finished).then(()=>job.cancel(),()=>pixelJobs.delete(job));return animation;
 }
 function screenMotion(scope,exit=false){
  if(!scope||reduced.matches)return null;
  // The instrument housing stays still; only the current prompt/data refreshes.
  const targets=[...(scope.querySelectorAll?.('h3,.console-port,.composer-choices,.form-group,.plan-title')||[])].filter(node=>!node.closest?.('[hidden]')).slice(0,4);
  const motions=targets.map((node,i)=>pixelMotion(node,exit,exit?0:Math.min(i,2)*25)).filter(Boolean);
  if(!motions.length)return null;
  return {finished:Promise.all(motions.map(m=>m.finished)),cancel(){motions.forEach(m=>m.cancel?.());}};
 }
 async function transition(change){
  const id=++transitionId;cancelPixels();
  const workspace=root.querySelector('[data-console] .console-workspace'),step=workspace?.dataset.step;
  const target=step?workspace.querySelector('[data-composer-step="'+step+'"]'):root.querySelector('[data-console]')||root.querySelector('#schedule-plans .schedule-plan-list');
  const exit=screenMotion(target,true);if(exit)try{await exit.finished;}catch{}
  if(id!==transitionId||target?.isConnected===false)return;
  return change();
 }
 let linkFrame=0,linkMotion=null,workspaceMotion=null,stepLinkMotion=null,stepMotion=null,activeChannel=null;
 function updateSteps(data){
  const workspace=root.querySelector('[data-console] .console-workspace');if(!workspace)return;
  const previous=workspace.dataset.step;workspace.dataset.step=data.step==='category'?'':data.step;
  let ports=workspace.querySelector('.console-step-bus'),svg=workspace.querySelector('.console-step-link');
  if(!ports){ports=document.createElement('nav');ports.className='console-step-bus';ports.setAttribute('aria-label','记录步骤接口');workspace.querySelector('form')?.before(ports);}
  if(!svg){svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','console-step-link');svg.setAttribute('aria-hidden','true');const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('pathLength','100');svg.append(path);workspace.append(svg);}
  ports.hidden=svg.hidden=data.step==='category';if(data.step==='category'){if(data.animate)screenMotion(root.querySelector('[data-console]'));return;}
  ports.innerHTML=stepsHTML(data);
  workspace.dataset.stage=data.step==='date'?'03':'02';
  if(!linkFrame)linkFrame=requestAnimationFrame(drawLink);
  if(data.animate&&previous!==data.step&&!reduced.matches){stop(stepLinkMotion);stop(stepMotion);stepLinkMotion=svg.querySelector('path').animate?.([{strokeDashoffset:100,opacity:.3},{strokeDashoffset:0,opacity:1}],{duration:260,easing:'ease-out'});stepMotion=screenMotion(workspace.querySelector('[data-composer-step="'+data.step+'"]'));}
 }
 function drawStepLink(workspace){
  const port=workspace.querySelector('.console-step-port.is-active'),step=workspace.dataset.step,section=step&&workspace.querySelector('[data-composer-step="'+step+'"]'),svg=workspace.querySelector('.console-step-link');if(!port||!section||!svg||svg.hidden)return;
  const box=workspace.getBoundingClientRect(),a=port.getBoundingClientRect(),b=section.getBoundingClientRect(),sx=a.left+a.width/2-box.left,sy=a.bottom-box.top,tx=b.left-box.left-8,ty=b.top-box.top+12;
  svg.setAttribute('viewBox','0 0 '+box.width+' '+box.height);svg.querySelector('path').setAttribute('d','M'+sx+' '+sy+'V'+(sy+ty)/2+'H'+tx+'V'+ty);
 }
 function setChannel(kind){
  const panel=root.querySelector('[data-console]');if(!panel)return;
  const previous=panel.dataset.channel||'';panel.dataset.channel=kind||'';activeChannel=kind;
  panel.querySelectorAll('.console-channel').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.value===kind));button.hidden=!!kind&&button.dataset.value!==kind;});
  const change=panel.querySelector('.console-change-channel');if(change)change.hidden=!kind;
  const heading=panel.querySelector('.console-channel-heading');if(heading)heading.hidden=!!kind;
  if(!kind){const path=panel.querySelector('.console-channel-link path');stop(linkMotion);if(previous&&!reduced.matches)linkMotion=path?.animate?.([{opacity:1,strokeDashoffset:0},{opacity:0,strokeDashoffset:100}],{duration:160,easing:'cubic-bezier(.23,1,.32,1)'});return;}
  if(!linkFrame)linkFrame=requestAnimationFrame(drawLink);
 }
 function drawLink(){
  linkFrame=0;const panel=root.querySelector('[data-console]'),button=panel?.querySelector('.console-channel[aria-pressed="true"]'),workspace=panel?.querySelector('.console-workspace'),svg=panel?.querySelector('.console-channel-link');if(!button||!workspace||!svg||!activeChannel)return;
  const box=panel.getBoundingClientRect(),port=button.getBoundingClientRect(),target=workspace.getBoundingClientRect(),horizontal=target.left>port.right;
  const sx=(horizontal?port.right:port.left+port.width/2)-box.left,sy=(horizontal?port.top+port.height/2:port.bottom)-box.top,tx=(horizontal?target.left:target.left+target.width/2)-box.left,ty=(horizontal?target.top+36:target.top)-box.top;
  const d=horizontal?'M'+sx+' '+sy+'H'+(sx+tx)/2+'V'+ty+'H'+tx:'M'+sx+' '+sy+'V'+(sy+ty)/2+'H'+tx+'V'+ty;
  svg.setAttribute('viewBox','0 0 '+box.width+' '+box.height);svg.querySelector('path').setAttribute('d',d);
  drawStepLink(workspace);
 }
 function connect(kind){
  setChannel(kind);const panel=root.querySelector('[data-console]'),workspace=panel?.querySelector('.console-workspace'),path=panel?.querySelector('.console-channel-link path');stop(linkMotion);stop(workspaceMotion);
  if(!reduced.matches){linkMotion=path?.animate?.([{strokeDashoffset:100,opacity:.3},{strokeDashoffset:0,opacity:1}],{duration:280,easing:'ease-out'});workspaceMotion=screenMotion(panel);}
 }
 Object.assign(window.CinemaConsole,{setChannel,connect,updateSteps,transition});
 let frame=0,plans=null,row=null,lastMode=null,lastDetail=null,lastTab=null;
 let indicatorMotion=null,surfaceMotion=null,detailMotion=null,saveMotion=null;
 const jobs=[];
 const stop=animation=>animation?.cancel?.();
 function schedule(){if(!frame)frame=requestAnimationFrame(decorate);}
 function decorate(){
  frame=0;if(!document.body.classList.contains('visual-schedule-page'))return;
  const nextPlans=root.querySelector('#schedule-plans'),nextRow=root.querySelector('#event-detail-row');
  if(plans!==nextPlans||row!==nextRow){for(const job of jobs)job.disconnect();jobs.length=0;plans=nextPlans;row=nextRow;
   for(const target of [plans,row])if(target){const job=new MutationObserver(schedule);job.observe(target,{childList:true});jobs.push(job);}
  }
  const mode=plans?.querySelector('.composer-panel')?'create':'plans',tabs=plans?.querySelector('.composer-tabs'),active=tabs?.querySelector('[aria-selected="true"]');
  if(plans&&(!diagnosticNode||diagnosticNode.isConnected===false)){diagnosticNode=document.createElement('p');diagnosticNode.className='pixel-plan-diagnostic';diagnosticNode.setAttribute('role','status');plans.append(diagnosticNode);reportParcel(diagnosticPhase);}
  if(tabs&&reduced.matches){
   let control=tabs.querySelector('.pixel-plan-motion');
   if(!control){control=document.createElement('button');control.className='pixel-plan-motion';control.setAttribute('type','button');tabs.append(control);}
   const update=()=>{control.textContent=parcelMotionOverride?'收合动效：已开启':'收合动效：已被减少动态关闭 · 开启';control.setAttribute('aria-pressed',String(parcelMotionOverride));control.setAttribute('title','只切换长按收合特效，不改变系统设置和其他页面动效');};
   control.onclick=()=>{parcelMotionOverride=!parcelMotionOverride;update();};update();
  }
  plans?.querySelectorAll?.('.plan-main').forEach(button=>button.setAttribute('title','长按拖到时间轴安排日期'));
  // Measure only on actual panel replacement, never during dragging or zooming.
  const tab=active?{x:active.offsetLeft,width:active.offsetWidth}:null;
  const detail=row?.querySelector('[data-detail-event]'),detailId=detail?.dataset.detailEvent||null;
  if(tabs&&tab){let indicator=tabs.querySelector('.console-mode-indicator');if(!indicator){indicator=document.createElement('i');indicator.className='console-mode-indicator';indicator.setAttribute('aria-hidden','true');tabs.append(indicator);}
   indicator.style.left=tab.x+'px';indicator.style.width=tab.width+'px';
   if(shouldSwitch(lastMode,mode)&&lastTab&&!reduced.matches){stop(indicatorMotion);indicatorMotion=indicator.animate?.([{transform:'translateX('+(lastTab.x-tab.x)+'px) scaleX('+(lastTab.width/Math.max(1,tab.width))+')'},{transform:'translateX(0) scaleX(1)'}],{duration:320,easing:'cubic-bezier(.16,1,.3,1)'});}
  }
  // Only tab changes animate the surface. Category -> form is already animated
  // once by composer.js; adding another surface animation causes double expansion.
  if(shouldSwitch(lastMode,mode)&&!reduced.matches){const surface=plans?.querySelector(mode==='create'?'.composer-panel':'.schedule-plan-list');stop(surfaceMotion);surfaceMotion=screenMotion(surface);}
  if(lastDetail!==null&&detailId!==lastDetail&&!reduced.matches){stop(detailMotion);detailMotion=detail?.animate?.([{opacity:.5,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'ease-out'});}
  lastMode=mode;lastTab=tab;lastDetail=detailId;
 }
 const mainObserver=new MutationObserver(schedule);mainObserver.observe(root,{childList:true});
 const toast=document.querySelector('#toast');
 const saveObserver=new MutationObserver(()=>{
  if(!toast?.classList.contains('visible')||!toast.textContent.includes('已保存')||!document.body.classList.contains('visual-schedule-page'))return;
  const stage=root.querySelector('.event-detail-space');if(!stage)return;
  let line=stage.querySelector(':scope > .console-save-line');if(!line){line=document.createElement('i');line.className='console-save-line';line.setAttribute('aria-hidden','true');stage.append(line);}
  stop(saveMotion);saveMotion=line.animate?.(reduced.matches?[{opacity:.8},{opacity:0}]:[{opacity:0,transform:'scaleX(.02)'},{opacity:1,transform:'scaleX(.45)',offset:.35},{opacity:0,transform:'scaleX(1)'}],{duration:reduced.matches?180:600,easing:'ease-out'});
 });
 if(toast)saveObserver.observe(toast,{attributes:true,attributeFilter:['class'],childList:true});
 window.addEventListener('resize',()=>{if(activeChannel&&!linkFrame)linkFrame=requestAnimationFrame(drawLink);});
 window.addEventListener('pagehide',()=>{transitionId++;cancelPixels();for(const m of parcelMotions)m.cancel?.();for(const parcel of parcels)parcel.remove();parcels.clear();mainObserver.disconnect();saveObserver.disconnect();for(const job of jobs)job.disconnect();for(const motion of [indicatorMotion,surfaceMotion,detailMotion,saveMotion,linkMotion,workspaceMotion,stepLinkMotion,stepMotion])stop(motion);if(frame)cancelAnimationFrame(frame);if(linkFrame)cancelAnimationFrame(linkFrame);});schedule();
})();
