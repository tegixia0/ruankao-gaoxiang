/* 软考高项备考站 —— 纯静态，无依赖。数据：data/index.json、data/plan.json、data/chapters/<id>.json */
(function(){
"use strict";
var $=function(id){return document.getElementById(id)};
var LS={get:function(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},
        set:function(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
var WKEY="rk.wrong.v1", DKEY="rk.done.v1";
var EXAM=new Date("2027-05-22T08:30:00+08:00"); // 预计日期，待官方公布
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function strip(s){return String(s).replace(/<[^>]+>/g,"")}
function hash(s){var h=5381;for(var i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36)}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}
var cache={};
function getJSON(url){if(cache[url])return Promise.resolve(cache[url]);
  return fetch(url,{cache:"no-cache"}).then(function(r){if(!r.ok)throw new Error(url+" "+r.status);return r.json()}).then(function(j){cache[url]=j;return j})}
function chapter(id){return getJSON("data/chapters/"+id+".json")}

/* ---------- 错题本 ---------- */
function wrongs(){return LS.get(WKEY,{})}
function addWrong(it){var w=wrongs();var o=w[it.key]||{n:0};o.n++;o.t=Date.now();o.src=it.src;o.q=it.q;o.options=it.options;o.answer=it.answer;o.explain=it.explain;w[it.key]=o;LS.set(WKEY,w);updCount()}
function delWrong(k){var w=wrongs();delete w[k];LS.set(WKEY,w);updCount()}
function updCount(){var n=Object.keys(wrongs()).length;var el=$("wrongCount");if(el)el.textContent=n+" 道错题"}

/* ---------- 路由 ---------- */
var VIEWS=["home","intro","method","plan","kp","ch","quiz","wrong","practice"];
function show(v,nav){VIEWS.forEach(function(x){$("v-"+x).hidden=(x!==v)});
  Array.prototype.forEach.call(document.querySelectorAll("#topnav a"),function(a){a.classList.toggle("active",a.getAttribute("data-v")===nav)});
  window.scrollTo(0,0)}
function route(){var h=(location.hash||"#home").slice(1).split("/");var v=h[0]||"home",arg=h[1];
  if(v==="home"){show("home","home");renderHome()}
  else if(v==="intro"||v==="method"){show(v,v)}
  else if(v==="plan"){show("plan","plan");renderPlan()}
  else if(v==="kp"&&arg){show("ch","kp");renderChapter(arg)}
  else if(v==="kp"){show("kp","kp");renderKP()}
  else if(v==="quiz"&&arg){show("quiz","kp");startQuiz(arg,h[2])}
  else if((v==="flash"||v==="match"||v==="blank")&&arg){show("practice","kp");renderPracticeShell(v,arg)}
  else if(v==="wrong"){show("wrong","wrong");renderWrong(arg)}
  else{show("home","home");renderHome()}}
window.addEventListener("hashchange",route);

/* ---------- 首页 ---------- */
function curWeek(plan){var t=new Date();var s=t.getFullYear()+"-"+("0"+(t.getMonth()+1)).slice(-2)+"-"+("0"+t.getDate()).slice(-2);
  var w=plan.weeks;for(var i=0;i<w.length;i++)if(s>=w[i].start&&s<=w[i].end)return w[i];
  return s<w[0].start?{before:true,first:w[0]}:null}
function renderHome(){updCount();
  var d=Math.ceil((EXAM-new Date())/86400000);$("daysLeft").textContent=d>0?d:"—";
  getJSON("data/plan.json").then(function(p){var c=curWeek(p);
    if(c&&c.before){$("weekNow").textContent="准备";$("weekNowText").textContent="计划从 "+c.first.start+" 开始";
      $("thisWeek").innerHTML="计划还没开始（从 "+c.first.start+" 起）。现在可以先读「考试介绍」，再看「49个过程总表」热身。<br>第1周："+esc(c.first.chapters)}
    else if(c){$("weekNow").textContent="第"+c.week+"周";$("weekNowText").textContent=c.phase+"阶段 · "+c.start.slice(5)+"～"+c.end.slice(5);
      $("thisWeek").innerHTML="<b>"+esc(c.chapters)+"</b><br>"+esc(c.tasks)}
    else{$("weekNow").textContent="—";$("weekNowText").textContent="计划之外";$("thisWeek").textContent="不在计划周期内。"}}).catch(function(){})}

/* ---------- 计划 ---------- */
function renderPlan(){getJSON("data/plan.json").then(function(p){
  $("phaseCards").innerHTML=p.phases.map(function(f){return '<div class="sec"><h3>'+esc(f.name)+'阶段 <span class="pill">'+esc(f.range)+'</span><span class="pill">'+esc(f.daily)+'</span></h3><div class="small">'+esc(f.goal)+'</div></div>'}).join("");
  var c=curWeek(p);var h='<tr><th>周</th><th>日期</th><th>章节 / 主题</th><th>练习与任务</th></tr>',last="";
  p.weeks.forEach(function(w){if(w.phase!==last){h+='<tr class="phase"><td colspan="4">'+esc(w.phase)+'阶段</td></tr>';last=w.phase}
    var cur=c&&c.week===w.week;
    h+='<tr'+(cur?' style="outline:2px solid var(--accent)"':'')+'><td>'+w.week+(cur?' 👈':'')+'</td><td style="white-space:nowrap">'+w.start.slice(5).replace("-","/")+'–'+w.end.slice(5).replace("-","/")+'</td><td>'+esc(w.chapters)+'</td><td class="small">'+esc(w.tasks)+'</td></tr>'});
  $("planTable").innerHTML=h})}

/* ---------- 知识点列表 ---------- */
function renderKP(){var done=LS.get(DKEY,{});getJSON("data/index.json").then(function(ix){
  $("kpSrc").textContent="章节顺序对应："+ix.textbook+"。已完成 "+ix.chapters.filter(function(c){return c.ready}).length+" / "+ix.chapters.length+" 个单元。";
  var prac='<div class="btnrow" style="margin:8px 0 12px"><a class="btn pri" href="#flash/ch00">🃏 闪卡</a><a class="btn" href="#match/ch00">🔗 匹配</a><a class="btn" href="#blank/ch00">✍️ 填空</a><a class="btn" href="#quiz/ch00/drill">🧩 过程组训练</a></div>';
  $("chList").innerHTML=prac+ix.chapters.map(function(c){return '<a href="#kp/'+c.id+'" class="'+(c.ready?"":"dis")+'"><span class="no">'+esc(c.no)+'</span><span class="t">'+esc(c.title)+'</span>'+
    (c.ready?(done[c.id]?'<span class="pill ok">已学</span>':'<span class="pill">笔记＋自测</span>'):'<span class="pill">待补充</span>')+'</a>'}).join("")})}

/* ---------- 章节 ---------- */
function li(a){return a.map(function(x){if(typeof x==="string")return "<li>"+x+"</li>";
  var h="<li>"+(x.t||x.text||"");
  if(x.eg)h+='<div class="eg"><span class="eg-lab">举例</span>'+x.eg+"</div>";
  return h+"</li>"}).join("")}
function procInfo(c,name){return (c.processes&&c.processes[name])||null}
function procDetailHTML(c,name,ka,gi){
  var g=c.matrix.groups[gi], info=procInfo(c,name)||{};
  var h='<div class="proc-detail" id="procDetail" data-p="'+esc(name)+'">';
  h+='<div class="proc-detail-hd"><b>'+esc(name)+'</b><span class="pill">'+esc(ka)+'</span><span class="pill">'+esc(g)+'过程组</span>';
  h+='<button type="button" class="proc-close" id="procClose" aria-label="关闭">×</button></div>';
  h+='<div class="proc-row"><span class="proc-lab">一句话</span><div>'+esc(info.do||"暂无说明")+'</div></div>';
  h+='<div class="proc-row"><span class="proc-lab">为啥这领域</span><div>'+esc(info.whyKa||"")+'</div></div>';
  h+='<div class="proc-row"><span class="proc-lab">为啥这过程组</span><div>'+esc(info.whyGroup||"")+'</div></div>';
  if(info.trap)h+='<div class="proc-trap"><span class="proc-lab">⚠ 易混</span><div>'+esc(info.trap)+'</div></div>';
  h+='</div>';
  return h}
function matrixHTML(c){var m=c.matrix;var h='<p class="small muted">点击过程名，查看「做什么 / 为啥这领域 / 为啥这过程组」。</p>';
  h+='<div class="tablewrap"><table class="matrix"><tr><th>知识领域</th>'+m.groups.map(function(g,i){return '<th>'+g+'过程组<small>'+m.colCounts[i]+'个</small></th>'}).join("")+'</tr>';
  m.rows.forEach(function(r){var n=r.cells.reduce(function(s,cell){return s+cell.length},0);
    h+='<tr><td class="ka">'+esc(r.ka)+'<br><small class="muted">'+n+'个</small></td>'+r.cells.map(function(cell,gi){return '<td>'+cell.map(function(p){
      var trap=procInfo(c,p)&&procInfo(c,p).trap?' trap':'';
      return '<button type="button" class="p'+trap+'" data-p="'+esc(p)+'" data-ka="'+esc(r.ka)+'" data-gi="'+gi+'">'+esc(p)+(trap?' ⚠':'')+'</button>'}).join("")+'</td>'}).join("")+'</tr>'});
  return h+'</table></div><div id="procSlot"><p class="small muted">合计 49 个过程。点上方任一过程名展开说明。</p></div>'}
function bindMatrixDetail(c){var root=$("chBody");if(!root)return;
  root.querySelectorAll(".matrix .p").forEach(function(btn){
    btn.onclick=function(){var name=btn.getAttribute("data-p"),ka=btn.getAttribute("data-ka"),gi=+btn.getAttribute("data-gi");
      root.querySelectorAll(".matrix .p.on").forEach(function(x){x.classList.remove("on")});
      btn.classList.add("on");
      var slot=$("procSlot");if(slot){slot.innerHTML=procDetailHTML(c,name,ka,gi);var cl=$("procClose");if(cl)cl.onclick=function(){btn.classList.remove("on");slot.innerHTML='<p class="small muted">合计 49 个过程。点上方任一过程名展开说明。</p>'};slot.scrollIntoView({behavior:"smooth",block:"nearest"})}}})
}
function ittoHTML(p){function L(t,a){return a&&a.length?'<div class="ir"><b>'+t+'</b>'+a.map(function(x){return '<span class="it">'+x+'</span>'}).join("")+'</div>':''}
  return '<details class="itto"><summary><span class="pn">'+esc(p.name)+'</span>'+(p.group?'<span class="pill">'+esc(p.group)+'</span>':'')+'</summary>'+
    (p.def?'<div class="small">'+p.def+'</div>':'')+L("输入",p.i)+L("工具与技术",p.t)+L("输出",p.o)+(p.note?'<div class="small tbd" style="margin-top:4px">★ '+p.note+'</div>':'')+(p.eg?'<div class="eg"><span class="eg-lab">举例</span>'+p.eg+'</div>':'')+'</details>'}
function renderChapter(id){$("chBody").innerHTML='<div class="card muted">加载中…</div>';
  chapter(id).then(function(c){var done=LS.get(DKEY,{});
    var h='<div class="card"><a href="#kp" class="small">← 知识点目录</a><h1>'+esc(c.no)+' · '+esc(c.title)+'</h1><p class="muted small">'+esc(c.source)+'</p><div class="tip">'+c.intro+'</div>';
    if(c.matrix)h+='<h2>49个过程总表</h2>'+matrixHTML(c);
    c.sections.forEach(function(s){h+='<div class="sec"><h3>'+esc(s.title)+'</h3><span class="lab k">要点</span><ul>'+li(s.points)+'</ul>';
      if(s.pitfalls&&s.pitfalls.length)h+='<span class="lab e">易错点</span><ul>'+li(s.pitfalls)+'</ul>';
      if(s.itto&&s.itto.length)h+='<span class="lab k">过程与ITTO（点开查看）</span>'+s.itto.map(ittoHTML).join("");
      if(s.example)h+='<span class="lab x">例题（原创）</span><div class="example">'+s.example+'</div>';
      if(s.mnemonic)h+='<span class="lab m">记忆口诀</span><div class="small">'+s.mnemonic+'</div>';h+='</div>'});
    h+='<div class="btnrow"><a class="btn pri" href="#quiz/'+id+'">✏️ 本章自测（'+c.quiz.length+'题）</a>'+(c.matrix?'<a class="btn" href="#quiz/'+id+'/drill">🧩 过程组归属训练</a>':'')+
      ((c.flash&&c.flash.length)?'<a class="btn" href="#flash/'+id+'">🃏 闪卡（'+c.flash.length+'）</a>':'')+((c.match&&c.match.length)?'<a class="btn" href="#match/'+id+'">🔗 匹配（'+c.match.length+'）</a>':'')+((c.blank&&c.blank.length)?'<a class="btn" href="#blank/'+id+'">✍️ 填空（'+c.blank.length+'）</a>':'')+'</div>';
    h+='<label class="check"><input type="checkbox" id="doneChk"'+(done[id]?" checked":"")+'> 我已学完本章</label></div>';
    $("chBody").innerHTML=h;
    if(c.matrix)bindMatrixDetail(c);
    $("doneChk").onchange=function(){var d=LS.get(DKEY,{});if(this.checked)d[id]=1;else delete d[id];LS.set(DKEY,d)}})
  .catch(function(){$("chBody").innerHTML='<div class="card">这一章还没有内容。<a href="#kp">返回目录</a></div>'})}

/* ---------- 自测引擎（单选；答错后可「再写一次」；错题进错题本） ---------- */
var Q=null;
function itemsFromChapter(c){return c.quiz.map(function(q){return{key:c.id+":"+hash(strip(q.q)),src:c.no+" "+c.title,q:q.q,options:q.options,answer:q.answer,explain:q.explain,kind:q.kind||"原创练习题",source:q.source||q.kind||"原创练习题"}})}
function drillExplain(c,x){var info=procInfo(c,x.p)||{};var g=c.matrix.groups[x.g];
  var parts=["「"+x.p+"」→ "+x.ka+" · "+g+"过程组。"];
  if(info.do)parts.push("做什么："+info.do);
  if(info.whyKa)parts.push("为啥这领域："+info.whyKa);
  if(info.whyGroup)parts.push("为啥这过程组："+info.whyGroup);
  if(info.trap)parts.push("⚠ "+info.trap);
  return parts.join("<br>")}
function drillItems(c,n){var all=[];c.matrix.rows.forEach(function(r){r.cells.forEach(function(cell,gi){cell.forEach(function(p){all.push({p:p,g:gi,ka:r.ka})})})});
  var kas=c.matrix.rows.map(function(r){return r.ka});
  return shuffle(all).slice(0,n).map(function(x,i){
    if(i%2===0)return{key:"ch00drill:"+x.p+":g",src:"49过程训练",q:"「"+x.p+"」属于哪个<b>过程组</b>？",options:c.matrix.groups.map(function(g){return g+"过程组"}),answer:x.g,explain:drillExplain(c,x),fixed:true};
    var opts=shuffle(kas.filter(function(k){return k!==x.ka})).slice(0,3).concat([x.ka]);opts=shuffle(opts);
    return{key:"ch00drill:"+x.p+":k",src:"49过程训练",q:"「"+x.p+"」属于哪个<b>知识领域</b>？",options:opts,answer:opts.indexOf(x.ka),explain:drillExplain(c,x),fixed:true}})}
function startQuiz(id,mode){$("quizBody").innerHTML='<div class="card muted">加载中…</div>';
  chapter(id).then(function(c){var items=mode==="drill"?drillItems(c,12):shuffle(itemsFromChapter(c));
    runQuiz({title:mode==="drill"?"🧩 过程组归属训练":"✏️ "+c.no+" 自测",items:items,back:"#kp/"+id,again:"#quiz/"+id+(mode?"/"+mode:""),wrongMode:false})})}
function runQuiz(cfg){Q={cfg:cfg,i:0,right:0,missed:[],retry:false};renderQ()}
function renderQ(){var c=Q.cfg,it=c.items[Q.i];if(!it){return renderEnd()}
  var order=it.fixed?it.options.map(function(_,i){return i}):shuffle(it.options.map(function(_,i){return i}));
  Q.order=order;Q.answered=false;
  var h='<div class="bar"><b>'+esc(c.title)+'</b><span class="sp"></span><span>'+(Q.i+1)+' / '+c.items.length+'</span>'+(Q.retry?'<span class="pill tbd">再写一次</span>':'')+'</div>'+
    '<div class="progress"><i style="width:'+(Q.i/c.items.length*100)+'%"></i></div><div class="card">'+
    '<div class="small muted">'+esc(it.src)+' · 单选题 · <span class="qtag">'+esc(it.source||it.kind||"原创练习题")+'</span></div><div class="qtext">'+it.q+'</div><div class="opts" id="opts">'+
    order.map(function(oi,k){return '<button type="button" class="opt" data-oi="'+oi+'"><span class="L">'+"ABCDE"[k]+'</span><span>'+it.options[oi]+'</span></button>'}).join("")+
    '</div><div class="feedback" id="fb"></div><div class="actions" id="acts"><a class="btn full" href="'+c.back+'">退出</a></div></div>';
  $("quizBody").innerHTML=h;
  $("opts").onclick=function(e){var b=e.target.closest(".opt");if(!b||Q.answered)return;answer(+b.getAttribute("data-oi"),b)}}
function answer(oi,btn){var it=Q.cfg.items[Q.i];Q.answered=true;var ok=oi===it.answer;
  Array.prototype.forEach.call(document.querySelectorAll("#opts .opt"),function(b){b.disabled=true;if(+b.getAttribute("data-oi")===it.answer&&(ok||!Q.cfg.hideRight))b.classList.add("right")});
  if(!ok)btn.classList.add("wrongpick");
  var fb=$("fb"),acts=$("acts"),note="";
  if(ok){if(!Q.retry){Q.right++;if(Q.cfg.wrongMode){delWrong(it.key);note='<div class="sub small muted">已从错题本移出 ✓</div>'}}
    fb.className="feedback ok";fb.innerHTML='<div class="title">✔ 正确'+(Q.retry?'（改正成功）':'')+'</div>'+note+'<div class="exp">'+it.explain+'</div>';
    acts.innerHTML='<button type="button" class="btn pri full" id="nextB">下一题 →</button>'}
  else{if(!Q.retry){addWrong(it);Q.missed.push(it)}else addWrong(it);
    fb.className="feedback bad";fb.innerHTML='<div class="title">✘ 再看看</div><div class="small">正确答案：'+it.options[it.answer]+'</div><div class="exp">'+it.explain+'</div><div class="small muted" style="margin-top:6px">已记入错题本。看懂解析后，点「再写一次」自己选对一遍。</div>';
    acts.innerHTML='<button type="button" class="btn bad" id="retryB">↺ 再写一次</button><button type="button" class="btn" id="nextB">下一题 →</button>'}
  var r=$("retryB");if(r)r.onclick=function(){Q.retry=true;renderQ()};
  $("nextB").onclick=function(){Q.retry=false;Q.i++;renderQ()};
  $("nextB").focus({preventScroll:true})}
function renderEnd(){var c=Q.cfg,n=c.items.length,pct=Math.round(Q.right/n*100);
  var h='<div class="card"><h1>'+esc(c.title)+' · 完成</h1><div class="count">'+Q.right+' / '+n+'</div><p class="muted">首次作答正确率 '+pct+'%'+(pct>=60?'，达到60%及格线 👍':'，还没到60%，回去再读一遍笔记吧')+'</p>';
  if(Q.missed.length)h+='<h3>本轮答错</h3><ul class="wl">'+Q.missed.map(function(m){return '<li><span class="n">✘</span> '+strip(m.q)+'<br><span class="src">答案：'+esc(strip(m.options[m.answer]))+'</span></li>'}).join("")+'</ul>';
  h+='<div class="btnrow"><a class="btn'+(Q.missed.length?'':' pri')+'" href="'+c.again+'" id="againB">再来一轮</a>'+(Q.missed.length?'<button type="button" class="btn bad" id="missB">只练本轮错题</button>':'')+'<a class="btn" href="#wrong">📕 错题本</a><a class="btn" href="'+c.back+'">返回</a></div></div>';
  $("quizBody").innerHTML=h;
  $("againB").onclick=function(e){if(location.hash===c.again){e.preventDefault();route()}};
  var mb=$("missB");if(mb)mb.onclick=function(){runQuiz({title:"本轮错题重练",items:shuffle(Q.missed),back:c.back,again:c.again,wrongMode:true})}}

/* ---------- 错题本 ---------- */
function renderWrong(arg){var w=wrongs(),keys=Object.keys(w).sort(function(a,b){return w[b].t-w[a].t});
  if(arg==="go"&&keys.length){show("quiz","wrong");runQuiz({title:"📕 错题本练习",items:shuffle(keys.map(function(k){var o=w[k];return{key:k,src:o.src,q:o.q,options:o.options,answer:o.answer,explain:o.explain,fixed:k.indexOf("ch00drill")===0}})),back:"#wrong",again:"#wrong/go",wrongMode:true});return}
  var h='<div class="card"><h1>📕 错题本</h1><p class="muted small">答错的题自动记在这里（只保存在本机浏览器）。在错题本里一次答对，就会移出。</p>';
  if(!keys.length)h+='<p>还没有错题。去 <a href="#kp">知识点</a> 做一套自测吧。</p>';
  else{h+='<div class="btnrow"><a class="btn bad" href="#wrong/go">开始练错题（'+keys.length+'道）</a><button type="button" class="btn" id="clrB">清空</button></div><ul class="wl">'+
    keys.map(function(k){var o=w[k];return '<li><span class="n">×'+o.n+'</span> '+strip(o.q)+'<br><span class="src">'+esc(o.src)+' · 答案：'+esc(strip(o.options[o.answer]))+'</span></li>'}).join("")+'</ul>'}
  $("wrongBody").innerHTML=h+'</div>';
  var cb=$("clrB");if(cb)cb.onclick=function(){if(confirm("确定清空全部错题记录？")){LS.set(WKEY,{});renderWrong()}}}


/* ---------- 练习模式壳（闪卡/匹配/填空）：接章节 flash/match/blank ---------- */
var FKEY="rk.flash.v1";
function flashState(){return LS.get(FKEY,{})}
function setFlash(k,weak){var s=flashState();if(weak)s[k]={w:1,t:Date.now()};else delete s[k];LS.set(FKEY,s)}
function flashKey(ch,card){return ch+":"+(card.id||hash(strip(card.front||"")))}
function normAns(s){return String(s||"").replace(/\s+/g,"").toLowerCase()}
function blankOk(it,val){var v=normAns(val);if(!v)return false;var acc=[it.answer].concat(it.accept||[]);return acc.some(function(a){return normAns(a)===v})}
function setProg(pct){var el=document.querySelector("#practiceBody .progress i");if(el)el.style.width=Math.max(0,Math.min(100,pct))+"%"}

function renderPracticeShell(mode,id){
  var titles={flash:"🃏 闪卡",match:"🔗 匹配",blank:"✍️ 填空"};
  var body=$("practiceBody");
  body.innerHTML='<div class="card muted">加载中…</div>';
  chapter(id).then(function(c){
    var deck=mode==="flash"? (c.flash||[]): mode==="match"? (c.match||[]): (c.blank||[]);
    if(!deck.length){
      body.innerHTML='<div class="card"><a href="#kp/'+id+'" class="small">← 返回本章</a><h1>'+titles[mode]+'</h1><p>本章还没有'+titles[mode]+'数据。</p><p class="muted small">可先练 <a href="#flash/ch00">总览闪卡</a> / <a href="#match/ch00">过程匹配</a> / <a href="#blank/ch00">公式填空</a>。</p><div class="btnrow"><a class="btn" href="#kp/'+id+'">返回</a></div></div>';
      return}
    if(mode==="flash") startFlash(c,id,deck);
    else if(mode==="match") startMatch(c,id,deck);
    else startBlank(c,id,deck);
  }).catch(function(){body.innerHTML='<div class="card">加载失败。<a href="#kp">返回目录</a></div>'})}

function practiceChrome(c,id,mode,titleExtra){
  var titles={flash:"🃏 闪卡",match:"🔗 匹配",blank:"✍️ 填空"};
  return '<div class="card practice-shell" data-mode="'+mode+'" data-ch="'+esc(id)+'">'+
    '<a href="#kp/'+id+'" class="small">← 返回本章</a>'+
    '<h1>'+titles[mode]+' · '+esc(c.no)+'</h1>'+
    '<div class="bar"><b>'+esc(c.title)+'</b><span class="sp"></span><span class="small muted" id="pracMeta">'+(titleExtra||"")+'</span></div>'+
    '<div class="progress"><i style="width:0%"></i></div><div id="pracMain"></div>'+
    '<div class="btnrow" style="margin-top:12px"><a class="btn" href="#flash/'+id+'">🃏 闪卡</a><a class="btn" href="#match/'+id+'">🔗 匹配</a><a class="btn" href="#blank/'+id+'">✍️ 填空</a><a class="btn" href="#quiz/'+id+'">✏️ 自测</a></div></div>'}

function startFlash(c,id,deck){
  var body=$("practiceBody");
  var st=flashState();
  var weak=deck.filter(function(card){return st[flashKey(id,card)]});
  var order=weak.length? shuffle(weak).concat(shuffle(deck.filter(function(card){return !st[flashKey(id,card)]}))) : shuffle(deck.slice());
  var i=0, flipped=false;
  body.innerHTML=practiceChrome(c,id,"flash","认识/不熟会记住，不熟优先再练");
  function show(){
    if(i>=order.length){
      $("pracMain").innerHTML='<div class="feedback ok"><div class="title">本轮闪卡完成</div><div class="exp">不熟的卡片会优先出现在下一轮。错题本仍用于选择题/填空。</div></div>'+
        '<div class="actions"><button type="button" class="btn pri full" id="againB">再来一轮</button><a class="btn full" href="#kp/'+id+'">返回</a></div>';
      setProg(100);
      $("againB").onclick=function(){startFlash(c,id,deck)};
      return}
    flipped=false; setProg(i/order.length*100);
    var card=order[i], k=flashKey(id,card);
    $("pracMeta").textContent=(i+1)+" / "+order.length+(st[k]?" · 不熟优先":"");
    var eg=card.eg?'<div class="eg"><span class="eg-lab">举例</span>'+card.eg+'</div>':'';
    $("pracMain").innerHTML=
      '<div class="flip-wrap"><button type="button" class="flip" aria-pressed="false" id="flipCard">'+
      '<span class="flip-inner"><span class="flip-face front"><span class="hint">点卡片看答案</span><span>'+esc(card.front)+'</span></span>'+
      '<span class="flip-face back"><span class="hint">答案</span><span style="white-space:pre-wrap">'+esc(card.back)+'</span>'+eg+'</span></span></button></div>'+
      '<div class="flip-actions" id="flipActs" hidden><button type="button" class="btn ok" id="knowB">记住了</button><button type="button" class="btn bad" id="againWeak">再练</button></div>';
    var flip=$("flipCard");
    flip.onclick=function(){
      flipped=!flipped;
      flip.classList.toggle("is-flipped",flipped);
      flip.setAttribute("aria-pressed",flipped?"true":"false");
      $("flipActs").hidden=!flipped;
    };
    $("knowB").onclick=function(){setFlash(k,false);i++;show()};
    $("againWeak").onclick=function(){setFlash(k,true);order.push(card);i++;show()};
  }
  show();
}

function startMatch(c,id,deck){
  var body=$("practiceBody");
  body.innerHTML=practiceChrome(c,id,"match","点左再点右配对");
  var pool=shuffle(deck.slice()), roundSize=Math.min(6,pool.length), doneRounds=0, totalRounds=Math.ceil(deck.length/6);
  function nextRound(){
    if(!pool.length){
      $("pracMain").innerHTML='<div class="feedback ok"><div class="title">全部配对完成</div><div class="exp">共 '+deck.length+' 组。</div></div>'+
        '<div class="actions"><button type="button" class="btn pri full" id="againB">再来一轮</button><a class="btn full" href="#kp/'+id+'">返回</a></div>';
      setProg(100);
      $("againB").onclick=function(){startMatch(c,id,deck)};
      return}
    var batch=pool.splice(0,roundSize); if(batch.length<2 && pool.length){batch=batch.concat(pool.splice(0,2))}
    while(batch.length<2 && deck.length>=2){batch=shuffle(deck.slice()).slice(0,Math.min(6,deck.length));pool=[]}
    doneRounds++;
    setProg((doneRounds-1)/Math.max(1,totalRounds)*100);
    $("pracMeta").textContent="本轮 "+batch.length+" 对 · 剩余 "+pool.length;
    var left=shuffle(batch.map(function(x,i){return {i:i,t:x.q}}));
    var right=shuffle(batch.map(function(x,i){return {i:i,t:x.a}}));
    var html='<div class="match-board"><div class="match-q">'+left.map(function(x){return '<button type="button" class="chip" data-side="q" data-i="'+x.i+'">'+esc(x.t)+'</button>'}).join("")+
      '</div><div class="match-a">'+right.map(function(x){return '<button type="button" class="chip" data-side="a" data-i="'+x.i+'">'+esc(x.t)+'</button>'}).join("")+'</div></div>'+
      '<div class="feedback" id="matchFb"></div>';
    $("pracMain").innerHTML=html;
    var sel=null, remain=batch.length;
    $("pracMain").querySelector(".match-board").onclick=function(e){
      var chip=e.target.closest(".chip"); if(!chip||chip.disabled||chip.classList.contains("ok"))return;
      if(!sel){ $("pracMain").querySelectorAll(".chip.sel").forEach(function(x){x.classList.remove("sel")}); chip.classList.add("sel"); sel=chip; return}
      if(sel===chip){chip.classList.remove("sel"); sel=null; return}
      if(sel.getAttribute("data-side")===chip.getAttribute("data-side")){
        sel.classList.remove("sel"); chip.classList.add("sel"); sel=chip; return}
      var a=sel,b=chip; sel=null;
      $("pracMain").querySelectorAll(".chip.sel").forEach(function(x){x.classList.remove("sel")});
      var ok=a.getAttribute("data-i")===b.getAttribute("data-i");
      var fb=$("matchFb");
      if(ok){
        a.classList.add("ok"); b.classList.add("ok"); a.disabled=true; b.disabled=true;
        remain--; if(fb){fb.className="feedback ok"; fb.innerHTML='<div class="title">✔ 配对正确</div>'}
        if(remain<=0){ setTimeout(nextRound,450) }
      }else{
        a.classList.add("bad"); b.classList.add("bad");
        if(fb){fb.className="feedback bad"; fb.innerHTML='<div class="title">✘ 再试试</div><div class="exp">不是一对，请重选。</div>'}
        setTimeout(function(){a.classList.remove("bad"); b.classList.remove("bad")},380);
      }
    };
  }
  nextRound();
}

function startBlank(c,id,deck){
  var body=$("practiceBody");
  body.innerHTML=practiceChrome(c,id,"blank","填空 · 答错可再写一次");
  var order=shuffle(deck.slice()), i=0, right=0, retry=false;
  function keyOf(it){return "blank:"+id+":"+hash(strip(it.q||""))}
  function show(){
    if(i>=order.length){
      $("pracMain").innerHTML='<div class="feedback ok"><div class="title">填空完成</div><div class="exp">首次正确 '+right+' / '+order.length+'</div></div>'+
        '<div class="actions"><button type="button" class="btn pri full" id="againB">再来一轮</button><a class="btn full" href="#wrong">📕 错题本</a><a class="btn full" href="#kp/'+id+'">返回</a></div>';
      setProg(100); updCount();
      $("againB").onclick=function(){startBlank(c,id,deck)};
      return}
    retry=false; setProg(i/order.length*100);
    var it=order[i];
    $("pracMeta").textContent=(i+1)+" / "+order.length;
    var qhtml=String(it.q||"").replace(/____/g,'<input class="blank-in" id="blankIn" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="…">');
    if(qhtml.indexOf("blank-in")<0) qhtml=esc(it.q)+' <input class="blank-in" id="blankIn" autocomplete="off" placeholder="…">';
    var eg=it.eg?'<div class="eg"><span class="eg-lab">举例</span>'+it.eg+'</div>':'';
    $("pracMain").innerHTML='<p class="blank-q">'+qhtml+'</p>'+eg+'<div class="feedback" id="blankFb"></div>'+
      '<div class="actions" id="blankActs"><button type="button" class="btn pri full" id="blankCheck">核对</button><a class="btn full" href="#kp/'+id+'">退出</a></div>';
    var inp=$("blankIn"); if(inp){inp.focus(); inp.onkeydown=function(e){if(e.key==="Enter"){e.preventDefault(); check()}}}
    $("blankCheck").onclick=check;
    function check(){
      var inp=$("blankIn"); if(!inp)return;
      var ok=blankOk(it,inp.value);
      var fb=$("blankFb"), acts=$("blankActs");
      inp.classList.remove("ok","bad");
      if(ok){
        inp.classList.add("ok"); inp.disabled=true;
        if(!retry){right++; delWrong(keyOf(it))}
        fb.className="feedback ok"; fb.innerHTML='<div class="title">✔ 正确'+(retry?"（改正成功）":"")+'</div><div class="exp">'+(it.explain||("答案："+it.answer))+'</div>';
        acts.innerHTML='<button type="button" class="btn pri full" id="nextB">下一题 →</button>';
        $("nextB").onclick=function(){i++;show()};
      }else{
        inp.classList.add("bad");
        if(!retry) addWrong({key:keyOf(it),src:c.no+" 填空",q:it.q,options:[it.answer],answer:0,explain:it.explain||("答案："+it.answer)});
        fb.className="feedback bad"; fb.innerHTML='<div class="title">✘ 再看看</div><div class="small">参考答案：'+esc(it.answer)+'</div><div class="exp">'+(it.explain||"")+'</div><div class="small muted" style="margin-top:6px">已记入错题本。点「再写一次」自己填对一遍。</div>';
        acts.innerHTML='<button type="button" class="btn bad" id="retryB">↺ 再写一次</button><button type="button" class="btn" id="nextB">下一题 →</button>';
        $("retryB").onclick=function(){retry=true; inp.disabled=false; inp.value=""; inp.classList.remove("bad"); fb.innerHTML=""; acts.innerHTML='<button type="button" class="btn pri full" id="blankCheck">核对</button><a class="btn full" href="#kp/'+id+'">退出</a>'; $("blankCheck").onclick=check; inp.focus()};
        $("nextB").onclick=function(){i++;show()};
      }
    }
  }
  show();
}


route();
})();

/* theme: dark default, optional day */
(function(){
  var KEY="ruankao.theme";
  function apply(t){
    if(t==="day") document.documentElement.setAttribute("data-theme","day");
    else document.documentElement.removeAttribute("data-theme");
    try{localStorage.setItem(KEY,t||"")}catch(e){}
    var bar=document.getElementById("themeToggle");
    if(!bar) return;
    [].forEach.call(bar.querySelectorAll("button"),function(b){
      b.classList.toggle("on",(b.getAttribute("data-t")||"")===(t||""));
    });
  }
  var saved=""; try{saved=localStorage.getItem(KEY)||""}catch(e){}
  // migrate old light-default keys: ""/light → dark default; "night" → dark; only "day" keeps cream
  if(saved==="day") apply("day");
  else apply("");
  document.addEventListener("click",function(e){
    var b=e.target.closest&&e.target.closest("#themeToggle button");
    if(!b) return;
    apply(b.getAttribute("data-t")||"");
  });
})();
