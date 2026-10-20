/* Lower console choreography only; no form handlers, API calls or timeline work. */
(()=>{
 'use strict';
 const shouldSwitch=(previous,next)=>previous!==null&&previous!==next;
 window.CinemaConsole={shouldSwitch};
 if(typeof document==='undefined')return;
 const root=document.querySelector('#main');if(!root)return;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
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
 window.addEventListener('pagehide',()=>{mainObserver.disconnect();saveObserver.disconnect();for(const job of jobs)job.disconnect();for(const motion of [indicatorMotion,surfaceMotion,detailMotion,saveMotion])stop(motion);if(frame)cancelAnimationFrame(frame);});schedule();
})();
