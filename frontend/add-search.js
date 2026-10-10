let candidateFilms=[],searchController=null,searchVersion=0;
function cancelFilmSearch(){searchController?.abort();searchVersion++;const button=document.querySelector('#search-films');if(button){button.disabled=false;button.textContent='搜索';}}
async function searchFilms(){
 const q=document.querySelector('#douban-keyword').value.trim(),notice=document.querySelector('#lookup-notice'),container=document.querySelector('#film-candidates');
 cancelFilmSearch();lookupController?.abort();lookupVersion++;linkedSubject=null;candidateFilms=[];container.innerHTML='';document.querySelector('#film-form').hidden=true;notice.classList.remove('warning');
 if(!q){notice.textContent='请输入片名或原名。';return;}
 searchController=new AbortController();const version=++searchVersion,button=document.querySelector('#search-films');button.disabled=true;button.textContent='搜索中…';notice.textContent='正在搜索豆瓣候选影片…';
 try{const response=await fetch('/api/douban/search?q='+encodeURIComponent(q),{signal:searchController.signal});const data=await response.json();if(version!==searchVersion)return;if(!response.ok)throw Error(data.error||'搜索失败');candidateFilms=data.results||[];notice.textContent=data.notice;notice.classList.toggle('warning',!!data.limited);
 container.innerHTML=candidateFilms.map((w,i)=>`<button type="button" class="film-candidate" data-candidate="${i}"><span class="candidate-name">${esc(w.title)} <small>${esc(w.year||'年份待补充')}</small></span><span class="candidate-meta">导演：${esc(w.director||'暂未获取')} · ${esc(w.type||'影视作品')}${w.en?' · '+esc(w.en):''}</span><span class="candidate-meta">${works.some(work=>doubanSources[work.id]?.id===w.id)?'已在片单':'选择并自动关联'} · 豆瓣条目 ${esc(w.id)}</span></button>`).join('');
 }catch(error){if(version!==searchVersion||error.name==='AbortError')return;notice.textContent='搜索暂时不可用，请稍后重试，或切换手动添加。';notice.classList.add('warning');}
 finally{if(version===searchVersion){button.disabled=false;button.textContent='搜索';}}
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='search-films')searchFilms();if(b.dataset.candidate!==undefined){const film=candidateFilms[Number(b.dataset.candidate)];if(film){document.querySelectorAll('[data-candidate]').forEach(el=>el.classList.toggle('selected',el===b));associateFilm(film);}}if(b.dataset.addMode)cancelFilmSearch();});
document.addEventListener('keydown',e=>{if(e.target.id==='douban-keyword'&&e.key==='Enter'){e.preventDefault();searchFilms();}});
document.addEventListener('input',e=>{if(e.target.id==='douban-keyword'){cancelFilmSearch();lookupController?.abort();lookupVersion++;linkedSubject=null;candidateFilms=[];document.querySelector('#film-candidates').innerHTML='';document.querySelector('#film-form').hidden=true;document.querySelector('#lookup-notice').textContent='输入完成后按回车或点击搜索。';}});
document.querySelector('#add').addEventListener('close',cancelFilmSearch);
