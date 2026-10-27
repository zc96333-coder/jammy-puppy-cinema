/* Appearance only. Never render the application or touch shared business data. */
(()=>{
 'use strict';
 const themes=[['original','原版','原始布局与交互 · 切换页面'],['pixel','像素宇宙','暖暗 · 复古屏幕'],['paper','纸白极简','暖白 · 清晰留白'],['clay','奶油陶土','奶油 · 独立电影杂志'],['midnight','午夜蓝','深蓝 · 夜间影院'],['riso','双色印刷','蓝与玫红 · 套印纸感']];
 const key='cinema.appearance',valid=value=>themes.some(item=>item[0]===value),root=document.documentElement;
 const originalEntry=!/\/pixel-schedule\.html$/.test(window.location.pathname);
 let theme=originalEntry?'original':'pixel',panel=null,toggle=null,motion=null,opened=false,menuMotions=[],menuRevision=0,keyboardInput=false;
 try{const saved=localStorage.getItem(key);if(!originalEntry&&valid(saved)&&saved!=='original')theme=saved;}catch{}
 root.dataset.theme=theme;
 function sync(){
  if(!panel)return;
  panel.querySelectorAll('[data-theme-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.themeChoice===theme)));
  toggle.setAttribute('title','外观：'+themes.find(item=>item[0]===theme)[1]);
 }
 function select(value,{persist=true,animate=true}={}){
  if(!valid(value))return false;
  if((value==='original')!==originalEntry){
   // Crossing entries uses the real original renderer; storage sync must never navigate another tab.
   if(!persist)return false;
   try{localStorage.setItem(key,value);}catch{}
   const page=window.location.hash.slice(1),hash='#'+(['schedule','movie','book','game','punishment','stats'].includes(page)?page:'schedule');
   window.location.assign((value==='original'?'/':'/pixel-schedule.html')+hash);return true;
  }
  const changed=theme!==value;theme=value;root.dataset.theme=theme;sync();
  if(persist)try{localStorage.setItem(key,theme);}catch{}
  if(changed&&animate&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
   motion?.cancel();const main=document.querySelector('#main');
   motion=main?.animate?.([{opacity:.55},{opacity:1}],{duration:200,easing:'ease-out'});
  }
  return true;
 }
 function cancelMenuMotion(){menuMotions.forEach(animation=>animation.cancel());menuMotions=[];}
 function positionPanel(){
  const rect=toggle.getBoundingClientRect(),width=Math.min(700,Math.max(80,rect.left-24),window.innerWidth-24);
  panel.style.setProperty('--appearance-width',width+'px');
  panel.style.setProperty('--appearance-left',Math.max(12,rect.left-width-12)+'px');
  panel.style.setProperty('--appearance-top',Math.max(12,rect.top)+'px');
  panel.style.setProperty('--appearance-height',(rect.height||44)+'px');
 }
 function setOpen(open,{keyboard=false,focus=false}={}){
  if(!panel)return;
  if(opened===open&&(!keyboard||panel.hidden))return;
  const wasHidden=panel.hidden,revision=++menuRevision,targets=[panel,...panel.querySelectorAll('[data-theme-choice]')];
  const instant=keyboard||window.matchMedia('(prefers-reduced-motion: reduce)').matches||!panel.animate;
  // Capture every live pose before cancelling: rapid reversals continue from this exact frame.
  const poses=instant?[]:targets.map((node,index)=>wasHidden?{opacity:0,transform:index?'translateX(8px)':'translateX(14px) scale(.96)'}:{opacity:Number(window.getComputedStyle(node).opacity),transform:window.getComputedStyle(node).transform});
  cancelMenuMotion();opened=open;panel.inert=!open;toggle.setAttribute('aria-expanded',String(open));
  if(open){positionPanel();panel.hidden=false;}
  if(instant){panel.hidden=!open;}
  else{
   menuMotions=targets.map((node,index)=>{
    const to={opacity:open?1:0,transform:open?'translateX(0px) scale(1)':index?'translateX(8px)':'translateX(14px) scale(.96)'};
    const animation=node.animate([poses[index],to],{duration:Math.max(40,(open?180:120)*Math.abs(to.opacity-poses[index].opacity)),delay:open&&wasHidden&&index?(targets.length-1-index)*20:0,easing:'cubic-bezier(.23,1,.32,1)',fill:'both'});
    return animation;
   });
   menuMotions[0].finished.then(()=>{if(revision===menuRevision&&!opened){panel.hidden=true;cancelMenuMotion();}},()=>{});
  }
  if(open){
   const choice=panel.querySelector('[aria-pressed="true"]'),strip=panel.querySelector('.appearance-options');
   choice?.focus({preventScroll:true});
   if(choice&&strip?.clientWidth)strip.scrollLeft=Math.max(0,choice.offsetLeft-strip.clientWidth/2+choice.offsetWidth/2);
  }
  else if(focus)toggle.focus({preventScroll:true});
 }
 function close(focus=false,keyboard=false){setOpen(false,{focus,keyboard});}
 function mount(){
  const header=document.querySelector('.shell-header');if(!header)return;
  const control=document.createElement('div');control.className='appearance-control';
  control.innerHTML='<button type="button" id="appearance-toggle" class="appearance-toggle" aria-label="切换外观" aria-expanded="false" aria-controls="appearance-panel" aria-haspopup="dialog"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c2 0 3-1 3-2.5 0-1.3-1.5-1.8-1.5-3 0-1 .8-1.5 2-1.5h2C20 14 21 12 21 10c0-4-4-7-9-7Zm-5 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5-2a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5 3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" fill-rule="evenodd"/></svg><span>外观</span></button><div id="appearance-panel" class="appearance-panel" role="dialog" aria-labelledby="appearance-label" hidden><p id="appearance-label">选择外观</p><div class="appearance-options">'+themes.map(([id,name,description])=>'<button type="button" data-theme-choice="'+id+'" title="'+description+'" aria-pressed="false"><span class="appearance-preview preview-'+id+'" aria-hidden="true"><i></i><b></b></span><span>'+name+'</span><small>'+description+'</small></button>').join('')+'</div></div>';
  header.append(control);toggle=control.querySelector('#appearance-toggle');panel=control.querySelector('#appearance-panel');sync();
  const strip=panel.querySelector('.appearance-options');
  strip?.addEventListener('wheel',event=>{if(strip.scrollWidth<=strip.clientWidth||Math.abs(event.deltaX)>=Math.abs(event.deltaY))return;event.preventDefault();strip.scrollLeft+=event.deltaY;},{passive:false});
  toggle.addEventListener('click',event=>setOpen(!opened,{keyboard:event.detail===0}));
  panel.addEventListener('click',event=>{const button=event.target.closest('[data-theme-choice]');if(button){select(button.dataset.themeChoice,{animate:event.detail!==0});close(true,event.detail===0);}});
  document.addEventListener('pointerdown',()=>{keyboardInput=false;});
  document.addEventListener('click',event=>{if(!control.contains(event.target))close(false,event.detail===0);});
  document.addEventListener('keydown',event=>{keyboardInput=true;if(event.key==='Escape'&&!panel.hidden){event.preventDefault();close(true,true);}});
  document.addEventListener('focusin',event=>{if(!control.contains(event.target))close(false,keyboardInput);});
  window.addEventListener('resize',()=>{if(opened)positionPanel();});
  document.addEventListener('scroll',event=>{if(opened&&!panel.contains(event.target)){if(toggle.getBoundingClientRect().bottom<=0)close(false,true);else positionPanel();}},true);
 }
 window.CinemaAppearance={select,getTheme:()=>theme};
 window.addEventListener('storage',event=>{if(event.key===key)select(valid(event.newValue)?event.newValue:'pixel',{persist:false});});
 window.addEventListener('pagehide',()=>{motion?.cancel();++menuRevision;cancelMenuMotion();});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
