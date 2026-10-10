// Name-only supplements checked against year and director on 2026-10-10.
// These sources never supply or replace a Douban rating.
const bySubject={
 '1828115':{en:'Lust, Caution',nameSourceLabel:'Focus Features · 英文发行名',nameSourceUrl:'https://www.focusfeatures.com/lust__caution'},
 '35073886':{en:'Decision to Leave',nameSourceLabel:'维基百科 · 英文名',nameSourceUrl:'https://en.wikipedia.org/wiki/Decision_to_Leave'},
 '6307447':{en:'Django Unchained',nameSourceLabel:'维基百科 · 原名',nameSourceUrl:'https://en.wikipedia.org/wiki/Django_Unchained'},
 '2037432':{en:'太阳伞',nameSourceLabel:'电影网 · 中文原名（未核实英文名）',nameSourceUrl:'https://m.1905.com/m/star/workslist/2372204/?fr=shipsj'}
};
const byTitle={
 '登堂入室':{en:'Dans la maison / In the House',year:2012,director:'François Ozon',nameSourceLabel:'维基百科 · 法文原名 / 英文名',nameSourceUrl:'https://en.wikipedia.org/wiki/In_the_House_(film)'}
};
function supplementName(id,metadata){const extra=bySubject[id];return extra&&!metadata.en?{...metadata,...extra}:metadata;}
module.exports={bySubject,byTitle,supplementName};
