// Inline schedule composer. References shared application functions at call time.
const LifeComposer=(()=>{
 let tab='plans',draft=null,pickSequence=0,choosing=false;
 const isOpen=()=>typeof page!=='undefined'&&page==='schedule'&&tab==='create';
 const tabsHTML=(count=visibleEvents().filter(e=>e.state==='plan').length)=>'<div class="composer-tabs" role="tablist" aria-label="日程下半区"><button type="button" role="tab" data-composer="plans" aria-selected="'+(tab==='plans')+'">想做的事 <small>'+count+'</small></button><button type="button" role="tab" data-composer="create" aria-selected="'+(tab==='create')+'">还想做什么 ＋</button></div>';
 function capture(){
  const form=document.querySelector('#quick-form');if(!draft||draft.saving||!isOpen()||!form?.elements)return;
  draft.values={...draft.values,...Object.fromEntries(new FormData(form))};
  draft.link=selectedDouban;draft.source=candidateSource;draft.results=candidates;
 }
 function resetDeck(){document.querySelector('.composer-deck')?.classList?.remove('is-picking');document.querySelectorAll('.composer-deck button').forEach(card=>card.getAnimations?.().forEach(a=>a.cancel()));}
 function cancelPick(){pickSequence++;choosing=false;resetDeck();document.querySelector('.composer-panel')?.getAnimations?.().forEach(a=>a.cancel());document.querySelectorAll('.composer-panel > *').forEach(el=>el.getAnimations?.().forEach(a=>a.cancel()));}
 function leave(){capture();cancelPick();searchAbort?.abort();searchSequence++;tab='plans';}
 function start(date=null){
  if(draft?.saving)return;cancelPick();capture();tab='create';hideEventHover(true);
  if(!draft)draft={kind:null,step:'category',values:{date:date||'',dateIntent:date?'dated':'unsure',count:'1',owner:person},people:3,state:'plan',link:null,source:null,action:null,requestId:null};
  if(date){draft.values.date=date;draft.values.dateIntent='dated';}render(document.querySelector('#schedule-plans'),true);
  document.querySelector('#schedule-plans')?.scrollIntoView?.({behavior:reducedMotion()?'auto':'smooth',block:'nearest'});
 }
 const button=(action,label,value='')=>'<button type="button" data-composer="'+action+'" data-value="'+esc(value)+'">'+label+'</button>';
 const entryStep=kind=>kind==='punishment'?'punishment-action':['movie','other'].includes(kind)?'name':'work';
 const timingLabel=()=>draft.values.date|| (draft.values.dateIntent==='future'?'未来':'暂不确定');
 const categoryHTML=()=>'<h3>做什么？</h3><div class="composer-deck" role="group" aria-label="选择一种活动">'+['movie','book','game','other','punishment'].map((k,i)=>'<button type="button" class="composer-deck-card" data-composer="kind" data-value="'+k+'" aria-pressed="'+(draft?.kind===k)+'" style="--card-index:'+(i-2)+';--card-rank:'+i+';--card-color:'+colors[k]+'"><span class="deck-corner" aria-hidden="true">'+eventArtwork({kind:k})+'</span><span class="deck-icon" aria-hidden="true">'+eventArtwork({kind:k})+'</span><span class="deck-label">'+labels[k]+'</span><span class="deck-number" aria-hidden="true">0'+(i+1)+'</span></button>').join('')+'</div>';
 function pane(step,html){return '<section class="composer-step" data-composer-step="'+step+'" '+(draft.step===step?'':'hidden')+'>'+html+'</section>';}
 function render(panel,force=false){
  if(!panel||!draft)return;panel.hidden=false;
  if(!force&&panel.querySelector?.('#quick-form'))return;
  quickKind=draft.kind;quickDate=draft.values.date;quickPeople=draft.people;quickState=draft.state;selectedDouban=draft.link;candidateSource=draft.source;candidates=draft.results||[];
  const kind=draft.kind,options=state.works.filter(w=>w.kind===kind&&!w.deleted),v=draft.values;
  let content=pane('category',categoryHTML());
  if(kind){
   if(['book','game'].includes(kind))content+=pane('work','<h3>选一个'+labels[kind]+'</h3><div class="composer-choices">'+options.map(w=>button('work',esc(w.title),w.id)).join('')+button('new','＋ 新'+labels[kind])+'</div>'+button('back','‹ 返回','category'));
   content+=pane('name','<h3>'+ (kind==='movie'?'电影名？':kind==='other'?'做什么？':kind==='punishment'?'希望做什么？':'叫什么？')+'</h3><div class="form-group"><input '+(kind==='other'||kind==='punishment'?'id="event-title" name="title"':'id="new-work-title" name="workTitle"')+' maxlength="160" aria-label="名称" value="'+esc(v.title||v.workTitle||'')+'"></div>'+button('name-next','下一步')+button('back','‹ 返回',['movie','other','punishment'].includes(kind)?'category':'work'));
   if(kind==='movie')content+=pane('search','<h3>选对版本</h3><p class="form-status" id="lookup-status"></p><div id="source-candidates" class="candidate-list">'+candidates.map((c,i)=>'<button type="button" class="candidate" data-source-candidate="'+i+'"><strong>'+esc(c.title)+' · '+esc(c.year||'年份待补充')+'</strong><small>'+esc(c.en||'')+'　'+esc(c.director||'导演暂未获取')+'</small></button>').join('')+'</div><div class="composer-choices"><button type="button" data-source-search="douban">重新查找</button><button type="button" data-source-search="wiki">其他资料源</button>'+button('manual','手动添加')+'</div>'+button('back','‹ 返回','name'));
   const metadata=[['en','原名'],['year','年份'],['director',kind==='book'?'作者':kind==='game'?'开发者':'导演'],['genre','类型'],['language','语言'],['country','地区']];
   content+=pane('metadata','<h3>补哪一项？</h3><div class="composer-choices">'+metadata.map(([key,label])=>button('field',label,key)).join('')+'</div>'+button('back','‹ 返回','confirm'));
   content+=pane('field','<h3 id="composer-field-label">年份</h3>'+metadata.map(([key,label])=>'<label class="composer-meta-field" data-meta-field="'+key+'" hidden><span>'+label+'</span><input name="'+key+'" value="'+esc(v[key]||'')+'" '+(key==='year'?'type="number" min="1000" max="2100"':'maxlength="200"')+'></label>').join('')+button('field-next','继续')+button('back','‹ 返回','metadata'));
   content+=pane('date','<h3>哪一天？</h3><div class="composer-choices">'+button('date-intent','未来','future')+button('date-intent','暂不确定','unsure')+[[-1,'昨天'],[0,'今天'],[1,'明天']].map(([n,label])=>button('date-preset',label,String(n))).join('')+'</div><input id="quick-date" name="date" aria-label="日期" type="date" value="'+esc(v.date)+'">'+button('back','确定','confirm'));
   content+=pane('people','<h3>谁一起？</h3><div class="composer-choices">'+[[3,'一起'],[1,'puppy'],[2,'jammy']].map(([n,label])=>button('people',label,String(n))).join('')+'</div>'+button('back','‹ 返回','confirm'));
   content+=pane('state','<h3>计划还是做过？</h3><div class="composer-choices">'+button('state','想做','plan')+button('state','做了','done')+'</div>'+button('back','‹ 返回','confirm'));
   content+=pane('punishment-action','<h3>惩罚</h3><div class="composer-choices">'+button('grant','获得一次机会')+'<button type="button" data-composer="demand" '+(balance(person)?'':'disabled')+'>提出要求 · 剩 '+balance(person)+' 次</button></div>'+button('back','‹ 返回','category'));
   content+=pane('owner','<h3>谁获得？</h3><div class="composer-choices">'+button('owner','puppy','puppy')+button('owner','jammy','jammy')+'</div><input name="owner" type="hidden" value="'+esc(v.owner||person)+'">'+button('back','‹ 返回','confirm'));
   content+=pane('count','<h3>几次？</h3><input name="count" type="number" min="1" max="20" step="1" value="'+esc(v.count||'1')+'">'+button('back','确定','confirm'));
   content+=pane('confirm','<h3>确认一下</h3><div id="composer-summary"></div><p class="form-error" role="alert"></p><div class="composer-actions">'+button('back','‹ 返回',entryStep(kind))+'<button type="submit" class="dark-button">保存</button></div>');
   content+='<input id="work-select" name="workId" type="hidden" value="'+esc(v.workId||'')+'"><input name="type" type="hidden" value="'+esc(v.type||labels[kind])+'">';
  }
  panel.innerHTML=tabsHTML()+'<div class="composer-panel" role="tabpanel" aria-label="还想做什么">'+(kind?'<button type="button" class="composer-kind" data-composer="back" data-value="category" aria-label="更换活动类别">'+eventArtwork({kind})+'<span>'+labels[kind]+'</span></button>':'')+'<div class="composer-progress" aria-hidden="true"><i></i><i></i><i></i></div><form id="quick-form" data-composer-form><fieldset>'+content+'</fieldset></form></div>';
  const container=panel.querySelector?.('.composer-panel');if(container){container.dataset.phase=draft.step==='category'?'0':draft.step==='confirm'?'2':'1';container.style?.setProperty('--card-color',colors[kind]||'#8fa4c1');}
  if(kind)setStep(draft.step,false);
 }
 function setStep(step,focus=true){
  const panel=document.querySelector('.composer-panel'),previous=draft.step;
  panel?.getAnimations?.().forEach(a=>a.cancel());
  document.querySelectorAll('[data-composer-step]').forEach(el=>el.getAnimations?.().forEach(a=>a.cancel()));
  if(step==='category')resetDeck();
  capture();draft.step=step;
  document.querySelectorAll('[data-composer-step]').forEach(el=>el.hidden=el.dataset.composerStep!==step);
  if(step==='confirm'){
   const v=draft.values,w=state.works.find(w=>w.id===v.workId),title=w?.title||v.workTitle||v.title||'';
   let summary='<strong class="composer-title">'+esc(draft.kind==='punishment'?(draft.action==='grant'?'获得机会':title):title)+'</strong><div class="composer-defaults">'+button('back',esc(timingLabel()),'date');
   if(draft.kind==='punishment'){summary+=draft.action==='grant'?button('back',esc(v.owner)+' → '+(v.owner==='puppy'?'jammy':'puppy'),'owner')+button('back',esc(v.count)+' 次','count'):'<span>'+esc(person)+' → '+(person==='puppy'?'jammy':'puppy')+'</span>';}
   else summary+=button('back',peopleText(draft.people),'people')+button('back',draft.state==='plan'?'想做':'做了','state');
   summary+='</div>';if(['movie','book','game'].includes(draft.kind)&&!v.workId)summary+='<div class="composer-meta-summary">'+esc([v.year,v.director,draft.link?'已关联豆瓣':''].filter(Boolean).join(' · '))+'</div>'+button('back','补充资料','metadata');
   document.querySelector('#composer-summary').innerHTML=summary;
  }
  if(panel)panel.dataset.phase=step==='category'?'0':step==='confirm'?'2':'1';
  if(step==='date')document.querySelectorAll('[data-composer="date-intent"]').forEach(b=>b.disabled=draft.kind==='punishment'&&draft.action==='grant');
  const badge=document.querySelector('.composer-kind');if(badge)badge.hidden=step==='category';
  updateTrail(panel,step);
  if(focus){
   const section=document.querySelector('[data-composer-step="'+step+'"]'),direction=step==='category'||previous==='confirm'?-1:1;
   if(!reducedMotion()){
    section?.animate?.([{opacity:0,transform:'translate3d('+direction*6+'px,4px,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],{duration:240,easing:'cubic-bezier(.16,1,.3,1)'});
   }
   section?.querySelector?.('input:not([type=hidden]),button')?.focus?.({preventScroll:true});
  }
 }
 function updateTrail(panel,step){
  if(!panel?.querySelector||!document.createElement)return;
  let trail=panel.querySelector('.composer-trail');if(!trail){trail=document.createElement('div');trail.className='composer-trail';panel.querySelector('form')?.before(trail);}
  const v=draft.values,w=state.works.find(w=>w.id===v.workId),title=w?.title||v.workTitle||v.title||'';
  trail.hidden=step==='category';
  const nameStep=['movie','other','punishment'].includes(draft.kind)?'name':'work';
  trail.innerHTML=(title?button('back',esc(title),nameStep):'')+(['date','people','state','metadata','field'].includes(step)?button('back',esc(timingLabel()),'date')+(draft.kind==='punishment'?'':button('back',peopleText(draft.people),'people')):'');
 }
 function chooseKind(kind){
  capture();if(draft.kind===kind){draft.step=entryStep(kind);render(document.querySelector('#schedule-plans'),true);return;}
  searchAbort?.abort();searchSequence++;selectedDouban=null;candidateSource=null;candidates=[];
  draft.kind=kind;draft.link=null;draft.source=null;draft.results=[];draft.values={date:draft.values.date,dateIntent:draft.values.dateIntent,owner:person,count:'1'};
  draft.step=entryStep(kind);render(document.querySelector('#schedule-plans'),true);
 }
 async function pickCard(card,kind){
  if(choosing)return;const token=++pickSequence,current=draft;let origin=card.getBoundingClientRect?.();choosing=true;
  try{
   if(card.animate&&!reducedMotion()){
    const deck=card.closest?.('.composer-deck');deck?.classList.add('is-picking');card.setAttribute?.('aria-pressed','true');
    deck?.querySelectorAll?.('button').forEach(sibling=>{if(sibling!==card)sibling.animate?.([{opacity:1,scale:'1'},{opacity:0,scale:'.95'}],{duration:220,easing:'ease-out',fill:'forwards'});});
    // Keep the picked card stationary: a lift followed by a fresh clone looks
    // like two expansions, especially while the hover fan is still settling.
    const lift=card.animate([{opacity:1},{opacity:1}],{duration:90});
    try{await lift.finished;}catch{return;}
    origin=card.getBoundingClientRect?.()||origin;
   }
   if(token!==pickSequence||draft!==current||!isOpen())return;
   chooseKind(kind);setStep(draft.step,false);
   const panel=document.querySelector('.composer-panel'),target=panel?.getBoundingClientRect?.();
   if(panel?.animate&&target?.width&&target.height&&origin?.width&&origin.height&&!reducedMotion()){
    // One real surface, one geometry animation. No cloned shell or handoff.
    const from='translate3d('+(origin.left-target.left)+'px,'+(origin.top-target.top)+'px,0) scale('+(origin.width/target.width)+','+(origin.height/target.height)+')';
    const expand=panel.animate([{transformOrigin:'0 0',transform:from},{transformOrigin:'0 0',transform:'translate3d(0,0,0) scale(1)'}],{duration:540,easing:'cubic-bezier(.16,1,.3,1)'});
    panel.querySelectorAll?.(':scope > *').forEach(el=>el.animate?.([{opacity:0},{opacity:1}],{duration:280,delay:180,fill:'backwards'}));
    try{await expand.finished;}catch{return;}
   }
   if(token===pickSequence&&isOpen())document.querySelector('[data-composer-step="'+draft.step+'"]')?.querySelector?.('input:not([type=hidden]),button')?.focus?.({preventScroll:true});
  }finally{if(token===pickSequence)choosing=false;}
 }
 async function click(b){
  if(draft?.saving)return;
  const action=b.dataset.composer,value=b.dataset.value;
  if(action==='create')return start();
  if(action==='plans'){cancelPick();capture();searchAbort?.abort();searchSequence++;tab='plans';hideEventHover(true);return renderSchedulePlans();}
  if(choosing)return;
  if(!draft)return;
  if(action==='kind')return pickCard(b,value);
  if(action==='back'){if(value==='confirm'&&['date','count'].includes(draft.step)){const input=document.querySelector('[data-composer-step="'+draft.step+'"] input');if(input&&!input.reportValidity())return;if(draft.step==='date'&&input?.value)draft.values.dateIntent='dated';}return setStep(value);}
  if(action==='work'){capture();draft.values.workId=value;document.querySelector('#work-select').value=value;return setStep('confirm');}
  if(action==='new'){document.querySelector('#work-select').value='';draft.values.workId='';return setStep('name');}
  if(action==='name-next'){
   const input=document.querySelector(draft.kind==='other'||draft.kind==='punishment'?'#event-title':'#new-work-title');
   if(!input.value.trim()){input.setCustomValidity('请填一个名称');input.reportValidity();input.setCustomValidity('');return;}
   capture();if(draft.kind==='movie'){setStep('search');return searchSource('douban');}return setStep('confirm');
  }
  if(action==='manual'){selectedDouban=null;candidateSource=null;draft.link=null;draft.source=null;return field('year');}
  if(action==='field')return field(value);
  if(action==='field-next'){const input=document.querySelector('[data-meta-field="'+draft.field+'"] input');if(input&&!input.reportValidity())return;return setStep('confirm');}
  if(action==='people'){draft.people=Number(value);quickPeople=draft.people;return setStep('confirm');}
  if(action==='state'){draft.state=value;quickState=value;if(value==='done'&&!document.querySelector('#quick-date').value){document.querySelector('#quick-date').value=today();draft.values.date=today();draft.values.dateIntent='dated';}return setStep('confirm');}
  if(action==='date-intent'){if(draft.kind==='punishment'&&draft.action==='grant')return;document.querySelector('#quick-date').value='';draft.values.date='';draft.values.dateIntent=value;draft.state='plan';quickState='plan';return setStep('confirm');}
  if(action==='date-preset'){draft.values.date=shift(today(),Number(value));document.querySelector('#quick-date').value=draft.values.date;draft.values.dateIntent='dated';return setStep('confirm');}
  if(action==='owner'){document.querySelector('[name=owner]').value=value;return setStep('confirm');}
  if(action==='grant'){draft.action='grant';if(!document.querySelector('#quick-date').value)document.querySelector('#quick-date').value=today();draft.values.date=document.querySelector('#quick-date').value;draft.values.dateIntent='dated';return setStep('confirm');}
  if(action==='demand'){if(!balance(person))return;draft.action='demand';draft.requestId=crypto.randomUUID();return setStep('name');}
 }
 function field(key){setStep('field');draft.field=key;document.querySelectorAll('[data-meta-field]').forEach(el=>el.hidden=el.dataset.metaField!==key);const label=document.querySelector('[data-meta-field="'+key+'"]');document.querySelector('#composer-field-label').textContent=label?.querySelector('span')?.textContent||'资料';label?.querySelector('input')?.focus();}
 function chooseSourceCandidate(index){chooseSource(index);if(candidateSource){capture();setStep('confirm');}}
 function payload(){
  const v=draft.values;if(draft.kind==='punishment')return draft.action==='grant'?{owner:v.owner,count:Number(v.count),date:v.date}:{title:v.title,date:v.date,dateIntent:v.date?'dated':v.dateIntent||'unsure',requestId:draft.requestId};
  const data={kind:draft.kind,date:v.date,dateIntent:v.date?'dated':v.dateIntent||'unsure',participants:draft.people,state:draft.state,note:''};
  if(v.workId)data.workId=v.workId;else if(draft.kind==='other')data.title=v.title;else{data.workTitle=v.workTitle;for(const key of ['en','year','director','genre','language','country','type'])data[key]=v[key];if(draft.link)data.douban={id:draft.link.id,rating:draft.link.rating??null,checkedAt:draft.link.checkedAt||'',ratingNote:draft.link.notice||'豆瓣资料快照，非实时'};if(draft.source?.nameSourceUrl)data.nameSourceUrl=draft.source.nameSourceUrl;}return data;
 }
 async function save(form){
  if(!draft||draft.saving||busy)return;
  if(draft.step!=='confirm')return;capture();
  const needsName=!(draft.values.workId||draft.kind==='punishment'&&draft.action==='grant');
  if(needsName&&!(draft.values.workTitle||draft.values.title||'').trim())return setStep('name');
  const data=payload(),current=draft;current.saving=true;form.querySelector('fieldset').disabled=true;
  try{
   const path=draft.kind==='punishment'?(draft.action==='grant'?'/api/chances':'/api/demands'):'/api/events';
   const saved=await mutate(path,'POST',data,false);
   if(saved){
    const panel=isOpen()?document.querySelector('.composer-panel'):null;
    if(panel?.animate&&!reducedMotion()){const fold=panel.animate([{opacity:1,scale:'1',translate:'0 0'},{opacity:0,scale:'.96',translate:'0 18px'}],{duration:280,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});try{await fold.finished;}catch{}}
    draft=null;tab='plans';if(page==='schedule'){renderSchedule();const card=document.querySelector('[data-event="'+saved.id+'"]')?.closest?.('.schedule-plan');if(!reducedMotion())card?.animate?.([{opacity:0,translate:'0 -10px',scale:'.98'},{opacity:1,translate:'0 0',scale:'1'}],{duration:480,easing:'cubic-bezier(.16,1,.3,1)'});}
   }
   else if(!form.querySelector('.form-error').textContent)form.querySelector('.form-error').textContent='未保存，请重试。';
  }finally{current.saving=false;form.querySelector('fieldset').disabled=false;}
 }
 function reset(){cancelPick();searchAbort?.abort();searchSequence++;draft=null;tab='plans';}
 return {isOpen,tabsHTML,capture,leave,reset,start,render,click,save,chooseSourceCandidate,payload,getDraft:()=>draft};
})();
