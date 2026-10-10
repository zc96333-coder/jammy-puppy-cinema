// Read public subject metadata only. Never follow security challenge redirects.
const {supplementName}=require('./supplemental-metadata.cjs');
const snapshots = {
  '1291856': { title: '戏梦巴黎', year: 2003, director: '贝纳尔多·贝托鲁奇', genre: '剧情 / 爱情', language: '英语 / 法语', rating: 8.1 },
  '1828115': { title: '色，戒', year: 2007, director: '李安', rating: 8.7 },
  '1308865': { title: '老男孩', year: 2003, director: '朴赞郁' },
  '1291936': { title: '攻壳机动队', year: 1995, director: '押井守', type: '动漫', genre: '动作 / 科幻 / 动画', language: '日语', rating: 9.0 },
  '2037432': { title: '太阳伞', year: 2005, director: '哈斯朝鲁', rating: 9.4 },
  '35073886': { title: '分手的决心', year: 2022, director: '朴赞郁', genre: '剧情 / 悬疑 / 犯罪', language: '韩语 / 汉语普通话', rating: 7.6 },
  '1291818': { title: '饮食男女', year: 1994, director: '李安', rating: 9.2 },
  '6307447': { title: '被解救的姜戈', year: 2012, director: '昆汀·塔伦蒂诺' }
};
// Original titles verified from Douban search candidates / title pages.
Object.assign(snapshots['1291856'],{en:'The Dreamers'});
Object.assign(snapshots['1308865'],{en:'올드보이'});
Object.assign(snapshots['1291936'],{en:'攻殻機動隊'});
Object.assign(snapshots['1291818'],{en:'飲食男女'});
snapshots['1300930']={title:'冰风暴',en:'The Ice Storm',year:1997};
for(const id of Object.keys(snapshots))snapshots[id]=supplementName(id,snapshots[id]);
function decode(value='') {return value.replace(/<[^>]*>/g,' ').replace(/&quot;/g,'"').replace(/&#39;|&#x27;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();}
function parseSubject(html) {
  const block=html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  let data;
  try{data=JSON.parse(block?.[1]||'null');}catch{return null;}
  if(!data||Array.isArray(data)||!['Movie','TVSeries'].includes(data['@type'])||!data.name)return null;
  const match=data.name.match(/^(.*?)\s*\((\d{4})\)\s*$/);
  const info=html.match(/<div[^>]*id=["']info["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]||'';
  const year=Number(match?.[2]||data.datePublished?.slice(0,4))||null;
  const rating=Number(data.aggregateRating?.ratingValue);
  const genre=Array.isArray(data.genre)?data.genre.join(' / '):data.genre||'';
  return {title:decode(match?.[1]||data.name),year,director:(Array.isArray(data.director)?data.director:[data.director]).filter(Boolean).map(d=>decode(d.name)).join(' / '),genre:decode(genre),language:decode(info.match(/语言:<\/span>\s*([^<]+)/)?.[1]||''),type:data['@type']==='TVSeries'?'剧集':genre.includes('动画')?'动漫':'电影',rating:Number.isFinite(rating)&&rating>0&&rating<=10?rating:null,synopsis:decode(data.description||'')};
}
async function lookupSubject(id,fetcher=fetch){
  if(!/^\d{5,12}$/.test(id))return {status:400,body:{error:'请粘贴有效的豆瓣电影条目链接。'}};
  const url='https://movie.douban.com/subject/'+id+'/';
  if(snapshots[id])return {status:200,body:{...snapshots[id],id,url,source:'snapshot',checkedAt:'2026-10-10',notice:'已匹配保存的豆瓣资料快照；请核对片名与版本，评分不是实时值。'}};
  try{
    const response=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(8000),headers:{'Accept':'text/html'}});
    if(!response.ok)return {status:502,body:{id,url,error:'豆瓣暂时不允许读取这个条目。链接可以保留，请根据豆瓣页面补全资料。'}};
    const reader=response.body.getReader();let bytes=0,text='';const decoder=new TextDecoder();
    while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>1500000){await reader.cancel();throw new Error('too large');}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();
    const metadata=parseSubject(text);
    if(!metadata)return {status:502,body:{id,url,error:'未能读取完整的影片资料。请核对豆瓣条目后补充信息。'}};
    return {status:200,body:{...supplementName(id,metadata),id,url,source:'public-page',checkedAt:new Date().toISOString(),notice:'已从豆瓣公开条目读取，请核对信息后保存。'}};
  }catch{return {status:502,body:{id,url,error:'豆瓣读取超时或不可用。链接可以保留，请手动补全资料。'}};}
}
const searchCache=new Map();
async function searchSubjects(query,fetcher=fetch){
 const q=String(query||'').trim();
 if(!q||q.length>100)return {status:400,body:{error:'请输入 1–100 字的片名。',results:[]}};
 const cached=searchCache.get(q);if(fetcher===fetch&&cached&&Date.now()-cached.time<180000)return cached.result;
 const local=Object.entries(snapshots).filter(([,w])=>w.title.replace(/[，,\s]/g,'').includes(q.replace(/[，,\s]/g,''))).map(([id,w])=>({...w,id,source:'snapshot'}));
 let remote=[],blocked=false;
 try{
  const response=await fetcher('https://movie.douban.com/j/subject_suggest?q='+encodeURIComponent(q),{redirect:'manual',signal:AbortSignal.timeout(5000),headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error('blocked');
  const reader=response.body.getReader();let bytes=0,body='';const decoder=new TextDecoder();
  while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.length;if(bytes>300000){await reader.cancel();throw Error('large');}body+=decoder.decode(chunk.value,{stream:true});}body+=decoder.decode();
  const data=JSON.parse(body);if(!Array.isArray(data))throw Error('invalid');
  remote=data.filter(w=>/^\d{5,12}$/.test(String(w.id))&&typeof w.title==='string'&&w.type==='movie').slice(0,8).map(w=>({id:String(w.id),title:w.title,year:/^\d{4}$/.test(String(w.year))?Number(w.year):null,en:typeof w.sub_title==='string'?w.sub_title:'',type:'电影',director:'',source:'suggestion'}));
 }catch{blocked=true;}
 const merged=[...remote,...local].filter((w,i,a)=>a.findIndex(x=>x.id===w.id)===i).slice(0,8);
 // Enrich publicly readable results; unavailable fields remain explicitly unknown.
 const results=await Promise.all(merged.map(async w=>{const detail=await lookupSubject(w.id,fetcher);return detail.status===200?{...w,...detail.body,metadataReady:true}:{...w,metadataReady:false};}));
 const result={status:200,body:{results,limited:blocked,notice:blocked?'豆瓣搜索暂时不可用，仅展示匹配的已保存资料；无匹配不代表豆瓣没有。':results.length?'请选择正确年份与版本；无法读取的导演等资料会标为待补充。':'没有找到候选。可换原名或更短的片名重试，也可手动添加。'}};
 if(fetcher===fetch){if(searchCache.size>=50)searchCache.delete(searchCache.keys().next().value);searchCache.set(q,{time:Date.now(),result});}
 return result;
}
module.exports={lookupSubject,parseSubject,searchSubjects,snapshots};
