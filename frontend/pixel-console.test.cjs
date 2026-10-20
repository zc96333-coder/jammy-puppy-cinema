const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=file=>fs.readFileSync(__dirname+'/'+file,'utf8');
test('console assets are opt-in and never write business data',()=>{
 const html=read('pixel-schedule.html'),original=read('index.html'),js=read('pixel-console.js');
 assert.match(html,/href="pixel-console.css"/);assert.match(html,/src="pixel-console.js"/);assert.doesNotMatch(original,/pixel-console/);
 assert.doesNotMatch(js,/fetch\(|\/api\/|FormData|localStorage|addEventListener\(['"](?:submit|input|click)/);
 assert.match(js,/textContent\.includes\('已保存'\)/);assert.match(js,/pagehide/);
 const css=read('pixel-console.css');assert.match(css,/--cabin-screen:#201b17/);assert.match(css,/repeating-linear-gradient/);assert.match(css,/prefers-reduced-motion/);
 assert.doesNotMatch(css,/\.review-flip-inner\s*\{|\.visual-track\s*\{|\.visual-node\s*\{|\.visual-scroll\s*\{|\.review-poster\s*\{/);
 assert.match(css,/\.event-detail-space/);assert.match(css,/pointer-events:none/);
});
test('category-to-form never requests a second console surface expansion',()=>{
 const ctx=vm.createContext({window:{}});vm.runInContext(read('pixel-console.js'),ctx);
 const {shouldSwitch}=ctx.window.CinemaConsole;assert.equal(shouldSwitch(null,'plans'),false);assert.equal(shouldSwitch('plans','create'),true);assert.equal(shouldSwitch('create','create'),false);assert.equal(shouldSwitch('create','plans'),true);
 const composer=read('composer.js');assert.match(composer,/duration:540/);assert.match(composer,/One real surface, one geometry animation/);
});
test('five fixed channels expose real composer actions with one selected state',()=>{
 const ctx=vm.createContext({window:{}});vm.runInContext(read('pixel-console.js'),ctx);
 const html=ctx.window.CinemaConsole.channelsHTML('game',{movie:'电影',book:'图书',game:'游戏',other:'日常',punishment:'惩罚'},({kind})=>'<svg data-art="'+kind+'"></svg>');
 assert.equal((html.match(/class="console-channel"/g)||[]).length,5);assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1);assert.match(html,/data-value="game" aria-pressed="true"/);assert.match(html,/class="console-channel-link" aria-hidden="true"/);
 assert.doesNotMatch(html,/composer-deck|rotate\(|scale\(/);
 assert.equal((html.match(/aria-pressed="false" hidden/g)||[]).length,4);
 assert.match(html,/console-change-channel" data-composer="back" data-value="category">更换/);
 const initial=ctx.window.CinemaConsole.channelsHTML(null,{},()=> '');assert.doesNotMatch(initial,/aria-pressed="false" hidden/);assert.match(initial,/data-value="category" hidden/);
});
test('step interfaces stay connected in sequence, escape content and never expose people selection',()=>{
 const ctx=vm.createContext({window:{}});vm.runInContext(read('pixel-console.js'),ctx);const {stepsHTML,stepIndex}=ctx.window.CinemaConsole;
 const date=stepsHTML({step:'date',content:'<测试游戏>',contentStep:'work',dateLabel:'暂不确定',ready:true,dateReady:false});
 assert.equal((date.match(/class="console-step-port/g)||[]).length,1);assert.equal((date.match(/class="console-step-crumb/g)||[]).length,1);assert.match(date,/data-value="date" aria-current="step"/);assert.match(date,/&lt;测试游戏&gt;/);assert.doesNotMatch(date,/data-value="confirm"/);assert.doesNotMatch(date,/people|一起|puppy|jammy/);
 const confirm=stepsHTML({step:'confirm',content:'游戏',ready:true,dateReady:true});assert.equal((confirm.match(/is-complete/g)||[]).length,1);assert.match(confirm,/data-value="date" aria-current="step"/);assert.doesNotMatch(confirm,/ disabled|data-value="confirm"|保存记录/);
 for(const step of ['work','name','search','field'])assert.equal(stepIndex(step),0);assert.equal(stepIndex('date'),1);assert.equal(stepIndex('confirm'),1);
 const content=stepsHTML({step:'work'});assert.doesNotMatch(content,/data-value="date"|data-value="confirm"|console-step-crumb/);
});
function consoleFixture(reduce=false,masks=false){
 let frames=[],mode='plans',animations=[],observers=[];
 class Node{
  constructor(name){this.name=name;this.children=[];this.style={};this.dataset={};this.className='';this.attrs={};this.offsetLeft=0;this.offsetWidth=120;this.textContent='';this.classList={contains:c=>this.className.split(' ').includes(c),add:c=>{if(!this.className.split(' ').includes(c))this.className+=' '+c;},remove:c=>{this.className=this.className.split(' ').filter(n=>n!==c).join(' ');},toggle:(c,on)=>{this.classList[on?'add':'remove'](c);}};}
  setAttribute(k,v){this.attrs[k]=v;if(k==='class')this.className=v;}append(...nodes){this.children.push(...nodes);}remove(){this.removed=true;}getBoundingClientRect(){return this.rect||{left:0,top:0,right:100,bottom:40,width:100,height:40};}animate(keyframes,options){const record={name:this.name,keyframes,options};animations.push(record);return {cancel(){record.canceled=true;}};}
  querySelector(selector){return this.children.find(n=>selector==='path'?n.name==='path':selector.endsWith('.'+n.className))||null;}
 }
 const root=new Node('root'),plans=new Node('plans'),row=new Node('row'),tabs=new Node('tabs'),active=new Node('active'),panel=new Node('panel'),list=new Node('list'),stage=new Node('stage'),toast=new Node('toast');
 const panelInk=new Node('panel-ink'),planInk=new Node('plan-ink');panel.querySelectorAll=()=>[panelInk];list.querySelectorAll=()=>[planInk];
 root.querySelector=s=>({'#schedule-plans':plans,'#event-detail-row':row,'.event-detail-space':stage})[s]||null;
 plans.querySelector=s=>s==='.composer-panel'?(mode==='create'?panel:null):s==='.schedule-plan-list'?list:s==='.composer-tabs'?tabs:null;
 tabs.querySelector=s=>s==='[aria-selected="true"]'?active:tabs.children.find(n=>n.className==='console-mode-indicator')||null;
 const ctx=vm.createContext({window:{CSS:{supports:()=>masks},matchMedia:()=>({matches:reduce}),addEventListener(){}},document:{querySelector:s=>s==='#main'?root:toast,createElement:()=>new Node('decoration'),createElementNS:(ns,name)=>new Node(name),body:{classList:{contains:()=>true}}},MutationObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(target){this.target=target;}disconnect(){}},requestAnimationFrame:f=>{frames.push(f);return 1;},cancelAnimationFrame(){}});
 vm.runInContext(read('pixel-console.js'),ctx);
 const flush=()=>{while(frames.length)frames.shift()();};flush();
 return {animations,toast,stage,tabs,plans,flush,observers,root,makeNode:name=>new Node(name),api:ctx.window.CinemaConsole,
  activateConsole(mobile=false){const previous=root.querySelector;root.querySelector=s=>s==='[data-console]'?panel:previous(s);const ports=['movie','game'].map(kind=>{const n=new Node(kind);n.dataset.value=kind;n.getBoundingClientRect=()=>({left:0,top:20,right:150,bottom:80,width:150,height:60});return n;});const workspace=new Node('workspace'),path=new Node('channel-line'),svg=new Node('channel-svg');
   const form=new Node('form'),stepPort=new Node('step-port'),section=new Node('step-section'),rootQuery=root.querySelector;root.querySelector=s=>s==='[data-console] .console-workspace'?workspace:rootQuery(s);
   const sectionInk=new Node('section-ink'),channelInk=new Node('channel-ink');sectionInk.getBoundingClientRect=()=>({width:80,height:20});channelInk.getBoundingClientRect=()=>({width:24,height:24});section.querySelectorAll=()=>[sectionInk];workspace.querySelectorAll=()=>[sectionInk];
   form.before=n=>workspace.children.unshift(n);workspace.querySelector=s=>s==='form'?form:s==='.console-step-port.is-active'?stepPort:s.startsWith('[data-composer-step=')?section:workspace.children.find(n=>s==='.'+n.className)||null;
   stepPort.getBoundingClientRect=()=>({left:250,top:24,width:110,bottom:80});section.getBoundingClientRect=()=>({left:238,top:116,width:440,height:200});
   workspace.getBoundingClientRect=()=>mobile?{left:0,top:110,width:500,height:300}:{left:210,top:0,width:500,height:350};panel.getBoundingClientRect=()=>({left:0,top:0,width:750,height:400});svg.querySelector=()=>path;
   panel.querySelectorAll=s=>s==='.console-channel'?ports:[channelInk,sectionInk];panel.querySelector=s=>s==='.console-workspace'?workspace:s==='.console-channel-link'?svg:s==='.console-channel-link path'?path:s==='.console-channel[aria-pressed="true"]'?ports.find(n=>n.attrs['aria-pressed']==='true'):null;return {panel,ports,path,svg,workspace,section,sectionInk,channelInk};
  },change(next){mode=next;active.offsetLeft=next==='create'?140:0;observers.find(o=>o.target===plans).fn([]);flush();},notify(){observers.find(o=>o.target===toast).fn([]);}};
}
test('mode changes animate once, internal steps do not replay; only saved feedback scans',()=>{
 const f=consoleFixture();assert.equal(f.animations.length,0);
 f.change('create');assert.equal(f.animations.filter(a=>a.name==='panel-ink').length,1);
 f.change('create');assert.equal(f.animations.filter(a=>a.name==='panel-ink').length,1);
 f.change('plans');assert.equal(f.animations.filter(a=>a.name==='plan-ink').length,1);assert.ok(f.animations.every(a=>!['panel','list'].includes(a.name)));
 f.toast.className='visible';f.toast.textContent='保存失败';f.notify();assert.equal(f.stage.children.length,0);
 f.toast.textContent='已保存，其他页面已同步';f.notify();assert.equal(f.stage.children.length,1);assert.equal(f.animations.at(-1).options.duration,600);
});
test('reduced motion skips panel movements and keeps a brief opacity save confirmation',()=>{
 const f=consoleFixture(true);f.change('create');f.change('plans');assert.equal(f.animations.length,0);
 f.toast.className='visible';f.toast.textContent='已保存';f.notify();assert.equal(f.animations.at(-1).options.duration,180);assert.ok(f.animations.at(-1).keyframes.every(k=>!('transform' in k)));
});
test('connecting a channel draws desktop or mobile routing without a surface scale animation',()=>{
 for(const mobile of [false,true]){const f=consoleFixture(),ui=f.activateConsole(mobile);f.api.connect('game');f.flush();assert.equal(ui.panel.dataset.channel,'game');assert.equal(ui.ports.filter(p=>p.attrs['aria-pressed']==='true').length,1);assert.match(ui.path.attrs.d,/^M/);assert.ok(f.animations.some(a=>a.name==='channel-line'&&a.options.duration===280));assert.ok(f.animations.some(a=>a.name==='section-ink'&&a.options.duration===180));assert.ok(f.animations.every(a=>a.keyframes.every(k=>!String(k.transform).includes('scale('))));assert.ok(f.animations.every(a=>!['panel','workspace','game','movie'].includes(a.name)));f.api.setChannel(null);assert.equal(ui.panel.dataset.channel,'');assert.equal(f.animations.at(-1).options.duration,160);}
 const reduced=consoleFixture(true);reduced.activateConsole();reduced.api.connect('movie');reduced.flush();assert.equal(reduced.animations.length,0);
});
test('content then date steps draw a second connected route and animate only the active section',()=>{
 const f=consoleFixture(),ui=f.activateConsole();f.api.setChannel('game');f.flush();
 f.api.updateSteps({step:'work',ready:false,animate:false});f.flush();
 const svg=ui.workspace.querySelector('.console-step-link');assert.match(svg.querySelector('path').attrs.d,/^M/);
 f.api.updateSteps({step:'date',content:'杀戮尖塔2',ready:true,dateReady:false,animate:true});f.flush();
 assert.equal(ui.workspace.dataset.step,'date');assert.equal(ui.workspace.dataset.stage,'03');assert.match(ui.workspace.querySelector('.console-step-bus').innerHTML,/data-value="date" aria-current="step"/);
 assert.ok(f.animations.some(a=>a.options.duration===260));assert.ok(f.animations.some(a=>a.name==='section-ink'&&a.options.duration===180));assert.ok(f.animations.every(a=>a.name!=='step-section'));
 f.api.updateSteps({step:'category',animate:true});assert.equal(svg.hidden,true);
});

test('selected category collapses other choices and returning reveals them again',()=>{
 const f=consoleFixture(),ui=f.activateConsole();
 f.api.setChannel('game');assert.equal(ui.ports.find(p=>p.dataset.value==='game').hidden,false);assert.equal(ui.ports.find(p=>p.dataset.value==='movie').hidden,true);
 f.api.setChannel(null);assert.ok(ui.ports.every(p=>p.hidden===false));
 f.api.setChannel('movie');assert.equal(ui.ports.find(p=>p.dataset.value==='game').hidden,true);assert.equal(ui.ports.find(p=>p.dataset.value==='movie').hidden,false);
});

test('cabin is one recessed screen, with no sidebar, fragmented mask or future-step dashboard',()=>{
 const css=read('pixel-console.css'),js=read('pixel-console.js');
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(css,/\[data-phase='0'\] .console-workspace\{display:none\}/);assert.match(css,/max-width:480px/);assert.match(css,/focus-visible/);
 assert.doesNotMatch(js,/maskImage|pixelFrames|Math\.random|console-screen-ink/);assert.doesNotMatch(css,/grid-template-columns:150px|backdrop-filter/);
});

test('retro display removes terminal numbering and wires, keeping pixel art and readable focus',()=>{
 const ctx=vm.createContext({window:{}});vm.runInContext(read('pixel-console.js'),ctx);const html=ctx.window.CinemaConsole.channelsHTML(null,{},()=>'<svg/>'),css=read('pixel-console.css');
 assert.doesNotMatch(html,/>01<|>02<|>03</);assert.match(css,/\.console-channel-link,\.console-step-link\{display:none\}/);
 assert.match(css,/border-radius:24px/);assert.match(css,/shape-rendering:crispEdges/);assert.match(css,/drop-shadow/);assert.match(css,/focus-visible/);
});

test('creation, plans and pinned detail share the same static retro glass without affecting the timeline',()=>{
 const css=read('pixel-console.css');assert.match(css,/--retro-glass:repeating-linear-gradient/);assert.match(css,/--retro-well:inset/);
 for(const selector of ['.composer-panel[data-console]','.schedule-plan-list','.day-detail-item']){const rule=css.split(selector+'{')[1]?.split('}')[0];assert.match(rule,/background:var\(--retro-glass\)/);assert.match(rule,/box-shadow:var\(--retro-well\)/);}
 assert.doesNotMatch(css,/@keyframes|animation:|filter:blur|\.visual-track\s*\{/);
});

test('screen lettering stays crisp with readable Chinese fallbacks and matching editable-title metrics',()=>{
 const css=read('pixel-console.css');assert.match(css,/--screen-face:Consolas,"Microsoft YaHei UI"/);assert.match(css,/--screen-reading:/);assert.match(css,/font-variant-numeric:tabular-nums/);
 assert.match(css,/\.movie-title-measure,input\[name=title\]\)\{font-family:inherit;letter-spacing:inherit\}/);
 assert.match(css,/line-height:1.75;text-shadow:none/);assert.doesNotMatch(css,/@import|font-smooth|filter:blur|image-rendering:pixelated/);
});

test('local data refresh is short and cleans itself without changing the housing or rasterizing text',async()=>{
 const f=consoleFixture(false,true),ui=f.activateConsole();let canceled=0;ui.sectionInk.animate=(keyframes,options)=>{f.animations.push({name:'section-ink',keyframes,options});return {finished:Promise.resolve(),cancel(){canceled++;}};};
 f.api.connect('game');const motion=f.animations.find(a=>a.name==='section-ink');assert.equal(motion.options.duration,180);assert.equal(motion.keyframes.length,2);assert.ok(motion.keyframes.every(frame=>!frame.maskImage));assert.equal(motion.keyframes.at(-1).transform,'translateY(0)');assert.ok(f.animations.every(a=>!['panel','workspace'].includes(a.name)));
 await new Promise(resolve=>setImmediate(resolve));assert.equal(canceled,1);
});

test('exit completes before changing the step; rapid changes cancel stale callbacks',async()=>{
 const f=consoleFixture(false,true),ui=f.activateConsole(),pending=[],changed=[];f.api.updateSteps({step:'work',animate:false});
 ui.sectionInk.animate=(frames,options)=>{assert.equal(options.duration,80);assert.equal(frames.length,2);let resolve,reject;const finished=new Promise((a,b)=>{resolve=a;reject=b;});pending.push({resolve,reject});return {finished,cancel(){reject(new Error('interrupted'));}};};
 const first=f.api.transition(()=>changed.push('old'));assert.deepEqual(changed,[]);
 const second=f.api.transition(()=>changed.push('latest'));assert.deepEqual(changed,[]);pending[1].resolve();await Promise.all([first,second]);assert.deepEqual(changed,['latest']);
 ui.section.isConnected=false;const third=f.api.transition(()=>changed.push('detached'));pending[2].resolve();await third;assert.deepEqual(changed,['latest']);
 const reduced=consoleFixture(true);reduced.activateConsole();let done=false;await reduced.api.transition(()=>done=true);assert.equal(done,true);assert.equal(reduced.animations.length,0);
});

test('screen refresh caps work to four visible local targets without measuring layout',()=>{
 const f=consoleFixture(false,true),ui=f.activateConsole(),events=[];
 const fragments=Array.from({length:8},(_,i)=>({
  closest:()=>i===0?{}:null,
  getBoundingClientRect(){assert.fail('refresh must not measure layout');},
  animate(frames,options){events.push('animate');assert.equal(options.duration,180);assert.ok(options.delay<=50);return {cancel(){}};}
 }));
 ui.panel.querySelectorAll=s=>s==='.console-channel'?ui.ports:fragments;
 f.api.connect('game');assert.deepEqual(events,Array(4).fill('animate'));
});

test('parcel charge, small pixel gathering and date highlighting are scoped and clean up',async()=>{
 const f=consoleFixture(),card=f.makeNode('card'),ghost=f.makeNode('parcel'),marker=f.makeNode('date-marker'),date=f.makeNode('date'),tick=f.makeNode('tick');
 card.rect={left:0,top:480,right:400,bottom:560,width:400,height:80};let reads=0;tick.getBoundingClientRect=()=>{reads++;return {left:200,top:300,width:2,height:2};};date.querySelector=()=>tick;
 const original=f.root.querySelector;f.root.querySelector=s=>s.startsWith('.axis-date[')?date:original(s);
 const drag={card,ghost,marker,event:{id:'test',kind:'game'},pointerType:'mouse',x:100,y:520,date:null};const fx=f.api.planDragUI;
 fx.hold(drag);assert.equal(drag.charge.children.length,6);assert.ok(card.classList.contains('is-plan-holding'));
 fx.pick(drag);assert.equal(drag.charge,null);assert.equal(drag.grains.length,0);assert.ok(ghost.classList.contains('pixel-plan-parcel'));assert.ok(marker.classList.contains('pixel-plan-date'));assert.equal(ghost.children.length,2);assert.equal(drag.foldMesh.children.length,36);
 drag.date='2026-10-20';fx.move(drag);fx.move(drag);assert.equal(reads,1);assert.ok(date.classList.contains('is-plan-drop-target'));assert.match(ghost.style.transform,/translate3d/);
 assert.ok(f.animations.every(m=>m.keyframes.every(frame=>!('width' in frame)&&!('height' in frame))));
 const fold=f.animations.find(m=>m.name==='card'&&m.options.duration===220);assert.ok(fold);assert.equal(fold.keyframes[0].transform,'scale(1)');assert.equal(fold.keyframes.at(-1).opacity,0);assert.ok(card.classList.contains('is-plan-folding'));
 const cells=f.animations.filter(m=>m.options.duration===640);assert.equal(cells.length,36);assert.ok(cells.every(m=>m.options.duration+m.options.delay<700));assert.ok(cells.every(m=>m.keyframes[1].opacity>.9&&m.keyframes[2].transform.includes('scale(0.06,0.3)')));assert.equal(card.style.pointerEvents,undefined);
 fx.clear(drag);assert.equal(card.classList.contains('is-plan-folding'),false);assert.equal(drag.foldMesh.removed,true);assert.equal(card.style.visibility,'');assert.equal(date.classList.contains('is-plan-drop-target'),false);assert.ok(cells.every(m=>m.canceled));
 await fx.finish(drag,false);assert.equal(ghost.removed,true);
});

test('pixel mesh covers the whole source and gathers to a complete 24px square, with bounded work',()=>{
 const ctx=vm.createContext({window:{}});vm.runInContext(read('pixel-console.js'),ctx);
 for(const [width,height] of [[400,80],[100,40],[1200,240],[280,150]]){const tiles=ctx.window.CinemaConsole.parcelTiles(width,height);assert.ok(tiles.length<=72);assert.equal(tiles[0].x,0);assert.equal(tiles[0].y,0);const last=tiles.at(-1);assert.ok(Math.abs(last.x+last.w-width)<.001);assert.ok(Math.abs(last.y+last.h-height)<.001);assert.ok(Math.abs(last.tx+last.w*last.sx-24)<.001);assert.ok(Math.abs(last.ty+last.h*last.sy-24)<.001);assert.ok(tiles.every(tile=>tile.delay<=48));}
 assert.doesNotMatch(read('pixel-console.js'),/cloneNode|clipPath|foldFrames/);
});

test('saved parcel contracts into the day node, reduced motion skips gathering and flight',async()=>{
 for(const reduce of [false,true]){const f=consoleFixture(reduce),card=f.makeNode('card'),ghost=f.makeNode('parcel'),marker=f.makeNode('marker'),node=f.makeNode('day'),glyph=f.makeNode('glyph');node.querySelector=()=>glyph;
  const original=f.root.querySelector;f.root.querySelector=s=>s.startsWith('[data-day-group=')?node:original(s);
  const drag={card,ghost,marker,event:{id:'test',kind:'movie'},pointerType:'touch',x:100,y:520,date:'2026-10-20'};const fx=f.api.planDragUI;
  fx.hold(drag);fx.pick(drag);fx.move(drag);fx.clear(drag);await fx.finish(drag,true);assert.equal(ghost.removed,true);
  if(reduce){assert.equal(f.animations.length,0);assert.equal(drag.grains.length,0);}else assert.ok(f.animations.some(a=>a.name==='parcel'&&a.options.duration===200));
 }
});

test('reduced-motion explanation allows an explicit parcel-only opt-in without enabling other screen animations',()=>{
 const f=consoleFixture(true),fx=f.api.planDragUI,control=f.tabs.children.find(n=>n.className==='pixel-plan-motion');
 assert.ok(control);assert.match(control.textContent,/已被减少动态关闭/);assert.equal(fx.motionState().enabled,false);assert.equal(fx.motionState().systemReduced,true);
 control.onclick();assert.equal(fx.motionState().enabled,true);assert.equal(fx.motionState().explicitlyEnabled,true);assert.match(control.textContent,/已开启/);
 const drag={card:f.makeNode('card'),ghost:f.makeNode('ghost'),marker:f.makeNode('marker'),event:{kind:'movie'},x:40,y:20,pointerType:'mouse'};
 fx.hold(drag);assert.equal(drag.chargeMotions.length,6);fx.pick(drag);assert.ok(drag.foldMesh.children.length>0);assert.ok(f.animations.some(a=>a.options.duration===640));fx.clear(drag);
 const count=f.animations.length;f.change('create');assert.equal(f.animations.length,count);control.onclick();assert.equal(fx.motionState().enabled,false);
 const normal=consoleFixture(false);assert.equal(normal.tabs.children.some(n=>n.className==='pixel-plan-motion'),false);assert.equal(normal.api.planDragUI.motionState().enabled,true);
});

test('temporary diagnostics expose the actual gesture phase and animation errors even with ordinary motion',()=>{
 const f=consoleFixture(),line=f.plans.children.find(n=>n.className==='pixel-plan-diagnostic'),fx=f.api.planDragUI;
 assert.match(line.textContent,/R4 · 普通动态 · 待长按/);
 const drag={card:f.makeNode('card'),ghost:f.makeNode('ghost'),marker:f.makeNode('marker'),event:{kind:'game'},x:40,y:20};
 fx.hold(drag);assert.match(line.textContent,/已触发长按/);fx.pick(drag);assert.match(line.textContent,/收合已创建 \d+ 段/);fx.report('结束：lostpointercapture');assert.match(line.textContent,/lostpointercapture/);fx.clear(drag);
 const broken=f.makeNode('broken');broken.animate=()=>{throw new Error('animation unavailable');};
 assert.throws(()=>fx.pick({...drag,card:broken}),/animation unavailable/);assert.match(line.textContent,/动画报错：animation unavailable/);
});
