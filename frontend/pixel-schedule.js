/* Opt-in visual adapter. Business state, authentication and writes belong to life.js. */
(()=>{
 'use strict';
 const shapes={
  chart:'M3 19h19v3H0V2h3zm3-8h3v6H6zm6-7h3v13h-3zm6 3h3v10h-3z',
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
 const paperShapes={
  chart:'M3 3h2v16h17v2H3zm5 8h3v6H8zm5-7h3v13h-3zm5 4h3v9h-3z',
  plus:'M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z',
  trash:'M8 3h8v2h5v2H3V5h5zM5 9h14l-1 12H6zm4 2v7h2v-7zm4 0v7h2v-7z',
  calendar:'M6 2h2v3h8V2h2v3h3v17H3V5h3zM5 10v10h14V10zm3 3h3v3H8zm5 0h3v3h-3z',
  target:'M11 2h2v3a7 7 0 0 1 6 6h3v2h-3a7 7 0 0 1-6 6v3h-2v-3a7 7 0 0 1-6-6H2v-2h3a7 7 0 0 1 6-6zm1 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  zoom:'M10 2a8 8 0 1 0 5 14l6 6 2-2-6-6a8 8 0 0 0-7-12zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12z',
  save:'M4 3h13l4 4v14H3V3zm2 2v5h10V5zm0 9v5h12v-5zm6-8h2v3h-2z',
  film:'M3 4h18v16H3zm3 3v2h2V7zm5 0v2h2V7zm5 0v2h2V7zM6 11v2h12v-2zm0 4v2h2v-2zm5 0v2h2v-2zm5 0v2h2v-2z',
  book:'M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3zm2 2v12h5l1 1V7l-2-1zm8 1v12l1-1h5V6h-5z',
  game:'M7 6h10c3 0 5 3 5 7v4c0 3-3 4-5 1l-1-2H8l-1 2c-2 3-5 2-5-1v-4c0-4 2-7 5-7zm0 3v2H5v2h2v2h2v-2h2v-2H9V9zm9 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm3 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
  gift:'M12 21C3 15 1 11 3 7s6-4 9 0c3-4 7-4 9 0s0 8-9 14z',
  other:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  left:'m15 3 2 2-7 7 7 7-2 2-9-9z',right:'m9 3-2 2 7 7-7 7 2 2 9-9z',
  check:'m3 11 2-2 5 5L19 5l2 2-11 11z',
  edit:'m16 3 5 5-13 13H3v-5zm-1 4L6 17v1h1L17 9z',
  clock:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm-1 2h2v6h4v2h-6z'
 };
 const icon=name=>'<svg class="pixel-icon" viewBox="0 0 24 24" fill="currentColor" stroke="none" shape-rendering="crispEdges" aria-hidden="true"><path class="pixel-symbol" fill-rule="evenodd" d="'+(shapes[name]||shapes.other)+'"/><path class="paper-symbol" fill-rule="evenodd" d="'+(paperShapes[name]||shapes[name]||paperShapes.other)+'"/></svg>';
 const rise=(x,width)=>-Math.min(28,width*.035)*Math.pow(Math.min(1.15,Math.abs(x-width/2)/(width/2)),2);
 // Original timeline left positions are civil-day expressions, not DOM measurements.
 const positionParts=(left,width,date=false)=>{const m=left.match(/^calc\(([-\d.]+)px \+ ([-\d.]+) \* var\(--time-scale\)/);return m?{base:Number(m[1])+(date?0:width/2),day:Number(m[2])}:null;};
 const position=(left,width,scale,date=false)=>{const p=positionParts(left,width,date);return p?p.base+p.day*scale:null;};
 window.CinemaPixel={icon,rise,position};
 if(typeof document==='undefined')return;
 const root=document.querySelector('#main');if(!root)return;
 const cosmos=document.createElement('div');cosmos.id='pixel-cosmos';cosmos.setAttribute('aria-hidden','true');
 let seed=641,stars='';const rand=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
 for(let i=0;i<90;i++)stars+='<i style="left:'+(rand()*100).toFixed(2)+'%;top:'+(rand()*100).toFixed(2)+'%;opacity:'+(rand()*.35+.12).toFixed(2)+'" class="'+(i%17===0?'pixel-star-cross':'')+'"></i>';
 cosmos.innerHTML=stars+'<div class="pixel-constellation"></div><div class="pixel-moon"></div>';document.body.prepend(cosmos);
 let frame=0,scroller=null,track=null,observer=null,dirty=true,entries=[],lastVisible=[],todayEntry=null,minBase=0,maxBase=0,svg=null,shapeKey='',futureKey='';
 function lowerBound(day){let lo=0,hi=entries.length;while(lo<hi){const mid=(lo+hi)>>1;if(entries[mid].day<day)lo=mid+1;else hi=mid;}return lo;}
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
  if(dirty){svg=track.querySelector(':scope > .pixel-rail');shapeKey=futureKey='';entries=[];lastVisible=[];
   for(const node of track.children){if(!node.matches('.visual-node,.axis-date,.event-anchor,.node-connector,.today-marker'))continue;
    const date=node.matches('.axis-date'),nodeWidth=node.offsetWidth,formula=node.style.left;
    const parts=positionParts(formula,nodeWidth,date)||{base:node.offsetLeft+nodeWidth/2,day:0};
    entries.push({node,date,width:nodeWidth,...parts,last:null,today:node.matches('.today-marker')});
   }entries.sort((a,b)=>a.day-b.day);todayEntry=entries.find(e=>e.today)||null;minBase=entries.length?Math.min(...entries.map(e=>e.base)):0;maxBase=entries.length?Math.max(...entries.map(e=>e.base)):0;dirty=false;
  }
  const updates=[];let todayX=todayEntry?todayEntry.base+todayEntry.day*scale-left-todayEntry.width/2:width;
  const visible=entries.slice(lowerBound((left-100-maxBase)/scale),lowerBound((left+width+101-minBase)/scale)),visibleSet=new Set(visible);
  for(const item of lastVisible)if(!visibleSet.has(item)&&item.last!=='0px'){updates.push([item.node,'0px']);item.last='0px';}
  for(const item of visible){const x=item.base+item.day*scale-left;
   if(item.today)todayX=x-item.width/2;
   const y=x>=-100&&x<=width+100?rise(x,width).toFixed(2)+'px':'0px';
   if(y!==item.last){if(item.last!==null||y!=='0px')updates.push([item.node,y]);item.last=y;}
  }
  lastVisible=visible;
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
