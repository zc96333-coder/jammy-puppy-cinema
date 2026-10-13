const {publicJson}=require('./metadata-lookup.cjs');
const {execFile}=require('node:child_process');
const cache=new Map();
function validImage(url){try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(u.hostname==='upload.wikimedia.org'||u.hostname==='media.themoviedb.org'||u.hostname==='image.tmdb.org'||/^img\d{0,2}\.doubanio\.com$/.test(u.hostname))&&/\.(jpg|jpeg|png|webp)$/i.test(u.pathname);}catch{return false;}}
async function publicHtml(url){
 if(process.platform==='win32')return new Promise((resolve,reject)=>execFile('curl.exe',['--silent','--show-error','--fail','--max-time','12',url],{windowsHide:true,timeout:14000,maxBuffer:2000000},(error,out)=>error?reject(error):resolve(out)));
 const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('source unavailable');const text=await r.text();if(text.length>2000000)throw Error('large response');return text;
}
function parseTmdbPosters(html){
 const items=[],decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/<[^>]*>/g,' ').trim();
 for(const m of html.matchAll(/<a\b([^>]+)>((?:(?!<\/a>)[\s\S])*?)<\/a>/g)){
  const path=m[1].match(/href="(\/(movie|tv)\/\d+[^"]*)"/)?.[1],image=m[2].match(/<img\b[^>]+>/)?.[0];if(!path||!image)continue;
  const urls=[...image.matchAll(/https:\/\/(?:media\.themoviedb\.org|image\.tmdb\.org)\/t\/p\/[^"\s,]+/g)].map(x=>x[0]);const url=urls.filter(validImage).at(-2)||urls.filter(validImage)[0];if(!url)continue;
  const label=decode(image.match(/alt="([^"]*)"/)?.[1]||''),after=html.slice(m.index+m[0].length,m.index+m[0].length+1800),year=after.match(/class="release_date[^"]*"[^>]*>([^<]*)/)?.[1]?.match(/\d{4}/)?.[0]||'';
  items.push({url,sourceUrl:'https://www.themoviedb.org'+path,label:label+(year?' · '+year:''),description:m[1].includes('data-media-type="tv"')?'剧集版本':'电影版本',source:'TMDB'});
 }return [...new Map(items.map(p=>[p.url,p])).values()].slice(0,10);
}
async function searchPosters(query,reader=publicJson,textReader=reader===publicJson?publicHtml:null){
 const q=String(query||'').trim();if(!q||q.length>100)return {status:400,body:{error:'请输入 1–100 字的电影名。'}};
 if(reader===publicJson&&cache.get(q)?.until>Date.now())return cache.get(q).result;
 const sources=['zh','en'];const requests=sources.map(async lang=>{
  const url='https://'+lang+'.wikipedia.org/w/api.php?'+new URLSearchParams({action:'query',generator:'search',gsrsearch:q,gsrnamespace:'0',gsrlimit:'6',prop:'pageimages|extracts|info',piprop:'thumbnail|original',pithumbsize:'640',pilicense:'any',exintro:'1',explaintext:'1',exchars:'180',inprop:'url',format:'json',formatversion:'2'});
  const body=reader===publicJson?await publicJson(url,5000):await reader(url);if(body.error)throw Error('source unavailable');
  return (body.query?.pages||[]).filter(p=>validImage(p.thumbnail?.source||p.original?.source)).map(p=>({url:p.thumbnail?.source||p.original.source,sourceUrl:p.fullurl||'https://'+lang+'.wikipedia.org/wiki/'+encodeURIComponent(p.title),label:p.title,description:String(p.extract||'').slice(0,180),source:lang==='zh'?'中文维基百科':'英文维基百科'}));
 });
 requests.push((async()=>{const rows=await reader('https://movie.douban.com/j/subject_suggest?q='+encodeURIComponent(q));if(!Array.isArray(rows))throw Error('source unavailable');return rows.filter(p=>p.type==='movie'&&/^\d{5,12}$/.test(String(p.id))&&validImage(p.img)).map(p=>({url:p.img,sourceUrl:'https://movie.douban.com/subject/'+p.id+'/',label:p.title+(p.year?' · '+p.year:''),description:p.sub_title||'',source:'豆瓣公开海报'}));})());
 if(textReader)requests.push((async()=>parseTmdbPosters(await textReader('https://www.themoviedb.org/search?query='+encodeURIComponent(q))).filter(p=>p.label.toLowerCase().includes(q.toLowerCase())))());
 const attempts=await Promise.allSettled(requests);
 if(attempts.every(a=>a.status==='rejected'))return {status:502,body:{error:'海报来源暂时无法连接，请稍后重试。'}};
 const results=[...new Map(attempts.flatMap(a=>a.status==='fulfilled'?a.value:[]).map(p=>[p.url,p])).values()].slice(0,12);
 const result={status:200,body:{results,notice:'请核对片名与版本后选择。海报在线引用，版权属于原权利人；来源连接或图片可能受网络限制。'+(attempts.some(a=>a.status==='rejected')?' 部分来源暂时不可用。':'')}};
 if(reader===publicJson){if(cache.size>=50)cache.delete(cache.keys().next().value);cache.set(q,{until:Date.now()+300000,result});}return result;
}
module.exports={searchPosters,validImage,parseTmdbPosters};
