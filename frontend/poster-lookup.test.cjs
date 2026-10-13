const test=require('node:test'),assert=require('node:assert/strict');
const {searchPosters,validImage}=require('./poster-lookup.cjs');
const {createRepository}=require('../backend/repository.cjs'),{createService}=require('../backend/service.cjs');
const image='https://img2.doubanio.com/view/photo/s_ratio_poster/public/p1910899751.jpg';
test('online poster candidates combine available sources and distinguish unavailable sources',async()=>{
 const r=await searchPosters('饮食男女',async url=>{if(url.includes('wikipedia.org'))throw Error('offline');return [{type:'movie',id:'1291818',title:'饮食男女',year:'1994',img:image}];});
 assert.equal(r.status,200);assert.equal(r.body.results.length,1);assert.equal(r.body.results[0].source,'豆瓣公开海报');assert.match(r.body.results[0].label,/1994/);assert.match(r.body.notice,/部分来源/);
 const failure=await searchPosters('电影',async()=>{throw Error('offline');});assert.equal(failure.status,502);
});
test('poster lookup validates inputs and does not accept unknown or local image hosts',async()=>{
 assert.equal((await searchPosters('',async()=>{})).status,400);
 for(const url of ['http://127.0.0.1/x.jpg','https://img2.doubanio.com.evil.test/x.jpg','https://upload.wikimedia.org/x.svg','https://user:pass@upload.wikimedia.org/x.jpg'])assert.equal(validImage(url),false);
 assert.equal(validImage(image),true);
});
test('poster choice is attributed to the authenticated owner and removal preserves movie and review data',t=>{
 const repo=createRepository();t.after(()=>repo.close());const service=createService(repo);service.seed(require('../data/film-records-snapshot.json'));
 const work=service.snapshot('puppy').works.find(w=>w.id==='film-9'),before=service.snapshot('puppy').events;
 const poster={url:image,sourceUrl:'https://movie.douban.com/subject/1291818/',label:'饮食男女 · 1994',source:'豆瓣公开海报'};
 service.updateWork(work.id,{version:work.version,poster},'puppy');let saved=service.snapshot('jammy').works.find(w=>w.id===work.id);assert.deepEqual(saved.posters.puppy,poster);assert.equal(saved.title,work.title);assert.deepEqual(service.snapshot('puppy').events,before);
 assert.throws(()=>service.updateWork(work.id,{version:saved.version,poster:{...poster,url:'https://127.0.0.1/x.jpg'}},'puppy'),/来源无效/);
 assert.throws(()=>service.updateWork(work.id,{version:work.version,poster},'puppy'),/版本|更新|修改|冲突/);
 service.updateWork(work.id,{version:saved.version,poster:null},'puppy');saved=service.snapshot('puppy').works.find(w=>w.id===work.id);assert.equal(saved.posters.puppy,null);assert.deepEqual(saved.reviews,work.reviews);
});
test('TMDB public search parser keeps poster images associated with title, year and source',()=>{const {parseTmdbPosters}=require('./poster-lookup.cjs');const rows=parseTmdbPosters('<a data-media-type="movie" href="/movie/10451"><div><img alt="饮食男女" srcset="https://media.themoviedb.org/t/p/w94/a.jpg 1x, https://media.themoviedb.org/t/p/w188/a.jpg 2x" src="https://media.themoviedb.org/t/p/w94/a.jpg"></div></a><span class="release_date">1994 年 08 月</span>');assert.equal(rows.length,1);assert.equal(rows[0].label,'饮食男女 · 1994');assert.equal(rows[0].url,'https://media.themoviedb.org/t/p/w188/a.jpg');assert.equal(rows[0].sourceUrl,'https://www.themoviedb.org/movie/10451');});
test('each owner can select and remove only their own poster without overwriting the partner',t=>{const repo=createRepository();t.after(()=>repo.close());const service=createService(repo);service.seed(require('../data/film-records-snapshot.json'));let work=service.snapshot('puppy').works.find(w=>w.id==='film-9');const a={url:image,sourceUrl:'https://movie.douban.com/subject/1291818/',label:'A',source:'豆瓣'},b={...a,label:'B'};service.updateWork(work.id,{version:work.version,poster:a,posterOwner:'jammy'},'puppy');work=service.snapshot('puppy').works.find(w=>w.id==='film-9');assert.equal(work.posters.puppy.label,'A');assert.equal(work.posters.jammy,undefined);service.updateWork(work.id,{version:work.version,poster:b},'jammy');work=service.snapshot('puppy').works.find(w=>w.id==='film-9');service.updateWork(work.id,{version:work.version,poster:null},'puppy');work=service.snapshot('jammy').works.find(w=>w.id==='film-9');assert.equal(work.posters.puppy,null);assert.equal(work.posters.jammy.label,'B');});
