(function(){
"use strict";
/* AdventureSpark. Reads window.ADVENTURES (data.js) and window.AS_CONFIG (set by each page).
   AS_CONFIG: lists = the lists this page can switch between without reloading, start = the list shown first,
   root = path back to the site root, hash = true when every list lives in one page and is chosen by #hash. */
const DATA=window.ADVENTURES||{adults:[],kids:[],sheffield:[]};
const CFG=Object.assign({lists:["adults","kids"],start:"adults",root:"",hash:false},window.AS_CONFIG||{});

const CATS=[
  {k:"outdoor",n:"Outdoor",h:"get out into the open"},
  {k:"creative",n:"Creative",h:"make something"},
  {k:"food",n:"Food",h:"eat and drink something new"},
  {k:"wellness",n:"Wellness",h:"slow down and recharge"},
  {k:"urban",n:"Urban",h:"streets, shops and sights"},
  {k:"social",n:"Social",h:"spend it with other people"}
];
const CI={};CATS.forEach(function(c,i){CI[c.k]=i});
const TWISTS=[
  {n:"Pocket the phone",d:"Your phone stays in your pocket until you finish. Emergencies and the map are the only exceptions."},
  {n:"One photo",d:"Take exactly one photo, and choose it carefully."},
  {n:"Report back",d:"Tell one person about it before bed."},
  {n:"Start now",d:"Start within ten minutes of this roll. No planning."},
  {n:"Stretch it",d:"Make it 20% bigger: a little longer, further or braver than planned."},
  {n:"Clean roll",d:"No twist. Do it your way."}
];
const LISTS={
  adults:{name:"Without kids",h1:"Roll for your next small adventure.",
    lede:function(n){return n+" small adventures in six categories. One die picks the kind, the other adds a twist. Set what you have to spend, then let chance decide."}},
  kids:{name:"With kids",h1:"Roll for your next family adventure.",
    lede:function(n){return n+" adventures for babies, toddlers, children and teenagers. One die picks the kind, the other adds a twist. Choose an age, then let chance decide."}},
  sheffield:{name:"Sheffield",h1:"Roll for a Sheffield adventure.",
    lede:function(n){return n+" adventures in and around Sheffield and the Peak District. One die picks the kind, the other adds a twist. Set your time and effort, then let chance decide."}}
};
const AGES=[["baby","Baby"],["toddler","Toddler"],["child","Child"],["teenager","Teenager"]];
const AGEL={};AGES.forEach(function(a){AGEL[a[0]]=a[1]});
const REACH_SHEF=[[0,"In the city"],[1,"Short trip"],[2,"Anywhere"]];
const FILTERS=[
  {k:"age",label:"Age of child",only:"kids",opts:AGES,test:function(a,v){return !!a.ages&&a.ages.indexOf(v)>-1}},
  {k:"mins",nested:true,label:"Time I have",opts:[[30,"30 min"],[90,"90 min"],[240,"Half day"],[600,"All day"],[2880,"Weekend"]],test:function(a,v){return a.mins<=v}},
  {k:"spend",nested:true,label:"Spend up to",opts:[[0,"Free"],[1,"Budget"],[2,"Moderate"],[3,"Splurge"]],test:function(a,v){return a.spend<=v}},
  {k:"effort",nested:true,label:"Energy",opts:[[1,"Gentle"],[2,"Up to steady"],[3,"Bring it on"]],test:function(a,v){return a.effort<=v}},
  {k:"who",label:"Company",opts:[["s","Just me"],["p","Two of us"],["g","A group"]],test:function(a,v){return a.who.indexOf(v)>-1}},
  {k:"where",label:"Setting",opts:[["in","Indoors"],["out","Outdoors"]],test:function(a,v){return a.where==="any"||a.where===v}},
  {k:"light",label:"Light",opts:[["day","Daylight"],["night","After dark"]],test:function(a,v){return a.light==="any"||a.light===v}},
  {k:"reach",nested:true,label:"Reach",opts:[[0,"From my door"],[1,"Short trip"],[2,"Anywhere"]],test:function(a,v){return a.reach<=v}}
];
const TL={30:"30 min",60:"About an hour",90:"About 90 min",240:"Half a day",600:"A full day",2880:"A weekend"};
const PL=["Free","Budget","Moderate","Splurge"];
const EL=["","Gentle","Steady","Big effort"];
const WL={"in":"Indoors","out":"Outdoors","any":"Indoors or out"};
const LL={"day":"Daylight","night":"After dark","any":""};
function reachLabel(r){return (listKey==="sheffield"?["In Sheffield","Short trip out","Day trip"]:["From your door","Short trip","Day trip"])[r]}

const MONTH=new Date().getMonth();
const WARM=MONTH>=3&&MONTH<=8;
const EVERY=[].concat(DATA.adults,DATA.kids,DATA.sheffield);
let listKey=CFG.start,ALL=DATA[listKey]||[];
const state={age:null,mins:null,spend:null,effort:null,who:null,where:null,light:null,reach:null,season:true};
const held=[false,false];
let cur={adv:null,cat:0,twist:0};
let rolling=false;
let seen=new Set();
const reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $=function(id){return document.getElementById(id)};
const chipRefs={};

function loadDone(){
  try{
    const v=JSON.parse(localStorage.getItem("adventurespark-done")||"[]");
    return Array.isArray(v)?v.filter(function(x){return x&&typeof x.t==="string"}):[];
  }catch(e){return []}
}
let done=loadDone();
function saveDone(){try{localStorage.setItem("adventurespark-done",JSON.stringify(done))}catch(e){}}
function isDone(t){return done.some(function(x){return x.t===t})}

function activeFilters(){return FILTERS.filter(function(f){return !f.only||f.only===listKey})}
function seasonOK(a){return !a.season||(a.season==="w")===WARM}
function matches(a,skip){
  if(skip!=="season"&&state.season&&!seasonOK(a))return false;
  return activeFilters().every(function(f){return f.k===skip||state[f.k]==null||f.test(a,state[f.k])});
}
function pool(skip){return ALL.filter(function(a){return matches(a,skip)})}

function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function pips(n){
  const P={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]}[n];
  let h="";
  for(let i=0;i<9;i++)h+="<i"+(P.indexOf(i)>-1?' class="on"':"")+"></i>";
  return h;
}
function setDice(c,t){
  $("die1").innerHTML=pips(c+1);
  $("die2").innerHTML=pips(t+1);
  $("die1").setAttribute("aria-pressed",String(held[0]));
  $("die2").setAttribute("aria-pressed",String(held[1]));
  $("die1").setAttribute("aria-label","Hold category die. Showing "+(c+1)+", "+CATS[c].n+".");
  $("die2").setAttribute("aria-label","Hold twist die. Showing "+(t+1)+", "+TWISTS[t].n+".");
  $("lab1").textContent=(c+1)+" · "+CATS[c].n+(held[0]?" · held":"");
  $("lab2").textContent=(t+1)+" · "+TWISTS[t].n+(held[1]?" · held":"");
}
function chipsFor(a){
  const out=[TL[a.mins],PL[a.spend],EL[a.effort],WL[a.where]+(LL[a.light]?", "+LL[a.light].toLowerCase():""),reachLabel(a.reach)];
  if(a.ages&&a.ages.length)out.push("Ages: "+a.ages.map(function(x){return AGEL[x]}).join(", "));
  return out;
}

function renderCard(label,note){
  const a=cur.adv,tw=TWISTS[cur.twist];
  $("card").innerHTML=
    '<p class="tag">'+esc(label)+' · Face '+(cur.cat+1)+' · '+esc(CATS[cur.cat].n)+'</p>'+
    '<h2 class="adv-title">'+esc(a.title)+'</h2>'+
    '<p class="adv-desc">'+esc(a.desc)+'</p>'+
    '<ul class="chips">'+chipsFor(a).map(function(c){return '<li>'+esc(c)+'</li>'}).join("")+'</ul>'+
    (a.kit&&a.kit.length?'<p class="kit"><b>You will need</b> · '+esc(a.kit.join(", "))+'</p>':'')+
    (a.tip?'<p class="kit"><b>Tip</b> · '+esc(a.tip)+'</p>':'')+
    '<div class="twist"><p class="tag">Twist die · Face '+(cur.twist+1)+' · '+esc(tw.n)+'</p><p>'+esc(tw.d)+'</p></div>'+
    (note?'<p class="note">'+esc(note)+'</p>':'')+
    '<div class="actions"><button class="btn" id="doneBtn" type="button"></button><button class="btn" id="grabBtn" type="button">Screen grab</button><span id="toast" role="status"></span></div>';
  syncDoneBtn();
  $("doneBtn").onclick=function(){
    if(isDone(a.title))done=done.filter(function(x){return x.t!==a.title});
    else done.push({t:a.title,ts:Date.now()});
    saveDone();syncDoneBtn();renderPassport();
  };
  $("grabBtn").onclick=grab;
}
function syncDoneBtn(){
  const b=$("doneBtn");if(!b)return;
  const d=isDone(cur.adv.title);
  b.textContent=d?"Done · undo":"Mark as done";
  b.setAttribute("aria-pressed",String(d));
}

function renderEmpty(){
  let best=null;
  activeFilters().forEach(function(f){
    if(state[f.k]!=null){
      const n=pool(f.k).length;
      if(!best||n>best.n)best={k:f.k,n:n,label:f.label};
    }
  });
  if(state.season){
    const n=pool("season").length;
    if(!best||n>best.n)best={k:"season",n:n,label:"Season"};
  }
  const relax=best&&best.n>0;
  $("card").innerHTML=
    '<p class="tag">No match</p>'+
    '<h2 class="adv-title">Nothing fits that combination.</h2>'+
    '<p class="adv-desc">'+(relax?'Relaxing one constraint unlocks '+best.n+(best.n===1?' adventure':' adventures')+'.':'These constraints rule out every adventure. Reset them and try a looser mix.')+'</p>'+
    '<div class="empty-actions">'+(relax?'<button class="btn primary" id="relaxBtn" type="button">Drop “'+esc(best.label)+'”</button>':'')+'<button class="btn" id="resetBtn2" type="button">Reset all</button></div>';
  if(relax)$("relaxBtn").onclick=function(){
    if(best.k==="season"){state.season=false;$("season").checked=false}
    else state[best.k]=null;
    syncFilters();updateCount();roll(false);
  };
  $("resetBtn2").onclick=resetAll;
}

function updateCount(){
  const p=pool();
  const active=activeFilters().filter(function(f){return state[f.k]!=null}).length;
  $("count").textContent=p.length+" of "+ALL.length+" fit"+(active?" · "+active+(active===1?" filter":" filters"):"");
  const counts=CATS.map(function(){return 0});
  p.forEach(function(a){counts[CI[a.cat]]++});
  $("legend").innerHTML=CATS.map(function(c,i){
    return '<li><span class="n">'+(i+1)+'</span><span>'+esc(c.n)+'<span class="h">'+esc(c.h)+'</span></span><span class="c">'+counts[i]+'</span></li>';
  }).join("");
}

function renderFilters(){
  const host=$("filters");host.innerHTML="";
  Object.keys(chipRefs).forEach(function(k){delete chipRefs[k]});
  activeFilters().forEach(function(f){
    const g=document.createElement("div");g.className="fgroup";
    const l=document.createElement("p");l.className="flabel";l.id="fl-"+f.k;l.textContent=f.label;
    const row=document.createElement("div");row.className="chips-row";
    row.setAttribute("role","radiogroup");row.setAttribute("aria-labelledby",l.id);
    chipRefs[f.k]=[];
    const all=(f.k==="reach"&&listKey==="sheffield")?REACH_SHEF:f.opts;
    // Offer only choices that change the result on this list: no chip that matches nothing, and no stepped chip that repeats the one before it.
    let prev=-1;
    const opts=all.filter(function(o){
      const n=ALL.filter(function(a){return f.test(a,o[0])}).length;
      const keep=n>0&&!(f.nested&&n===prev);
      prev=n;return keep;
    });
    [[null,"Any"]].concat(opts).forEach(function(o){
      const b=document.createElement("button");b.type="button";b.className="chip";b.textContent=o[1];
      b.setAttribute("role","radio");
      b.onclick=function(){state[f.k]=o[0];syncFilters();updateCount()};
      b.onkeydown=function(e){
        const list=chipRefs[f.k];const i=list.findIndex(function(r){return r.b===b});
        let n=-1;
        if(e.key==="ArrowRight"||e.key==="ArrowDown")n=(i+1)%list.length;
        else if(e.key==="ArrowLeft"||e.key==="ArrowUp")n=(i-1+list.length)%list.length;
        else if(e.key==="Home")n=0;
        else if(e.key==="End")n=list.length-1;
        if(n<0)return;
        e.preventDefault();state[f.k]=list[n].v;syncFilters();updateCount();list[n].b.focus();
      };
      row.appendChild(b);chipRefs[f.k].push({v:o[0],b:b});
    });
    g.appendChild(l);g.appendChild(row);host.appendChild(g);
  });
  syncFilters();
}
function syncFilters(){
  activeFilters().forEach(function(f){
    chipRefs[f.k].forEach(function(r){const on=state[f.k]===r.v;r.b.setAttribute("aria-checked",String(on));r.b.tabIndex=on?0:-1});
  });
}
function resetAll(){
  FILTERS.forEach(function(f){state[f.k]=null});
  state.season=true;$("season").checked=true;
  syncFilters();updateCount();
}

function tumble(cat,twist,cb){
  if(reduce){setDice(cat,twist);cb();return}
  rolling=true;$("stage").classList.add("rolling");$("rollBtn").setAttribute("aria-disabled","true");$("rollBtn2").setAttribute("aria-disabled","true");
  let n=0;
  const iv=setInterval(function(){
    n++;
    if(n<10){
      setDice(held[0]?cur.cat:Math.floor(Math.random()*6),held[1]?cur.twist:Math.floor(Math.random()*6));
    }else{
      clearInterval(iv);setDice(cat,twist);
      rolling=false;$("stage").classList.remove("rolling");$("rollBtn").removeAttribute("aria-disabled");$("rollBtn2").removeAttribute("aria-disabled");
      cb();
    }
  },85);
}

function roll(fromPanel){
  if(rolling)return;
  const p=pool();
  if(!p.length){renderEmpty();return}
  let cands=p.filter(function(a){return !seen.has(a.title)&&!isDone(a.title)});
  if(!cands.length)cands=p.filter(function(a){return !seen.has(a.title)});
  if(!cands.length){p.forEach(function(a){seen.delete(a.title)});cands=p}
  let note="";
  let cat;
  if(held[0]&&cands.some(function(a){return CI[a.cat]===cur.cat}))cat=cur.cat;
  else{
    if(held[0]){held[0]=false;note="Your held die was released because nothing left under these filters matches that category."}
    const cs=[];cands.forEach(function(a){const i=CI[a.cat];if(cs.indexOf(i)<0)cs.push(i)});
    cat=cs[Math.floor(Math.random()*cs.length)];
  }
  const inCat=cands.filter(function(a){return CI[a.cat]===cat});
  const adv=inCat[Math.floor(Math.random()*inCat.length)];
  const twist=held[1]?cur.twist:Math.floor(Math.random()*6);
  seen.add(adv.title);
  $("sr").textContent="Rolling the dice";tumble(cat,twist,function(){
    cur={adv:adv,cat:cat,twist:twist};
    renderCard("Your roll",note);
    if(fromPanel){try{$("stage").scrollIntoView({block:"start",behavior:reduce?"auto":"smooth"})}catch(e){}}
  });
}

function renderPassport(){
  const byT={};EVERY.forEach(function(a){byT[a.title]=a});
  const counts=CATS.map(function(){return 0});
  done.forEach(function(x){const a=byT[x.t];if(a)counts[CI[a.cat]]++});
  const stamped=counts.filter(function(n){return n>0}).length;
  $("stats").textContent=done.length+" done · "+stamped+" of 6 categories stamped";
  $("stamps").innerHTML=CATS.map(function(c,i){
    return '<div class="stamp'+(counts[i]?' on':'')+'"><b>'+esc(c.n)+'</b><span>'+counts[i]+' done</span></div>';
  }).join("");
  const log=$("log");
  if(!done.length){
    log.innerHTML='<li><span class="t" style="color:var(--muted)">Nothing logged yet. Mark an adventure as done and it lands here.</span></li>';
    return;
  }
  log.innerHTML=done.slice(-6).reverse().map(function(x){
    const d=new Date(x.ts).toLocaleDateString("en-GB",{day:"numeric",month:"short"});
    return '<li><span class="t">'+esc(x.t)+'</span><span class="d">'+esc(d)+'</span><button type="button" data-ts="'+x.ts+'" data-t="'+esc(x.t)+'" aria-label="Remove '+esc(x.t)+' from log">Remove</button></li>';
  }).join("");
  Array.prototype.forEach.call(log.querySelectorAll("button"),function(b){
    b.onclick=function(){
      const ts=Number(b.getAttribute("data-ts")),t=b.getAttribute("data-t");
      done=done.filter(function(x){return !(x.ts===ts&&x.t===t)});
      saveDone();renderPassport();syncDoneBtn();
    };
  });
}

let grabCanvas=null;
function rrect(x,X,Y,w,h,r){x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+w,Y,X+w,Y+h,r);x.arcTo(X+w,Y+h,X,Y+h,r);x.arcTo(X,Y+h,X,Y,r);x.arcTo(X,Y,X+w,Y,r);x.closePath()}
function wrapLines(x,text,maxW){
  const words=text.split(" "),lines=[];let line="";
  words.forEach(function(w){
    const t=line?line+" "+w:w;
    if(x.measureText(t).width>maxW&&line){lines.push(line);line=w}else line=t;
  });
  if(line)lines.push(line);
  return lines;
}
function drawDie(x,X,Y,s,val,bg,deep,pip){
  rrect(x,X,Y+8,s,s,s*.21);x.fillStyle=deep;x.fill();
  rrect(x,X,Y,s,s,s*.21);x.fillStyle=bg;x.fill();
  const P={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]}[val];
  const pad=s*.165,cell=(s-2*pad)/3;
  x.fillStyle=pip;
  P.forEach(function(i){
    x.beginPath();x.arc(X+pad+cell*((i%3)+.5),Y+pad+cell*(Math.floor(i/3)+.5),cell*.4,0,Math.PI*2);x.fill();
  });
}
function grab(){
  const cs=getComputedStyle(document.documentElement);
  const v=function(n){return cs.getPropertyValue(n).trim()};
  const W=1080,M=96,TW=W-2*M;
  const go=function(){
    const a=cur.adv,tw=TWISTS[cur.twist];
    const big=document.createElement("canvas");big.width=W;big.height=3000;
    const x=big.getContext("2d");
    let y=M+6;
    drawDie(x,M,y,160,cur.cat+1,v("--d1"),v("--d1-deep"),v("--d1-pip"));
    drawDie(x,M+200,y,160,cur.twist+1,v("--d2"),v("--d2-deep"),v("--d2-pip"));
    y+=160+84;
    x.fillStyle=v("--muted");x.font='500 26px "DM Mono",monospace';
    try{x.letterSpacing="3px"}catch(e){}
    x.fillText(("Face "+(cur.cat+1)+" · "+CATS[cur.cat].n+"   Twist "+(cur.twist+1)).toUpperCase(),M,y);
    try{x.letterSpacing="0px"}catch(e){}
    y+=40;
    x.fillStyle=v("--fg");x.font='700 76px "Bricolage Grotesque",sans-serif';
    wrapLines(x,a.title,TW).forEach(function(l){y+=84;x.fillText(l,M,y)});
    y+=40;
    x.font='500 36px Figtree,sans-serif';
    wrapLines(x,a.desc,TW).forEach(function(l){y+=54;x.fillText(l,M,y)});
    y+=44;
    x.font='500 28px Figtree,sans-serif';
    let cx=M,cy=y;const ch=56;
    chipsFor(a).forEach(function(t){
      const w=x.measureText(t).width+40;
      if(cx+w>M+TW){cx=M;cy+=ch+14}
      rrect(x,cx,cy,w,ch,ch/2);x.strokeStyle=v("--line");x.lineWidth=2;x.stroke();
      x.fillStyle=v("--muted");x.fillText(t,cx+20,cy+37);
      cx+=w+12;
    });
    y=cy+ch+30;
    x.fillStyle=v("--muted");x.font='500 28px Figtree,sans-serif';
    if(a.kit&&a.kit.length)wrapLines(x,"You will need · "+a.kit.join(", "),TW).forEach(function(l){y+=42;x.fillText(l,M,y)});
    y+=44;
    const pad=36;
    x.font='500 34px Figtree,sans-serif';
    const tl=wrapLines(x,tw.d,TW-2*pad);
    const bh=pad+20+54+(tl.length-1)*48+pad;
    rrect(x,M,y,TW,bh,28);x.fillStyle=v("--tint");x.fill();
    x.fillStyle=v("--muted");x.font='500 24px "DM Mono",monospace';
    try{x.letterSpacing="3px"}catch(e){}
    x.fillText(("Twist · Face "+(cur.twist+1)+" · "+tw.n).toUpperCase(),M+pad,y+pad+20);
    try{x.letterSpacing="0px"}catch(e){}
    x.fillStyle=v("--fg");x.font='500 34px Figtree,sans-serif';
    tl.forEach(function(l,i){x.fillText(l,M+pad,y+pad+20+54+i*48)});
    y+=bh;
    const total=Math.max(1350,y+170);
    const out=document.createElement("canvas");out.width=W;out.height=total;
    const o=out.getContext("2d");
    o.fillStyle=v("--bg");o.fillRect(0,0,W,total);
    rrect(o,36,36,W-72,total-72,44);o.fillStyle=v("--surface");o.fill();o.strokeStyle=v("--line");o.lineWidth=2;o.stroke();
    o.drawImage(big,0,0);
    o.fillStyle=v("--muted");o.font='500 24px "DM Mono",monospace';
    try{o.letterSpacing="3px"}catch(e){}
    o.textAlign="left";o.fillText("ADVENTURESPARK"+(listKey==="sheffield"?" · SHEFFIELD":""),M,total-84);
    o.textAlign="right";o.fillText(new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}).toUpperCase(),W-M,total-84);
    grabCanvas=out;
    $("grabImg").src=out.toDataURL("image/png");
    $("grabMsg").textContent="";
    $("overlay").hidden=false;document.querySelector(".wrap").inert=true;
    $("grabClose").focus();
  };
  if(document.fonts&&document.fonts.load){
    Promise.all([document.fonts.load('700 76px "Bricolage Grotesque"'),document.fonts.load('500 34px Figtree'),document.fonts.load('500 24px "DM Mono"')]).then(go,go);
  }else go();
}

function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function strHash(s){let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return h}

/* List switching */
function listHref(k){
  if(CFG.hash)return "#"+k;
  if(k==="sheffield")return CFG.root+"sheffield/";
  if(k==="kids")return (CFG.root||"./")+"#kids";
  return CFG.root||"./";
}
function renderNav(){
  const nav=$("lists");nav.innerHTML="";
  ["adults","kids","sheffield"].forEach(function(k){
    const a=document.createElement("a");
    a.href=listHref(k);a.textContent=LISTS[k].name;
    if(k===listKey)a.setAttribute("aria-current","page");
    a.onclick=function(e){
      if(CFG.lists.indexOf(k)<0)return;
      e.preventDefault();
      if(k===listKey)return;
      switchList(k,true);
    };
    nav.appendChild(a);
  });
}
function dailyPick(){
  const d=new Date();
  const rnd=mulberry(d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()+strHash(listKey));
  let p=pool();if(!p.length)p=ALL;
  const adv=p[Math.floor(rnd()*p.length)];
  const twist=Math.floor(rnd()*6);
  cur={adv:adv,cat:CI[adv.cat],twist:twist};
  seen=new Set([adv.title]);
  setDice(cur.cat,twist);
  renderCard("Today's roll","");
}
function switchList(k,updateUrl){
  if(rolling||!DATA[k])return;
  listKey=k;ALL=DATA[k];
  held[0]=false;held[1]=false;
  FILTERS.forEach(function(f){state[f.k]=null});
  state.season=true;$("season").checked=true;
  $("h1").textContent=LISTS[k].h1;
  $("lede").textContent=LISTS[k].lede(ALL.length);
  renderNav();renderFilters();updateCount();dailyPick();
  if(updateUrl){
    try{
      const h=(k==="adults")?"":"#"+k;
      history.replaceState(null,"",location.pathname+location.search+h);
    }catch(e){}
  }
}
function listFromHash(){
  const h=(location.hash||"").replace("#","");
  return (CFG.lists.indexOf(h)>-1)?h:CFG.start;
}

function init(){
  document.documentElement.setAttribute("lang","en-GB");
  listKey=listFromHash();ALL=DATA[listKey]||[];
  $("h1").textContent=LISTS[listKey].h1;
  $("lede").textContent=LISTS[listKey].lede(ALL.length);
  $("seasonLabel").textContent="Match the season ("+(WARM?"warm":"cold")+" months)";
  $("season").onchange=function(){state.season=$("season").checked;updateCount()};
  $("die1").onclick=function(){if(rolling)return;held[0]=!held[0];setDice(cur.cat,cur.twist)};
  $("die2").onclick=function(){if(rolling)return;held[1]=!held[1];setDice(cur.cat,cur.twist)};
  $("rollBtn").onclick=function(){roll(false)};
  $("rollBtn2").onclick=function(){roll(true)};
  $("resetBtn").onclick=resetAll;
  function setRig(open){$("rig").classList.toggle("collapsed",!open);$("rigHead").setAttribute("aria-expanded",String(open));$("rigState").textContent=open?"Hide":"Show"}
  $("rigHead").onclick=function(){setRig($("rig").classList.contains("collapsed"))};
  setRig(false);
  function closeGrab(){$("overlay").hidden=true;document.querySelector(".wrap").inert=false;const b=$("grabBtn");if(b)b.focus()}
  $("grabClose").onclick=closeGrab;
  $("overlay").onclick=function(e){if(e.target===this)closeGrab()};
  document.addEventListener("keydown",function(e){
    if($("overlay").hidden)return;
    if(e.key==="Escape"){closeGrab();return}
    if(e.key==="Tab"){
      const f=[$("grabCopy"),$("grabClose")],i=f.indexOf(document.activeElement);
      if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus()}
      else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus()}
      else if(i<0){e.preventDefault();f[0].focus()}
    }
  });
  $("grabCopy").onclick=function(){
    const msg=$("grabMsg"),blocked="Copy is blocked here. Save the image instead.";
    try{
      const item=new ClipboardItem({"image/png":new Promise(function(res){grabCanvas.toBlob(res,"image/png")})});
      navigator.clipboard.write([item]).then(function(){msg.textContent="Image copied"},function(){msg.textContent=blocked});
    }catch(e){msg.textContent=blocked}
  };
  window.addEventListener("hashchange",function(){const k=listFromHash();if(k!==listKey)switchList(k,false)});
  renderNav();renderFilters();updateCount();dailyPick();
  renderPassport();
}
init();
})();
