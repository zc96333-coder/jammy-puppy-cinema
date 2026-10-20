const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=file=>fs.readFileSync(__dirname+'/'+file,'utf8');
test('pixel schedule reuses the full application, not the read-only prototype',()=>{
 const html=read('pixel-schedule.html'),original=read('index.html');
 for(const name of ['film-metadata.js','timeline-engine.js','composer.js','life.js']){assert.ok(html.includes('src="'+name+'"'));assert.ok(original.includes('src="'+name+'"'));}
 assert.doesNotMatch(html,/orbit-preview\.js|orbit-geometry\.js|three-r149/);
 assert.match(html,/与原版共用数据，编辑会保存/);assert.match(html,/href="\/#schedule"/);
 assert.doesNotMatch(original,/pixel-schedule|pixel-theme/);
});
test('pixel icon set covers content and actions with local, accessible SVGs',()=>{
 const ctx=vm.createContext({window:{}});vm.runInContext(read('pixel-schedule.js'),ctx);
 for(const name of ['film','game','book','gift','other','edit','save','trash','plus','check','calendar','left','right','clock','target','zoom']){
  const svg=ctx.window.CinemaPixel.icon(name);assert.match(svg,/viewBox="0 0 24 24"/);assert.match(svg,/shape-rendering="crispEdges"/);assert.match(svg,/aria-hidden="true"/);assert.match(svg,/fill="currentColor"/);assert.doesNotMatch(svg,/#undefined/);
 }
 assert.match(read('life.js'),/window\.CinemaPixel&&page==='schedule'/);
});
test('shallow arc does not warp chronological X coordinates or business state',()=>{
 const ctx=vm.createContext({window:{}});vm.runInContext(read('pixel-schedule.js'),ctx);const {rise}=ctx.window.CinemaPixel;
 for(const width of [375,768,1200,1920]){assert.equal(Math.abs(rise(width/2,width)),0);assert.ok(rise(0,width)<0);assert.equal(rise(0,width),rise(width,width));assert.ok(Math.abs(rise(0,width))<=28);}
 const js=read('pixel-schedule.js');assert.doesNotMatch(js,/fetch\(|localStorage|\.scrollLeft\s*=|\.style\.transform\s*=|\.style\.height\s*=.*orbit|\/api\//);
 assert.match(js,/--orbit-rise/);assert.match(js,/MutationObserver/);assert.match(js,/pagehide/);
});
test('theme preserves original animation rules and scopes styling to the new schedule',()=>{
 const css=read('pixel-schedule.css'),original=read('life.css');
 for(const token of ['pin-dash-flow','title-dash-flow','title-save-fade','review-flip-inner','rating-visual-thumb','composer-deck','today-breathe'])assert.ok(original.includes(token));
 assert.doesNotMatch(css,/animation:\s*none|transition:\s*none|\.review-flip-inner\s*\{|\.visual-node[^{}]*\{[^{}]*transform:/);
 assert.match(css,/\.pixel-theme\.visual-schedule-page \.visual-schedule \.visual-node\{[^}]*background:transparent;[^}]*border:0;[^}]*box-shadow:none/);
 assert.match(css,/focus-visible/);assert.match(css,/prefers-reduced-motion/);assert.match(css,/button\[type=submit\]::before/);
 assert.match(css,/\.pixel-theme\.visual-schedule-page \.visual-schedule \.visual-scroll,\.pixel-theme\.visual-schedule-page \.visual-schedule \.visual-track\{background:transparent\}/,'the white original viewport is explicitly overridden');
 assert.match(css,/\.pixel-theme\.visual-schedule-page \.visual-schedule \.axis-date\.is-future \.axis-numeral\{color:#d6b181\}/,'future dates must not inherit original blue');
 assert.match(read('server.cjs'),/'pixel-schedule.html','pixel-schedule.css','pixel-schedule.js'/);
});

test('upper labels reuse warm screen grain and crisp typography without changing axis geometry',()=>{
 const css=read('pixel-schedule.css');assert.match(css,/--pixel-screen-font:Consolas,"Microsoft YaHei UI"/);assert.match(css,/--pixel-screen-grain:repeating-linear-gradient/);
 for(const selector of ['.shell-header','.pixel-version','.preview-strip','.icon-control'])assert.ok(css.split(selector+'{').slice(1).some(part=>part.split('}')[0].includes('var(--pixel-screen-grain)')));
 assert.match(css,/@supports \(background-clip:text\)/);assert.match(css,/\.current-date strong\{background-image:repeating-linear-gradient/);
 assert.doesNotMatch(css.slice(0,css.indexOf('.pixel-theme.visual-schedule-page svg.pixel-icon')),/(?:^|[;{])filter:blur|font-smooth|image-rendering:pixelated/);assert.match(css,/min-width:44px;min-height:44px/);
});

test('civil-day expressions preserve original centers without measuring each node',()=>{
 const ctx=vm.createContext({window:{}});vm.runInContext(read('pixel-schedule.js'),ctx);const {position}=ctx.window.CinemaPixel;
 for(const scale of [.25,8,36,80,160])for(const index of [-50,.5,12.5,500]){
  assert.equal(position('calc(62px + '+index+' * var(--time-scale))',36,scale),80+index*scale);
  assert.equal(position('calc(80px + '+index+' * var(--time-scale) - min(var(--time-scale), 44px) / 2)',44,scale,true),80+index*scale);
 }
 assert.equal(position('12px',36,36),null,'unrecognized formulas must use a current geometry fallback');
});

test('zoom batches layout reads before writes and skips offscreen/unchanged nodes',()=>{
 let trace=[],frames=[],observers=[];
 class Node{
  constructor(name=''){this.name=name;this.children=[];this.dataset={};this.metrics={width:36,left:0,height:400,top:288};this.values={};this.attrs={};this.listeners={};this.className='';
   this.style=new Proxy({getPropertyValue:k=>this.values[k]||'',setProperty:(k,v)=>{trace.push(['write',this.name,k]);this.values[k]=v;}},{get:(o,k)=>k in o?o[k]:this.values[k],set:(o,k,v)=>{trace.push(['write',this.name,k]);this.values[k]=v;return true;}});
   this.classList={add:c=>{this.className+=' '+c;},contains:c=>this.className.split(' ').includes(c)};
  }
  get offsetWidth(){trace.push(['read',this.name]);return this.metrics.width;}get offsetLeft(){trace.push(['read',this.name]);return this.metrics.left;}get offsetTop(){trace.push(['read',this.name]);return this.metrics.top;}get offsetHeight(){trace.push(['read',this.name]);return this.metrics.height;}get clientWidth(){trace.push(['read',this.name]);return this.metrics.width;}
  setAttribute(k,v){trace.push(['write',this.name,k]);this.attrs[k]=v;if(k==='class')this.className=v;}
  append(n){this.children.push(n);}prepend(n){this.children.unshift(n);}addEventListener(k,f){this.listeners[k]=f;}
  matches(sel){return sel.split(',').some(c=>this.classList.contains(c.trim().slice(1)));}
  querySelector(sel){return this.children.find(n=>n.matches(sel.replace(':scope > ','')))||null;}
 }
 const root=new Node('root'),scroll=new Node('scroll'),track=new Node('track'),rail=new Node('rail');scroll.className='visual-scroll';track.className='visual-track';rail.className='single-axis';rail.metrics.height=1;scroll.metrics.width=1200;scroll.scrollLeft=0;track.values['--time-scale']='36px';root.append(scroll);scroll.append(track);track.append(rail);
 for(let i=0;i<400;i++){const n=new Node('event'+i);n.className='visual-node';const formula='calc(62px + '+i+' * var(--time-scale))';n.values.left={match:pattern=>{trace.push(['parse',n.name]);return formula.match(pattern);}};track.append(n);}
 const ctx=vm.createContext({window:{addEventListener(){}},document:{querySelector:()=>root,createElement:()=>new Node(),createElementNS:()=>new Node('svg'),body:new Node()},MutationObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(n){this.target=n;}disconnect(){}},requestAnimationFrame:f=>{frames.push(f);return 1;},cancelAnimationFrame(){}});
 vm.runInContext(read('pixel-schedule.js'),ctx);trace=[];frames.shift()();
 assert.ok(trace.filter(x=>x[0]==='write'&&x[2]==='--orbit-rise').length<45,'offscreen nodes are not written');
 const zoomObserver=observers.find(o=>o.target===track);
 track.values['--time-scale']='40px';scroll.scrollLeft=20;trace=[];zoomObserver.fn([]);frames.shift()();
 const reads=trace.filter(x=>x[0]==='read');assert.ok(reads.length<=5,'steady zoom reads viewport/rail metrics, not 400 node layouts');
 assert.equal(trace.filter(x=>x[0]==='parse').length,0,'zoom reuses parsed civil-day coordinates instead of parsing every node again');
 const firstWrite=trace.findIndex(x=>x[0]==='write');assert.ok(firstWrite>=0);assert.ok(trace.slice(firstWrite).every(x=>x[0]!=='read'),'no forced read/write interleaving');
 trace=[];zoomObserver.fn([]);frames.shift()();assert.equal(trace.filter(x=>x[2]==='--orbit-rise').length,0,'unchanged nodes are not restyled');
 observers[0].fn([{type:'childList',target:new Node('review-editor'),addedNodes:[new Node()],removedNodes:[]}]);assert.equal(frames.length,0,'unrelated detail edits do not repaint the timeline');
});
