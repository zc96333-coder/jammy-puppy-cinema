const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {createRepository}=require('../backend/repository.cjs'),{createService}=require('../backend/service.cjs');
test('opt-in console uses fixed channels and bypasses card geometry while preserving composer state',async t=>{
 const h=harness(t),theme=vm.createContext({window:{}}),channels=[];vm.runInContext(fs.readFileSync(__dirname+'/pixel-console.js','utf8'),theme);
 h.context.window.CinemaConsole={channelsHTML:theme.window.CinemaConsole.channelsHTML,setChannel:k=>channels.push(k),connect:k=>channels.push('connect:'+k)};
 h.run('renderSchedule();LifeComposer.start()');let html=h.nodes.get('#schedule-plans').innerHTML;assert.match(html,/data-console="true"/);assert.equal((html.match(/class="console-channel"/g)||[]).length,5);assert.doesNotMatch(html,/class="composer-deck"/);
 h.context.channelButton={dataset:{composer:'kind',value:'game'},getBoundingClientRect(){assert.fail('console must not measure or expand a card');},animate(){assert.fail('console must not animate a card');}};
 await h.run('LifeComposer.click(channelButton)');assert.equal(h.run('LifeComposer.getDraft().kind'),'game');assert.equal(h.run('LifeComposer.getDraft().step'),'work');assert.ok(channels.includes('connect:game'));
 html=h.nodes.get('#schedule-plans').innerHTML;assert.equal((html.match(/class="console-channel"/g)||[]).length,5);assert.match(html,/class="console-workspace"/);
 await h.run("LifeComposer.click({dataset:{composer:'back',value:'category'}})");assert.equal(channels.at(-1),null);
 await h.run('LifeComposer.click(channelButton)');assert.equal(h.run('LifeComposer.getDraft().step'),'work');assert.equal(channels.at(-1),'connect:game');
 for(const [kind,step]of [['movie','name'],['book','work'],['other','name'],['punishment','punishment-action']]){h.context.channelButton.dataset.value=kind;await h.run('LifeComposer.click(channelButton)');assert.equal(h.run('LifeComposer.getDraft().step'),step);assert.equal(channels.at(-1),'connect:'+kind);assert.equal((h.nodes.get('#schedule-plans').innerHTML.match(/class="console-channel"/g)||[]).length,5);}
});
function harness(t){const repo=createRepository();t.after(()=>repo.close());const service=createService(repo);service.seed(require('../data/film-records-snapshot.json'));const nodes=new Map();const node=key=>{if(!nodes.has(key))nodes.set(key,{innerHTML:'',textContent:'',dataset:{},style:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},close(){},showModal(){}});return nodes.get(key);};const context=vm.createContext({TimelineEngine:require('./timeline-engine.js'),console,Date,Set,Map,URL,JSON,Number,String,Object,Array,FormData,AbortController,location:{hash:''},history:{replaceState(){}},document:{querySelector:node,querySelectorAll(){return [];},addEventListener(){}},window:{addEventListener(){}},localStorage:{getItem(){return null;}},setInterval(){},setTimeout(){},clearTimeout(){}});vm.runInContext(fs.readFileSync(__dirname+'/composer.js','utf8'),context);const source=fs.readFileSync(__dirname+'/life.js','utf8');vm.runInContext(source.slice(0,source.lastIndexOf('(async()=>{try{const session=')),context);context.initialState=service.snapshot('puppy');vm.runInContext('state=initialState;preview=true;',context);return {context,nodes,service,run(code){return vm.runInContext(code,context);},main(){return nodes.get('#main').innerHTML;}};}
test('single visual timeline renders event names with no category tabs or tables',t=>{const h=harness(t);h.run("visualFocus='2026-10-05';renderSchedule()");const html=h.main();assert.match(html,/aria-label="饮食男女/);assert.match(html,/aria-label="登堂入室/);assert.match(html,/data-day="2026-10-05"/);assert.equal((html.match(/class="single-axis"/g)||[]).length,1);assert.equal((html.match(/class="visual-node /g)||[]).length,11);assert.doesNotMatch(html,/<table|event-card|data-timeline-filter|class="summary"|upcoming/);const visible=html.replace(/<[^>]*>/g,'').replace('今天','').replace(/[一二三四五六七八九十]+月/g,'');assert.ok(visible.includes('戏梦巴黎'));assert.match(html,/data-quick/);});
test('all content kinds share the same axis and plan versus done has a graphical state',t=>{const h=harness(t);h.service.createEvent({kind:'book',workTitle:'测试书',date:'2026-10-13',state:'plan',participants:1},'puppy');h.service.createEvent({kind:'game',workTitle:'测试游戏',date:'2026-10-13',state:'done',participants:2},'jammy');h.service.createEvent({kind:'other',title:'散步',date:'2026-10-13',state:'done',participants:3},'puppy');h.service.grant({owner:'puppy',date:'2026-10-13'},'puppy');h.context.updated=h.service.snapshot('puppy');h.run('state=updated;renderSchedule()');assert.match(h.main(),/data-day-group="2026-10-13"/);h.context.hoverNode={getBoundingClientRect(){return {left:300,top:350,width:36,bottom:386};}};h.context.window.innerWidth=1000;h.run("showDayHover('2026-10-13',hoverNode)");const detail=h.nodes.get('#event-detail-row').innerHTML;for(const title of ['测试书','测试游戏','散步','机会'])assert.ok(h.nodes.get('#event-hover-card').innerHTML.includes(title));assert.equal((detail.match(/data-detail-event=/g)||[]).length,1);assert.match(h.main(),/day-group is-done/);assert.equal((h.main().match(/class="single-axis"/g)||[]).length,1);});
test('movie library keeps independent score labels and ten works',t=>{const h=harness(t);h.run("page='movie';renderLibrary()");assert.match(h.main(),/puppy的评分/);assert.match(h.main(),/Jammy 评分/);assert.match(h.main(),/计数 10/);assert.match(h.main(),/显示列/);assert.match(h.main(),/批量删除/);});
test('empty book and game pages guide to the same schedule entry, not fake data',t=>{const h=harness(t);h.run("page='book';renderLibrary()");assert.match(h.main(),/下一本想一起读什么/);assert.match(h.main(),/在日程里记一次/);h.run("page='game';renderLibrary()");assert.match(h.main(),/下一局/);assert.match(h.main(),/计数 0/);});
test('preview clearly identifies local storage server, punishment balance starts at zero',t=>{const h=harness(t);h.run('navigation();renderPunishments()');assert.match(h.nodes.get('#preview').innerHTML,/本地预览身份/);assert.match(h.main(),/机会获得记录/);assert.match(h.main(),/未使用的机会/);assert.match(h.main(),/disabled/);});
test('library redaction never renders hidden review note or rating',t=>{const h=harness(t);const w=h.service.snapshot('puppy').works[0];h.service.updateWork(w.id,{version:w.version,reveal:true});h.service.review(w.id,{score:9.3,note:'PRIVATE REVIEW',submitted:true},'jammy');h.context.updated=h.service.snapshot('puppy');h.run("state=updated;page='movie';renderLibrary()");assert.match(h.main(),/待揭晓/);assert.equal(h.main().includes('PRIVATE REVIEW'),false);});
test('dragging blank timeline pans left/right without creating or modifying a record',t=>{const h=harness(t),scroll={scrollLeft:500,classList:{add(){},remove(){}},setPointerCapture(){},hasPointerCapture(){return true;},releasePointerCapture(){}};h.context.down={target:{closest(selector){return selector==='.visual-scroll'?scroll:null;}},button:0,pointerId:7,pointerType:'mouse',clientX:100};h.context.move={pointerId:7,clientX:180,preventDefault(){}};h.context.up={pointerId:7};h.run('beginAxisPan(down);moveAxisPan(move)');assert.equal(scroll.scrollLeft,420);assert.equal(h.run('axisPan.moved'),true);h.run('endAxisPan(up)');assert.equal(h.run('axisPan'),null);assert.equal(h.run('suppressAxisClickUntil>Date.now()'),true);assert.equal(h.service.snapshot('puppy').events.length,12);});
test('simple glyphs replace illustrations, and details remain empty until hover',t=>{const h=harness(t);h.run('renderSchedule()');assert.match(h.main(),/class="current-date"/);assert.match(h.main(),/data-day-group="2026-/);assert.doesNotMatch(h.main(),/symbol-art|<rect width="86"|node-state|node-people/);h.context.hoverNode={getBoundingClientRect(){return {left:300,top:250,width:36,bottom:286};}};h.context.window.innerWidth=1000;h.run("showEventHover('seed-1-0',hoverNode)");assert.match(h.nodes.get('#event-detail-row').innerHTML,/戏梦巴黎/);assert.equal(h.nodes.get('#event-hover-card').hidden,true);h.run('hideEventHover()');assert.equal(h.nodes.get('#event-hover-card').hidden,true);assert.equal(h.nodes.get('#event-hover-card').innerHTML,'');});
test('continuous density keeps the same fractional date at the viewport center',t=>{const h=harness(t);const scroll={scrollLeft:1000,clientWidth:600};const track={dataset:{start:'2026-08-16'},style:{setProperty(k,v){this[k]=v;}}};h.nodes.set('.visual-scroll',scroll);h.nodes.set('.visual-track',track);h.run('visualScale=36;zoomAxis(72)');assert.ok(Math.abs(scroll.scrollLeft-2220)<.001);assert.equal(track.style['--time-scale'],'72px');h.run('zoomAxis(18)');assert.ok(Math.abs(scroll.scrollLeft-390)<.001);assert.equal(track.dataset.density,'compact');});
test('spring zoom converges and does not move the central date',t=>{const h=harness(t),frames=new Map();let clock=0,id=0;h.context.performance={now:()=>clock};h.context.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};h.context.cancelAnimationFrame=n=>frames.delete(n);const scroll={scrollLeft:1000,clientWidth:600};h.nodes.set('.visual-scroll',scroll);h.nodes.set('.visual-track',{dataset:{start:'2026-08-16'},style:{setProperty(){}}});h.run('zoomAxis(72)');assert.equal(h.run('visualScale'),36);for(let i=0;i<300&&frames.size;i++){clock+=16;const batch=[...frames.values()];frames.clear();batch.forEach(f=>f(clock));}assert.equal(h.run('visualScale'),72);assert.equal(h.run('zoomFrame'),0);assert.ok(Math.abs(scroll.scrollLeft-2220)<.001);});
test('inertial movement continues after release and settles within bounds',t=>{const h=harness(t),frames=new Map();let clock=0,id=0;h.context.performance={now:()=>clock};h.context.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};h.context.cancelAnimationFrame=n=>frames.delete(n);const scroll={scrollLeft:500,clientWidth:400,scrollWidth:3000};h.nodes.set('.visual-scroll',scroll);h.run('glideAxis(800,1000)');assert.equal(scroll.scrollLeft,500);clock=16;let batch=[...frames.values()];frames.clear();batch.forEach(f=>f(clock));assert.ok(scroll.scrollLeft>500);for(let i=0;i<300&&frames.size;i++){clock+=16;batch=[...frames.values()];frames.clear();batch.forEach(f=>f(clock));}assert.equal(scroll.scrollLeft,800);assert.equal(h.run('motionFrame'),0);});
test('released pan decays freely and never snaps to a date coordinate',t=>{const h=harness(t),frames=new Map();let clock=0,id=0;h.context.performance={now:()=>clock};h.context.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};h.context.cancelAnimationFrame=n=>frames.delete(n);const scroll={scrollLeft:513,clientWidth:400,scrollWidth:3000};h.nodes.set('.visual-scroll',scroll);h.run('coastAxis(725)');for(let i=0;i<300&&frames.size;i++){clock+=16;const batch=[...frames.values()];frames.clear();batch.forEach(f=>f(clock));}assert.equal(h.run('motionFrame'),0);assert.ok(scroll.scrollLeft>657&&scroll.scrollLeft<658);assert.notEqual((scroll.scrollLeft-80)%36,0);});
test('single event directly shows the detail row without a redundant tooltip',t=>{const h=harness(t);h.run('renderSchedule()');assert.match(h.main(),/event-detail-space/);h.context.hoverNode={getBoundingClientRect(){return {left:300,top:350,width:36,bottom:386};}};h.context.window.innerWidth=1000;h.run("showEventHover('seed-1-0',hoverNode)");assert.equal(h.nodes.get('#event-hover-card').hidden,true);assert.equal(h.nodes.get('#event-detail-row').hidden,false);const detail=h.nodes.get('#event-detail-row').innerHTML;assert.match(detail,/戏梦巴黎/);assert.doesNotMatch(detail,/detail-facts/);assert.match(detail,/movie-meta/);assert.match(detail,/class="detail-label">puppy<\/span>/);assert.match(detail,/>jammy<\/span>/);h.run('hideEventHover()');assert.equal(h.nodes.get('#event-detail-row').hidden,true);});
test('timeline entry asks only five categories before revealing the selected form',t=>{const h=harness(t);h.run("openQuickCategory('2026-10-18')");let html=h.nodes.get('#modal').innerHTML;assert.equal((html.match(/data-quick-category=/g)||[]).length,5);assert.doesNotMatch(html,/<form|<input|participant-options|quick-content/);assert.equal(h.run('quickDate'),'2026-10-18');h.run("openQuick('book',quickDate)");html=h.nodes.get('#modal').innerHTML;assert.match(html,/id="quick-form"/);assert.match(html,/id="quick-back"/);assert.match(html,/value="2026-10-18"/);assert.doesNotMatch(html,/data-quick-category=/);h.run("openQuick('punishment',quickDate)");html=h.nodes.get('#modal').innerHTML;assert.match(html,/id="quick-grant"/);assert.match(html,/id="quick-demand"/);assert.doesNotMatch(html,/participant-options|id="quick-form"/);});
test('saved games become reusable tags and selecting one links the existing library entry',t=>{const h=harness(t);const first=h.service.createEvent({kind:'game',workTitle:'杀戮尖塔2',date:'2026-10-12',state:'done',participants:3},'puppy');h.context.updated=h.service.snapshot('puppy');h.context.gameId=first.workId;h.run("state=updated;openQuick('game','2026-10-13')");const html=h.nodes.get('#quick-content').innerHTML;assert.match(html,/game-reuse-tags/);assert.match(html,/杀戮尖塔2/);assert.match(html,/name="workId" hidden/);h.run('selectQuickGame(gameId)');assert.equal(h.nodes.get('#work-select').value,first.workId);assert.equal(h.nodes.get('#new-work-fields').hidden,true);assert.equal(h.nodes.get('#new-work-title').required,false);h.service.createEvent({workId:first.workId,date:'2026-10-13',state:'done',participants:3},'puppy');assert.equal(h.service.snapshot('puppy').works.filter(w=>w.kind==='game').length,1);h.run("selectQuickGame('')");assert.equal(h.nodes.get('#new-work-fields').hidden,false);assert.equal(h.nodes.get('#new-work-title').required,true);});
test('month appears once per month and date ticks show only the day number',t=>{const h=harness(t);h.run('renderSchedule()');const html=h.main();assert.equal((html.match(/>九月</g)||[]).length,1);assert.equal((html.match(/>十月</g)||[]).length,1);assert.match(html,/class="axis-numeral" aria-hidden="true">1<\/span>/);assert.match(html,/class="axis-numeral" aria-hidden="true">31<\/span>/);assert.doesNotMatch(html,/class="axis-numeral" aria-hidden="true">\d{2}\.\d{2}/);});
test('month bands span each month and track height reserves scaled label space',t=>{const h=harness(t);h.run('visualScale=120;renderSchedule()');const html=h.main();assert.match(html,/data-month="2026-09"[^>]*width:calc\(30 \* var\(--time-scale\)\)/);assert.match(html,/>九月<small>1 – 30<\/small>/);assert.match(html,/height:calc\(var\(--axis-y\) \+ 136px \* var\(--visual-zoom\) \+ 24px\)/);assert.match(html,/--month-offset:90px/);});
test('date hit targets are centered and bounded, with shared node and number hover feedback',t=>{const h=harness(t);h.run('renderSchedule()');assert.match(h.main(),/width:min\(var\(--time-scale\), 44px\)/);const css=fs.readFileSync(__dirname+'/life.css','utf8');assert.match(css,/\.axis-date\{top:calc\(var\(--axis-y\) - 14px \* var\(--visual-zoom\)\);height:calc\(52px \* var\(--visual-zoom\)\)/);assert.match(css,/\.axis-date:hover \.axis-numeral[^}]*scale\(1\.5\)/);assert.match(css,/\.axis-date:hover \.axis-tick[^}]*transform:scale\(1\.8\)/);});
test('same-day aggregation shows one badge and expands every event without stacking',t=>{const h=harness(t);h.service.createEvent({kind:'other',title:'第三件事',date:'2026-10-05',state:'done',participants:3},'puppy');h.context.updated=h.service.snapshot('puppy');h.run('state=updated;visualScale=120;renderSchedule()');const html=h.main();assert.equal((html.match(/data-day-group="2026-10-05"/g)||[]).length,1);assert.match(html,/class="day-count">3<\/span>/);assert.doesNotMatch(html,/101px \* var\(--visual-zoom\)|147px \* var\(--visual-zoom\)/);h.context.hoverNode={getBoundingClientRect(){return {left:300,top:350,width:36,bottom:386};}};h.context.window.innerWidth=1000;h.run("showDayHover('2026-10-05',hoverNode)");const palette=h.nodes.get('#event-hover-card').innerHTML,detail=h.nodes.get('#event-detail-row').innerHTML;assert.equal((palette.match(/data-visual-event=/g)||[]).length,3);assert.equal((palette.match(/data-event=/g)||[]).length,3);for(const title of ['登堂入室','分手的决心','第三件事'])assert.ok(palette.includes(title));assert.equal((detail.match(/data-detail-event=/g)||[]).length,1);h.run("showEventHover(visibleEvents().find(e=>e.title==='第三件事').id,hoverNode)");assert.match(h.nodes.get('#event-detail-row').innerHTML,/第三件事/);assert.doesNotMatch(h.nodes.get('#event-detail-row').innerHTML,/登堂入室|分手的决心/);h.run('hideEventHover()');assert.equal(h.run('activeDay'),null);});
test('idle lower region shows pending plans, hover replaces them and leaving restores them',t=>{const h=harness(t);h.service.createEvent({kind:'other',title:'明天散步',date:'2026-10-14',state:'plan',participants:3},'puppy');h.service.createEvent({kind:'other',title:'没确认的旧计划',date:'2026-10-01',state:'plan',participants:1},'puppy');h.context.updated=h.service.snapshot('puppy');h.run('state=updated;renderSchedule()');const panel=h.nodes.get('#schedule-plans');assert.equal(panel.hidden,false);assert.match(panel.innerHTML,/明天散步/);assert.match(panel.innerHTML,/没确认的旧计划/);assert.doesNotMatch(panel.innerHTML,/戏梦巴黎/);h.context.hoverNode={getBoundingClientRect(){return {left:300,top:350,width:36,bottom:386};}};h.context.window.innerWidth=1000;h.run("showDayHover('2026-10-05',hoverNode)");assert.equal(panel.hidden,true);assert.equal(h.nodes.get('#event-detail-row').hidden,false);h.run('hideEventHover()');assert.equal(panel.hidden,false);assert.equal(h.nodes.get('#event-detail-row').hidden,true);assert.match(panel.innerHTML,/明天散步/);});
test('clicked day stays pinned on leave and exposes inline editors until explicitly released',t=>{const h=harness(t);h.run('renderSchedule()');h.context.hoverNode={getBoundingClientRect(){return {left:300,top:350,width:36,bottom:386};}};h.context.window.innerWidth=1000;h.run("pinDay('2026-10-05',hoverNode);hideEventHover()");assert.equal(h.run('pinnedDay'),'2026-10-05');const row=h.nodes.get('#event-detail-row');assert.equal(row.hidden,false);assert.match(row.innerHTML,/已固定/);assert.match(row.innerHTML,/data-inline-work="film-7"/);assert.match(row.innerHTML,/data-inline-review="film-7"/);assert.doesNotMatch(row.innerHTML,/name="participants"|修改这次日程/);const pinned=row.innerHTML;h.run("showDayHover('2026-10-07',hoverNode)");assert.equal(row.innerHTML,pinned);h.run('hideEventHover(true)');assert.equal(h.run('pinnedDay'),null);assert.equal(row.hidden,true);assert.equal(h.nodes.get('#schedule-plans').hidden,false);});
test('inline evaluation saves to shared work and immediately appears in library',async t=>{const h=harness(t);const w=h.service.snapshot('puppy').works.find(w=>w.id==='film-7');h.context.FormData=class{constructor(form){this.values=form.values;}[Symbol.iterator](){return this.values[Symbol.iterator]();}};h.context.mockApi=async(path,method,body)=>{if(path==='/api/state')return h.service.snapshot('puppy');return h.service.review(path.split('/').at(-1),body,'puppy');};h.context.inlineForm={dataset:{inlineReview:w.id,version:w.reviews.puppy.version||''},values:[['score','8.7'],['note','这是下方编辑保存的感受']],querySelector(){return {disabled:false,textContent:''};}};h.run("api=mockApi;pinnedDay='2026-10-05'");await h.run('saveInlineDay(inlineForm)');assert.equal(h.service.snapshot('puppy').works.find(x=>x.id===w.id).reviews.puppy.score,8.7);h.run("page='movie';renderLibrary()");assert.match(h.main(),/>8.7<\/button>/);});
test('clicking the same day again releases its pin and restores plans',t=>{const h=harness(t);h.run('renderSchedule()');h.context.hoverNode={getBoundingClientRect(){return {left:300,top:350,width:36,bottom:386};}};h.context.window.innerWidth=1000;h.run("toggleDayPin('2026-10-05',hoverNode)");assert.equal(h.run('pinnedDay'),'2026-10-05');h.run("toggleDayPin('2026-10-05',hoverNode)");assert.equal(h.run('pinnedDay'),null);assert.equal(h.nodes.get('#event-detail-row').hidden,true);assert.equal(h.nodes.get('#schedule-plans').hidden,false);});
test('dasharray experiment is confined to the pinned node with reduced-motion support',t=>{const h=harness(t);h.run("pinnedDay='2026-10-05';renderSchedule()");assert.match(h.main(),/day-group is-done is-pinned/);assert.match(h.main(),/class="pin-orbit"/);const css=fs.readFileSync(__dirname+'/life.css','utf8');assert.match(css,/stroke-dasharray:3 6/);assert.match(css,/stroke-dashoffset:-54/);assert.match(css,/prefers-reduced-motion:reduce[^}]+animation:none/);});
test('movie detail keeps only title and independent reviews, with own-account editing',t=>{const h=harness(t);h.run("pinnedDay='2026-10-05';showEventDetail(state.events.find(e=>e.id==='seed-7-0'))");const html=h.nodes.get('#event-detail-row').innerHTML;assert.match(html,/aria-label="电影名"/);assert.match(html,/class="detail-label">puppy<\/span>/);assert.match(html,/>jammy<\/span>/);assert.doesNotMatch(html,/未评分|暂无感受|修改这次日程|name="date"|name="participants"|name="state"|detail-original/);assert.match(html,/movie-meta/);assert.equal((html.match(/data-inline-review=/g)||[]).length,1);});
test('inline rename updates the library and every linked timeline name without changing dates',async t=>{const h=harness(t),work=h.service.snapshot('puppy').works.find(w=>w.id==='film-9'),before=h.service.snapshot('puppy').events.filter(e=>e.workId===work.id).map(e=>e.date);h.context.FormData=class{constructor(form){this.values=form.values;}[Symbol.iterator](){return this.values[Symbol.iterator]();}};h.context.mockApi=async(path,method,body)=>path==='/api/state'?h.service.snapshot('puppy'):h.service.updateWork(path.split('/').at(-1),body);h.context.inlineForm={dataset:{inlineWork:work.id,version:work.version},values:[['title','饮食男女（重看）']],querySelector(){return {disabled:false,textContent:''};}};h.run("api=mockApi;pinnedDay='2026-10-07'");await h.run('saveInlineDay(inlineForm)');assert.equal(h.run("visibleEvents().filter(e=>e.workId==='film-9').every(e=>e.title==='饮食男女（重看）')"),true);assert.deepEqual(h.service.snapshot('puppy').events.filter(e=>e.workId===work.id).map(e=>e.date),before);h.run("page='movie';renderLibrary()");assert.match(h.main(),/饮食男女（重看）/);});
test('movie review blanks remain empty, zero remains a rating, metadata stays in its footer',t=>{const h=harness(t);let html=h.run("simpleMovieDetail(state.works.find(w=>w.id==='film-9'))");assert.doesNotMatch(html,/未评分|暂无感受|的评分与感受/);assert.match(html,/<output><\/output>/);assert.match(html,/movie-meta[^]*1994[^]*导演 李安[^]*豆瓣 9.2/);const work=h.service.snapshot('puppy').works.find(w=>w.id==='film-9');h.service.review(work.id,{score:0,note:'零分是有效评分'},'jammy');h.context.updated=h.service.snapshot('puppy');h.run('state=updated');html=h.run("simpleMovieDetail(state.works.find(w=>w.id==='film-9'))");assert.match(html,/<output>0.0<\/output>/);assert.match(html,/零分是有效评分/);});
test('own movie rating is an editable input before pinning and metadata sits beside the title',t=>{const h=harness(t);h.run('pinnedDay=null');const html=h.run("simpleMovieDetail(state.works.find(w=>w.id==='film-9'))");assert.match(html,/movie-header[^]*movie-meta[^]*movie-person-reviews/);assert.match(html,/data-inline-review="film-9"[^]*name="score"[^]*aria-label="puppy 分数"/);assert.doesNotMatch(html,/name="score"[^>]*readonly|name="score"[^>]*disabled/);assert.match(html,/type="range" min="0" max="10" step="0.1"/);});
test('rating bars use proportional fills and keep blank distinct from zero',t=>{const h=harness(t);const blank=h.run("movieRatingBar({score:null},'puppy',true)"),filled=h.run("movieRatingBar({score:6.8},'puppy',true)"),partner=h.run("movieRatingBar({score:5},'jammy',false)");assert.match(blank,/<output><\/output>/);assert.match(blank,/name="score" type="hidden" value=""/);assert.match(filled,/--rating-percent:68%/);assert.match(filled,/<output>6.8<\/output>/);assert.match(partner,/--rating-percent:50%/);assert.doesNotMatch(partner,/type="range"/);const nodes={score:{value:''},output:{textContent:''},clear:{hidden:true}};h.context.ratingRange={value:'6.8',setAttribute(){},closest(){return {style:{setProperty(k,v){nodes.percent=v;}},querySelector(q){return q==='[name=score]'?nodes.score:q==='output'?nodes.output:nodes.clear;}};}};h.run('updateMovieRating(ratingRange)');assert.equal(nodes.score.value,6.8);assert.equal(nodes.percent,'68%');assert.equal(nodes.output.textContent,'6.8');});
test('partner card starts on its cover and never exposes server-redacted review fields',t=>{const h=harness(t);h.context.secretWork={reviews:{jammy:{hidden:true,score:9.9,note:'PRIVATE_NOTE'}}};const html=h.run("partnerReviewCard(secretWork,'jammy')");assert.match(html,/review-cover/);assert.match(html,/review-front" aria-hidden="true" inert/);assert.match(html,/点击翻面/);assert.doesNotMatch(html,/PRIVATE_NOTE|9.9/);assert.match(html,/待揭晓/);});
test('partner flip toggles its faces and keyboard accessibility in both directions',t=>{const h=harness(t);let flipped=false;const control={setAttribute(){},focus(){}},front={inert:true,setAttribute(){},querySelector(){return control;}},cover={inert:false,setAttribute(){},querySelector(){return control;}},card={classList:{toggle(){flipped=!flipped;return flipped;}},querySelector(s){return s==='.review-front'?front:cover;}};h.context.flipButton={closest(){return card;}};h.run("pinnedDay='2026-10-07';flipPartnerReview(flipButton)");assert.equal(flipped,true);assert.equal(front.inert,false);assert.equal(cover.inert,true);h.run('flipPartnerReview(flipButton)');assert.equal(flipped,false);assert.equal(front.inert,true);assert.equal(cover.inert,false);});
test('month band centers its middle day without changing zoom, including leap February',t=>{const h=harness(t),seen=[];h.context.captureDate=date=>seen.push(date);h.run('centerAxisDate=captureDate;visualScale=72');h.run("centerAxisMonth('2026-10');centerAxisMonth('2026-09');centerAxisMonth('2028-02');centerAxisMonth('2026-13')");assert.deepEqual(seen,['2026-10-16','2026-09-15','2028-02-15']);assert.equal(h.run('visualScale'),72);h.run('renderSchedule()');assert.match(h.main(),/<button type="button" class="axis-month/);assert.match(h.main(),/点击居中显示本月/);});
test('poster is present only on partner card cover and remains shared with movie library',t=>{const h=harness(t),work=h.service.snapshot('puppy').works.find(w=>w.id==='film-9');const poster={url:'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p1910899751.jpg',sourceUrl:'https://movie.douban.com/subject/1291818/',label:'饮食男女',source:'豆瓣公开海报'};h.service.updateWork(work.id,{version:work.version,poster},'jammy');h.context.updated=h.service.snapshot('puppy');h.run('state=updated');const detail=h.run("simpleMovieDetail(state.works.find(w=>w.id==='film-9'))");assert.equal((detail.match(/class="review-poster"/g)||[]).length,1);assert.match(detail,/review-cover"><img class="review-poster"/);assert.doesNotMatch(detail,/own-review"><img|review-front"[^>]*><img/);assert.match(detail,/data-poster-picker="film-9"/);h.run("page='movie';renderLibrary()");assert.match(h.main(),/海报/);assert.match(h.main(),/p1910899751.jpg/);});
test('puppy selected poster does not show on jammy cover, but shows on puppy cover to jammy',t=>{const h=harness(t);h.context.posterWork={title:'电影',reviews:{puppy:{score:null},jammy:{score:null}},posters:{puppy:{url:'https://media.themoviedb.org/t/p/w188/a.jpg'}}};let html=h.run("person='puppy';simpleMovieDetail(posterWork)");assert.doesNotMatch(html,/class="review-poster"/);html=h.run("person='jammy';simpleMovieDetail(posterWork)");assert.match(html,/review-cover"><img class="review-poster"/);h.context.oldWork={...h.context.posterWork,posters:undefined,poster:h.context.posterWork.posters.puppy};html=h.run("simpleMovieDetail(oldWork)");assert.doesNotMatch(html,/class="review-poster"/);});
test('recycling preserves the absolute center, active drag and pinned lower editor',t=>{
 const h=harness(t),T=require('./timeline-engine.js');
 const scroll={scrollLeft:150,clientWidth:600},track={dataset:{start:'2026-10-01',days:'120'},style:{},innerHTML:''};
 h.nodes.set('.visual-scroll',scroll);h.nodes.set('.visual-track',track);
 h.context.scroll=scroll;h.context.track=track;
 h.run("visualScale=36;axisPan={scroll,left:400};pinnedDay='2026-10-05';pinnedEventIds=['seed-7-0'];");
 h.nodes.get('#event-detail-row')||h.run('renderSchedulePlans()');
 const editor={innerHTML:'unsaved draft',hidden:false};h.nodes.set('#event-detail-row',editor);
 const center=T.index(track.dataset.start)+(150+300-80)/36;
 h.context.center=center;const delta=h.run('rebuildAxisWindow(scroll,track,center)');
 assert.ok(Math.abs(T.index(track.dataset.start)+(scroll.scrollLeft+300-80)/36-center)<1e-9);
 assert.equal(h.run('axisPan.left'),400+delta);assert.equal(h.run('pinnedDay'),'2026-10-05');
 assert.equal(editor.innerHTML,'unsaved draft');assert.equal(editor.hidden,false);
});
test('lowest density renders years and month groups without thousands of day elements',t=>{
 const h=harness(t);h.run("visualScale=.25;visualFocus='2026-10-13';renderSchedule()");
 assert.doesNotMatch(h.main(),/class="axis-date /);assert.match(h.main(),/class="axis-year"/);
 assert.match(h.main(),/simplified-node/);assert.ok((h.main().match(/data-month=/g)||[]).length<1000);
 h.context.hoverNode={getBoundingClientRect(){return {left:300,top:350,width:36,bottom:386};}};
 h.context.window.innerWidth=1000;h.run("showDayHover('2026-01-01',hoverNode)");
 const detail=h.nodes.get('#event-detail-row').innerHTML;
 assert.equal((detail.match(/data-detail-event=/g)||[]).length,1);
 h.run("showEventHover(visibleEvents().find(e=>e.title==='攻壳机动队').id,hoverNode)");
 assert.match(h.nodes.get('#event-detail-row').innerHTML,/攻壳机动队/);
 assert.doesNotMatch(h.nodes.get('#event-detail-row').innerHTML,/分手的决心/);
});
test('first entrance spreads the rail then months then plans without moving real dates',t=>{
 const h=harness(t),calls=[],animations=[];
 const rect={left:20,right:620,width:600};
 const animated=label=>({getBoundingClientRect(){return rect;},animate(frames,options){calls.push({label,frames,options});const a={finished:new Promise(()=>{}),finish(){this.finishedByUser=true;},cancel(){this.cancelled=true;}};animations.push(a);return a;}});
 h.nodes.set('.visual-scroll',{...animated('scroll'),scrollLeft:555});
 h.nodes.set('.single-axis',animated('rail'));h.nodes.set('.event-detail-space',animated('panel'));
 h.context.requestAnimationFrame=()=>{};h.context.document.querySelectorAll=selector=>selector==='.axis-month'?[animated('month')]:selector==='.schedule-plan'?[animated('plan')]:[];
 const events=JSON.stringify(h.service.snapshot('puppy').events);
 h.run('animateScheduleEntrance()');assert.deepEqual(calls.map(c=>c.label),['rail','month','panel','plan']);
 assert.ok(calls[0].options.delay<calls[1].options.delay&&calls[1].options.delay<calls[2].options.delay);
 const upperEnd=Math.max(...calls.filter(c=>['rail','month'].includes(c.label)).map(c=>c.options.delay+c.options.duration));
 assert.ok(calls.find(c=>c.label==='panel').options.delay>upperEnd);
 assert.ok(calls.find(c=>c.label==='plan').options.delay>upperEnd);
 assert.ok(calls.find(c=>c.label==='plan').options.delay+calls.find(c=>c.label==='plan').options.duration>=3700);
 assert.match(calls[0].frames[0].clipPath,/inset/);assert.equal(h.nodes.get('.visual-scroll').scrollLeft,555);
 h.run('animateScheduleEntrance()');assert.equal(calls.length,4);
 h.run('finishScheduleEntrance()');assert.ok(animations.every(a=>a.finishedByUser&&a.cancelled));
 assert.equal(h.run('entranceAnimations.length'),0);assert.equal(JSON.stringify(h.service.snapshot('puppy').events),events);
});
test('reduced motion skips entrance animation and never replays on data refresh',t=>{
 const h=harness(t);h.context.requestAnimationFrame=()=>{};h.context.window.matchMedia=()=>({matches:true});
 h.nodes.set('.visual-scroll',{animate(){throw Error('must not animate');}});
 h.run('animateScheduleEntrance();animateScheduleEntrance()');assert.equal(h.run('scheduleEntranceShown'),true);assert.equal(h.run('entranceAnimations.length'),0);
});
test('flight detail reduction is velocity based, resets to zero and honors reduced motion',t=>{
 const h=harness(t),values={};h.context.requestAnimationFrame=()=>{};
 h.nodes.set('.visual-scroll',{style:{setProperty(k,v){values[k]=v;}},classList:{toggle(k,v){values[k]=v;}}});
 h.run('setAxisFlight(2000)');assert.equal(values['--flight'],1);assert.equal(values['is-flying'],true);
 h.run('setAxisFlight(200)');assert.equal(values['--flight'],0);
 h.run('setAxisFlight(-1300);stopAxisMotion()');assert.equal(values['--flight'],0);
 h.context.window.matchMedia=()=>({matches:true});h.run('setAxisFlight(2400)');assert.equal(values['--flight'],0);
});
test('proximity feedback applies only near the nearest node, never across blank canvas',t=>{
 const h=harness(t);h.context.requestAnimationFrame=()=>{};
 const values={},node={getBoundingClientRect(){return {left:100,top:200,width:36,height:36};},style:{setProperty(k,v){values[k]=v;},removeProperty(k){delete values[k];}},classList:{add(){values.near=true;},remove(){values.near=false;}}};
 h.context.document.querySelectorAll=()=>[node];h.context.pointer={clientX:130,clientY:218,target:{closest(){return true;}}};
 h.run('updateAxisProximity(pointer)');assert.equal(values.near,true);assert.ok(Number(values['--near'])>.7);
 h.context.pointer.clientY=400;h.run('updateAxisProximity(pointer)');assert.equal(values.near,false);assert.equal(values['--near'],undefined);
});
test('LOD morph disperses aggregated nodes from their former screen positions and cleans ghost',async t=>{
 const h=harness(t),records=[],ghost={dataset:{},style:{},remove(){this.removed=true;},animate(){return {finished:Promise.resolve()};}};
 h.context.requestAnimationFrame=()=>{};h.nodes.set('.visual-scroll',{getBoundingClientRect(){return {left:0,right:600};}});
 const node={dataset:{dayGroup:'2026-10-05'},getBoundingClientRect(){return {left:280,right:316,width:36};},animate(frames,options){records.push({frames,options});}};
 h.context.track={append(child){this.child=child;},querySelectorAll(){return [node];}};
 h.context.morph={ghost,positions:new Map([['one',260],['two',280]])};
 h.run("axisGroups=new Map([['2026-10-05',[{id:'one'},{id:'two'}]]]);playAxisMorph(track,morph,100)");
 assert.equal(ghost.style.left,'100px');assert.equal(records[0].frames[0].translate,'-28px 0');assert.equal(records[0].frames[1].translate,'0px 0');
 await Promise.resolve();assert.equal(ghost.removed,true);
});
test('single selected detail stays selected after pinning and refresh without hover losing edits',t=>{
 const h=harness(t);h.run('renderSchedule()');h.context.hoverNode={getBoundingClientRect(){return {left:300,top:350,width:36,bottom:386};}};h.context.window.innerWidth=1000;
 h.run("pinDay('2026-10-05',hoverNode,'seed-8-0')");
 const row=h.nodes.get('#event-detail-row');assert.equal((row.innerHTML.match(/data-detail-event=/g)||[]).length,1);
 assert.match(row.innerHTML,/data-inline-work="film-8"/);assert.doesNotMatch(row.innerHTML,/data-inline-work="film-7"/);
 const fixed=row.innerHTML;h.run("showEventHover('seed-7-0',hoverNode)");assert.equal(row.innerHTML,fixed);
 h.run('renderSchedule()');assert.equal(h.run('selectedDetailId'),'seed-8-0');assert.match(row.innerHTML,/data-inline-work="film-8"/);
 h.run("pinDay('2026-10-05',hoverNode,'seed-7-0')");assert.match(row.innerHTML,/data-inline-work="film-7"/);assert.doesNotMatch(row.innerHTML,/data-inline-work="film-8"/);
 h.run('hideEventHover(true)');assert.equal(h.run('selectedDetailId'),null);
});
test('moving from multiple events to a single event removes the palette but keeps detail and pin editing',t=>{
 const h=harness(t);h.run('renderSchedule()');h.context.hoverNode={getBoundingClientRect(){return {left:300,top:350,width:36,bottom:386};}};h.context.window.innerWidth=1000;
 h.run("showDayHover('2026-10-05',hoverNode)");assert.equal(h.nodes.get('#event-hover-card').hidden,false);
 h.run("showDayHover('2026-10-07',hoverNode)");assert.equal(h.nodes.get('#event-hover-card').hidden,true);assert.equal(h.nodes.get('#event-hover-card').innerHTML,'');
 assert.match(h.nodes.get('#event-detail-row').innerHTML,/饮食男女/);
 h.run("pinDay('2026-10-07',hoverNode)");assert.equal(h.nodes.get('#event-hover-card').hidden,true);assert.match(h.nodes.get('#event-detail-row').innerHTML,/已固定/);
 assert.match(h.nodes.get('#event-detail-row').innerHTML,/data-inline-review="film-9"/);
});
test('title dashed outline preserves autosizing sibling order and is only visible during editing',t=>{
 const h=harness(t);h.run("pinnedDay='2026-10-05'");const html=h.run("simpleMovieDetail(state.works.find(w=>w.id==='film-7'))");
 assert.match(html,/movie-title-measure[^]*<input name="title"[^]*<svg class="title-edit-outline"/);
 assert.match(html,/title-edit-outline" aria-hidden="true" focusable="false"/);
 const css=fs.readFileSync(__dirname+'/life.css','utf8');assert.match(css,/stroke-dasharray:4 6/);assert.match(css,/stroke-dashoffset:-40/);
 assert.match(css,/\.movie-title-form:focus-within \.title-edit-outline\{opacity:1\}/);
 assert.match(css,/prefers-reduced-motion:reduce[^]*title-edit-outline rect\{animation:none/);
});
test('title saved feedback turns green temporarily and restores the normal control label',t=>{
 const h=harness(t),classes=new Set(),attrs={},timers=[];
 h.context.setTimeout=(fn,ms)=>{timers.push({fn,ms});};
 h.nodes.set('[data-inline-work="film-7"]',{classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)},querySelector(){return {setAttribute(k,v){attrs[k]=v;}};}});
 h.run("showTitleSaved('film-7')");assert.ok(classes.has('is-title-saved'));assert.equal(attrs['aria-label'],'电影名已保存');
 assert.equal(timers[0].ms,1500);timers[0].fn();assert.equal(classes.has('is-title-saved'),false);assert.equal(attrs['aria-label'],'保存电影名');
});
test('rating spring follows the exact score, can retarget and converges without changing saved data',t=>{
 const h=harness(t),frames=new Map(),styles={'--rating-percent':'0%'},fields={score:{value:''},output:{textContent:''},clear:{hidden:true}};let clock=0,id=0;
 h.context.performance={now:()=>clock};h.context.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};h.context.cancelAnimationFrame=n=>frames.delete(n);
 const rating={dataset:{},isConnected:true,style:{setProperty(k,v){styles[k]=v;},getPropertyValue:k=>styles[k]},querySelector(q){return q==='[name=score]'?fields.score:q==='output'?fields.output:fields.clear;}};
 h.context.range={value:'8.7',closest:()=>rating,setAttribute(){}};
 const before=JSON.stringify(h.service.snapshot('puppy').works);h.run('updateMovieRating(range)');assert.equal(fields.score.value,8.7);assert.equal(styles['--rating-percent'],'0%');
 clock+=16;let batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(clock));assert.ok(parseFloat(styles['--rating-percent'])>0&&parseFloat(styles['--rating-percent'])<87);
 h.context.range.value='6.3';h.run('updateMovieRating(range)');assert.equal(fields.score.value,6.3);assert.equal(fields.output.textContent,'6.3');
 for(let i=0;i<300&&frames.size;i++){clock+=16;batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(clock));assert.ok(parseFloat(styles['--rating-percent'])>=0&&parseFloat(styles['--rating-percent'])<=100);}
 assert.equal(styles['--rating-percent'],'63%');assert.equal(styles['--rating-fraction'],.63);assert.equal(h.run('ratingMotions.size'),0);assert.equal(JSON.stringify(h.service.snapshot('puppy').works),before);
});
test('clearing a rating cancels inertia and leaves a genuinely empty score',t=>{
 const h=harness(t),frames=new Map(),styles={'--rating-percent':'70%'},score={value:7},output={textContent:'7.0'},clear={hidden:false};let id=0;
 h.context.performance={now:()=>0};h.context.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};h.context.cancelAnimationFrame=n=>frames.delete(n);
 const range={value:7,setAttribute(){}};h.context.rating={dataset:{},style:{setProperty(k,v){styles[k]=v;},getPropertyValue:k=>styles[k]},querySelector(q){return q==='[name=score]'?score:q==='output'?output:q==='[data-rating-range]'?range:clear;}};
 h.run('setRatingTarget(rating,90);clearMovieRating(rating)');assert.equal(frames.size,0);assert.equal(score.value,'');assert.equal(output.textContent,'');assert.equal(styles['--rating-percent'],'0%');assert.equal(clear.hidden,true);assert.equal(h.run('rating.dataset.empty'),'true');
});
test('initial timeline is centered on today and no longer includes the small range readout',t=>{
 const h=harness(t),T=require('./timeline-engine.js'),scroll={scrollLeft:0,clientWidth:600,addEventListener(){}};h.nodes.set('.visual-scroll',scroll);
 h.run('renderSchedule()');const start=h.main().match(/data-start="([^"]+)"/)[1];
 const center=T.index(start)+(scroll.scrollLeft+scroll.clientWidth/2-80)/36;
 assert.equal(center,T.index(h.run('today()'))+.5);assert.doesNotMatch(h.main(),/view-date-range|id="visual-range"/);
});
test('vertical node titles appear at default zoom, hide at wide zoom and deduplicate names',t=>{
 const h=harness(t);h.run('visualScale=35.9;renderSchedule()');assert.doesNotMatch(h.main(),/class="node-titles"/);
 h.run('visualScale=36;renderSchedule()');assert.match(h.main(),/class="node-titles"/);
 h.run('visualScale=72;renderSchedule()');assert.match(h.main(),/class="node-titles" aria-hidden="true"><span>登堂入室<\/span><span>分手的决心<\/span>/);
 const safe=h.run("nodeTitleMarkup([{title:'<电影>'},{title:'<电影>'}])");assert.equal((safe.match(/&lt;电影&gt;/g)||[]).length,1);
 const css=fs.readFileSync(__dirname+'/life.css','utf8');assert.match(css,/writing-mode:vertical-rl/);assert.match(css,/text-orientation:upright/);
});
test('zoom defers detail changes until settling, avoids morph clones and preserves center',t=>{
 const h=harness(t),T=require('./timeline-engine.js'),scroll={scrollLeft:1000,clientWidth:600};
 const track={dataset:{start:'2026-10-01',days:'120',detail:'days',aggregate:'normal',titles:'true'},style:{'--visual-zoom':1,setProperty(k,v){this[k]=v;}},cloneNode(){throw Error('zoom must not clone layers');}};
 h.nodes.set('.visual-scroll',scroll);h.nodes.set('.visual-track',track);
 const center=T.index('2026-10-01')+(1000+300-80)/36;h.context.center=center;
 h.run('visualScale=36;setAxisScale(18,0,center,true)');assert.equal(track.dataset.detail,'days');assert.equal(track.style['--visual-zoom'],h.run('axisVisualZoom(18)'));
 h.run('setAxisScale(18,0,center,false)');assert.equal(track.dataset.detail,'weeks');assert.equal(track.dataset.titles,'false');assert.equal(track.style['--title-space'],'0px');
 assert.ok(Math.abs(T.index(track.dataset.start)+(scroll.scrollLeft+300-80)/18-center)<1e-9);
});
test('punishment node captions are short, deduplicated and do not replace movie names',t=>{
 const h=harness(t);h.run('visualScale=36');const html=h.run("nodeTitleMarkup([{kind:'punishment',title:'puppy 获得一次机会'},{kind:'punishment',title:'jammy 提出了要求'},{kind:'movie',title:'喜宴'}])");
 assert.equal((html.match(/<span>惩罚<\/span>/g)||[]).length,1);assert.match(html,/<span>喜宴<\/span>/);assert.doesNotMatch(html,/获得|要求|puppy|jammy/);
});
test('inline composer starts with exactly five choices, preserves date and blocks timeline hover',t=>{
 const h=harness(t);h.run('renderSchedule()');assert.doesNotMatch(h.main(),/visual-add|添加一条日程/);assert.match(h.main(),/data-quick=/);
 assert.match(h.nodes.get('#schedule-plans').innerHTML,/还想做什么/);
 h.run("LifeComposer.start('2026-10-23')");const panel=h.nodes.get('#schedule-plans'),first=panel.innerHTML;
 assert.equal((first.match(/data-composer="kind"/g)||[]).length,5);assert.doesNotMatch(first,/<input/);
 assert.equal(h.run('LifeComposer.getDraft().values.date'),'2026-10-23');assert.equal(h.run('LifeComposer.getDraft().people'),3);assert.equal(h.run('LifeComposer.getDraft().state'),'plan');
 h.context.hoverNode={};h.run("showDayHover('2026-10-05',hoverNode);toggleDayPin('2026-10-05',hoverNode);renderSchedulePlans()");assert.equal(panel.innerHTML,first);assert.equal(h.run('pinnedDay'),null);
});
test('composer existing work selection reaches confirmation without duplicating its metadata',async t=>{
 const h=harness(t);h.run('renderSchedule();LifeComposer.start()');await h.run("LifeComposer.click({dataset:{composer:'kind',value:'movie'}})");
 await h.run("LifeComposer.click({dataset:{composer:'work',value:'film-7'}})");
 assert.equal(h.run('LifeComposer.getDraft().step'),'confirm');const data=h.run('LifeComposer.payload()');assert.equal(data.workId,'film-7');assert.equal(data.state,'plan');assert.equal(data.participants,3);assert.equal(data.workTitle,undefined);
 await h.run("LifeComposer.click({dataset:{composer:'back',value:'work'}})");assert.equal(h.run('LifeComposer.getDraft().values.workId'),'film-7');
});
test('composer drafts survive switching tabs, rerender and changed date shortcuts',async t=>{
 const h=harness(t);h.run("renderSchedule();LifeComposer.start('2026-10-22')");await h.run("LifeComposer.click({dataset:{composer:'kind',value:'game'}})");
 h.run("LifeComposer.getDraft().values.workTitle='杀戮尖塔2';LifeComposer.getDraft().step='confirm'");
 await h.run("LifeComposer.click({dataset:{composer:'plans'}})");h.run('LifeComposer.start();renderSchedule()');
 assert.equal(h.run('LifeComposer.getDraft().values.workTitle'),'杀戮尖塔2');assert.equal(h.run('LifeComposer.getDraft().step'),'confirm');
 h.run("LifeComposer.start('2026-11-01')");assert.equal(h.run('LifeComposer.payload().date'),'2026-11-01');assert.equal(h.run('LifeComposer.payload().workTitle'),'杀戮尖塔2');
});
test('composer saves through the shared API then returns to plans',async t=>{
 const h=harness(t);h.run('renderSchedule();LifeComposer.start()');await h.run("LifeComposer.click({dataset:{composer:'kind',value:'movie'}})");await h.run("LifeComposer.click({dataset:{composer:'work',value:'film-7'}})");
 h.context.mockApi=async(path,method,body)=>path==='/api/state'?h.service.snapshot('puppy'):h.service.createEvent(body,'puppy');h.run('api=mockApi');
 const fieldset={disabled:false},error={textContent:''};h.context.composerForm={querySelector:q=>q==='fieldset'?fieldset:error};
 await h.run('LifeComposer.save(composerForm)');assert.equal(h.run('LifeComposer.isOpen()'),false);assert.equal(fieldset.disabled,false);
 assert.equal(h.service.snapshot('puppy').events.filter(e=>e.workId==='film-7'&&e.state==='plan').length,1);assert.match(h.nodes.get('#schedule-plans').innerHTML,/登堂入室/);
});
test('composer failed writes retain the draft, stop duplicates while pending and expose error',async t=>{
 const h=harness(t);h.run('renderSchedule();LifeComposer.start()');await h.run("LifeComposer.click({dataset:{composer:'kind',value:'movie'}})");await h.run("LifeComposer.click({dataset:{composer:'work',value:'film-7'}})");
 let calls=0,release;h.context.mockApi=async()=>{calls++;await new Promise(resolve=>release=resolve);throw Error('conflict');};h.run('api=mockApi');
 const fieldset={disabled:false},error={textContent:''};h.context.composerForm={querySelector:q=>q==='fieldset'?fieldset:error};
 const first=h.run('LifeComposer.save(composerForm)');await h.run('LifeComposer.save(composerForm)');assert.equal(calls,1);release();await first;
 assert.equal(h.run('LifeComposer.isOpen()'),true);assert.equal(h.run('LifeComposer.getDraft().values.workId'),'film-7');assert.equal(fieldset.disabled,false);assert.match(h.nodes.get('#quick-form .form-error').textContent,/conflict/);
});
test('composer captures typed fields and keeps them when the timeline is rerendered',async t=>{
 const h=harness(t);h.run('renderSchedule();LifeComposer.start()');await h.run("LifeComposer.click({dataset:{composer:'kind',value:'game'}})");
 h.context.FormData=class{constructor(form){this.values=form.values;}[Symbol.iterator](){return this.values[Symbol.iterator]();}};
 h.nodes.set('#quick-form',{elements:{},values:[['date','2026-10-25'],['workTitle','杀戮尖塔2'],['year','2026'],['owner','puppy'],['count','1']]});
 h.run('LifeComposer.capture();renderSchedule()');assert.equal(h.run('LifeComposer.getDraft().values.workTitle'),'杀戮尖塔2');assert.equal(h.run('LifeComposer.getDraft().values.date'),'2026-10-25');assert.match(h.nodes.get('#schedule-plans').innerHTML,/value="杀戮尖塔2"/);
});
test('inline movie association payload retains checked sources and optional metadata',async t=>{
 const h=harness(t);h.run('renderSchedule();LifeComposer.start()');await h.run("LifeComposer.click({dataset:{composer:'kind',value:'movie'}})");
 h.run("Object.assign(LifeComposer.getDraft().values,{workTitle:'新电影',year:'2001',director:'导演',en:'Original',type:'电影'});LifeComposer.getDraft().link={id:'1234567',rating:8.1};LifeComposer.getDraft().source={nameSourceUrl:'https://www.wikidata.org/wiki/Q1'}");
 const data=h.run('LifeComposer.payload()');assert.equal(data.douban.id,'1234567');assert.equal(data.douban.rating,8.1);assert.equal(data.en,'Original');assert.equal(data.year,'2001');assert.equal(data.state,'plan');assert.equal(data.nameSourceUrl,'https://www.wikidata.org/wiki/Q1');
});
test('punishment composer defaults to one chance for the current owner and writes one ledger event',async t=>{
 const h=harness(t);h.run('renderSchedule();LifeComposer.start()');await h.run("LifeComposer.click({dataset:{composer:'kind',value:'punishment'}})");await h.run("LifeComposer.click({dataset:{composer:'grant'}})");
 const data=h.run('LifeComposer.payload()');assert.equal(data.owner,'puppy');assert.equal(data.count,1);assert.equal(data.state,undefined);
 h.context.mockApi=async(path,method,body)=>path==='/api/state'?h.service.snapshot('puppy'):h.service.grant(body,'puppy');h.run('api=mockApi');
 const fieldset={disabled:false};h.context.composerForm={querySelector:q=>q==='fieldset'?fieldset:{textContent:''}};await h.run('LifeComposer.save(composerForm)');
 assert.equal(h.service.snapshot('puppy').chances.length,1);assert.equal(h.service.snapshot('puppy').events.filter(e=>e.kind==='punishment').length,1);assert.equal(h.run('LifeComposer.isOpen()'),false);
});
test('background refresh updates state without rebuilding an active composer',async t=>{
 const h=harness(t);h.run('renderSchedule();LifeComposer.start()');const panel=h.nodes.get('#schedule-plans'),before=panel.innerHTML;
 h.context.mockApi=async()=>h.service.snapshot('puppy');h.run('api=mockApi');await h.run('refresh()');assert.equal(panel.innerHTML,before);assert.equal(h.run('LifeComposer.isOpen()'),true);
});
test('deck renders five accessible cards and a touch/reduced-motion alternative',t=>{
 const h=harness(t);h.run('renderSchedule();LifeComposer.start()');const html=h.nodes.get('#schedule-plans').innerHTML;
 assert.equal((html.match(/class="composer-deck-card"/g)||[]).length,5);assert.match(html,/role="group" aria-label="选择一种活动"/);
 const css=fs.readFileSync(__dirname+'/life.css','utf8');assert.match(css,/\.composer-deck:hover,\.composer-deck:focus-within/);assert.match(css,/@media\(hover:none\),\(max-width:420px\)/);assert.match(css,/prefers-reduced-motion:reduce[^]*composer-deck/);
});
test('card extraction accepts only one selection while transitioning',async t=>{
 const h=harness(t);h.context.requestAnimationFrame=()=>{};h.run('renderSchedule();LifeComposer.start()');let complete;
 h.context.card={dataset:{composer:'kind',value:'game'},animate(){return {finished:new Promise(resolve=>complete=resolve)};},closest(){return {classList:{add(){}},querySelectorAll(){return [];}};},setAttribute(){}};
 const first=h.run('LifeComposer.click(card)');await h.run("LifeComposer.click({dataset:{composer:'kind',value:'movie'}})");assert.equal(h.run('LifeComposer.getDraft().kind'),null);
 complete();await first;assert.equal(h.run('LifeComposer.getDraft().kind'),'game');assert.equal(h.run('LifeComposer.getDraft().step'),'work');
});
test('leaving during card extraction cannot reopen or change the composer',async t=>{
 const h=harness(t);h.context.requestAnimationFrame=()=>{};h.run('renderSchedule();LifeComposer.start()');let complete;
 h.context.card={dataset:{composer:'kind',value:'movie'},animate(){return {finished:new Promise(resolve=>complete=resolve)};},closest(){return {classList:{add(){}},querySelectorAll(){return [];}};},setAttribute(){}};
 const pending=h.run('LifeComposer.click(card)');h.run('LifeComposer.leave()');complete();await pending;
 assert.equal(h.run('LifeComposer.isOpen()'),false);assert.equal(h.run('LifeComposer.getDraft().kind'),null);
});
test('expanded card keeps selected title in an editable trail without duplicating confirmation defaults',async t=>{
 const h=harness(t);h.run('renderSchedule();LifeComposer.start()');await h.run("LifeComposer.click({dataset:{composer:'kind',value:'movie'}})");
 const trail={innerHTML:'',hidden:false},panel={dataset:{},querySelector:q=>q==='.composer-trail'?trail:null};
 h.context.document.createElement=()=>({});h.nodes.set('.composer-panel',panel);
 await h.run("LifeComposer.click({dataset:{composer:'work',value:'film-7'}})");
 assert.match(trail.innerHTML,/登堂入室/);assert.match(trail.innerHTML,/data-value="name"/);assert.doesNotMatch(trail.innerHTML,/data-value="date"/);
 await h.run("LifeComposer.click({dataset:{composer:'back',value:'date'}})");assert.match(trail.innerHTML,/data-value="date"/);
 await h.run("LifeComposer.click({dataset:{composer:'back',value:'category'}})");assert.equal(trail.hidden,true);
});
test('repeated return to the same category clears deck locks and retained exit animations',async t=>{
 const h=harness(t);h.run('renderSchedule();LifeComposer.start()');let removed=0,cancelled=0;
 h.nodes.set('.composer-deck',{classList:{remove(name){assert.equal(name,'is-picking');removed++;}}});
 const original=h.context.document.querySelectorAll;
 h.context.document.querySelectorAll=q=>q==='.composer-deck button'?[{getAnimations:()=>[{cancel(){cancelled++;}}]}]:original(q);
 for(let i=0;i<4;i++){
  await h.run("LifeComposer.click({dataset:{composer:'kind',value:'game'}})");assert.equal(h.run('LifeComposer.getDraft().step'),'work');
  await h.run("LifeComposer.click({dataset:{composer:'back',value:'category'}})");assert.equal(h.run('LifeComposer.getDraft().step'),'category');
 }
 assert.equal(removed,4);assert.equal(cancelled,4);
});
test('step changes cancel old animations and use only transform and opacity, not panel height',async t=>{
 const h=harness(t);h.context.requestAnimationFrame=()=>{};h.run('renderSchedule();LifeComposer.start()');await h.run("LifeComposer.click({dataset:{composer:'kind',value:'game'}})");
 let cancelled=0;const frames=[],section={dataset:{composerStep:'name'},getAnimations:()=>[{cancel(){cancelled++;}}],animate:f=>frames.push(f)};
 h.nodes.set('.composer-panel',{dataset:{},getAnimations:()=>[{cancel(){cancelled++;}}],animate(){assert.fail('panel height must not animate');}});
 h.nodes.set('[data-composer-step="name"]',section);h.context.document.querySelectorAll=q=>q==='[data-composer-step]'?[section]:[];
 await h.run("LifeComposer.click({dataset:{composer:'back',value:'name'}})");
 assert.equal(cancelled,2);assert.equal(frames.length,1);assert.deepEqual(Object.keys(frames[0][0]).sort(),['opacity','transform']);
});
test('selection does not scale or lift before expansion and samples the settled card position',async t=>{
 const h=harness(t);h.context.requestAnimationFrame=()=>{};h.run('renderSchedule();LifeComposer.start()');let complete,reads=0,selectionFrames;
 h.context.card={dataset:{composer:'kind',value:'book'},getBoundingClientRect(){reads++;return {left:100,top:100,width:120,height:176};},animate(frames){selectionFrames=frames;return {finished:new Promise(resolve=>complete=resolve)};},closest(){return {classList:{add(){}},querySelectorAll(){return [];}};},setAttribute(){}};
 const pending=h.run('LifeComposer.click(card)');complete();await pending;
 assert.equal(reads,2);for(const frame of selectionFrames)assert.deepEqual(Object.keys(frame),['opacity']);assert.equal(h.run('LifeComposer.getDraft().kind'),'book');
});
test('card expands the real panel once without a clone or surface crossfade',async t=>{
 const h=harness(t);h.context.requestAnimationFrame=()=>{};h.run('renderSchedule();LifeComposer.start()');const surfaceFrames=[],contentFrames=[];
 const panel={dataset:{},getAnimations:()=>[],getBoundingClientRect:()=>({left:20,top:500,width:700,height:300}),animate(frames){surfaceFrames.push(frames);return {finished:Promise.resolve()};},querySelectorAll:()=>[{animate:frames=>contentFrames.push(frames)}]};
 h.nodes.set('.composer-panel',panel);
 h.context.card={dataset:{composer:'kind',value:'game'},getBoundingClientRect:()=>({left:200,top:550,width:120,height:176}),animate:()=>({finished:Promise.resolve()}),cloneNode(){assert.fail('must not clone the card');},closest:()=>({classList:{add(){}},querySelectorAll:()=>[]}),setAttribute(){}};
 await h.run('LifeComposer.click(card)');assert.equal(surfaceFrames.length,1);assert.equal(surfaceFrames[0].length,2);
 for(const frame of surfaceFrames[0])assert.equal(frame.opacity,undefined);
 assert.match(surfaceFrames[0][0].transform,/translate3d\(180px,50px,0\) scale/);assert.equal(surfaceFrames[0][1].transform,'translate3d(0,0,0) scale(1)');assert.equal(contentFrames.length,1);
});
test('movie entry goes directly to a fresh title, with no previous-movie choices even after returning',async t=>{
 const h=harness(t);h.run('renderSchedule();LifeComposer.start()');
 for(let i=0;i<2;i++){
  await h.run("LifeComposer.click({dataset:{composer:'kind',value:'movie'}})");
  assert.equal(h.run('LifeComposer.getDraft().step'),'name');
  const html=h.nodes.get('#schedule-plans').innerHTML;assert.match(html,/电影名？/);assert.match(html,/id="new-work-title"/);assert.doesNotMatch(html,/data-composer="work"|data-composer-step="work"|戏梦巴黎/);
  await h.run("LifeComposer.click({dataset:{composer:'back',value:'category'}})");
 }
 await h.run("LifeComposer.click({dataset:{composer:'kind',value:'game'}})");assert.equal(h.run('LifeComposer.getDraft().step'),'work');assert.match(h.nodes.get('#schedule-plans').innerHTML,/data-composer-step="work"/);
});
test('new composer defaults to unsure but date-node shortcuts remain dated',async t=>{const h=harness(t);h.run('renderSchedule();LifeComposer.start()');assert.equal(h.run('LifeComposer.payload().date'),'');assert.equal(h.run('LifeComposer.payload().dateIntent'),'unsure');await h.run("LifeComposer.click({dataset:{composer:'kind',value:'game'}})");await h.run("LifeComposer.click({dataset:{composer:'date-intent',value:'future'}})");assert.equal(h.run('LifeComposer.payload().dateIntent'),'future');assert.equal(h.run('LifeComposer.payload().state'),'plan');h.run("LifeComposer.start('2026-12-02')");assert.equal(h.run('LifeComposer.payload().date'),'2026-12-02');assert.equal(h.run('LifeComposer.payload().dateIntent'),'dated');});
test('undated plans appear below but never enter timeline groups at any zoom',t=>{const h=harness(t);h.service.createEvent({kind:'game',workTitle:'以后玩',state:'plan',dateIntent:'future'},'puppy');h.service.createEvent({kind:'other',title:'再考虑',state:'plan',dateIntent:'unsure'},'puppy');h.context.updated=h.service.snapshot('puppy');h.run('state=updated;renderSchedule()');const html=h.nodes.get('#schedule-plans').innerHTML;assert.match(html,/未来/);assert.match(html,/暂不确定/);assert.match(html,/data-plan-drag=/);for(const scale of [36,12,2,.3]){h.context.zoom=scale;assert.equal(h.run("T.groups(visibleEvents().filter(e=>!e.date),zoom,T.index('2026-10-01'),120).size"),0);}h.run("page='game';renderLibrary()");assert.match(h.main(),/以后玩/);});
test('drop geometry selects exact civil dates across zoom, scroll and viewport boundaries',t=>{const h=harness(t);h.context.dropScroll={scrollLeft:0,getBoundingClientRect:()=>({left:100,right:700,top:100,bottom:400})};h.context.dropTrack={dataset:{start:'2026-10-01'}};assert.equal(h.run('planDropDate(dropScroll,dropTrack,198,200)'),'2026-10-01');assert.equal(h.run('planDropDate(dropScroll,dropTrack,234,200)'),'2026-10-02');assert.equal(h.run('planDropDate(dropScroll,dropTrack,234,450)'),null);h.run('visualScale=2;dropScroll.scrollLeft=40');assert.equal(h.run('planDropDate(dropScroll,dropTrack,181,200)'),'2026-10-21');});
test('dropping a plan writes only its date and preserves plan state; cancellation writes nothing',async t=>{
 const h=harness(t),e=h.service.createEvent({kind:'other',title:'想做',state:'plan',dateIntent:'unsure'},'puppy');h.context.updated=h.service.snapshot('puppy');h.run('state=updated');
 h.nodes.set('.visual-scroll',{scrollLeft:0,getBoundingClientRect:()=>({left:100,right:700,top:100,bottom:400})});h.nodes.set('.visual-track',{dataset:{start:'2026-10-01'}});h.nodes.set('.single-axis',{getBoundingClientRect:()=>({top:320})});
 let writes=0;h.context.saveDrop=async(path,method,body)=>{writes++;return h.service.updateEvent(e.id,body,'puppy');};h.run('mutate=saveDrop');
 const drag=()=>({id:1,event:e,handle:{},card:{classList:{remove(){}}},ghost:{style:{},remove(){}},marker:{style:{},remove(){}},moved:true,date:null});
 h.context.drag=drag();h.run('planDrag=drag;endPlanDrag({pointerId:1,type:"pointercancel",clientX:234,clientY:200})');await Promise.resolve();assert.equal(writes,0);
 h.context.drag=drag();h.run('planDrag=drag;endPlanDrag({pointerId:1,type:"pointerup",clientX:234,clientY:200})');await Promise.resolve();assert.equal(writes,1);
 const saved=h.service.snapshot('puppy').events.find(x=>x.id===e.id);assert.equal(saved.date,'2026-10-02');assert.equal(saved.dateIntent,'dated');assert.equal(saved.state,'plan');assert.equal(h.run('planDrag'),null);
});
test('plan dragging pans at timeline edges but not outside its vertical bounds',t=>{const h=harness(t);let frames=0;h.context.requestAnimationFrame=()=>++frames;h.context.scroll={scrollLeft:200,getBoundingClientRect:()=>({left:100,right:700,width:600,top:100,bottom:400})};h.nodes.set('.visual-scroll',h.context.scroll);h.run('recycleAxisIfNeeded=()=>{};updatePlanDropTarget=()=>{};planDrag={moved:true,x:690,y:200,last:0};tickPlanDrag(100)');assert.ok(h.context.scroll.scrollLeft>200);const prior=h.context.scroll.scrollLeft;h.run('planDrag.y=500;tickPlanDrag(116)');assert.equal(h.context.scroll.scrollLeft,prior);assert.equal(frames,2);});
