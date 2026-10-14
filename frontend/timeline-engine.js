// Pure civil-day geometry for a bounded, recycled timeline viewport.
(function(root){
 const DAY=86400000;
 const index=date=>Math.floor(Date.parse(date+'T00:00:00Z')/DAY);
 const date=day=>new Date(Math.floor(day)*DAY).toISOString().slice(0,10);
 const density=scale=>scale>=24?'days':scale>=8?'weeks':scale>=1.8?'months':'years';
 const span=(scale,width)=>Math.max(120,Math.ceil((width||1000)/scale*7));
 function windowFor(center,scale,width){const days=span(scale,width);return {start:Math.floor(center-days/2),days};}
 function months(start,days){
  const end=start+days,items=[];let at=start;
  while(at<end){const d=date(at),month=d.slice(0,7),first=index(month+'-01'),nextDate=new Date(first*DAY);nextDate.setUTCMonth(nextDate.getUTCMonth()+1);const next=Math.floor(nextDate.getTime()/DAY);items.push({month,start:at,length:Math.min(end,next)-at,lastDay:next-first});at=next;}
  return items;
 }
 function groups(events,scale,start,days){
  const map=new Map();
  for(const event of events){const d=index(event.date);if(!Number.isFinite(d)||d<start||d>=start+days)continue;
   const key=scale>=24?event.date:scale>=8?date(d-((new Date(d*DAY).getUTCDay()+6)%7)):scale>=.65?event.date.slice(0,7)+'-01':event.date.slice(0,4)+'-01-01';
   if(!map.has(key))map.set(key,[]);map.get(key).push(event);
  }return map;
 }
 root.TimelineEngine={index,date,density,span,windowFor,months,groups};
 if(typeof module!=='undefined')module.exports=root.TimelineEngine;
})(typeof globalThis!=='undefined'?globalThis:this);
