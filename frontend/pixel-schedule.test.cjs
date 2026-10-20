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
 assert.match(read('server.cjs'),/'pixel-schedule.html','pixel-schedule.css','pixel-schedule.js'/);
});
