const test=require('node:test'),assert=require('node:assert/strict'),T=require('./timeline-engine.js');
test('civil days cross leap days and years without local timezone drift',()=>{
 for(const date of ['1900-01-01','2026-12-31','2028-02-29','2035-06-15'])assert.equal(T.date(T.index(date)),date);
 assert.equal(T.date(T.index('2028-02-28')+1),'2028-02-29');
 assert.equal(T.date(T.index('2026-12-31')+1),'2027-01-01');
});
test('recycled windows cover both directions, keeping physical size bounded at every zoom',()=>{
 for(const scale of [.25,1,2,8,36,160])for(const center of ['1980-01-01','2026-10-13','2080-01-01']){
  const w=T.windowFor(T.index(center)+.5,scale,1000);
  assert.ok(w.start<T.index(center));assert.ok(w.start+w.days>T.index(center));
  assert.ok(w.days*scale>=7000);assert.ok(w.days*scale<=19200);
 }
});
test('month segments partition the window exactly, including leap February',()=>{
 const start=T.index('2028-02-13'),segments=T.months(start,70);
 assert.deepEqual(segments.map(m=>m.month),['2028-02','2028-03','2028-04']);
 assert.equal(segments[0].lastDay,29);assert.equal(segments.reduce((n,m)=>n+m.length,0),70);
 for(let i=1;i<segments.length;i++)assert.equal(segments[i].start,segments[i-1].start+segments[i-1].length);
});
test('zoom levels collapse days into weeks then months without losing events',()=>{
 const events=['2026-10-05','2026-10-06','2026-10-12','2026-11-01'].map((date,id)=>({date,id}));
 const start=T.index('2026-10-01');
 assert.deepEqual([36,12,3,.5].map(T.density),['days','weeks','months','years']);
 assert.deepEqual([36,12,3,.5].map(s=>T.groups(events,s,start,40).size),[4,3,2,1]);
 for(const scale of [36,3,.5])assert.equal([...T.groups(events,scale,start,40).values()].flat().length,4);
 assert.equal(T.groups(events,.5,start,5).get('2026-01-01').length,1);
});
