'use strict';
const restaurants=window.RESTAURANTS||[];
const candidates=window.CANDIDATES||[];
const el=id=>document.getElementById(id);
let remaining=[],draws=0,lastId=null,busy=false;
const mapUrl=p=>'https://uri.amap.com/search?keyword='+encodeURIComponent(p.name+' 长沙市望城区 '+p.address)+'&city=长沙&view=map';
function renderList(){
 el('listCount').textContent=restaurants.length;
 el('candidateCount').textContent=candidates.length;
 el('poolCount').textContent=restaurants.length+' 家有今年评价'+(restaurants.length>1?' · 一轮不重复':'');
 renderRows(restaurants,'placeList');renderRows(candidates,'candidateList');
 if(restaurants.length===1)el('drawNote').textContent='目前只有 1 家取得今年评价；下面的候选店尚不参与抽签。';
 if(!restaurants.length){el('drawButton').disabled=true;el('buttonText').textContent='暂没有通过核对的餐馆';el('resultAddress').textContent='今年的营业信息尚未核实，请先查看候选名单。';}
}
function renderRows(records,targetId){
 const fragment=document.createDocumentFragment();
 for(const p of records){
  const tr=document.createElement('tr');tr.id='place-'+p.id;
  const main=document.createElement('td');
  const name=document.createElement('p');name.className='place-name';name.textContent=p.name;main.append(name);
  const addr=document.createElement('p');addr.className='place-address';addr.textContent=p.address;main.append(addr);
  const evidence=document.createElement('p');evidence.className='evidence-status';evidence.textContent=p.reviewDate?'今年评价：'+p.reviewDate:'仅当前地图收录 · 营业待核实';main.append(evidence);
  const date=document.createElement('p');date.className='source-date';date.append('查询：'+p.checkedAt+' · ');
  const source=document.createElement('a');source.href=p.url;source.target='_blank';source.rel='noopener noreferrer';source.textContent='来源';date.append(source);main.append(date);
  const type=document.createElement('td');const badge=document.createElement('span');badge.className='type-pill';badge.textContent=p.category;type.append(badge);
  const dist=document.createElement('td');dist.className='distance-cell';dist.textContent='约 '+p.distanceM+' m';
  const nav=document.createElement('td');const link=document.createElement('a');link.href=mapUrl(p);link.target='_blank';link.rel='noopener noreferrer';link.textContent='地图';link.setAttribute('aria-label','在地图中查找'+p.name);nav.append(link);
  tr.append(main,type,dist,nav);fragment.append(tr);
 }
 el(targetId).replaceChildren(fragment);
}
function randomIndex(n){
 if(!Number.isInteger(n)||n<1)throw new Error('没有可抽取的餐馆');
 const limit=Math.floor(4294967296/n)*n;const a=new Uint32Array(1);do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%n;
}
function pick(){
 if(!remaining.length)remaining=restaurants.map(p=>p.id);
 const choices=remaining.length===restaurants.length&&restaurants.length>1?remaining.filter(id=>id!==lastId):remaining;
 const id=choices[randomIndex(choices.length)];remaining.splice(remaining.indexOf(id),1);lastId=id;return restaurants.find(p=>p.id===id);
}
function show(p){el('category').textContent=p.category+' · 有今年评价';el('resultName').textContent=p.name;el('resultAddress').textContent=p.address;el('resultEvidence').textContent='百度地图评价日期：'+p.reviewDate;el('distance').textContent='百度周边查询距离约 '+p.distanceM+' m';el('sourceLink').href=p.url;el('mapLink').href=mapUrl(p);el('resultDetails').hidden=false;}
async function draw(){
 if(busy)throw new Error('正在抽签，请稍等');
 if(!restaurants.length)throw new Error('名单为空');
 busy=true;el('drawButton').disabled=true;el('buttonText').textContent='正在抽你的饭签…';
 try{
  const result=pick();
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
   el('ticket').classList.add('rolling');el('resultDetails').hidden=true;
   for(let i=0;i<9;i++){show(restaurants[randomIndex(restaurants.length)]);el('resultDetails').hidden=true;await new Promise(resolve=>setTimeout(resolve,55+i*12));}
  }
  show(result);draws++;el('ticketCode').textContent='NO. '+String(draws).padStart(3,'0');
  document.querySelectorAll('.selected').forEach(row=>row.classList.remove('selected'));el('place-'+result.id).classList.add('selected');
  el('poolCount').textContent='本轮还剩 '+remaining.length+' 家';el('drawNote').textContent=remaining.length?'想换个选择？再抽一张，本轮不会抽到同一家。':'这一轮抽完啦，下次抽签开启新一轮。';
  if(restaurants.length===1){el('poolCount').textContent='目前 1 家有今年评价';el('drawNote').textContent='目前只有这家取得今年评价，再抽仍会是同一家。';}
  return {name:result.name,address:result.address,distanceM:result.distanceM,source:result.url,mapUrl:mapUrl(result)};
 }finally{busy=false;el('ticket').classList.remove('rolling');el('drawButton').disabled=false;el('buttonText').textContent='再抽一张';}
}
renderList();el('drawButton').addEventListener('click',()=>draw().catch(()=>{el('drawNote').textContent='抽签遇到问题，请刷新再试。';}));
if(document.modelContext?.registerTool){
 const lifecycle=new AbortController();
 const register=t=>{try{Promise.resolve(document.modelContext.registerTool(t,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
 register({name:'list_nearby_restaurants',title:'查看周边餐馆清单',description:'读取有今年评价、百度地图周边查询距离不超过一公里的抽签名单。待核实候选不参与抽签。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){if(input&&Object.keys(input).length)throw new Error('不接受参数');return restaurants.map(({name,address,distanceM,category,url,checkedAt,reviewDate,status})=>({name,address,distanceM,category,source:url,checkedAt,reviewDate,status}));}});
 register({name:'draw_restaurant',title:'抽一张今日饭签',description:'随机抽取本轮未抽到过的一家餐馆并在页面显示结果。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute(input){if(input&&Object.keys(input).length)throw new Error('不接受参数');return draw();}});
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
