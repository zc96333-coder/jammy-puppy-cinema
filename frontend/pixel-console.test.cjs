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
function consoleFixture(reduce=false){
 let frames=[],mode='plans',animations=[],observers=[];
 class Node{
  constructor(name){this.name=name;this.children=[];this.style={};this.dataset={};this.className='';this.attrs={};this.offsetLeft=0;this.offsetWidth=120;this.textContent='';this.classList={contains:c=>this.className.split(' ').includes(c)};}
  setAttribute(k,v){this.attrs[k]=v;}append(n){this.children.push(n);}animate(keyframes,options){animations.push({name:this.name,keyframes,options});return {cancel(){}};}
  querySelector(selector){return this.children.find(n=>selector.endsWith('.'+n.className))||null;}
 }
 const root=new Node('root'),plans=new Node('plans'),row=new Node('row'),tabs=new Node('tabs'),active=new Node('active'),panel=new Node('panel'),list=new Node('list'),stage=new Node('stage'),toast=new Node('toast');
 root.querySelector=s=>({'#schedule-plans':plans,'#event-detail-row':row,'.event-detail-space':stage})[s]||null;
 plans.querySelector=s=>s==='.composer-panel'?(mode==='create'?panel:null):s==='.schedule-plan-list'?list:s==='.composer-tabs'?tabs:null;
 tabs.querySelector=s=>s==='[aria-selected="true"]'?active:tabs.children.find(n=>n.className==='console-mode-indicator')||null;
 const ctx=vm.createContext({window:{matchMedia:()=>({matches:reduce}),addEventListener(){}},document:{querySelector:s=>s==='#main'?root:toast,createElement:()=>new Node('decoration'),body:{classList:{contains:()=>true}}},MutationObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(target){this.target=target;}disconnect(){}},requestAnimationFrame:f=>{frames.push(f);return 1;},cancelAnimationFrame(){}});
 vm.runInContext(read('pixel-console.js'),ctx);
 const flush=()=>{while(frames.length)frames.shift()();};flush();
 return {animations,toast,stage,flush,observers,change(next){mode=next;active.offsetLeft=next==='create'?140:0;observers.find(o=>o.target===plans).fn([]);flush();},notify(){observers.find(o=>o.target===toast).fn([]);}};
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
