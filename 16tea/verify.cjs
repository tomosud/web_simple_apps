'use strict';
const assert=require('node:assert/strict');
const T=require('./game-core.js');
function permutations(a){return a.length?a.flatMap(v=>permutations(a.filter(n=>n!==v)).map(p=>[v,...p])):[[]];}
const perms=permutations([1,2,3,4]);let recipes=0;
for(let index=0;index<8;index++)for(let seed=0;seed<40;seed++){
 const c=T.createCase(index,seed);
 assert.equal(perms.filter(p=>T.consistent(c,p)).length,1,`unique deduction ${index}/${seed}`);
 for(const bonus of [false,true]){
  const path=T.solve(c,T.initial(c),bonus);assert.ok(path,`solvable ${index}/${seed}/${bonus}`);
  const end=path.reduce((s,a)=>T.transition(c,s,a),T.initial(c));
  assert.equal(end.status,'won');assert.equal(end.total,16);assert.ok(end.left>=0);assert.ok(T.requiredMet(c,end));
  if(bonus)assert.ok(T.bonusMet(c,end));recipes++;
 }
}
let c=T.createCase(0),s=T.initial(c);
assert.deepEqual(T.candidates(s,0),[2,3]);
s=T.transition(c,s,{type:'pour',color:3});assert.equal(s.status,'lost');assert.equal(s.reason,'overflow');
assert.equal(T.transition(c,s,{type:'spoon'}),s,'overflow is terminal');
s=T.initial(c);const old=JSON.stringify(s);let n=T.transition(c,s,{type:'inspect',color:0});
assert.equal(JSON.stringify(s),old,'immutable');assert.equal(n.total,13);assert.equal(n.left,1);assert.equal(n.known[0],2);assert.deepEqual(T.candidates(n,1),[3]);
assert.equal(T.transition(c,n,{type:'inspect',color:1}),n,'one inspection');
n=T.transition(c,n,{type:'pour',color:1});assert.equal(n.status,'won','last turn win');
s=T.initial(c,'lens');n=T.transition(c,s,{type:'inspect',color:0});assert.equal(n.left,2,'lens costs zero turns');
s=T.initial(c,'spoon');n=T.transition(c,s,{type:'spoon'});assert.equal(n.left,2);assert.equal(n.total,12);assert.equal(n.layers.reduce((a,b)=>a+b.amount,0),12);assert.equal(T.transition(c,n,{type:'spoon'}),n);
c=T.createCase(3);s=T.initial(c);s=T.transition(c,s,{type:'pour',color:0});assert.equal(T.multiplier(c,s),2);s=T.transition(c,s,{type:'inspect',color:1});assert.equal(T.multiplier(c,s),2,'inspect does not advance echo');n=T.transition(c,s,{type:'pour',color:1});assert.equal(n.total-s.total,8);assert.equal(T.multiplier(c,n),1);
c=T.createCase(4);s=T.initial(c);s=T.transition(c,s,{type:'pour',color:1});assert.equal(T.amount(c,s,1),5,'bloom increments next pour');assert.equal(s.known[1],4,'base quantity kept');n=T.transition(c,s,{type:'pour',color:1});assert.equal(n.total-s.total,5);assert.equal(T.transition(c,n,{type:'pour',color:1}),n,'stock limited');
c=T.createCase(5);s=T.initial(c);for(const color of [0,3,3])s=T.transition(c,s,{type:'pour',color});assert.equal(s.total,16);assert.equal(s.status,'lost');assert.equal(s.reason,'order','mandatory ingredient missing');
c=T.createCase(6);s=T.initial(c);s=T.transition(c,s,{type:'pour',color:3});assert.equal(T.transition(c,s,{type:'pour',color:3}),s,'single stock');
c=T.createCase(1);s=T.initial(c);for(const color of [1,1,3,3])s=T.transition(c,s,{type:'pour',color});assert.equal(s.status,'lost');assert.equal(s.reason,'turns');
console.log(`PASS: ${recipes} normal/mastery solutions; 320 uniquely deducible recipes; overflow, turns, stock, echo, bloom, orders, tools, immutability.`);
