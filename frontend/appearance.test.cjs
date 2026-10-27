const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=name=>fs.readFileSync(__dirname+'/'+name,'utf8');
function fixture({saved=null,blocked=false,reduced=false,pathname='/pixel-schedule.html',hash='#movie'}={}){
 const listeners={},writes=[],animations=[],navigations=[],root={dataset:{}},main={draft:'保留草稿',scrollLeft:1250,children:[{}],animate:(frames,options)=>{animations.push({frames,options});return{cancel(){}};}};
 const storage={getItem(){if(blocked)throw Error('unavailable');return saved;},setItem(k,v){if(blocked)throw Error('unavailable');writes.push([k,v]);}};
 const document={documentElement:root,readyState:'loading',addEventListener:(k,fn)=>listeners[k]=fn,querySelector:s=>s==='#main'?main:null};
 const window={location:{pathname,hash,assign:url=>navigations.push(url)},matchMedia:()=>({matches:reduced}),addEventListener:(k,fn)=>listeners[k]=fn};
 vm.runInNewContext(read('appearance.js'),{document,window,localStorage:storage});
 return{api:window.CinemaAppearance,root,main,writes,listeners,animations,navigations};
}
test('both full entries load the chooser without loading pixel assets on original',()=>{
 const html=read('pixel-schedule.html');assert.ok(html.indexOf('src="appearance.js"')<html.indexOf('href="life.css"'));assert.ok(html.indexOf('href="appearance.css"')>html.indexOf('href="pixel-console.css"'));
 assert.match(read('index.html'),/src="appearance.js"/);assert.match(read('index.html'),/href="appearance.css"/);assert.doesNotMatch(read('index.html'),/pixel-schedule\.(?:js|css)|pixel-console\.(?:js|css)/);assert.match(read('server.cjs'),/'appearance.js','appearance.css'/);
});
test('original option navigates to the real entry while preserving all six route hashes',()=>{
 for(const page of ['schedule','movie','book','game','punishment','stats']){
  const f=fixture({hash:'#'+page});f.api.select('original');assert.deepEqual(f.navigations,['/#'+page]);assert.deepEqual(f.writes,[['cinema.appearance','original']]);
  const original=fixture({pathname:'/',hash:'#'+page,saved:'riso'});assert.equal(original.api.getTheme(),'original');original.api.select('midnight');assert.deepEqual(original.navigations,['/pixel-schedule.html#'+page]);
 }
 assert.equal(fixture({saved:'original'}).api.getTheme(),'pixel','explicit pixel URL must still work after visiting original');
 const invalid=fixture({hash:'#unrecognized'});invalid.api.select('original');assert.deepEqual(invalid.navigations,['/#schedule']);
});
test('cross-entry storage updates cannot navigate tabs or discard their active work',()=>{
 const f=fixture();f.listeners.storage({key:'cinema.appearance',newValue:'original'});assert.equal(f.api.getTheme(),'pixel');assert.deepEqual(f.navigations,[]);
 const original=fixture({pathname:'/index.html'});original.listeners.storage({key:'cinema.appearance',newValue:'riso'});assert.equal(original.api.getTheme(),'original');assert.deepEqual(original.navigations,[]);
});
test('appearance defaults safely and validates remembered values',()=>{
 for(const options of [{},{saved:'unknown'},{blocked:true}])assert.equal(fixture(options).api.getTheme(),'pixel');
 assert.equal(fixture({saved:'paper'}).root.dataset.theme,'paper');
});
test('theme changes preserve drafts, node identity and timeline position with no business render',()=>{
 const f=fixture(),child=f.main.children[0];assert.equal(f.api.select('paper'),true);assert.equal(f.root.dataset.theme,'paper');assert.equal(f.main.children[0],child);assert.equal(f.main.draft,'保留草稿');assert.equal(f.main.scrollLeft,1250);
 assert.deepEqual(f.writes,[['cinema.appearance','paper']]);assert.equal(f.animations.length,1);assert.equal(f.animations[0].options.duration,200);
 assert.equal(f.api.select('unexpected'),false);assert.equal(f.root.dataset.theme,'paper');assert.equal(f.writes.length,1);
 f.api.select('pixel');assert.equal(f.root.dataset.theme,'pixel');
 assert.doesNotMatch(read('appearance.js'),/fetch\(|\/api\/|location\.reload|main\.innerHTML|render\(/);
});
test('cross-tab changes do not echo storage writes; reduced motion skips fade',()=>{
 const f=fixture({reduced:true});f.listeners.storage({key:'cinema.appearance',newValue:'paper'});assert.equal(f.api.getTheme(),'paper');assert.equal(f.writes.length,0);assert.equal(f.animations.length,0);
 f.listeners.storage({key:'unrelated',newValue:'pixel'});assert.equal(f.api.getTheme(),'paper');f.listeners.storage({key:'cinema.appearance',newValue:null});assert.equal(f.api.getTheme(),'pixel');
 assert.doesNotThrow(()=>fixture({blocked:true}).api.select('paper'));
});
test('switcher exposes pressed state, escape dismissal and theme-scoped surfaces',()=>{
 const js=read('appearance.js'),css=read('appearance.css');
 for(const part of ['aria-expanded','aria-controls','aria-pressed','aria-labelledby',"event.key==='Escape'",'focusin','control.contains','toggle.focus({preventScroll:true})'])assert.ok(js.includes(part),part);
 for(const selector of ['#modal','.visual-node','.schedule-plan','.composer-panel','.library-table','.balance-panel','.stat-panel'])assert.ok(css.includes(selector),selector);
 assert.match(css,/html:is\(\[data-theme=paper\],\[data-theme=clay\],\[data-theme=midnight\],\[data-theme=riso\]\) body\.pixel-theme/);assert.match(css,/--retro-glass:var\(--paper-surface\)/);assert.match(css,/\.paper-symbol\{display:none\}/);assert.match(css,/\.pixel-symbol\{display:none\}/);
});

test('all five themes persist and switching among them preserves the live application',()=>{
 const f=fixture(),child=f.main.children[0];
 for(const theme of ['clay','midnight','riso','paper','pixel']){
  assert.equal(f.api.select(theme),true);assert.equal(f.api.getTheme(),theme);assert.equal(fixture({saved:theme}).root.dataset.theme,theme);
  assert.equal(f.main.children[0],child);assert.equal(f.main.draft,'保留草稿');assert.equal(f.main.scrollLeft,1250);
 }
 assert.equal(f.writes.length,5);
});
test('new art directions have separate token palettes and decoration never changes axis geometry',()=>{
 const css=read('appearance.css').split('/* Alternate art directions')[1];
 for(const theme of ['clay','midnight','riso'])assert.ok(css.includes('html[data-theme='+theme+'] body.pixel-theme{'));
 assert.match(css,/#f3e9d8/);assert.match(css,/#0b1222/);assert.match(css,/#f237a1/);assert.match(css,/SimSun,Georgia,serif/);
 assert.doesNotMatch(css,/\.visual-track\{|\.visual-scroll\{|scrollLeft|--time-scale|animation:/);
});
test('new skins keep normal text and primary actions at readable contrast',()=>{
 const luminance=hex=>{let h=hex.slice(1);if(h.length===3)h=h.split('').map(x=>x+x).join('');return h.match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);};
 const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
 for(const theme of ['clay','midnight','riso']){
  const block=read('appearance.css').split('html[data-theme='+theme+'] body.pixel-theme{')[1].split('}')[0];
  const color=name=>block.match(new RegExp('--'+name+':(#[a-f0-9]+)'))[1];
  for(const [fg,bg] of [['paper-ink','paper-ground'],['paper-muted','paper-surface'],['theme-on-action','theme-action']])assert.ok(ratio(color(fg),color(bg))>=4.5,theme+': '+fg+' / '+bg);
 }
});

function menuFixture({reduced=false,left=450,width=550}={}){
 const animations=[],events={},properties={};
 const node=()=>({attrs:{},listeners:{},pose:{opacity:1,transform:'none'},focusCount:0,
  setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this.listeners[k]=fn;},focus(){this.focusCount++;},
  animate(frames,options){let finish;const animation={frames,options,cancelled:false,finished:new Promise(resolve=>finish=resolve),finish:()=>finish(),cancel(){this.cancelled=true;}};animations.push(animation);return animation;}});
 const toggle=node(),panel=node(),strip={clientWidth:200,scrollWidth:648,scrollLeft:0,listeners:{},addEventListener(name,fn){this.listeners[name]=fn;}},choices=['original','pixel','paper','clay','midnight','riso'].map((id,index)=>Object.assign(node(),{dataset:{themeChoice:id},offsetLeft:index*108,offsetWidth:108}));
 panel.hidden=true;panel.style={setProperty:(k,v)=>properties[k]=v};panel.querySelectorAll=()=>choices;panel.querySelector=selector=>selector==='.appearance-options'?strip:choices[1];panel.contains=target=>target===panel||choices.includes(target);
 toggle.getBoundingClientRect=()=>({left,top:16});const control={querySelector:s=>s==='#appearance-toggle'?toggle:panel,contains:target=>target===toggle||panel.contains(target)};
 const document={documentElement:{dataset:{}},readyState:'complete',querySelector:s=>s==='.shell-header'?{append(){}}:null,createElement:()=>control,addEventListener:(name,fn)=>events[name]=fn};
 const window={location:{pathname:'/pixel-schedule.html'},innerWidth:width,innerHeight:1000,matchMedia:()=>({matches:reduced}),getComputedStyle:n=>n.pose,addEventListener(){}};
 vm.runInNewContext(read('appearance.js'),{window,document,localStorage:{getItem:()=>null}});
 return{toggle,panel,strip,choices,animations,events,properties};
}
test('single-row strip opens left at trigger height, staggers right to left and closes after exit',async()=>{
 const f=menuFixture();f.toggle.listeners.click({detail:1});
 assert.equal(f.panel.hidden,false);assert.equal(f.panel.inert,false);assert.equal(f.toggle.attrs['aria-expanded'],'true');
 assert.equal(f.properties['--appearance-top'],'16px');assert.equal(f.properties['--appearance-left'],'12px');assert.equal(f.properties['--appearance-width'],'426px');assert.equal(f.properties['--appearance-height'],'44px');
 assert.equal(f.animations[0].options.duration,180);assert.equal(f.animations[1].options.delay,100);assert.equal(f.animations[6].options.delay,0);
 assert.equal(f.strip.scrollLeft,62,'opening reveals the selected choice horizontally without scrolling the page');
 f.toggle.listeners.click({detail:1});assert.equal(f.panel.hidden,false);assert.equal(f.panel.inert,true);assert.equal(f.toggle.attrs['aria-expanded'],'false');assert.equal(f.animations[7].options.duration,120);
 f.animations[7].finish();await Promise.resolve();assert.equal(f.panel.hidden,true);
});
test('appearance choices stay in one compact horizontal row, with no preview grid',()=>{
 const css=read('appearance.css');assert.match(css,/\.appearance-options\{display:flex;flex-wrap:nowrap/);assert.match(css,/overflow-x:auto;overflow-y:hidden/);assert.match(css,/\.appearance-options small\{display:none\}/);assert.doesNotMatch(css,/grid-template-columns:1fr 1fr/);
});
test('wheel browses overflowing options horizontally while native horizontal gestures remain available',()=>{
 const f=menuFixture();let prevented=0;f.strip.listeners.wheel({deltaX:0,deltaY:80,preventDefault(){prevented++;}});assert.equal(f.strip.scrollLeft,80);assert.equal(prevented,1);
 f.strip.listeners.wheel({deltaX:100,deltaY:0,preventDefault(){prevented++;}});assert.equal(prevented,1);
 f.strip.scrollWidth=100;f.strip.listeners.wheel({deltaX:0,deltaY:80,preventDefault(){prevented++;}});assert.equal(prevented,1);
});
test('rapid direction changes keep current pose and stale completion cannot hide reopened menu',async()=>{
 const f=menuFixture();f.toggle.listeners.click({detail:1});f.panel.pose={opacity:.4,transform:'matrix(.98, 0, 0, .98, 8, 0)'};
 f.toggle.listeners.click({detail:1});const closing=f.animations[7];assert.equal(closing.frames[0].opacity,.4);assert.equal(closing.frames[0].transform,f.panel.pose.transform);
 f.toggle.listeners.click({detail:1});closing.finish();await Promise.resolve();assert.equal(f.panel.hidden,false);assert.equal(f.toggle.attrs['aria-expanded'],'true');assert.equal(closing.cancelled,true);
});
test('keyboard and reduced motion are instant, Escape returns focus, narrow panel stays left',()=>{
 for(const options of [{reduced:true},{left:280,width:360}]){
  const f=menuFixture(options);f.toggle.listeners.click({detail:options.reduced?1:0});assert.equal(f.animations.length,0);assert.equal(f.panel.hidden,false);
  assert.ok(parseFloat(f.properties['--appearance-left'])>=12);assert.ok(parseFloat(f.properties['--appearance-left'])+parseFloat(f.properties['--appearance-width'])<= (options.left||450)-12);
  f.events.keydown({key:'Escape',preventDefault(){}});assert.equal(f.panel.hidden,true);assert.equal(f.toggle.focusCount,1);
 }
});
test('pointer outside closes with motion while keyboard focus leaving closes instantly',()=>{
 const f=menuFixture();f.toggle.listeners.click({detail:1});f.events.pointerdown();f.events.focusin({target:{}});assert.equal(f.panel.hidden,false);assert.equal(f.animations.length,14);
 const k=menuFixture();k.toggle.listeners.click({detail:0});k.events.keydown({key:'Tab'});k.events.focusin({target:{}});assert.equal(k.panel.hidden,true);assert.equal(k.animations.length,0);
});
