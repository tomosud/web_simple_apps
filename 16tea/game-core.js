/* Pure rules. Also used by the browser and the dependency-free verifier. */
(function(root){
'use strict';
const COLORS=['red','green','blue','yellow'];
const NAMES=['赤茶','緑茶','青茶','黄茶'];
const CASES=[
 {title:'消えたラベル',subtitle:'まずは、ひとつ見抜く。',story:'「緑茶のラベルが消えてしまってね。残った量から、読めるかい？」',values:[2,3,1,4],start:13,turns:2,known:[2,3],clues:[['gt',1,0]],bonus:{kind:'pours',count:1},lesson:'4色には1・2・3・4がひとつずつ。青が1、黄が4なら、赤と緑に残る量は？',feature:'推理の入口'},
 {title:'ふたりの証言',subtitle:'足し算の先に、選び方。',story:'「赤と青を合わせて7。大きい方が赤だって。今度は、どう組み合わせよう？」',values:[4,1,3,2],start:5,turns:4,known:[1],clues:[['sum',0,2,7],['gt',0,2]],bonus:{kind:'colors',count:3},lesson:'完成の道はひとつじゃない。「3色使う」まで狙うなら、少し違う組み合わせを。',feature:'組み合わせ'},
 {title:'最後の茶葉',subtitle:'わかった量も、使い切れば終わり。',story:'「最後の茶葉だ。どの色も、たった一煎しか残っていない。」',values:[3,1,4,2],start:7,turns:4,known:[],clues:[['sum',0,1,4],['gt',0,1],['gt',2,3]],stock:1,bonus:{kind:'last',color:3},lesson:'この席だけ、各色は1回きり。量だけでなく、残す茶葉も考えよう。',feature:'NEW · 各色1回'},
 {title:'こだまの茶器',subtitle:'二煎目だけ、二倍になる。',story:'「この茶器は、二度目に注いだ量をこだまさせる。順番が、味を変えるよ。」',values:[1,4,2,3],start:3,turns:4,known:[0],clues:[['gt',1,3],['gt',3,2]],double:2,bonus:{kind:'colors',count:3},lesson:'2回目に「注ぐ」量だけ×2。調べても順番は進まない。次の倍率はいつも表示されるよ。',feature:'NEW · 二煎目×2'},
 {title:'目覚める茶葉',subtitle:'同じ茶葉が、少しずつ濃くなる。',story:'「一度使った茶葉は目を覚ます。同じ色をもう一度注ぐと、1だけ濃い。」',values:[2,4,3,1],start:4,turns:4,known:[3],clues:[['sum',0,2,5],['gt',2,0]],bloom:true,bonus:{kind:'colors',count:3},lesson:'同じ色の2回目は元の量＋1。たとえば3の茶葉なら、次は4。ボタンも更新されるよ。',feature:'NEW · 二度目＋1'},
 {title:'ふた色の約束',subtitle:'16だけでは、届かない注文。',story:'「赤の香りと緑の余韻。どちらも入れてほしい、と招待状には書いてある。」',values:[3,2,1,4],start:5,turns:5,known:[2],clues:[['sum',0,1,5],['gt',0,1]],required:[0,1],bonus:{kind:'last',color:1},lesson:'指定の2色を注いでから16へ。片方が入っていないまま16になると、注文失敗。',feature:'NEW · 指定の2色'},
 {title:'月下の一煎',subtitle:'一度きりの茶葉と、こだま。',story:'「覚えているかい。一煎だけの茶葉。二煎目に響く茶器。今度は、ふたつ一緒だ。」',values:[4,2,3,1],start:2,turns:5,known:[3],clues:[['sum',1,2,5],['gt',2,1]],stock:1,double:2,bonus:{kind:'last',color:2},lesson:'各色1回、2回目の注ぎだけ×2。どの色を倍にすれば、全部で14増やせる？',feature:'応用 · 一煎×こだま'},
 {title:'十六夜の招待状',subtitle:'最後の一杯は、あなたの推理で。',story:'「最後の席を、君に任せよう。三煎目にこだまする茶器で、約束のふた色を。」',values:[3,1,4,2],start:4,turns:5,known:[],clues:[['sum',0,1,4],['gt',0,1],['gt',2,3]],stock:1,double:3,required:[0,3],bonus:{kind:'colors',count:4},lesson:'各色1回、3回目の注ぎが×2。赤と黄を忘れずに。4色すべて使う、もうひとつの完成形もある。',feature:'FINAL · 三煎目の謎'}
];
function clone(x){return JSON.parse(JSON.stringify(x));}
function createCase(index,seed=0){
 const c=clone(CASES[index]);c.index=index;
 if(seed){let n=seed>>>0;const map=[0,1,2,3];for(let i=3;i>0;i--){n=(Math.imul(n,1664525)+1013904223)>>>0;const j=n%(i+1);[map[i],map[j]]=[map[j],map[i]];}
 const old=c.values;c.values=[];old.forEach((v,i)=>c.values[map[i]]=v);c.known=c.known.map(i=>map[i]);c.clues=c.clues.map(([kind,a,b,v])=>[kind,map[a],map[b],v]);if(c.required)c.required=c.required.map(i=>map[i]);if(c.bonus.kind==='last')c.bonus.color=map[c.bonus.color];
 // Narrative color references belong to the original recipe; remixed play uses live clue text.
 c.story='同じ茶器、新しいラベル。前の答えではなく、今日の手がかりを読もう。';c.lesson='配合のラベルが変わったよ。手がかり・茶器の効果・注文は、この画面の表示を確かめよう。';
 }return c;
}
function initial(c,tool=''){return{total:c.start,left:c.turns,used:[0,0,0,0],known:c.values.map((v,i)=>c.known.includes(i)?v:null),pours:0,inspected:0,spoon:false,tool,status:'playing',reason:'',last:null,layers:[{color:-1,amount:c.start}],log:[]};}
function multiplier(c,s){return c.double===s.pours+1?2:1;}
function amount(c,s,i){return(c.values[i]+(c.bloom?s.used[i]:0))*multiplier(c,s);}
function candidates(s,i){return s.known[i]!==null?[s.known[i]]:[1,2,3,4].filter(v=>!s.known.includes(v));}
function requiredMet(c,s){return(c.required||[]).every(i=>s.used[i]>0);}
function bonusMet(c,s){const b=c.bonus;return b.kind==='colors'?s.used.filter(n=>n>0).length>=b.count:b.kind==='last'?s.last===b.color:s.pours<=b.count;}
function transition(c,s,action){
 if(s.status!=='playing')return s;
 const i=action.color;
 if(action.type==='pour'&&(!Number.isInteger(i)||i<0||i>3||s.used[i]>=(c.stock||2)))return s;
 if(action.type==='inspect'&&(!Number.isInteger(i)||i<0||i>3||s.inspected||candidates(s,i).length===1))return s;
 if(action.type==='spoon'&&(s.tool!=='spoon'||s.spoon||s.total<1))return s;
 if(!['pour','inspect','spoon'].includes(action.type))return s;
 const n=clone(s);
 if(action.type==='pour'){const value=amount(c,s,i);n.total+=value;n.left--;n.used[i]++;n.known[i]=c.values[i];n.pours++;n.last=i;n.layers.push({color:i,amount:value});n.log.push({type:'pour',color:i,amount:value,total:n.total});}
 if(action.type==='inspect'){n.known[i]=c.values[i];n.inspected++;if(s.tool!=='lens')n.left--;n.log.push({type:'inspect',color:i,amount:c.values[i],total:n.total});}
 if(action.type==='spoon'){n.total--;n.spoon=true;const top=n.layers[n.layers.length-1];if(--top.amount===0)n.layers.pop();n.log.push({type:'spoon',amount:-1,total:n.total});}
 if(n.total>16){n.status='lost';n.reason='overflow';}
 else if(n.total===16){n.status=requiredMet(c,n)?'won':'lost';n.reason=n.status==='won'?'':'order';}
 else if(n.left<=0){n.status='lost';n.reason='turns';}
 else if(n.used.every(v=>v>=(c.stock||2))){n.status='lost';n.reason='stock';}
 return n;
}
function solve(c,source=initial(c),wantBonus=false){
 const queue=[{s:source,path:[]}],seen=new Set();
 for(let k=0;k<queue.length;k++){const {s,path}=queue[k];if(s.status==='won'&&(!wantBonus||bonusMet(c,s)))return path;if(s.status!=='playing')continue;
 const key=[s.total,s.left,...s.used,s.pours,s.spoon,s.last].join(',');if(seen.has(key))continue;seen.add(key);
 for(const action of [...[0,1,2,3].map(color=>({type:'pour',color})),{type:'spoon'}]){const n=transition(c,s,action);if(n!==s)queue.push({s:n,path:[...path,action]});}
 }return null;
}
function clueText([kind,a,b,value]){return kind==='gt'?`${NAMES[a]}は${NAMES[b]}より多い`:`${NAMES[a]} ＋ ${NAMES[b]} ＝ ${value}`;}
function bonusText(c){const b=c.bonus;return b.kind==='colors'?`${b.count}色を使って完成`:b.kind==='last'?`${NAMES[b.color]}で締める`:'ひと注ぎで完成';}
function consistent(c,values){return c.known.every(i=>values[i]===c.values[i])&&c.clues.every(([kind,a,b,v])=>kind==='gt'?values[a]>values[b]:values[a]+values[b]===v);}
const api={COLORS,NAMES,CASES,createCase,initial,multiplier,amount,candidates,requiredMet,bonusMet,transition,solve,clueText,bonusText,consistent};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Tea=api;
})(typeof globalThis!=='undefined'?globalThis:this);
