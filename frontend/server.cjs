const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {createRepository}=require('../backend/repository.cjs');
const {createApplication}=require('../backend/application.cjs');
const {lookupSubject,searchSubjects,snapshots}=require('./douban-lookup.cjs');
const {byTitle}=require('./supplemental-metadata.cjs');
const {searchMetadata}=require('./metadata-lookup.cjs');
const {searchPosters}=require('./poster-lookup.cjs');
const seed=require('../data/film-records-snapshot.json');
const repo=createRepository(process.env.DATABASE_FILE||path.resolve(__dirname,'../.runtime/shared-life.sqlite'));
const app=createApplication({repository:repo,seed,metadata:{lookupSubject,searchSubjects,snapshots,byTitle,searchMetadata,searchPosters}});
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8'};
const allowed=new Set(['index.html','life.js','timeline-engine.js','life.css','style.css','backup.html','film-metadata.js']);
const port=Number(process.env.PORT||4173);
http.createServer(async(req,res)=>{
 try{
  const origin=process.env.PUBLIC_ORIGIN||'http://'+req.headers.host;
  const url=new URL(req.url,origin);
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
  if(url.pathname.startsWith('/api/')){
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>512000){res.writeHead(413);return res.end('Request too large');}chunks.push(chunk);}
   const request=new Request(url,{method:req.method,headers:req.headers,...(req.method==='GET'||req.method==='HEAD'?{}:{body:Buffer.concat(chunks)})});
   const response=await app.handle(request,req.socket.remoteAddress);res.writeHead(response.status,Object.fromEntries(response.headers));return res.end(await response.text());
  }
  if(req.method!=='GET'){res.writeHead(405);return res.end();}
  const name=url.pathname==='/'?'index.html':url.pathname.slice(1);if(!allowed.has(name)){res.writeHead(404);return res.end('Not found');}
  const file=path.join(__dirname,name);res.setHeader('Content-Type',types[path.extname(file)]);res.setHeader('Cache-Control','no-cache');fs.createReadStream(file).on('error',()=>{res.statusCode=404;res.end('Not found');}).pipe(res);
 }catch{res.writeHead(500);res.end('Service unavailable');}
}).listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+port+' ('+(app.preview?'local preview, not production authentication':'fixed-account login')+')'));
