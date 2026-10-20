/* Opt-in visual adapter. Business state, authentication and writes belong to life.js. */
(()=>{
 'use strict';
 const shapes={
  plus:'M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z',
  check:'M3 11h3v3h3v3h3v-3h3v-3h3V8h3V5h-3v3h-3v3h-3v3H9v-3H6V8H3z',
  left:'M14 3h3v3h-3v3h-3v6h3v3h3v3h-3v-3h-3v-3H8v-3H5V9h3V6h3V3z',
  right:'M7 3h3v3h3v3h3v3h3v3h-3v3h-3v3h-3v-3H7v-3h3v-3h3V9h-3V6H7z',
  edit:'M16 3h3v3h3v3h-3v3h-3v3h-3v3h-3v3H3v-7h3v-3h3V8h3V5h4zm-10 12v3h3v-3z',
  trash:'M8 2h8v3h5v3H3V5h5zM5 10h3v10h2V10h4v10h2V10h3v12H5z',
  calendar:'M6 2h3v3h6V2h3v3h3v17H3V5h3zM6 11v8h12v-8zm2 2h3v3H8zm5 0h3v3h-3z',
  film:'M2 3h20v18H2zm3 3v3h3V6zm6 0v3h3V6zm6 0v3h3V6zM5 11v2h14v-2zm0 4v3h3v-3zm6 0v3h3v-3zm6 0v3h3v-3z',
  book:'M2 4h8v2h4V4h8v16h-8v2h-4v-2H2zm3 3v10h5V7zm9 0v10h5V7z',
  game:'M5 5h14v3h3v13h-5v-4H7v4H2V8h3zm2 4v3H4v2h3v3h2v-3h3v-2H9V9zm9 1v3h3v-3zm-2 4v3h3v-3z',
  gift:'M5 3h4v6h6V3h4v13h-3v4h-3v3h-3v-3H7v-4H5zm3 8v3h3v-3zm6 0v3h3v-3z',
  clock:'M7 2h10v3h4v4h2v8h-2v4h-4v2H7v-2H3v-4H1V9h2V5h4zm1 3H6v3H4v9h3v3h10v-3h3V8h-3V5zm2 2h3v6h4v3h-7z',
  target:'M10 1h4v4h5v5h4v4h-4v5h-5v4h-4v-4H5v-5H1v-4h4V5h5zm-2 7v8h8V8zm2 2h4v4h-4z',
  zoom:'M5 2h10v3h3v10h-3v3H5v-3H2V5h3zm1 4v8h8V6zm10 10h3v3h3v3h-3v-3h-3z',
  save:'M3 2h15v3h3v17H3zm3 2v6h10V4zm0 10v6h12v-6zm6-9h2v3h-2z',
  other:'M8 2h8v4h4v4h3v4h-3v4h-4v4H8v-4H4v-4H1v-4h3V6h4z'
 };
 const icon=name=>'<svg class="pixel-icon" viewBox="0 0 24 24" fill="currentColor" stroke="none" shape-rendering="crispEdges" aria-hidden="true"><path fill-rule="evenodd" d="'+(shapes[name]||shapes.other)+'"/></svg>';
 const rise=(x,width)=>-Math.min(28,width*.035)*Math.pow(Math.min(1.15,Math.abs(x-width/2)/(width/2)),2);
 // Original timeline left positions are civil-day expressions, not DOM measurements.
 const position=(left,width,scale,date=false)=>{const m=left.match(/^calc\(([-\d.]+)px \+ ([-\d.]+) \* var\(--time-scale\)/);return m?Number(m[1])+Number(m[2])*scale+(date?0:width/2):null;};
 window.CinemaPixel={icon,rise,position};
 if(typeof document==='undefined')return;
 const root=document.querySelector('#main');if(!root)return;
 const cosmos=document.createElement('div');cosmos.id='pixel-cosmos';cosmos.setAttribute('aria-hidden','true');
 let seed=641,stars='';const rand=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
 for(let i=0;i<90;i++)stars+='<i style="left:'+(rand()*100).toFixed(2)+'%;top:'+(rand()*100).toFixed(2)+'%;opacity:'+(rand()*.35+.12).toFixed(2)+'" class="'+(i%17===0?'pixel-star-cross':'')+'"></i>';
 cosmos.innerHTML=stars+'<div class="pixel-constellation"></div><div class="pixel-moon"></div>';document.body.prepend(cosmos);
 let frame=0,scroller=null,track=null,observer=null,dirty=true,entries=[],svg=null,shapeKey='',futureKey='';
 const ns='http://www.w3.org/2000/svg';
 function schedule(){if(!frame)frame=requestAnimationFrame(paint);}
 function paint(){
  frame=0;const scroll=root.querySelector('.visual-scroll'),nextTrack=scroll?.querySelector('.visual-track');
  if(!scroll||!nextTrack)return;
  if(scroll!==scroller){scroller=scroll;scroll.addEventListener('scroll',schedule,{passive:true});}
  if(track!==nextTrack){track=nextTrack;dirty=true;svg=null;shapeKey=futureKey='';observer?.disconnect();observer=new MutationObserver(schedule);observer.observe(track,{attributes:true,attributeFilter:['style','data-detail','data-titles','data-hide-titles']});}
  const width=scroll.clientWidth;if(!width)return;
  const original=track.querySelector(':scope > .single-axis');if(!original)return;
  // READ phase: finish geometry reads before changing any margin, path or size.
  const base=original.offsetTop+original.offsetHeight/2,left=scroll.scrollLeft,height=track.offsetHeight,scale=parseFloat(track.style.getPropertyValue('--time-scale'))||36;
  if(dirty){svg=track.querySelector(':scope > .pixel-rail');shapeKey=futureKey='';entries=[];
   for(const node of track.children){if(!node.matches('.visual-node,.axis-date,.event-anchor,.node-connector,.today-marker'))continue;
    const date=node.matches('.axis-date'),nodeWidth=node.offsetWidth,formula=node.style.left;
    entries.push({node,date,width:nodeWidth,formula,last:null,today:node.matches('.today-marker')});
   }dirty=false;
  }
  const updates=[];let todayX=width;
  for(const item of entries){const x=(position(item.formula,item.width,scale,item.date)??(item.node.offsetLeft+item.node.offsetWidth/2))-left;
   if(item.today)todayX=x-item.width/2;
   const y=x>=-100&&x<=width+100?rise(x,width).toFixed(2)+'px':'0px';
   if(y!==item.last){if(item.last!==null||y!=='0px')updates.push([item.node,y]);item.last=y;}
  }
  // WRITE phase: no offset/bounds reads below this point (avoids layout per node).
  if(!svg){svg=document.createElementNS(ns,'svg');svg.classList.add('pixel-rail');svg.setAttribute('aria-hidden','true');for(const type of ['halo','past','future']){const path=document.createElementNS(ns,'path');path.setAttribute('class','pixel-rail-'+type);svg.append(path);}track.prepend(svg);}
  const key=width+':'+height+':'+base;
  if(key!==shapeKey){svg.style.width=width+'px';svg.style.height=height+'px';svg.setAttribute('viewBox','0 0 '+width+' '+height);
   let d='';for(let x=-20;x<=width+20;x+=12)d+=(d?'L':'M')+x+' '+(base+rise(x,width)).toFixed(2);
   svg.querySelector('.pixel-rail-halo').setAttribute('d',d);svg.querySelector('.pixel-rail-past').setAttribute('d',d);shapeKey=key;futureKey='';
  }
  svg.style.left=left+'px';
  const nextFuture=key+':'+Math.max(0,todayX).toFixed(2);
  if(nextFuture!==futureKey){let future='';if(todayX<width)for(let x=Math.max(0,todayX);x<=width+20;x+=12)future+=(future?'L':'M')+x.toFixed(2)+' '+(base+rise(x,width)).toFixed(2);svg.querySelector('.pixel-rail-future').setAttribute('d',future);futureKey=nextFuture;}
  if(track.dataset.pixelCurved!=='true')track.dataset.pixelCurved='true';
  for(const [node,y]of updates)node.style.setProperty('--orbit-rise',y);
 }
 const mainObserver=new MutationObserver(records=>{if(records.some(r=>r.type==='childList'&&(r.target===root||r.target===track)&&[...r.addedNodes,...r.removedNodes].some(n=>!n.classList?.contains('pixel-rail')))){dirty=true;schedule();}});mainObserver.observe(root,{childList:true,subtree:true});
 window.addEventListener('resize',schedule);window.addEventListener('pagehide',()=>{mainObserver.disconnect();observer?.disconnect();if(frame)cancelAnimationFrame(frame);});schedule();
})();
