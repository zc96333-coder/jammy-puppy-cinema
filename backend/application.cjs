const {randomBytes,scryptSync,timingSafeEqual,createHash}=require('node:crypto');
const {createService}=require('./service.cjs');
const people=['puppy','jammy'];
const digest=v=>createHash('sha256').update(v).digest('hex');
function createApplication({repository,seed,env=process.env,metadata={}}){
 const service=createService(repository);service.seed(seed);
 const configured=!!(env.PUPPY_PASSWORD&&env.JAMMY_PASSWORD),production=env.NODE_ENV==='production';
 if(!!env.PUPPY_PASSWORD!==!!env.JAMMY_PASSWORD)throw Error('Configure both fixed-account passwords, not just one.');
 if(configured&&env.PUPPY_PASSWORD===env.JAMMY_PASSWORD)throw Error('The two fixed accounts need different passwords.');
 if(production&&!configured)throw Error('Production requires PUPPY_PASSWORD and JAMMY_PASSWORD.');
 if(production&&!/^https:\/\//.test(env.PUBLIC_ORIGIN||''))throw Error('Production requires HTTPS PUBLIC_ORIGIN.');
 function verify(password,a){const actual=scryptSync(password,a.salt,32),expected=Buffer.from(a.hash,'hex');return actual.length===expected.length&&timingSafeEqual(actual,expected);}
 if(configured)for(const p of people){const password=env[p.toUpperCase()+'_PASSWORD'];if(password.length<12||password.length>200)throw Error('Account passwords must contain 12–200 characters.');let account=repository.get('accounts',p);if(!account||!verify(password,account)){const salt=randomBytes(16).toString('hex');repository.put('accounts',p,{salt,hash:scryptSync(password,salt,32).toString('hex')});for(const session of repository.list('sessions'))repository.remove('sessions',session.id);}}
 const loginAttempts=new Map(),requests=new Map();
 function json(body,status=200,headers={}){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});}
 function identity(req){if(!configured){const p=req.headers.get('x-preview-person')||'puppy';return people.includes(p)?p:null;}const token=(req.headers.get('cookie')||'').match(/(?:^|;\s*)cinema_session=([a-f0-9]{64})(?:;|$)/)?.[1];if(!token)return null;const s=repository.get('sessions',digest(token));if(!s||s.expires<Date.now())return null;return s.person;}
 function rate(map,key,limit,ms){const now=Date.now();let entry=map.get(key);if(!entry||entry.until<now){entry={count:0,until:now+ms};map.set(key,entry);}if(++entry.count>limit)return false;if(map.size>2000)for(const [k,v]of map)if(v.until<now)map.delete(k);return true;}
 async function handle(req,client='local'){
  const u=new URL(req.url),person=identity(req),method=req.method;
  try{
   if(!rate(requests,client,200,60000))return json({error:'请求过快，请稍后重试。'},429);
   if(!['GET','POST','PATCH'].includes(method))return json({error:'不支持的方法。'},405);
   if(method!=='GET'){const origin=req.headers.get('origin');const expected=env.PUBLIC_ORIGIN||u.origin;if((origin&&origin!==expected)||production&&!origin||req.headers.get('sec-fetch-site')==='cross-site')return json({error:'拒绝跨站写入请求。'},403);if(!(req.headers.get('content-type')||'').startsWith('application/json'))return json({error:'需要 JSON 请求。'},415);}
   let b={};if(method!=='GET'){const content=await req.text();if(content.length>512000)return json({error:'请求太大。'},413);try{b=JSON.parse(content);}catch{return json({error:'JSON 格式无效。'},400);}if(!b||typeof b!=='object'||Array.isArray(b))return json({error:'请求格式无效。'},400);}
   if(u.pathname==='/api/session'&&method==='GET')return json({person,preview:!configured});
   if(u.pathname==='/api/login'&&method==='POST'){
    if(!configured)return json({error:'本地预览未设置密码；正式部署必须配置两个密码。'},400);
    if(!rate(loginAttempts,client,5,15*60000))return json({error:'尝试过多，请 15 分钟后重试。'},429);
    if(!people.includes(b.person)||typeof b.password!=='string'||b.password.length>200||!verify(b.password,repository.get('accounts',b.person)))return json({error:'账号或密码错误。'},401);
    const token=randomBytes(32).toString('hex');repository.put('sessions',digest(token),{person:b.person,expires:Date.now()+30*86400000});return json({person:b.person},200,{'Set-Cookie':`cinema_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${production?'; Secure':''}`});
   }
   if(u.pathname==='/api/logout'&&method==='POST'){const token=(req.headers.get('cookie')||'').match(/cinema_session=([a-f0-9]{64})/)?.[1];if(token)repository.remove('sessions',digest(token));return json({ok:true},200,{'Set-Cookie':'cinema_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'+(production?'; Secure':'')});}
   if(!person)return json({error:'请先登录。'},401);
   if(u.pathname==='/api/state'&&method==='GET')return json(service.snapshot(person));
   if(u.pathname==='/api/export'&&method==='GET')return json({format:'shared-life-backup',version:1,exportedAt:new Date().toISOString(),...service.snapshot(person)});
   if(u.pathname==='/api/import-legacy'&&method==='POST')return json(service.importLegacy(b.storage||{},person));
   if(u.pathname==='/api/works'&&method==='POST')return json(repository.transaction(()=>service.createWork(b,person)),201);
   if(u.pathname==='/api/works/batch'&&method==='POST')return json(service.batchWorks(b));
   if(u.pathname==='/api/events'&&method==='POST')return json(service.createEvent(b,person),201);
   if(u.pathname==='/api/chances'&&method==='POST')return json(service.grant(b,person),201);
   if(u.pathname==='/api/demands'&&method==='POST')return json(service.demand(b,person),201);
   const route=u.pathname.match(/^\/api\/(works|events|reviews|demands)\/([^/]+)$/);
   if(route&&method==='PATCH'){const id=decodeURIComponent(route[2]);return json(route[1]==='works'?service.updateWork(id,b,person):route[1]==='events'?service.updateEvent(id,b):route[1]==='reviews'?service.review(id,b,person):service.completeDemand(id,b,person));}
   if(method==='GET'&&u.pathname==='/api/douban/catalog')return json({...metadata.snapshots,_unlinked:metadata.byTitle});
   if(method==='GET'&&u.pathname==='/api/douban/search'){const r=await metadata.searchSubjects(u.searchParams.get('q')||'');return json(r.body,r.status);}
   if(method==='GET'&&u.pathname==='/api/douban'){const r=await metadata.lookupSubject(u.searchParams.get('id')||'');return json(r.body,r.status);}
   if(method==='GET'&&u.pathname==='/api/metadata/search'){const r=await metadata.searchMetadata(u.searchParams.get('q')||'');return json(r.body,r.status);}
   if(method==='GET'&&u.pathname==='/api/posters/search'){const r=await metadata.searchPosters(u.searchParams.get('q')||'');return json(r.body,r.status);}
   return json({error:'接口不存在。'},404);
  }catch(error){return json({error:error.status?error.message:'服务暂时不可用，数据未保存。'},error.status||500);}
 }
 return {handle,service,configured,preview:!configured};
}
module.exports={createApplication};
