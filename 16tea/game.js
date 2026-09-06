'use strict';
const $=id=>document.getElementById(id);
const {COLORS,NAMES}=Tea;
const SYMBOLS=['◒','❧','◈','✦'];
const KEY='tea16_moon_v1';
let profile={unlocked:0,stars:Array(8).fill(0),tool:'',seed:0,seen:[],active:null};
try{const p=JSON.parse(localStorage.getItem(KEY)||'null');if(p&&typeof p==='object'){profile.unlocked=Number.isInteger(p.unlocked)?Math.max(0,Math.min(8,p.unlocked)):0;profile.stars=Array.from({length:8},(_,i)=>Math.max(0,Math.min(3,Number(p.stars?.[i])||0)));profile.tool=['lens','spoon'].includes(p.tool)?p.tool:'';profile.seed=Number.isInteger(p.seed)?p.seed:0;profile.seen=Array.isArray(p.seen)?p.seen.filter(i=>Number.isInteger(i)&&i>=0&&i<8):[];profile.active=p.active||null;}}catch{}
let board,state,inspectMode=false,assisted=false,hinted=false,lastFocus,dialogKind='',effectTimer;
function persist(){try{localStorage.setItem(KEY,JSON.stringify(profile));}catch{}}
function saveActive(){profile.active={index:board.index,seed:profile.seed,state,assisted,hinted};persist();}
function say(text,kind=''){$('message').textContent=text;$('message').className='message '+kind;}
function ruleInfo(c=board){
 const effects=[];if(c.stock===1)effects.push('各色1回');if(c.double)effects.push(`${c.double}回目 ×2`);if(c.bloom)effects.push('同じ色の2回目は＋1');if(c.required)effects.push('指定の2色');
 return{title:effects.join(' / ')||'16ぴったりで完成。超えたら即失敗。',detail:c.double?'調べても「注ぐ順番」は進みません。':c.bloom?'手がかりは元の量。増えた量はボタンに表示。':c.required?'指定の色を入れる前に16になると注文失敗。':c.stock===1?'使い切った色は、もう注げません。':'注ぐ・調べる＝1手。各色は2回まで。'};
}
function begin(index,options={}){
 clearTimeout(effectTimer);board=Tea.createCase(index,profile.seed);state=Tea.initial(board,profile.tool);inspectMode=false;assisted=!!options.retry;hinted=false;
 closeDialog(false);$('pourNumber').textContent='';$('vessel').classList.remove('pour');render();saveActive();
 say(index===0&&!profile.seed?'残る量は2と3。緑は赤より多い。あと3を注ぐには？':['手がかりから、あと3の正体を見抜こう。','量がわかったら、3色で完成する道も探そう。','残りは各色1回。どの色を使う？','次の倍率を確かめて、注ぐ順番を考えよう。','同じ茶の2回目が＋1。濃さも計算に入れよう。','必須の2色を入れてから、16へ。','倍にする色が鍵。注ぐ順番を考えよう。','最後の一杯。必須の2色と、3回目の倍率を忘れずに。'][index]);
 if(options.brief&&index>0)brief();
}
function availableTool(){return profile.unlocked>=3;}
function drawProgress(){$('progress').innerHTML=Tea.CASES.map((_,i)=>`<i class="${profile.stars[i]>0?'done':i===board.index?'current':''}"></i>`).join('');$('progress').setAttribute('aria-label',`${profile.stars.filter(n=>n>0).length}席完成、全8席`);}
function render(){
 $('app').classList.toggle('dense',board.clues.length>2||!!board.required);
 $('caseNumber').textContent=`SEAT ${String(board.index+1).padStart(2,'0')} / 08`;$('caseTitle').textContent=board.title;drawProgress();
 const rule=ruleInfo();$('ruleTitle').textContent=rule.title;$('ruleDetail').textContent=rule.detail;$('ruleIcon').textContent=board.double?'響':board.bloom?'濃':board.required?'約':board.stock===1?'一':'葉';$('ruleIcon').parentElement.className='rule-card '+(board.index===7?'final':board.double?'echo':'');
 $('remaining').textContent=Math.abs(16-state.total);$('currentLabel').textContent=`いま ${state.total} / 16${state.total>16?' 超過':''}`;$('turns').textContent=state.left;$('pourCounter').textContent=`${state.pours}回 注いだ`;
 let bottom=0;$('layers').replaceChildren();for(const layer of state.layers){const el=document.createElement('div');el.className='layer '+(COLORS[layer.color]||'base');el.style.bottom=`${bottom*5}%`;el.style.height=`${layer.amount*5}%`;bottom+=layer.amount;$('layers').append(el);}
 $('clues').innerHTML=board.clues.map(c=>`<span class="clue">${Tea.clueText(c)}</span>`).join('');
 $('mission').hidden=board.index===0;
 $('mission').innerHTML=(board.required?`必須：${board.required.map(i=>`<span class="${state.used[i]?'met':''}">${state.used[i]?'✓':'○'} ${NAMES[i]}</span>`).join('')}`:'')+`<small>☆ ${Tea.bonusText(board).replace('色を使って完成','色で完成')}（任意）</small>`;
 const multi=Tea.multiplier(board,state);$('actionLabel').textContent=inspectMode?'調べるお茶を選ぶ（注ぎません）':'お茶を選んで注ぐ';
 $('nextEffect').textContent=board.double?`次の注ぎ：×${multi}${multi===2?'！':''}`:board.bloom?'二度目は＋1':'タップで1回 注ぐ';$('nextEffect').className=multi===2?'double':'';
 for(let i=0;i<4;i++){
  const btn=$('tea-'+i),options=Tea.candidates(state,i),known=options.length===1;
  const amounts=options.map(v=>(v+(board.bloom?state.used[i]:0))*multi),val=amounts[0];
  const left=(board.stock||2)-state.used[i],spent=left<=0;
  btn.disabled=state.status!=='playing'||(inspectMode?(state.inspected>0||known):spent);
  btn.className=`tea-btn ${COLORS[i]}${inspectMode&&!known?' inspect-target':''}${!inspectMode&&amounts.every(v=>state.total+v>16)?' danger':''}${!inspectMode&&known&&state.total+val===16&&Tea.requiredMet(board,{...state,used:state.used.map((v,j)=>v+(j===i?1:0))})?' exact':''}`;
  btn.querySelector('.tea-stock').textContent=`残${left}回`;
  btn.querySelector('.tea-value').textContent=spent&&!inspectMode?'—':inspectMode?'調べる':known?'+'+val:multi===2?'? ×2':'?';
  let detail=spent&&!inspectMode?'茶葉を使い切りました':inspectMode?(known?'量は判明済み':`${state.tool==='lens'?'0':'1'}手で元の量を確認`):known?`→ 合計${state.total+val}${state.total+val>16?' · 超過！':state.total+val===16?' · 16到達':''}`:`元の候補 ${options.join(' / ')}`;
  if(!spent&&!inspectMode&&known&&board.bloom&&state.used[i])detail=`元${options[0]}＋濃さ${state.used[i]} → 合計${state.total+val}`;
  if(!spent&&!inspectMode&&!known&&amounts.some(v=>state.total+v>16))detail+=' · 超過に注意';
  btn.querySelector('.tea-detail').textContent=detail;
  btn.setAttribute('aria-label',`${NAMES[i]} ${inspectMode?'調べる':known?'プラス'+val:'量は未確認'}。${detail}。残り${left}回`);
 }
 $('inspectButton').disabled=state.status!=='playing'||state.inspected>0||[0,1,2,3].every(i=>Tea.candidates(state,i).length===1);
 $('inspectButton').className=inspectMode?'active':'';$('inspectButton').innerHTML=inspectMode?'調べるのをやめる':state.inspected?'調査済み':`量を調べる<small>${state.tool==='lens'?'透かし眼鏡 · 手数0':'注がずに確認 · 1手 / 1回'}</small>`;
 $('toolButton').hidden=state.tool!=='spoon';$('toolButton').disabled=state.status!=='playing'||state.spoon||state.total===0;$('toolButton').className='tool';$('toolButton').innerHTML=state.spoon?'茶匙 使用済み':'月の茶匙 −1<small>手数0 · 1回</small>';
 $('notesButton').textContent=state.log.length?'記録 '+state.log.length:'注いだ記録';
}
function act(action){
 if(!$('overlay').hidden||state.status!=='playing')return;
 const before=state;const next=Tea.transition(board,state,action);if(before===next)return;
 state=next;inspectMode=false;render();
 if(action.type==='pour'){
  const amount=state.total-before.total;clearTimeout(effectTimer);$('pourNumber').textContent='+'+amount;$('vessel').classList.remove('pour');void $('vessel').offsetWidth;$('vessel').classList.add('pour');effectTimer=setTimeout(()=>{$('pourNumber').textContent='';$('vessel').classList.remove('pour');},450);
  const extra=board.bloom&&state.used[action.color]===1?' 同じ茶の次の量は＋1。':'';
  say(`${NAMES[action.color]}を＋${amount}。${before.total} → ${state.total}。${extra}`,16-state.total<=4?'warning':'');
 }else if(action.type==='inspect')say(`${NAMES[action.color]}の元の量は ${board.values[action.color]}。お茶の量はそのまま。`,'inspect');
 else say('月の茶匙で −1。まだ間に合う。次の一手を考えよう。');
 saveActive();if(state.status!=='playing')result();
}
function openDialog(html,kind){lastFocus=document.activeElement;dialogKind=kind;$('dialog').innerHTML=html;$('overlay').hidden=false;$('app').inert=true;$('dialog').scrollTop=0;$('dialog').focus();}
function closeDialog(restore=true){$('overlay').hidden=true;$('app').inert=false;dialogKind='';if(restore&&lastFocus?.isConnected&&!lastFocus.disabled)lastFocus.focus();}
function click(id,fn){$(id).onclick=fn;}
function intro(){
 const resume=validActive(profile.active);
 openDialog(`<div class="intro-art" aria-hidden="true"><div class="moon"></div></div><span class="eyebrow">EIGHT SEATS, ONE SECRET</span><h2 id="dialogTitle">十六夜の茶会</h2><p class="lead">招待状は八通。<br>一杯ごとに、違う謎が待っている。</p><div class="equation"><span>13</span>＋<b>?</b>＝<span>16</span></div><div class="intro-steps"><div><strong>1.</strong>4色の量は、1・2・3・4がひとつずつ。</div><div><strong>2.</strong>手がかりを読んで、お茶を選んで注ぐ。</div><div><strong>3.</strong>16ぴったりで完成。超えた瞬間に失敗。</div></div><button class="primary" id="enter">${resume?'途中の席に戻る':profile.unlocked?'次の席へ':'最初の謎を解く'}</button>${profile.unlocked?'<button class="secondary" id="introMap">八席の地図を見る</button>':''}<p class="small">時間制限なし。最初の謎は、ひと注ぎで解けます。</p>`,'intro');
 click('enter',()=>resume?restoreActive():profile.unlocked>=8?ending():begin(profile.unlocked,{brief:profile.unlocked>0}));if($('introMap'))click('introMap',map);
}
function brief(){profile.seen.push(board.index);profile.seen=[...new Set(profile.seen)];persist();
 openDialog(`<span class="eyebrow">${board.feature}</span><h2 id="dialogTitle">${board.title}</h2><p class="story">${board.story}</p><div class="feature-preview"><strong>${ruleInfo().title}</strong>${board.lesson}</div><div class="optional">☆ もうひと工夫：${Tea.bonusText(board)}<br>このお願いは、達成しなくても次へ進めます。</div><button class="primary" id="startSeat">手がかりを読む</button>`,'brief');click('startSeat',()=>closeDialog(false));
}
function marks(){return[true,!state.inspected&&!state.spoon&&!hinted,Tea.bonusMet(board,state)];}
function result(){
 const won=state.status==='won',m=won?marks():[false,false,false],stars=m.filter(Boolean).length;
 if(won){profile.stars[board.index]=Math.max(profile.stars[board.index],stars);profile.unlocked=Math.max(profile.unlocked,board.index+1);saveActive();drawProgress();}
 const title=won?'16ぴったり。':state.reason==='overflow'?`${state.total}。こぼれてしまった。`:state.reason==='order'?'16。でも、約束がひとつ。':state.reason==='stock'?'茶葉を使い切った。':'あと一手、足りなかった。';
 const loss=state.reason==='overflow'?`16を${state.total-16}超えたため、この一杯は失敗。`:
 state.reason==='order'?`${board.required.filter(i=>!state.used[i]).map(i=>NAMES[i]).join('・')}が入っていません。指定の色を使ってから16にしよう。`:'調べる手数と、注ぐ回数を組み直してみよう。';
 const path=Tea.solve(board),pathBonus=Tea.solve(board,Tea.initial(board),true);
 openDialog(`<span class="eyebrow">${won?'SEAT COMPLETE':'THE NEXT CUP IS YOURS'}</span><h2 id="dialogTitle">${title}</h2>${won?`<div class="stamps" aria-label="星${stars}つ">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</div><div class="stamp-details"><span class="earned">16で完成</span><span class="${m[1]?'earned':''}">サポートなし</span><span class="${m[2]?'earned':''}">${Tea.bonusText(board)}</span></div>`:`<p>${loss}<br>この席から、何度でもやり直せます。</p>`}<div class="answers">${won?NAMES.map((n,i)=>`<span class="${COLORS[i]}">${n} ${board.values[i]}</span>`).join(''):''}</div>${won?`<p class="result-note">${board.index===0?`正解。${Tea.clueText(board.clues[0])}。${NAMES[board.clues[0][1]]}は${board.values[board.clues[0][1]]}とわかる。`:m[2]?'お見事。量だけでなく、組み立て方まで読み切った。':`完成！ 次は「${Tea.bonusText(board)}」という別の解も探せます。`}</p>`:''}<details><summary>${won?'自分の注ぎ方を見る':'解き方を見る'}</summary><div class="solution">${won?historyHTML():recipeHTML(path)}</div></details>${won&&!m[2]?`<details><summary>お願いを満たす解の一例</summary><div class="solution">${recipeHTML(pathBonus)}</div></details>`:''}<button class="primary" id="resultNext">${won?(board.index===7?'招待状の続きを読む':board.index===2&&!profile.tool?'茶器をひとつ選ぶ':'次の席へ'):'同じ席でもう一度'}</button>${won?'<button class="secondary" id="retrySeat">この席でもう一度工夫する</button>':''}<button class="secondary" id="resultMap">八席の地図へ</button>`,'result');
 click('resultNext',()=>won?advance():begin(board.index,{retry:true}));if($('retrySeat'))click('retrySeat',()=>begin(board.index,{retry:true}));click('resultMap',map);
}
function recipeHTML(path){if(!path)return'別の配合を試してみよう。';let s=Tea.initial(board);return`開始 ${board.start}<br>`+path.map(a=>{const n=Tea.transition(board,s,a);const text=`${a.type==='spoon'?'茶匙':NAMES[a.color]} ${n.total-s.total>0?'+':''}${n.total-s.total} → ${n.total}`;s=n;return text;}).join('<br>');}
function advance(){if(board.index===7){ending();return;}if(board.index===2&&!profile.tool){chooseTool(()=>begin(3,{brief:true}));return;}begin(board.index+1,{brief:true});}
function chooseTool(after){
 openDialog(`<span class="eyebrow">A GIFT FROM THE TEA MASTER</span><h2 id="dialogTitle">旅の相棒を、ひとつ。</h2><p class="story">「量を見抜くか。最後に整えるか。<br>ここからの茶器は、少し気まぐれだよ。」</p><button class="tool-choice ${profile.tool==='lens'?'selected':''}" id="lensChoice"><strong>◈ 透かし眼鏡</strong><span>1色を、手数を使わず調べられる。<br>情報を集めて、確実に組み立てたい人へ。</span></button><button class="tool-choice ${profile.tool==='spoon'?'selected':''}" id="spoonChoice"><strong>☽ 月の茶匙</strong><span>手数を使わず、合計を1減らせる。<br>量を読み切って、組み合わせを広げたい人へ。</span></button><p class="small">各席で1回。こぼれた後には使えません。<br>地図から選び直せます。変更は次に始める席から。</p>`,'tool');
 for(const tool of ['lens','spoon'])click(tool+'Choice',()=>{profile.tool=tool;persist();after();});
}
function map(){
 openDialog(`<span class="eyebrow">THE EIGHT INVITATIONS</span><h2 id="dialogTitle">八席の旅</h2><p class="small">${profile.stars.filter(n=>n>0).length} / 8 席完成 · 星 ${profile.stars.reduce((a,b)=>a+b,0)} / 24<br>各席に、違う組み立て方があります。</p><div class="route-map">${Tea.CASES.map((c,i)=>`<button id="seat${i}" ${i>profile.unlocked?'disabled':''}><small>第${i+1}席 · ${i>profile.unlocked?'未到着':c.feature.replace('NEW · ','')}</small><strong>${i>profile.unlocked?'まだ見ぬ招待状':c.title}</strong><span>${i>profile.unlocked?'◇ ◇ ◇':'★'.repeat(profile.stars[i])+'☆'.repeat(3-profile.stars[i])}</span></button>`).join('')}</div>${availableTool()?`<button class="secondary" id="changeTool">相棒：${profile.tool==='lens'?'透かし眼鏡':profile.tool==='spoon'?'月の茶匙':'未選択'} · 選び直す</button>`:''}${state?.status==='playing'?'<button class="primary" id="mapResume">いまの一杯に戻る</button>':''}${profile.unlocked===8?'<button class="secondary" id="newLabels">配合のラベルを変えて、もう一周</button>':''}`,'map');
 for(let i=0;i<=Math.min(7,profile.unlocked);i++)click('seat'+i,()=>{const go=()=>begin(i,{brief:i>0});if(state?.status==='playing'&&state.log.length){confirmLeave(go);}else go();});
 if($('mapResume'))click('mapResume',()=>closeDialog(false));if($('changeTool'))click('changeTool',()=>chooseTool(map));if($('newLabels'))click('newLabels',()=>{profile.seed=(Date.now()>>>0)||1;profile.active=null;persist();begin(0);});
}
function confirmLeave(after){openDialog('<h2 id="dialogTitle">別の席へ移りますか？</h2><p>いま注いでいる一杯は、最初からになります。<br>獲得した星は残ります。</p><button class="primary" id="leaveSeat">別の席を始める</button><button class="secondary" id="keepSeat">いまの一杯に戻る</button>','confirm');click('leaveSeat',after);click('keepSeat',()=>closeDialog(false));}
function ending(){
 profile.active=null;persist();openDialog(`<div class="ending"><div class="intro-art" aria-hidden="true"><div class="moon"></div></div><span class="eyebrow">THE NINTH SEAT</span><h2 id="dialogTitle">九つ目の席は、<br>茶師の席。</h2><p class="story">「招待したのは、客としてじゃない。<br>この茶房を、君に継いでほしかったんだ。」</p><p>見抜く。試す。順番を変える。<br>八つの謎を解いたあなたが、次の茶師です。</p><div class="stamps">☽</div><p class="small">八席踏破 · 星 ${profile.stars.reduce((a,b)=>a+b,0)} / 24<br>まだ満たしていない注文にも、別の解が待っています。</p><button class="primary" id="endingMap">残った注文を探す</button><button class="secondary" id="endingRemix">ラベルを変えて、新しい茶会へ</button></div>`,'ending');click('endingMap',map);click('endingRemix',()=>{profile.seed=(Date.now()>>>0)||1;persist();begin(0);});
}
function historyHTML(){return state.log.length?state.log.map((e,i)=>`${i+1}. ${e.type==='pour'?`${NAMES[e.color]} ＋${e.amount} → ${e.total}`:e.type==='inspect'?`${NAMES[e.color]}を調査：元の量${e.amount}`:'月の茶匙 −1 → '+e.total}`).join('<br>'):'まだ注いでいません。';}
function notes(){openDialog(`<span class="eyebrow">YOUR BREWING NOTES</span><h2 id="dialogTitle">注いだ記録</h2><p class="small">開始時は ${board.start}。元の量と、実際に注いだ量を分けて考えよう。</p><div class="history">${state.log.length?state.log.map(e=>`<div>${e.type==='pour'?`${NAMES[e.color]} ＋${e.amount}<b>合計 ${e.total}</b>`:e.type==='inspect'?`${NAMES[e.color]}を調べた <b>元の量 ${e.amount}</b>`:`月の茶匙 −1 <b>合計 ${e.total}</b>`}</div>`).join(''):'<p>まだ記録がありません。</p>'}</div><button class="primary" id="notesBack">お茶づくりに戻る</button>`,'notes');click('notesBack',()=>closeDialog());}
function help(){openDialog(`<span class="eyebrow">ONE CUP, ONE DEDUCTION</span><h2 id="dialogTitle">いまの席の遊び方</h2><ol class="help-list"><li>元の量は<strong>1・2・3・4が1色ずつ</strong>。手がかりを組み合わせ、? の量を考えます。</li><li>色のボタンを押すと、その量を注ぎます。<strong>16ぴったりで完成。超えたら即失敗。</strong></li><li>注ぐ・調べるは1手。調べる時は「量を調べる」→色を選択。お茶を増やさず、元の量を確認します。</li></ol><div class="feature-preview"><strong>${ruleInfo().title}</strong>${board.lesson}</div><p class="small">☆のお願いは任意。自力の推理・お願い達成で星が増えます。<br>道具・調査・考え方のヒントを使うと「サポートなし」の星はつきません。再挑戦では全ての星を狙えます。</p><button class="primary" id="helpBack">手がかりに戻る</button><button class="secondary" id="hintButton">考え方のヒントを見る</button>`,'help');click('helpBack',()=>closeDialog());click('hintButton',hint);}
function hint(){
 hinted=true;saveActive();
 const first=board.clues[0];const pair=[];for(let a=1;a<=4;a++)for(let b=1;b<=4;b++)if(a!==b&&(first[0]==='gt'?a>b:a+b===first[3]))pair.push(`${a}と${b}`);
 const text=first[0]==='sum'?`${NAMES[first[1]]}＋${NAMES[first[2]]}＝${first[3]}。同じ量は2色にありません。候補は${[...new Set(pair.map(p=>p.split('と').sort().join('と')))].join('、')}。大小の手がかりで、どちらがどちらかを決めよう。`:'わかっている色の量を1・2・3・4から除こう。残った量のうち、大きい方はどちらの色？';
 openDialog(`<span class="eyebrow">A NUDGE, NOT A GUESS</span><h2 id="dialogTitle">考え方のひと枝</h2><p class="lead">${text}</p><p class="small">候補表示は、見つけた量の消去だけ。<br>大小や合計の手がかりは、あなたが組み合わせる部分です。</p><button class="primary" id="hintBack">もう一度考える</button>`,'hint');click('hintBack',()=>{closeDialog(false);say('手がかりはすべて本当。元の量を見抜いてから、注ぐ順番を考えよう。');});
}
function validActive(a){
 if(!a||!Number.isInteger(a.index)||a.index<0||a.index>7||a.index>profile.unlocked||a.seed!==profile.seed||!a.state||!Array.isArray(a.state.log)||a.state.log.length>12)return false;
 try{const c=Tea.createCase(a.index,a.seed);let s=Tea.initial(c,['lens','spoon'].includes(a.state.tool)?a.state.tool:'');for(const e of a.state.log){const next=Tea.transition(c,s,{type:e.type,color:e.color});if(next===s)return false;s=next;}return JSON.stringify(s)===JSON.stringify(a.state);}catch{return false;}
}
function restoreActive(){const a=profile.active;if(!validActive(a)){begin(Math.min(7,profile.unlocked),{brief:true});return;}board=Tea.createCase(a.index,a.seed);state=a.state;assisted=!!a.assisted;hinted=!!a.hinted;inspectMode=false;closeDialog(false);render();say('途中の一杯から再開しました。手がかりと記録を確かめよう。');if(state.status!=='playing')result();}
for(let i=0;i<4;i++){const btn=document.createElement('button');btn.id='tea-'+i;btn.innerHTML=`<span class="tea-name"><span aria-hidden="true">${SYMBOLS[i]}</span> ${NAMES[i]}<span class="tea-stock"></span></span><span class="tea-value"></span><span class="tea-detail"></span>`;btn.onclick=()=>act({type:inspectMode?'inspect':'pour',color:i});$('teaButtons').append(btn);}
click('inspectButton',()=>{if(state.status!=='playing'||state.inspected||!$('overlay').hidden)return;inspectMode=!inspectMode;render();say(inspectMode?`調べる色を選ぼう。お茶は増えず、${state.tool==='lens'?'手数も使いません':'1手を使います'}。`:'注ぐ操作に戻りました。',inspectMode?'inspect':'');});click('toolButton',()=>act({type:'spoon'}));click('notesButton',notes);click('helpButton',help);click('mapButton',map);
document.addEventListener('keydown',event=>{if($('overlay').hidden){if(event.key==='Escape'&&inspectMode){inspectMode=false;render();}return;}if(event.key==='Escape'&&['help','notes','map','hint','confirm'].includes(dialogKind)){closeDialog();return;}if(event.key==='Tab'){const list=[...$('dialog').querySelectorAll('button:not(:disabled),summary')];const first=list[0],last=list[list.length-1];if(!first)return;if(event.shiftKey&&(document.activeElement===first||document.activeElement===$('dialog'))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===$('dialog'))){event.preventDefault();first.focus();}}});
// Draw a harmless first-seat backdrop without replacing an unfinished saved cup.
board=Tea.createCase(0,profile.seed);state=Tea.initial(board,profile.tool);render();say('手がかりから量を推理して、16ぴったり。');intro();
