const {execFile}=require('node:child_process');
const cache=new Map();
async function publicJson(url,timeout=12000){
 // Windows curl uses the system's network configuration; never invoke a shell.
 if(process.platform==='win32')return new Promise((resolve,reject)=>execFile('curl.exe',['--silent','--show-error','--fail','--max-time',String(Math.ceil(timeout/1000)),url],{windowsHide:true,timeout:timeout+2000,maxBuffer:2000000},(error,out)=>{if(error)return reject(error);try{resolve(JSON.parse(out));}catch(e){reject(e);}}));
 const r=await fetch(url,{signal:AbortSignal.timeout(timeout),redirect:'error',headers:{'User-Agent':'SharedFilmArchive/1.0'}});if(!r.ok)throw Error('source unavailable');const s=await r.text();if(s.length>2000000)throw Error('response too large');return JSON.parse(s);
}
function api(params){return 'https://www.wikidata.org/w/api.php?'+new URLSearchParams({...params,format:'json'});}
function values(e,p){return (e.claims?.[p]||[]).filter(c=>c.rank!=='deprecated').map(c=>c.mainsnak?.datavalue?.value).filter(v=>v!=null);}
function label(e){return e?.labels?.zh?.value||e?.labels?.['zh-cn']?.value||e?.labels?.en?.value||'';}
async function searchMetadata(query,reader=publicJson){
 const q=query.trim();if(!q||q.length>100)return {status:400,body:{error:'请输入 1–100 字的片名。'}};
 if(reader===publicJson&&cache.get(q)?.until>Date.now())return cache.get(q).result;
 try{
  const lang=/[\u3400-\u9fff]/.test(q)?'zh':'en';
  const search=await reader(api({action:'wbsearchentities',search:q,language:lang,uselang:'zh',type:'item',limit:'12'}));
  if(search.error||!Array.isArray(search.search))throw Error('invalid response');
  const ids=search.search.map(x=>x.id).filter(id=>/^Q\d+$/.test(id));
  if(!ids.length)return {status:200,body:{results:[],notice:'未找到匹配资料。可换用原名搜索，或继续手动填写。'}};
  const data=await reader(api({action:'wbgetentities',ids:ids.join('|'),props:'claims|labels|descriptions|sitelinks',languages:'zh|zh-cn|en'}));
  if(!data.entities)throw Error('invalid entities');
  const films=ids.map(id=>data.entities[id]).filter(e=>e&&values(e,'P57').length&&values(e,'P577').length).slice(0,8);
  const related=[...new Set(films.flatMap(e=>['P57','P136','P364','P495'].flatMap(p=>values(e,p).map(v=>v.id))).filter(id=>/^Q\d+$/.test(id)))].slice(0,50);
  const labels=related.length?(await reader(api({action:'wbgetentities',ids:related.join('|'),props:'labels',languages:'zh|zh-cn|en'}))).entities||{}:{};
  const results=films.map(e=>{
   const names=p=>values(e,p).map(v=>label(labels[v.id])).filter(Boolean).join(' / ');
   const original=values(e,'P1476').map(v=>v.text).filter(Boolean).join(' / ')||e.labels?.en?.value||'';
   const dates=values(e,'P577').map(v=>Number(v.time?.match(/^\+(\d{4})-/)?.[1])).filter(y=>y>=1888&&y<=2100);
   const kinds=values(e,'P31').map(v=>v.id),type=kinds.includes('Q5398426')?'剧集':kinds.includes('Q93204')?'纪录片':'电影';
   return {id:e.id,title:label(e),en:original,year:dates.length?Math.min(...dates):null,director:names('P57'),genre:names('P136'),language:names('P364'),country:names('P495'),type,description:e.descriptions?.zh?.value||e.descriptions?.en?.value||'',nameSourceUrl:'https://www.wikidata.org/wiki/'+e.id,nameSourceLabel:'Wikidata · 影视资料'};
  });
  const result={status:200,body:{results,notice:results.length?'请选择正确年份和导演的版本，只补全空白资料。来源：Wikidata（维基百科结构化资料）；不包含豆瓣评分。':'未找到匹配影视条目，可换用原名搜索或手动填写。'}};
  if(reader===publicJson){if(cache.size>=50)cache.delete(cache.keys().next().value);cache.set(q,{until:Date.now()+180000,result});}return result;
 }catch{return {status:502,body:{error:'资料源暂时无法连接，请稍后重试或继续手动填写。这不代表该影片不存在。'}};}
}
module.exports={searchMetadata,publicJson};
