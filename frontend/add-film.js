let addMode='douban',linkedSubject=null,lookupController=null,lookupVersion=0;
let selectedNameMetadata=null;
const field=(name,label,type='text',extra='')=>`<label class="form-field"><span>${label}</span><input name="${name}" type="${type}" ${extra}></label>`;
function openAdd(){
  lookupController?.abort();lookupVersion++;addMode='douban';linkedSubject=null;selectedNameMetadata=null;
  document.querySelector('#add-workflow').innerHTML=`<div class="add-source-tabs"><button type="button" data-add-mode="douban" class="active">1 · 关联豆瓣</button><button type="button" data-add-mode="manual">豆瓣没有，手动添加</button></div><section id="douban-step"><label class="form-field"><span>先搜索片名</span><div class="lookup-line"><input id="douban-keyword" placeholder="输入片名，核对上映年份与版本" aria-label="豆瓣搜索片名"><a id="douban-search-link" class="secondary-button" href="https://search.douban.com/movie/subject_search?cat=1002" target="_blank" rel="noopener noreferrer">去豆瓣搜索 ↗</a></div></label><label class="form-field"><span>粘贴选中的豆瓣条目链接</span><div class="lookup-line"><input id="douban-subject-url" type="url" placeholder="https://movie.douban.com/subject/…/" aria-label="豆瓣条目链接"><button id="lookup-subject" type="button" class="secondary-button">关联影片</button></div></label><p class="field-help">在豆瓣选择正确的影片，把详情页网址复制回来。</p></section><p id="lookup-notice" class="lookup-notice" role="status">关联影片后，可以核对并补全资料。</p><form id="film-form" hidden><div class="form-section-heading">2 · 核对影片资料</div><div class="form-grid">${field('title','片名 *','text','required maxlength="160"')}${field('year','上映年份','number','min="1888" max="2100" placeholder="可留空"')}${field('en','原名 / 英文名','text','maxlength="200"')}<label class="form-field"><span>内容</span><select name="type"><option>电影</option><option>剧集</option><option>动漫</option><option>纪录片</option></select></label>${field('director','导演 / 主创','text','maxlength="300"')}${field('genre','类型标签','text','maxlength="160" placeholder="例如：剧情 / 悬疑"')}${field('language','语言','text','maxlength="160"')}${field('country','国家 / 地区','text','maxlength="160"')}</div><label class="form-field"><span>简介</span><textarea name="synopsis" maxlength="5000" rows="3" placeholder="可选，填写影片简介"></textarea></label><div class="form-section-heading">3 · 加入片单</div><div class="form-grid"><label class="form-field"><span>状态</span><select name="status" id="new-film-status"><option value="want">想看</option><option value="watched">看过</option></select></label><label class="form-field"><span>添加人</span><select name="by"><option>你</option><option>Jammy</option></select></label><label class="form-field"><span>优先级</span><select name="priority"><option value="">普通</option><option value="高优先级">高</option><option value="低优先级">低</option></select></label>${field('plannedDate','计划观看日期','date')}<label class="form-field watched-field" hidden><span>观看日期 *</span><input name="watchedDate" type="date"></label><label class="form-field watched-field" hidden><span>结束日期（跨日观看可选）</span><input name="endDate" type="date"></label></div><label class="form-field"><span>备注</span><textarea name="note" maxlength="2000" rows="2" placeholder="版本、观看计划等备注"></textarea></label><p id="save-error" class="form-error" role="alert"></p><div class="form-footer"><span>保存到当前浏览器，刷新后保留</span><button class="primary" type="submit">添加到片单</button></div></form>`;
  document.querySelector('#douban-step').innerHTML=`<label class="form-field"><span>搜索片名</span><div class="lookup-line"><input id="douban-keyword" maxlength="100" placeholder="输入片名或原名，搜索后选择版本" aria-label="豆瓣搜索片名"><button id="search-films" type="button" class="secondary-button">搜索</button></div></label><div id="film-candidates" aria-label="候选影片"></div>`;
  mountMetadataSearch(document.querySelector('#film-form'));
  document.querySelector('#add').showModal();
}
function setAddMode(mode){lookupController?.abort();lookupVersion++;addMode=mode;linkedSubject=null;const form=document.querySelector('#film-form');form.reset();form.hidden=mode!=='manual';document.querySelector('#douban-step').hidden=mode==='manual';document.querySelectorAll('[data-add-mode]').forEach(b=>b.classList.toggle('active',b.dataset.addMode===mode));document.querySelector('#lookup-notice').textContent=mode==='manual'?'未找到豆瓣条目时，直接填写影片资料即可。':'关联影片后，可以核对并补全资料。';syncFilmDates();}
function syncFilmDates(){const watched=document.querySelector('#new-film-status').value==='watched';document.querySelectorAll('.watched-field').forEach(f=>f.hidden=!watched);const form=document.querySelector('#film-form');form.elements.watchedDate.required=watched;form.elements.plannedDate.closest('label').hidden=watched;document.querySelector('#save-error').textContent='';}
function subjectId(value){try{const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.hostname!=='movie.douban.com'||u.username||u.password)return null;return u.pathname.match(/^\/subject\/(\d{5,12})\/?$/)?.[1]||null;}catch{return null;}}
async function associateFilm(candidate){
 const id=candidate?.id,notice=document.querySelector('#lookup-notice');
 if(!/^\d{5,12}$/.test(id||''))return;
 lookupController?.abort();lookupController=new AbortController();const requestVersion=++lookupVersion;notice.textContent='正在关联「'+candidate.title+'」…';document.querySelector('#film-form').hidden=true;linkedSubject=null;
 try{
  const response=candidate.metadataReady?{ok:true}:await fetch('/api/douban?id='+id,{signal:lookupController.signal});const data=candidate.metadataReady?candidate:await response.json();if(requestVersion!==lookupVersion)return;
  const canonical='https://movie.douban.com/subject/'+id+'/';
  linkedSubject={id,rating:response.ok?data.rating??null:null,sourceUrl:canonical,ratingNote:data.source==='snapshot'?'保存的豆瓣资料快照，非实时':response.ok?'豆瓣公开页面读取':'链接已关联，资料待补充',checkedAt:data.checkedAt||null};
  const form=document.querySelector('#film-form');form.reset();form.hidden=false;
  const metadata=normalizeFilmMetadata({...candidate,...data});
  selectedNameMetadata=metadata;
  for(const key of ['title','year','en','director','genre','language','country','synopsis','type'])if(form.elements[key]&&metadata[key]!=null)form.elements[key].value=metadata[key];
  if(!form.elements.title.value)form.elements.title.value=document.querySelector('#douban-keyword').value.trim();
  notice.textContent=response.ok?data.notice:'已自动关联「'+candidate.title+'」并带入候选资料。豆瓣详情暂时无法读取，导演等缺失资料可手动补充。';notice.classList.toggle('warning',!response.ok);syncFilmDates();
 }catch(error){if(requestVersion!==lookupVersion||error.name==='AbortError')return;linkedSubject={id,rating:null,sourceUrl:'https://movie.douban.com/subject/'+id+'/',ratingNote:'链接已关联，资料待补充'};const form=document.querySelector('#film-form');form.reset();form.hidden=false;for(const key of ['title','year','en','director','type'])if(candidate[key]!=null)form.elements[key].value=candidate[key];notice.textContent='暂时无法读取详细资料。已关联所选豆瓣影片并带入片名、年份，请补全其余信息。';syncFilmDates();}
}
function saveFilm(event){
 event.preventDefault();const form=event.target,error=document.querySelector('#save-error');error.textContent='';
 if(addMode==='douban'&&!linkedSubject){error.textContent='请先关联豆瓣条目，或切换到手动添加。';return;}
 if(!form.reportValidity())return;const v=Object.fromEntries(new FormData(form));const title=v.title.trim();if(!title){error.textContent='请填写片名。';return;}
 if(linkedSubject&&works.some(w=>doubanSources[w.id]?.id===linkedSubject.id)){error.textContent='这部豆瓣影片已经在片单里，无需重复添加。';return;}
 if(addMode==='manual'&&works.some(w=>w.title===title&&String(w.year||doubanSources[w.id]?.year||'')===v.year)){error.textContent='片单中已有同名同年份作品，请先检查已有记录。';return;}
 if(v.status==='watched'&&v.endDate&&v.endDate<v.watchedDate){error.textContent='结束日期不能早于观看日期。';return;}
 const id=Date.now(),dates=v.status==='watched'?[v.watchedDate,...(v.endDate&&v.endDate!==v.watchedDate?[v.endDate]:[])]:[];
 const work={id,title,en:v.en.trim(),year:v.year?Number(v.year):null,type:v.type,genre:v.genre.trim()||'待补充',art:['city','orange','forest','sea','space'][works.length%5],status:v.status,by:v.by,date:v.status==='watched'?dates.map(d=>d.replaceAll('-','/')).join('、'):v.plannedDate||'待定',watchedDates:dates,plannedDate:v.status==='want'?v.plannedDate:'',priority:v.priority,scores:null,language:v.language.trim(),country:v.country.trim(),director:v.director.trim(),synopsis:v.synopsis.trim(),note:v.note.trim(),source:addMode,addedAt:new Date().toISOString()};
 if(selectedNameMetadata?.en===work.en){work.nameSourceUrl=selectedNameMetadata.nameSourceUrl;work.nameSourceLabel=selectedNameMetadata.nameSourceLabel;}
 const savedRecord={work,douban:linkedSubject?{...linkedSubject}:null};
 try{const additions=readAddedFilms();additions.push(savedRecord);localStorage.setItem('gongying.addedFilms.v1',JSON.stringify(additions));}catch{error.textContent='浏览器存储失败，记录没有保存。请检查存储空间或浏览器设置后重试。';return;}
 works.push(work);if(savedRecord.douban)doubanSources[id]=savedRecord.douban;
 document.querySelector('#add').close();page=work.status==='want'?'want':'watched';filter='全部';search='';year='all';score='all';statusFilter='all';history.replaceState(null,'','#'+page);render();showToast('已添加「'+title+'」，保存在当前浏览器。');
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.addMode)setAddMode(b.dataset.addMode);});
document.addEventListener('change',e=>{if(e.target.id==='new-film-status')syncFilmDates();});
document.addEventListener('submit',e=>{if(e.target.id==='film-form')saveFilm(e);});
document.querySelector('#add').addEventListener('close',()=>{lookupController?.abort();lookupVersion++;});
