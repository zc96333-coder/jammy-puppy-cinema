async function syncFilmMetadata(){
 try{
  const response=await fetch('/api/douban/catalog');if(!response.ok)throw Error('catalog unavailable');const catalog=await response.json();const edits=readFilmEdits();
  for(const work of [...works,...deletedWorks.map(record=>record.work)]){
   const link=doubanSources[work.id];if(work.source==='manual')continue;
   const raw=link?.id?catalog[link.id]:work.id<=10?catalog._unlinked?.[work.title]:null;if(!raw)continue;fillFilmMetadata(work,raw,edits[work.id]||{});
  }
  if(!activeCellEditor)render();
 }catch{showToast('已保存的影片记录仍可使用，豆瓣资料补全暂时不可用。');}
}
syncFilmMetadata();
