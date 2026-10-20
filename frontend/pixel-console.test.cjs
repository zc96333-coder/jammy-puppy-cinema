const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=file=>fs.readFileSync(__dirname+'/'+file,'utf8');
test('console assets are opt-in and never write business data',()=>{
 const html=read('pixel-schedule.html'),original=read('index.html'),js=read('pixel-console.js');
 assert.match(html,/href="pixel-console.css"/);assert.match(html,/src="pixel-console.js"/);assert.doesNotMatch(original,/pixel-console/);
 assert.doesNotMatch(js,/fetch\(|\/api\/|FormData|localStorage|addEventListener\(['"](?:submit|input|click)/);
 assert.match(js,/textContent\.includes\('已保存'\)/);assert.match(js,/pagehide/);
 const css=read('pixel-console.css');assert.match(css,/backdrop-filter:blur\(6px\)/);assert.match(css,/@supports not/);assert.match(css,/prefers-reduced-motion/);
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
});
test('step interfaces stay connected in sequence, escape content and never expose people selection',()=>{
 const ctx=vm.createContext({window:{}});vm.runInContext(read('pixel-console.js'),ctx);const {stepsHTML,stepIndex}=ctx.window.CinemaConsole;
 const date=stepsHTML({step:'date',content:'<测试游戏>',contentStep:'work',dateLabel:'暂不确定',ready:true,dateReady:false});
 assert.equal((date.match(/class="console-step-port/g)||[]).length,3);assert.match(date,/data-value="date" aria-current="step"/);assert.match(date,/&lt;测试游戏&gt;/);assert.match(date,/data-value="confirm" disabled/);assert.doesNotMatch(date,/people|一起|puppy|jammy/);
 const confirm=stepsHTML({step:'confirm',content:'游戏',ready:true,dateReady:true});assert.equal((confirm.match(/is-complete/g)||[]).length,2);assert.match(confirm,/data-value="confirm" aria-current="step"/);assert.doesNotMatch(confirm,/ disabled/);
 for(const step of ['work','name','search','field'])assert.equal(stepIndex(step),0);assert.equal(stepIndex('date'),1);assert.equal(stepIndex('confirm'),2);
});
function consoleFixture(reduce=false){
 let frames=[],mode='plans',animations=[],observers=[];
 class Node{
  constructor(name){this.name=name;this.children=[];this.style={};this.dataset={};this.className='';this.attrs={};this.offsetLeft=0;this.offsetWidth=120;this.textContent='';this.classList={contains:c=>this.className.split(' ').includes(c)};}
  setAttribute(k,v){this.attrs[k]=v;if(k==='class')this.className=v;}append(n){this.children.push(n);}animate(keyframes,options){animations.push({name:this.name,keyframes,options});return {cancel(){}};}
  querySelector(selector){return this.children.find(n=>selector==='path'?n.name==='path':selector.endsWith('.'+n.className))||null;}
 }
 const root=new Node('root'),plans=new Node('plans'),row=new Node('row'),tabs=new Node('tabs'),active=new Node('active'),panel=new Node('panel'),list=new Node('list'),stage=new Node('stage'),toast=new Node('toast');
 root.querySelector=s=>({'#schedule-plans':plans,'#event-detail-row':row,'.event-detail-space':stage})[s]||null;
 plans.querySelector=s=>s==='.composer-panel'?(mode==='create'?panel:null):s==='.schedule-plan-list'?list:s==='.composer-tabs'?tabs:null;
 tabs.querySelector=s=>s==='[aria-selected="true"]'?active:tabs.children.find(n=>n.className==='console-mode-indicator')||null;
 const ctx=vm.createContext({window:{matchMedia:()=>({matches:reduce}),addEventListener(){}},document:{querySelector:s=>s==='#main'?root:toast,createElement:()=>new Node('decoration'),createElementNS:(ns,name)=>new Node(name),body:{classList:{contains:()=>true}}},MutationObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(target){this.target=target;}disconnect(){}},requestAnimationFrame:f=>{frames.push(f);return 1;},cancelAnimationFrame(){}});
 vm.runInContext(read('pixel-console.js'),ctx);
 const flush=()=>{while(frames.length)frames.shift()();};flush();
 return {animations,toast,stage,flush,observers,api:ctx.window.CinemaConsole,
  activateConsole(mobile=false){const previous=root.querySelector;root.querySelector=s=>s==='[data-console]'?panel:previous(s);const ports=['movie','game'].map(kind=>{const n=new Node(kind);n.dataset.value=kind;n.getBoundingClientRect=()=>({left:0,top:20,right:150,bottom:80,width:150,height:60});return n;});const workspace=new Node('workspace'),path=new Node('channel-line'),svg=new Node('channel-svg');
   const form=new Node('form'),stepPort=new Node('step-port'),section=new Node('step-section'),rootQuery=root.querySelector;root.querySelector=s=>s==='[data-console] .console-workspace'?workspace:rootQuery(s);
   form.before=n=>workspace.children.unshift(n);workspace.querySelector=s=>s==='form'?form:s==='.console-step-port.is-active'?stepPort:s.startsWith('[data-composer-step=')?section:workspace.children.find(n=>s==='.'+n.className)||null;
   stepPort.getBoundingClientRect=()=>({left:250,top:24,width:110,bottom:80});section.getBoundingClientRect=()=>({left:238,top:116,width:440,height:200});
   workspace.getBoundingClientRect=()=>mobile?{left:0,top:110,width:500,height:300}:{left:210,top:0,width:500,height:350};panel.getBoundingClientRect=()=>({left:0,top:0,width:750,height:400});svg.querySelector=()=>path;
   panel.querySelectorAll=()=>ports;panel.querySelector=s=>s==='.console-workspace'?workspace:s==='.console-channel-link'?svg:s==='.console-channel-link path'?path:s==='.console-channel[aria-pressed="true"]'?ports.find(n=>n.attrs['aria-pressed']==='true'):null;return {panel,ports,path,svg,workspace};
  },change(next){mode=next;active.offsetLeft=next==='create'?140:0;observers.find(o=>o.target===plans).fn([]);flush();},notify(){observers.find(o=>o.target===toast).fn([]);}};
}
test('mode changes animate once, internal steps do not replay; only saved feedback scans',()=>{
 const f=consoleFixture();assert.equal(f.animations.length,0);
 f.change('create');assert.equal(f.animations.filter(a=>a.name==='panel').length,1);
 f.change('create');assert.equal(f.animations.filter(a=>a.name==='panel').length,1);
 f.change('plans');assert.equal(f.animations.filter(a=>a.name==='list').length,1);
 f.toast.className='visible';f.toast.textContent='保存失败';f.notify();assert.equal(f.stage.children.length,0);
 f.toast.textContent='已保存，其他页面已同步';f.notify();assert.equal(f.stage.children.length,1);assert.equal(f.animations.at(-1).options.duration,600);
});
test('reduced motion skips panel movements and keeps a brief opacity save confirmation',()=>{
 const f=consoleFixture(true);f.change('create');f.change('plans');assert.equal(f.animations.length,0);
 f.toast.className='visible';f.toast.textContent='已保存';f.notify();assert.equal(f.animations.at(-1).options.duration,180);assert.ok(f.animations.at(-1).keyframes.every(k=>!('transform' in k)));
});
test('connecting a channel draws desktop or mobile routing without a surface scale animation',()=>{
 for(const mobile of [false,true]){const f=consoleFixture(),ui=f.activateConsole(mobile);f.api.connect('game');f.flush();assert.equal(ui.panel.dataset.channel,'game');assert.equal(ui.ports.filter(p=>p.attrs['aria-pressed']==='true').length,1);assert.match(ui.path.attrs.d,/^M/);assert.ok(f.animations.some(a=>a.name==='channel-line'&&a.options.duration===280));assert.ok(f.animations.some(a=>a.name==='workspace'&&a.options.duration===230));assert.ok(f.animations.every(a=>a.keyframes.every(k=>!String(k.transform).includes('scale('))));f.api.setChannel(null);assert.equal(ui.panel.dataset.channel,'');assert.equal(f.animations.at(-1).options.duration,160);}
 const reduced=consoleFixture(true);reduced.activateConsole();reduced.api.connect('movie');reduced.flush();assert.equal(reduced.animations.length,0);
});
test('content then date steps draw a second connected route and animate only the active section',()=>{
 const f=consoleFixture(),ui=f.activateConsole();f.api.setChannel('game');f.flush();
 f.api.updateSteps({step:'work',ready:false,animate:false});f.flush();
 const svg=ui.workspace.querySelector('.console-step-link');assert.match(svg.querySelector('path').attrs.d,/^M/);
 f.api.updateSteps({step:'date',content:'杀戮尖塔2',ready:true,dateReady:false,animate:true});f.flush();
 assert.equal(ui.workspace.dataset.step,'date');assert.match(ui.workspace.querySelector('.console-step-bus').innerHTML,/data-value="date" aria-current="step"/);
 assert.ok(f.animations.some(a=>a.options.duration===260));assert.ok(f.animations.some(a=>a.name==='step-section'&&a.options.duration===230));
 f.api.updateSteps({step:'category',animate:true});assert.equal(svg.hidden,true);
});
