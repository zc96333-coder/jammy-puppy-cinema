/* Lower console choreography only; no form handlers, API calls or timeline work. */
(()=>{
 'use strict';
 const shouldSwitch=(previous,next)=>previous!==null&&previous!==next;
 const text=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const stepIndex=step=>step==='date'?1:['confirm','state'].includes(step)?2:0;
 function stepsHTML({step,content='',contentStep='work',dateLabel='暂不确定',ready=false,dateReady=false}){
  const active=stepIndex(step),items=[{label:'内容',value:contentStep,note:content||'选择内容',done:ready},{label:'日期',value:'date',note:dateLabel,done:dateReady},{label:'确认',value:'confirm',note:'保存记录',done:false}];
  return items.map((item,i)=>'<button type="button" class="console-step-port'+(i===active?' is-active':'')+(item.done?' is-complete':'')+'" data-composer="back" data-value="'+text(item.value)+'" '+(i>0&&(!ready||i===2&&!dateReady)?'disabled ':'')+'aria-current="'+(i===active?'step':'false')+'"><i aria-hidden="true"></i><span>'+item.label+'<small title="'+text(item.note)+'">'+text(item.note)+'</small></span></button>').join('');
 }
 const channelsHTML=(active,labels,artwork)=>'<nav class="console-channel-bus" aria-label="活动通道">'+['movie','book','game','other','punishment'].map(kind=>'<button type="button" class="console-channel" data-composer="kind" data-value="'+kind+'" aria-pressed="'+(kind===active)+'"><span class="console-port" aria-hidden="true">'+artwork({kind})+'</span><span>'+labels[kind]+'</span><i class="console-port-light" aria-hidden="true"></i></button>').join('')+'</nav><svg class="console-channel-link" aria-hidden="true"><path pathLength="100"/></svg>';
 window.CinemaConsole={shouldSwitch,channelsHTML,stepsHTML,stepIndex};
 if(typeof document==='undefined')return;
 const root=document.querySelector('#main');if(!root)return;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 let linkFrame=0,linkMotion=null,workspaceMotion=null,stepLinkMotion=null,stepMotion=null,activeChannel=null;
 function updateSteps(data){
  const workspace=root.querySelector('[data-console] .console-workspace');if(!workspace)return;
  const previous=workspace.dataset.step;workspace.dataset.step=data.step==='category'?'':data.step;
  let ports=workspace.querySelector('.console-step-bus'),svg=workspace.querySelector('.console-step-link');
  if(!ports){ports=document.createElement('nav');ports.className='console-step-bus';ports.setAttribute('aria-label','记录步骤接口');workspace.querySelector('form')?.before(ports);}
  if(!svg){svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','console-step-link');svg.setAttribute('aria-hidden','true');const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('pathLength','100');svg.append(path);workspace.append(svg);}
  ports.hidden=svg.hidden=data.step==='category';if(data.step==='category')return;
  ports.innerHTML=stepsHTML(data);
  if(!linkFrame)linkFrame=requestAnimationFrame(drawLink);
  if(data.animate&&previous!==data.step&&!reduced.matches){stop(stepLinkMotion);stop(stepMotion);stepLinkMotion=svg.querySelector('path').animate?.([{strokeDashoffset:100,opacity:.3},{strokeDashoffset:0,opacity:1}],{duration:260,easing:'ease-out'});const section=workspace.querySelector('[data-composer-step="'+data.step+'"]');stepMotion=section?.animate?.([{opacity:.4,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:230,easing:'cubic-bezier(.16,1,.3,1)'});}
 }
 function drawStepLink(workspace){
  const port=workspace.querySelector('.console-step-port.is-active'),step=workspace.dataset.step,section=step&&workspace.querySelector('[data-composer-step="'+step+'"]'),svg=workspace.querySelector('.console-step-link');if(!port||!section||!svg||svg.hidden)return;
  const box=workspace.getBoundingClientRect(),a=port.getBoundingClientRect(),b=section.getBoundingClientRect(),sx=a.left+a.width/2-box.left,sy=a.bottom-box.top,tx=b.left-box.left-8,ty=b.top-box.top+12;
  svg.setAttribute('viewBox','0 0 '+box.width+' '+box.height);svg.querySelector('path').setAttribute('d','M'+sx+' '+sy+'V'+(sy+ty)/2+'H'+tx+'V'+ty);
 }
 function setChannel(kind){
  const panel=root.querySelector('[data-console]');if(!panel)return;
  const previous=panel.dataset.channel||'';panel.dataset.channel=kind||'';activeChannel=kind;
  panel.querySelectorAll('.console-channel').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.value===kind)));
  if(!kind){const path=panel.querySelector('.console-channel-link path');stop(linkMotion);if(previous&&!reduced.matches)linkMotion=path?.animate?.([{opacity:1,strokeDashoffset:0},{opacity:0,strokeDashoffset:100}],{duration:160,easing:'ease-in'});return;}
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
  if(!reduced.matches){linkMotion=path?.animate?.([{strokeDashoffset:100,opacity:.3},{strokeDashoffset:0,opacity:1}],{duration:280,easing:'ease-out'});workspaceMotion=workspace?.animate?.([{opacity:.4,transform:'translateX(6px)'},{opacity:1,transform:'translateX(0)'}],{duration:230,easing:'cubic-bezier(.16,1,.3,1)'});}
 }
 Object.assign(window.CinemaConsole,{setChannel,connect,updateSteps});
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
  // Measure only on actual panel replacement, never during dragging or zooming.
  const tab=active?{x:active.offsetLeft,width:active.offsetWidth}:null;
  const detail=row?.querySelector('[data-detail-event]'),detailId=detail?.dataset.detailEvent||null;
  if(tabs&&tab){let indicator=tabs.querySelector('.console-mode-indicator');if(!indicator){indicator=document.createElement('i');indicator.className='console-mode-indicator';indicator.setAttribute('aria-hidden','true');tabs.append(indicator);}
   indicator.style.left=tab.x+'px';indicator.style.width=tab.width+'px';
   if(shouldSwitch(lastMode,mode)&&lastTab&&!reduced.matches){stop(indicatorMotion);indicatorMotion=indicator.animate?.([{transform:'translateX('+(lastTab.x-tab.x)+'px) scaleX('+(lastTab.width/Math.max(1,tab.width))+')'},{transform:'translateX(0) scaleX(1)'}],{duration:320,easing:'cubic-bezier(.16,1,.3,1)'});}
  }
  // Only tab changes animate the surface. Category -> form is already animated
  // once by composer.js; adding another surface animation causes double expansion.
  if(shouldSwitch(lastMode,mode)&&!reduced.matches){const surface=plans?.querySelector(mode==='create'?'.composer-panel':'.schedule-plan-list');stop(surfaceMotion);surfaceMotion=surface?.animate?.([{opacity:.25,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:280,easing:'cubic-bezier(.16,1,.3,1)'});}
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
 window.addEventListener('pagehide',()=>{mainObserver.disconnect();saveObserver.disconnect();for(const job of jobs)job.disconnect();for(const motion of [indicatorMotion,surfaceMotion,detailMotion,saveMotion,linkMotion,workspaceMotion,stepLinkMotion,stepMotion])stop(motion);if(frame)cancelAnimationFrame(frame);if(linkFrame)cancelAnimationFrame(linkFrame);});schedule();
})();
