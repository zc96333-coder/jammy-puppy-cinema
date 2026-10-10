const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {lookupSubject,searchSubjects,snapshots}=require('./douban-lookup.cjs');
const {byTitle}=require('./supplemental-metadata.cjs');
const {searchMetadata}=require('./metadata-lookup.cjs');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8' };
http.createServer(async(req,res)=>{
  const requestUrl = new URL(req.url,'http://localhost');
  const pathname = requestUrl.pathname;
  if(pathname==='/api/metadata/search'){
    if(req.method!=='GET'){res.writeHead(405);return res.end();}
    const result=await searchMetadata(requestUrl.searchParams.get('q')||'');
    res.writeHead(result.status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
    return res.end(JSON.stringify(result.body));
  }
  if(pathname==='/api/douban/catalog'){
    if(req.method!=='GET'){res.writeHead(405);return res.end();}
    res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
    return res.end(JSON.stringify({...snapshots,_unlinked:byTitle}));
  }
  if(pathname==='/api/douban'||pathname==='/api/douban/search'){
    if(req.method!=='GET'){res.writeHead(405);return res.end();}
    const result=pathname==='/api/douban/search'?await searchSubjects(requestUrl.searchParams.get('q')||''):await lookupSubject(requestUrl.searchParams.get('id')||'');
    res.writeHead(result.status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
    return res.end(JSON.stringify(result.body));
  }
  const file = path.resolve(__dirname, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(__dirname + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);});
}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
