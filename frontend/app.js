const works=[
  {
    "id": 1,
    "title": "戏梦巴黎",
    "en": "",
    "year": null,
    "type": "电影",
    "genre": "待补充",
    "art": "city",
    "status": "watched",
    "by": "—",
    "date": "8 月 23 日",
    "watchedDates": [
      "2026-08-23"
    ],
    "scores": null
  },
  {
    "id": 2,
    "title": "色戒",
    "en": "",
    "year": null,
    "type": "电影",
    "genre": "待补充",
    "art": "orange",
    "status": "watched",
    "by": "—",
    "date": "8 月 28 日、8 月 29 日",
    "watchedDates": [
      "2026-08-28",
      "2026-08-29"
    ],
    "scores": null
  },
  {
    "id": 3,
    "title": "冰风暴",
    "en": "",
    "year": null,
    "type": "电影",
    "genre": "待补充",
    "art": "forest",
    "status": "watched",
    "by": "—",
    "date": "8 月 26 日",
    "watchedDates": [
      "2026-08-26"
    ],
    "scores": null
  },
  {
    "id": 4,
    "title": "太阳伞",
    "en": "",
    "year": null,
    "type": "电影",
    "genre": "待补充",
    "art": "sea",
    "status": "watched",
    "by": "—",
    "date": "9 月 15 日",
    "watchedDates": [
      "2026-09-15"
    ],
    "scores": null
  },
  {
    "id": 5,
    "title": "老男孩",
    "en": "",
    "year": null,
    "type": "电影",
    "genre": "待补充",
    "art": "space",
    "status": "watched",
    "by": "—",
    "date": "9 月 26 日",
    "watchedDates": [
      "2026-09-26"
    ],
    "scores": null
  },
  {
    "id": 6,
    "title": "攻壳机动队",
    "en": "",
    "year": null,
    "type": "电影",
    "genre": "待补充",
    "art": "city",
    "status": "watched",
    "by": "—",
    "date": "10 月 3 日",
    "watchedDates": [
      "2026-10-03"
    ],
    "scores": null
  },
  {
    "id": 7,
    "title": "登堂入室",
    "en": "",
    "year": null,
    "type": "电影",
    "genre": "待补充",
    "art": "orange",
    "status": "watched",
    "by": "—",
    "date": "10 月 5 日",
    "watchedDates": [
      "2026-10-05"
    ],
    "scores": null
  },
  {
    "id": 8,
    "title": "分手的决心",
    "en": "",
    "year": null,
    "type": "电影",
    "genre": "待补充",
    "art": "forest",
    "status": "watched",
    "by": "—",
    "date": "10 月 5 日",
    "watchedDates": [
      "2026-10-05"
    ],
    "scores": null
  },
  {
    "id": 9,
    "title": "饮食男女",
    "en": "",
    "year": null,
    "type": "电影",
    "genre": "待补充",
    "art": "sea",
    "status": "watched",
    "by": "—",
    "date": "10 月 7 日、10 月 8 日",
    "watchedDates": [
      "2026-10-07",
      "2026-10-08"
    ],
    "scores": null
  },
  {
    "id": 10,
    "title": "被解决的姜戈",
    "en": "",
    "year": null,
    "type": "电影",
    "genre": "待补充",
    "art": "space",
    "status": "watched",
    "by": "—",
    "date": "10 月 9 日",
    "watchedDates": [
      "2026-10-09"
    ],
    "scores": null
  }
];
let page='home',filter='全部',search='',year='all',score='all',view='table',statusFilter='all',sort='default';


const doubanSources={
 3:{id:'1300930',rating:null,year:1997,ratingNote:'豆瓣搜索候选已核对，评分待获取'},
 2:{id:'1828115',rating:8.7,sourceUrl:'https://movie.douban.com/top250?start=-125',ratingNote:'豆瓣榜单索引快照，非实时',year:2007},
 5:{id:'1308865',rating:null,ratingNote:'已确认 2003 年韩国版，评分待获取',year:2003},
 6:{id:'1291936',rating:9.0,sourceUrl:'https://movie.douban.com/top250?start=231',ratingNote:'豆瓣榜单索引快照，非实时',year:1995},
 1:{id:'1291856',rating:8.1,sourceUrl:'https://movie.douban.com/subject/1291856/?dt_dapp=1',ratingNote:'公开页面索引快照，非实时',year:2003},
 4:{id:'2037432',rating:9.4,sourceUrl:'https://movie.douban.com/celebrity/1275318/movies',ratingNote:'公开导演作品页快照，非实时',year:2005},
 8:{id:'35073886',rating:7.6,sourceUrl:'https://movie.douban.com/subject/35073886/',ratingNote:'公开页面索引快照，非实时',year:2022},
 9:{id:'1291818',rating:9.2,sourceUrl:'https://www.douban.com/doulist/123435310/',ratingNote:'公开片单索引快照，非实时'},
 10:{id:'6307447',rating:null,ratingNote:'条目已核对，评分待获取'}
};

function esc(value){return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
function readAddedFilms(){const records=JSON.parse(localStorage.getItem('gongying.addedFilms.v1')||'[]');if(!Array.isArray(records))throw new Error('Invalid saved films');return records;}
function loadAddedFilms(){try{for(const record of readAddedFilms()){const w=record?.work;if(!w||!Number.isSafeInteger(w.id)||w.id<=10||typeof w.title!=='string'||!['want','watched'].includes(w.status)||!Array.isArray(w.watchedDates)||works.some(existing=>existing.id===w.id))continue;works.push({...w,en:w.en||'',genre:w.genre||'待补充',art:['city','orange','forest','sea','space'].includes(w.art)?w.art:'city'});if(record.douban&&/^\d{5,12}$/.test(record.douban.id)){doubanSources[w.id]={...record.douban,rating:typeof record.douban.rating==='number'&&record.douban.rating>=0&&record.douban.rating<=10?record.douban.rating:null,sourceUrl:'https://movie.douban.com/subject/'+record.douban.id+'/'};}}}catch{showToast('无法读取浏览器中的新增片单，原始数据未被修改。');}}

function doubanUrl(w){const d=doubanSources[w.id];return d?.id?'https://movie.douban.com/subject/'+d.id+'/':'https://search.douban.com/movie/subject_search?search_text='+encodeURIComponent(w.id===10?'被解救的姜戈':w.title)+'&cat=1002';}
function doubanCell(w){const d=doubanSources[w.id];if(w.source==='manual')return '<span class="blank">未关联</span>';return `<a class="douban-link" href="${doubanUrl(w)}" target="_blank" rel="noopener noreferrer" title="${esc(d?.ratingNote||'尚未确定具体条目，请先核对影片版本')}">${d?.rating!=null?d.rating.toFixed(1)+' ↗':d?.id?'查看豆瓣 ↗':'待关联 ↗'}</a>`;}
function doubanDetail(w){const d=doubanSources[w.id];if(w.source==='manual')return '<p class="demo-note">手动添加 · 未关联豆瓣条目</p>';return `<div class="douban-detail"><a href="${doubanUrl(w)}" target="_blank" rel="noopener noreferrer">豆瓣 · ${d?.rating!=null?d.rating.toFixed(1)+' 分':d?.id?'打开影片条目':'搜索并核对条目'} ↗</a><p>${esc(d?.ratingNote||'同名作品或条目尚未核实，暂不展示评分。')}${d?.rating!=null?' · '+esc(d.checkedAt?.slice(0,10)||'2026-10-10'):''}</p>${d?.sourceUrl?`<a class="rating-source" href="${d.sourceUrl}" target="_blank" rel="noopener noreferrer">评分来源 ↗</a>`:''}${w.id===10?'<p>豆瓣片名：被解救的姜戈（保留你原先录入的片名）。</p>':''}</div>`;}

let rowSelectionMode=false,selectedRows=new Set();
const columnDefinitions=[
 ['title','片名','Aa',290],['media','内容','◉',75],['genre','类型','☷',86],['status','状态','◉',76],['language','语言','◉',74],['myScore','puppy的评分','＃',105],['jammyScore','Jammy 评分','＃',105],['douban','豆瓣评分','豆',105],['year','上映年份','＃',94],['watched','观看日期','▣',190],['comment','短评 / 感受','☷',190],['priority','优先级','⚑',83],['author','添加人','♙',85],['planned','计划观看','▣',108],['cover','封面','↗',60]
];
let hiddenColumns=new Set(['media','language']);
try{const saved=JSON.parse(localStorage.getItem('gongying.hiddenColumns'));if(Array.isArray(saved))hiddenColumns=new Set(saved.filter(key=>key!=='title'&&columnDefinitions.some(c=>c[0]===key)));}catch{}
function columnMenu(){return `<details class="column-menu"><summary>☷ 显示列</summary><div class="column-options"><p>表格展示属性</p>${columnDefinitions.map(([key,label])=>`<label><input type="checkbox" aria-label="${label}" data-column="${key}" ${hiddenColumns.has(key)?'':'checked'} ${key==='title'?'disabled':''}><span>${label}</span>${key==='title'?'<small>固定</small>':''}</label>`).join('')}<span class="column-tip">仅改变展示，记录内容会保留</span></div></details>`;}

const main=document.querySelector('#main');
const artwork=w=>`<div class="art ${w.art}">${w.priority?`<span class="priority">↗ ${w.priority}</span>`:''}<div class="art-text">${esc(w.en)}<small>${esc(w.title)}</small></div></div>`;
function card(w){return `<button class="movie" data-work="${w.id}" aria-label="查看${esc(w.title)}">${artwork(w)}<div class="movie-body"><h3>${esc(w.title)}</h3><div class="movie-meta">${w.year??'—'}<span>·</span>${esc(w.type)}<span>·</span>${esc(w.genre)}</div><div class="movie-bottom">${w.status==='want'?`<span>${esc(w.by)} 添加</span><span class="tag">想看</span>`:w.locked?'<span>10 月 8 日看过</span><span class="tag">等待揭晓 ◇</span>':`<span>${esc(w.date)}看过</span><span class="scores"><span class="you">Y ${(w.scores?.[0]?.toFixed(1)??'—')}</span><span class="other">J ${(w.scores?.[1]?.toFixed(1)??'—')}</span></span>`}</div></div></button>`}
function metrics(){const watched=works.filter(w=>w.status==='watched'),days=new Set(watched.flatMap(w=>w.watchedDates)),ratings=watched.flatMap(w=>w.locked?[w.scores?.[0]]:w.scores||[]).filter(Number.isFinite);return `<div class="metrics"><div class="metric"><div class="metric-label">已看</div><div class="metric-value">${watched.length}<span>部作品</span></div></div><div class="metric"><div class="metric-label">想看</div><div class="metric-value">${works.filter(w=>w.status==='want').length}<span>部作品</span></div></div><div class="metric"><div class="metric-label">观看日期</div><div class="metric-value">${days.size}<span>天</span></div></div><div class="metric"><div class="metric-label">平均个人评分</div><div class="metric-value">${ratings.length?(ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(1):'—'}<span>${ratings.length?ratings.length+' 个已填写评分':'尚未评分'}</span></div></div></div>`}
function toolbar(){return `<div class="database-tools"><div class="view-tabs" role="group" aria-label="数据库视图">${[['table','▦','表格'],['board','▥','看板'],['gallery','⊞','画廊'],['timeline','▤','时间线']].map(([v,i,t])=>`<button data-view="${v}" class="${view===v?'active':''}" aria-pressed="${view===v}"><span>${i}</span> ${t}查看</button>`).join('')}</div><div class="table-actions">${view==='table'?columnMenu():''}<label class="search">⌕ <input id="list-search" placeholder="搜索片名" value="${search.replaceAll('&','&amp;').replaceAll('"','&quot;')}" aria-label="搜索清单"></label><select id="sort" aria-label="排序"><option value="default">排序</option><option value="year" ${sort==='year'?'selected':''}>上映年份 ↓</option><option value="title" ${sort==='title'?'selected':''}>片名 A–Z</option></select><button class="primary" data-add>＋ 新建</button></div></div><div class="database-filters"><span class="filter-label">筛选</span><select id="status-filter" aria-label="状态筛选"><option value="all">全部状态</option><option value="want" ${statusFilter==='want'?'selected':''}>想看</option><option value="watched" ${statusFilter==='watched'?'selected':''}>看过</option></select><select id="type-filter" aria-label="内容类型">${['全部','电影','剧集','动漫','纪录片'].map(t=>`<option value="${t}" ${filter===t?'selected':''}>${t==='全部'?'全部内容':t}</option>`).join('')}</select><select id="year" aria-label="上映年份"><option value="all">全部年份</option><option value="2010" ${year==='2010'?'selected':''}>2010 年后</option><option value="older" ${year==='older'?'selected':''}>2010 年前</option></select><span class="database-hint">点击片名查看详情与观后感</span></div>`}
function filtered(){return works.filter(w=>(page==='home'||w.status===(page==='want'?'want':'watched'))&&(filter==='全部'||w.type===filter)&&(!search||w.title.toLowerCase().includes(search.toLowerCase())||w.en.toLowerCase().includes(search.toLowerCase()))&&(year==='all'||(year==='2010'?w.year>=2010:w.year!==null&&w.year<2010))&&(page!=='watched'||score==='all'||(score==='pending'?w.locked:!w.locked&&w.scores?.every(s=>s>=9))))}
function updateCards(){const grid=document.querySelector('#movies');if(!grid)return;let list=filtered().filter(w=>statusFilter==='all'||w.status===statusFilter);if(sort==='year')list.sort((a,b)=>b.year-a.year);if(sort==='title')list.sort((a,b)=>a.title.localeCompare(b.title,'zh-CN'));grid.className=view==='gallery'?'grid gallery-view':view==='board'?'board-view':'table-view';grid.innerHTML=view==='timeline'?timelineView(list):view==='table'?tableView(list):view==='gallery'?(list.length?list.map(card).join(''):'<p class="empty">没有匹配的作品</p>'):boardView(list);const count=document.querySelector('#record-count');if(count)count.textContent='计数 '+list.length;}
function legacyRender(){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));main.innerHTML=`<div class="page-top"><div><span class="eyebrow">YEAR IN REVIEW · 2026</span><h1>2026 观影报告</h1><p>依据已录入的观看日期统计。</p></div></div>${metrics()}<div class="stats-grid"><section class="panel"><h3>每月观看作品</h3><p>同一作品在同月仅计一次。</p><div class="bars">${Array.from({length:12},(_,i)=>works.filter(w=>w.status==='watched'&&w.watchedDates.some(d=>d.startsWith('2026-'+String(i+1).padStart(2,'0')))).length).map((count,i)=>`<div class="bar-col"><span>${count} 部</span><i style="height:${count*24}px"></i>${i+1}月</div>`).join('')}</div></section><section class="panel"><h3>记录概况</h3><div class="stat-line"><span>首次记录</span><strong>2026/08/23</strong></div><div class="stat-line"><span>最近观看</span><strong>2026/10/09</strong></div><div class="stat-line"><span>多日观看作品</span><strong>色戒、饮食男女</strong></div><div class="stat-line"><span>评分与观后感</span><strong>待填写</strong></div></section></div><div class="section-heading"><h2>年度已看作品</h2></div><div class="grid archive">${works.filter(w=>w.status==='watched').map(card).join('')}</div>`;}

const languages={};
const comments={};

function tableView(list){
 const visible=new Set(list.map(w=>w.id));selectedRows=new Set([...selectedRows].filter(id=>visible.has(id)));
 const columns=[...(rowSelectionMode?[['actions','选择','',48]]:[]),...columnDefinitions.filter(([key])=>!hiddenColumns.has(key))];
 const blank='<span class="blank">—</span>';
 function cells(w){return {
 actions:`<input type="checkbox" class="row-checkbox" data-select-row="${w.id}" aria-label="选择${esc(w.title)}" ${selectedRows.has(w.id)?'checked':''}>`,
 title:`<button class="title-cell" data-work="${w.id}"><span class="doc-icon">▱</span><strong>${esc(w.title)}</strong><span class="original-title">${esc(w.en)}</span><span class="open-arrow">↗</span></button>`,
 media:`<span class="notion-tag media-${esc(w.type)}">${esc(w.type)}</span>`,
 genre:`<span class="notion-tag genre-${esc(w.genre)}">${esc(w.genre)}</span>`,
 status:`<span class="notion-tag ${w.status==='want'?'status-want':'status-watched'}">${w.status==='want'?'想看':'看过'}</span>`,
 language:`<span class="notion-tag language">${esc(w.language||languages[w.id]||'—')}</span>`,
 myScore:w.scores?.[0]?.toFixed(1)??blank,
 jammyScore:w.locked?'<span class="locked-value">◇ 未揭晓</span>':w.scores?.[1]?.toFixed(1)??blank,
 douban:doubanCell(w),
 year:w.yearCleared?blank:w.year??doubanSources[w.id]?.year??blank,
 watched:w.status==='watched'?w.watchedDates.map(d=>d.replaceAll('-','/')).join('、'):blank,
 comment:w.locked?`<button data-work="${w.id}" class="pending-review">◇ 等待双方提交</button>`:esc(w.note||comments[w.id]||''),
 priority:w.priority?`<span class="notion-tag priority-high">${w.priority==='低优先级'?'低':'高'}</span>`:blank,
 author:esc(w.by),
 planned:w.status==='want'?esc(w.date):blank,
 cover:`<button class="cover-cell art ${w.art}" data-work="${w.id}" aria-label="查看${esc(w.title)}封面"></button>`
 };}
 return `${rowSelectionToolbar(list)}<div class="table-scroll"><table class="film-table" style="min-width:${columns.reduce((sum,c)=>sum+c[3],0)}px"><thead><tr>${columns.map(([key,label,icon,width])=>`<th scope="col" data-column-key="${key}" style="width:${width}px">${key==='actions'?`<input type="checkbox" class="row-checkbox" data-select-all aria-label="全选当前结果" ${list.length&&selectedRows.size===list.length?'checked':''} ${list.length?'':'disabled'}>`:`<span>${icon}</span> ${label}`}</th>`).join('')}</tr></thead><tbody>${list.map(w=>{const values=cells(w);return `<tr class="${selectedRows.has(w.id)?'selected-film-row':''}">${columns.map(([key])=>`<td data-column-key="${key}" class="${['myScore','jammyScore','year'].includes(key)?'numeric':['watched','planned'].includes(key)?'date-cell':key==='comment'?'comment-cell':key==='author'?'author-cell':''}">${tableEditableCell(w,key,values[key])}</td>`).join('')}</tr>`;}).join('')}${list.length?'':`<tr><td colspan="${columns.length}" class="empty">没有匹配的作品，请调整筛选条件。</td></tr>`}</tbody></table><div class="row-footer"><button class="new-row" data-add>＋ 新建作品</button><button class="trash-link" data-trash>回收站</button></div></div>`;
}
function rowSelectionToolbar(list){return `<div class="row-selection-toolbar"><div class="selection-delete-group"><button data-selection="${rowSelectionMode?'exit':'enter'}">${rowSelectionMode?'退出选择':'☑ 选择'}</button><button data-bulk-delete class="bulk-delete" ${rowSelectionMode&&selectedRows.size?'':'disabled'}>批量删除 (${rowSelectionMode?selectedRows.size:0})</button></div>${rowSelectionMode?`<button data-selection="all" ${list.length?'':'disabled'}>全选</button><button data-selection="invert" ${list.length?'':'disabled'}>反选</button><button data-selection="clear" ${selectedRows.size?'':'disabled'}>清空选择</button><span>已选 ${selectedRows.size} / ${list.length} 部（当前结果）</span>`:'<span>勾选作品后可批量删除</span>'}</div>`;}
function tableEditableCell(w,key,content){const label=columnDefinitions.find(c=>c[0]===key)?.[1];const button=`data-edit="${key}" data-edit-id="${w.id}" aria-label="编辑${esc(w.title)}的${label}"`;if(key==='title')return `<div class="editable-title">${content}<button ${button} class="rename-cell" title="修改片名">✎</button></div>`;if(['media','genre','status','language','myScore','jammyScore','year','watched','comment','priority','author','planned'].includes(key)&&!(w.locked&&['jammyScore','comment'].includes(key)))return `<button class="editable-cell" ${button} title="点击编辑">${content||'<span class="blank">—</span>'}</button>`;return content;}

function boardView(list){return ['want','watched'].map(s=>`<section class="board-column"><div class="board-heading"><span class="notion-tag ${s==='want'?'status-want':'status-watched'}">${s==='want'?'想看':'看过'}</span><span>${list.filter(w=>w.status===s).length}</span></div>${list.filter(w=>w.status===s).map(w=>`<button class="board-card" data-work="${w.id}"><strong>▱ ${esc(w.title)}</strong><p>${w.year??'—'} · ${esc(w.type)} · ${esc(w.genre)}</p><span class="notion-tag language">${w.locked?'待揭晓':w.scores?'你 '+(w.scores?.[0]?.toFixed(1)??'—')+' / Jammy '+(w.scores?.[1]?.toFixed(1)??'—'):w.by+' 添加'}</span></button>`).join('')}<button class="new-row" data-add>＋ 新建</button></section>`).join('');}
function render(){if(page==='stats'){legacyRender();return;}document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));main.innerHTML=`<section class="database-page"><div class="database-title"><div class="page-icon">▣</div><div><h1>${page==='home'?'观影片单':page==='want'?'想看清单':'观影档案'}</h1><p>电影、剧集与动漫 · 共享记录，独立评分</p></div></div>${toolbar()}<div id="movies"></div><div class="database-summary"><span id="record-count"></span><span>评分满分 10 分 · 精确到 0.1</span></div><div class="extensions"><button data-page="watched"><span>◇</span> 观后感记录 <span class="extension-count">待填写</span><span>↗</span></button><button data-page="stats"><span>▥</span> 2026 年度统计与回顾 <span>↗</span></button></div><p class="workspace-note">新增记录保存在当前浏览器。豆瓣评分显示来源快照，未读取到的资料可手动补充。封面为占位插画。</p></section>`;updateCards();}


const dayMs=86400000;
const clientToday=new Date('2026-10-10T00:00:00Z');
let timelineScale='week',timelineAnchor=new Date(clientToday);
function timelineRange(w){const dates=w.status==='watched'?w.watchedDates:w.plannedDate?[w.plannedDate]:[];return dates?.length?{start:dates[0],end:dates[dates.length-1],planned:w.status==='want'}:null;}
function timelineWindow(){const start=new Date(timelineAnchor);if(timelineScale==='month'){start.setUTCDate(1);return {start,days:new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,0)).getUTCDate()};}const dow=(start.getUTCDay()+6)%7;start.setUTCDate(start.getUTCDate()-dow);return {start,days:7};}
function timelineView(list){
 const {start,days}=timelineWindow(),end=new Date(start.getTime()+(days-1)*dayMs);
 const dateLabel=d=>`${d.getUTCMonth()+1}/${d.getUTCDate()}`;
 const title=timelineScale==='month'?`${start.getUTCFullYear()}年${start.getUTCMonth()+1}月`:`${start.getUTCFullYear()}年 ${dateLabel(start)} — ${dateLabel(end)}`;
 const dayHeaders=Array.from({length:days},(_,i)=>{const d=new Date(start.getTime()+i*dayMs);return `<div class="timeline-day ${[0,6].includes(d.getUTCDay())?'weekend':''} ${d.getTime()===clientToday.getTime()?'today':''}"><small>${['日','一','二','三','四','五','六'][d.getUTCDay()]}</small><span>${d.getUTCDate()}</span></div>`;}).join('');
 let visible=0;
 const rows=list.map(w=>{const range=timelineRange(w);let bar='';
 if(range){const a=new Date(range.start+'T00:00:00Z'),b=new Date(range.end+'T00:00:00Z');if(b>=start&&a<=end){visible++;const left=Math.max(0,(a-start)/dayMs),right=Math.min(days,(b-start)/dayMs+1);const single=a.getTime()===b.getTime();bar=`<button class="timeline-bar ${range.planned?'planned':'completed'} ${single?'single':''}" style="left:calc(${left}/${days} * 100% + 3px);width:calc(${right-left}/${days} * 100% - 6px)" data-work="${w.id}" aria-label="${esc(w.title)}，${range.planned?'计划':'观看'} ${range.start}${single?'':' 至 '+range.end}" title="${esc(w.title)} · ${dateLabel(a)}${single?'':'—'+dateLabel(b)} · ${range.planned?'计划观看':'已看'}"><span>${single?'●':w.title}</span>${single?'':`<small>${range.planned?'计划':'已看'}</small>`}</button>`;}
 else bar=`<span class="timeline-outside">${dateLabel(a)}${a<start?' ← 在此之前':' → 在此之后'}</span>`;
 }else bar='<span class="timeline-unscheduled">尚未安排日期</span>';
 return `<div class="timeline-row"><div class="timeline-item"><button data-work="${w.id}">▱ <strong>${esc(w.title)}</strong></button><span class="notion-tag ${w.status==='want'?'status-want':'status-watched'}">${w.status==='want'?'想看':'看过'}</span></div><div class="timeline-track" style="--days:${days}">${bar}</div></div>`;
 }).join('');
 return `<div class="timeline-controls"><strong>${title}</strong><div><select id="timeline-scale" aria-label="时间线跨度"><option value="week" ${timelineScale==='week'?'selected':''}>周视图</option><option value="month" ${timelineScale==='month'?'selected':''}>月视图</option></select><button data-timeline="prev" aria-label="上一个时间段">‹</button><button data-timeline="today">今天</button><button data-timeline="next" aria-label="下一个时间段">›</button></div></div><div class="timeline-scroll"><div class="timeline-canvas" style="--days:${days};--track-width:${timelineScale==='week'?560:days*38}px"><div class="timeline-header"><div class="timeline-item timeline-column-title"><span>Aa &nbsp; 片名</span><span>◉ 状态</span></div><div class="timeline-dates">${dayHeaders}</div></div>${rows||'<p class="empty">没有匹配的作品</p>'}</div></div><div class="timeline-legend"><span><i class="legend-completed"></i> 已看</span><span><i class="legend-planned"></i> 计划观看</span><span>● 单日观看 · 长条为连续观看区间</span><span>当前时间段 ${visible} 部</span></div><p class="timeline-note">电影按观看当天记录；剧集可记录开始与结束日期。日期按实际观看记录展示，多日观看保留开始与结束日期。</p>`;
}

function navigate(p){page=p;filter='全部';search='';year='all';score='all';statusFilter='all';history.replaceState(null,'','#'+p);render();window.scrollTo({top:0,behavior:'smooth'})}
function openWork(id){const w=works.find(w=>w.id===Number(id));document.querySelector('#detail-content').innerHTML=`<div class="detail-art art ${w.art}"><div class="art-text">${esc(w.en)}<small>${esc(w.title)}</small></div></div><div class="dialog-body"><span class="eyebrow">${w.status==='want'?'WATCHLIST':'VIEWING RECORD'}</span><h2>${esc(w.title)}</h2><div class="detail-meta">${w.year??'—'} · ${esc(w.type)} · ${esc(w.genre)} &nbsp; / &nbsp; ${esc(w.by)} 添加</div>${doubanDetail(w)}${w.director||w.country||w.synopsis||w.note?`<div class="work-information">${w.director?`<p><span>导演 / 主创</span>${esc(w.director)}</p>`:''}${w.country?`<p><span>国家 / 地区</span>${esc(w.country)}</p>`:''}${w.synopsis?`<p><span>简介</span>${esc(w.synopsis)}</p>`:''}${w.note?`<p><span>备注</span>${esc(w.note)}</p>`:''}</div>`:''}${w.status==='want'?`<div class="review-box"><p>观看计划</p><h3>${esc(w.date)}</h3><p>${w.priority||'普通优先级'} · 待看作品</p></div><div style="margin-top:24px"><button class="primary" data-demo="标记已看将在下一阶段接入真实记录。">✓ 标记为已看</button></div>`:`<p class="muted">${esc(w.date)}已看 · ${w.locked?'双方写完后，同时揭晓':'双方评分与观后感'}</p><div class="review-pair"><div class="review-box"><span class="avatar me">P</span> puppy<div class="score">${(w.scores?.[0]?.toFixed(1)??'—')} <small>/ 10</small></div><p>${w.locked?'puppy已提交，等待双方一起揭晓。':'尚未填写观后感。'}</p></div><div class="review-box ${w.locked?'locked':''}"><span class="avatar jammy">J</span> Jammy<div class="score">${w.locked?'◇':(w.scores?.[1]?.toFixed(1)??'—')} ${w.locked?'':'<small>/ 10</small>'}</div><p>${w.locked?'尚未提交，双方完成后展示评分和内容。':'尚未填写观后感。'}</p></div></div><button class="primary" data-demo="评分和观后感编辑将在下一阶段接入。">✎ 写下我的感受</button>`}<p class="demo-note">观看日期已录入。影片资料待补充，封面为占位插画。</p></div>`;document.querySelector('#detail').showModal()}
function showToast(t){document.querySelector('#toast').textContent=t;document.querySelector('#toast').classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>document.querySelector('#toast').classList.remove('show'),3000)}
function addResults(q=''){document.querySelector('#search-results').innerHTML=works.filter(w=>!q||w.title.includes(q)||w.en.toLowerCase().includes(q.toLowerCase())).slice(0,4).map(w=>`<div class="result"><div class="art ${w.art} mini-art"></div><div><strong>${esc(w.title)}</strong><small>${w.year??'—'} · ${esc(w.type)}</small></div><button class="pill" data-demo="已展示添加入口，真实片单保存将在下一阶段接入。">＋ 想看</button></div>`).join('')||'<p class="muted">示例库中没有找到这部影片。</p>'}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.timeline){const action=b.dataset.timeline;if(action==='today')timelineAnchor=new Date(clientToday);else if(timelineScale==='month'){timelineAnchor.setUTCDate(1);timelineAnchor.setUTCMonth(timelineAnchor.getUTCMonth()+(action==='next'?1:-1));}else timelineAnchor.setUTCDate(timelineAnchor.getUTCDate()+(action==='next'?7:-7));updateCards()}if(b.dataset.view){view=b.dataset.view;render()}if(b.dataset.page)navigate(b.dataset.page);if(b.dataset.filter){filter=b.dataset.filter;render()}if(b.dataset.work)openWork(b.dataset.work);if(b.hasAttribute('data-add')){openAdd()}if(b.classList.contains('close'))b.closest('dialog').close();if(b.dataset.demo)showToast(b.dataset.demo)});
document.addEventListener('click',e=>{const menu=document.querySelector('.column-menu');if(menu&&!menu.contains(e.target))menu.open=false;});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const menu=document.querySelector('.column-menu');if(menu)menu.open=false;}});
document.addEventListener('input',e=>{if(e.target.id==='list-search'){search=e.target.value;updateCards()}});
document.addEventListener('change',e=>{if(e.target.dataset.column){const key=e.target.dataset.column;if(key==='title')return;if(e.target.checked)hiddenColumns.delete(key);else hiddenColumns.add(key);try{localStorage.setItem('gongying.hiddenColumns',JSON.stringify([...hiddenColumns]));}catch{}updateCards()}if(e.target.id==='timeline-scale'){timelineScale=e.target.value;updateCards()}if(e.target.id==='sort'){sort=e.target.value;updateCards()}if(e.target.id==='status-filter'){statusFilter=e.target.value;updateCards()}if(e.target.id==='type-filter'){filter=e.target.value;updateCards()}if(e.target.id==='year'){year=e.target.value;updateCards()}if(e.target.id==='score'){score=e.target.value;updateCards()}});
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}}));
document.querySelectorAll('a[href="#home"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();navigate('home')}));
loadAddedFilms();
page=['home','want','watched','stats'].includes(location.hash.slice(1))?location.hash.slice(1):'home';render();
