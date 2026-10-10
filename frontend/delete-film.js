const deletionKey='gongying.deletedFilms.v1';
let deletedIds=new Set(),deletedWorks=[],pendingDeletion=null,lastDeletedBatch=[];
function readDeletedIds(){const value=JSON.parse(localStorage.getItem(deletionKey)||'[]');if(!Array.isArray(value)||value.some(id=>!Number.isSafeInteger(id)))throw Error('Invalid deleted records');return new Set(value);}
function loadDeletedFilms(){
 try{deletedIds=readDeletedIds();deletedWorks=works.map((work,index)=>({work,index})).filter(record=>deletedIds.has(record.work.id));for(let i=works.length-1;i>=0;i--)if(deletedIds.has(works[i].id))works.splice(i,1);}
 catch{showToast('无法读取回收站，已有数据未被修改。');}
}
function requestDelete(id){requestDeleteMany([Number(id)]);}
function requestDeleteMany(ids){const chosen=works.filter(w=>ids.includes(w.id));if(!chosen.length)return;pendingDeletion=chosen.map(w=>w.id);document.querySelector('#delete-title').textContent='删除选中的 '+chosen.length+' 部作品？';document.querySelector('#delete-description').textContent=chosen.slice(0,6).map(w=>'「'+w.title+'」').join('、')+(chosen.length>6?' 等 '+chosen.length+' 部':'')+'将从片单和其他视图中移除。';document.querySelector('#delete-error').textContent='';document.querySelector('#delete-confirm').showModal();}
function persistDeletion(next,errorSelector){try{localStorage.setItem(deletionKey,JSON.stringify([...next]));deletedIds=next;return true;}catch{document.querySelector(errorSelector).textContent='浏览器存储失败，操作未完成。请检查浏览器设置或存储空间。';return false;}}
function confirmDelete(){
 const chosen=works.map((work,index)=>({work,index})).filter(r=>pendingDeletion?.includes(r.work.id));if(!chosen.length)return;
 const next=new Set(deletedIds);chosen.forEach(r=>next.add(r.work.id));if(!persistDeletion(next,'#delete-error'))return;
 deletedWorks.push(...chosen);lastDeletedBatch=chosen.map(r=>r.work.id);for(let i=works.length-1;i>=0;i--)if(lastDeletedBatch.includes(works[i].id))works.splice(i,1);if(typeof selectedRows!=='undefined')selectedRows.clear();pendingDeletion=null;document.querySelector('#delete-confirm').close();const detail=document.querySelector('#detail');if(detail.open)detail.close();render();showToast('已将 '+chosen.length+' 部作品移到回收站。');
 const undo=document.createElement('button');undo.textContent='撤销本次删除';undo.dataset.undoBatch='true';undo.className='undo-delete';document.querySelector('#toast').append(undo);
}
function restoreFilm(id){
 const index=deletedWorks.findIndex(record=>record.work.id===Number(id));if(index<0)return;const record=deletedWorks[index],source=doubanSources[record.work.id];
 const duplicate=works.some(w=>w.id===record.work.id||(source&&doubanSources[w.id]?.id===source.id));
 if(duplicate){document.querySelector('#trash-error').textContent='片单已有同一豆瓣作品，请先检查，避免重复恢复。';showToast('片单已有同一作品，未重复恢复。');return;}
 const next=new Set(deletedIds);next.delete(record.work.id);if(!persistDeletion(next,'#trash-error')){showToast('恢复失败，作品仍保留在回收站。');return;}
 deletedWorks.splice(index,1);works.splice(Math.min(record.index,works.length),0,record.work);render();if(document.querySelector('#trash').open)renderTrash();showToast('已恢复「'+record.work.title+'」。');
}
function renderTrash(){document.querySelector('#trash-error').textContent='';document.querySelector('#trash-list').innerHTML=deletedWorks.length?deletedWorks.map(({work})=>`<div class="trash-item"><div><strong>${esc(work.title)}</strong><small>${esc(work.year||doubanSources[work.id]?.year||'年份未填写')} · ${work.status==='watched'?'看过':'想看'}</small></div><button data-restore="${work.id}" class="secondary-button">恢复</button></div>`).join(''):'<p class="empty">回收站为空</p>';}
function undoBatchDelete(){const records=deletedWorks.filter(r=>lastDeletedBatch.includes(r.work.id));if(!records.length)return;const conflict=records.some(r=>works.some(w=>w.id===r.work.id||(doubanSources[r.work.id]?.id&&doubanSources[w.id]?.id===doubanSources[r.work.id].id)));if(conflict){showToast('片单已有相同作品，请从回收站逐项检查恢复。');return;}const next=new Set(deletedIds);records.forEach(r=>next.delete(r.work.id));if(!persistDeletion(next,'#trash-error')){showToast('撤销失败，作品仍在回收站。');return;}records.sort((a,b)=>a.index-b.index).forEach(r=>works.splice(Math.min(r.index,works.length),0,r.work));deletedWorks=deletedWorks.filter(r=>!lastDeletedBatch.includes(r.work.id));lastDeletedBatch=[];render();showToast('已撤销本次批量删除。');}
function visibleSelectionIds(){return filtered().filter(w=>statusFilter==='all'||w.status===statusFilter).map(w=>w.id);}
function changeRowSelection(action){if(typeof cancelCellEdit==='function')cancelCellEdit();const visible=visibleSelectionIds();if(action==='enter')rowSelectionMode=true;if(action==='exit'){rowSelectionMode=false;selectedRows.clear();}if(action==='all')selectedRows=new Set(visible);if(action==='invert')selectedRows=new Set(visible.filter(id=>!selectedRows.has(id)));if(action==='clear')selectedRows.clear();updateCards();}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.delete)requestDelete(b.dataset.delete);
 if(b.hasAttribute('data-confirm-delete'))confirmDelete();
 if(b.hasAttribute('data-cancel-delete'))document.querySelector('#delete-confirm').close();
 if(b.hasAttribute('data-trash')){renderTrash();document.querySelector('#trash').showModal();}
 if(b.dataset.restore)restoreFilm(b.dataset.restore);
 if(b.dataset.undoBatch)undoBatchDelete();
 if(b.dataset.selection)changeRowSelection(b.dataset.selection);
 if(b.hasAttribute('data-bulk-delete'))requestDeleteMany([...selectedRows].filter(id=>visibleSelectionIds().includes(id)));
});
document.addEventListener('change',e=>{if(e.target.dataset.selectRow){const id=Number(e.target.dataset.selectRow);if(e.target.checked)selectedRows.add(id);else selectedRows.delete(id);updateCards();}if(e.target.hasAttribute('data-select-all'))changeRowSelection(e.target.checked?'all':'clear');});
document.querySelector('#delete-confirm').addEventListener('close',()=>pendingDeletion=null);
loadDeletedFilms();render();
