const fs=require("fs"),vm=require("vm"),assert=require("assert");
/* Tests for game/shared/profile.js and wallet.js. Run: node tests/shared-kit.test.js */
const path=require("path");const GAME=path.join(__dirname,"..","game");
function boot(store){
  const ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)}};
  const ctx={localStorage:ls,console,Date,Math,JSON,isFinite,String,addEventListener(){}};ctx.window=ctx;vm.createContext(ctx);
  for(const f of ["shared/profile.js","shared/wallet.js"]) vm.runInContext(fs.readFileSync(path.join(GAME,f),"utf8"),ctx,{filename:f});
  return ctx;
}
const store={jillsAccount:'{"name":"X"}'};
let c=boot(store);
assert.equal(c.JillWallet.balance(),0);
let seen=null;c.JillWallet.onChange((n,e)=>seen=[n,e.src]);
assert.equal(c.JillWallet.earn("yard:muck-out"),2);
assert.deepEqual(seen,[2,"yard:muck-out"]);
assert.equal(c.JillWallet.earn("yard:show",17.6),17);
assert.equal(c.JillWallet.earn("yard:show"),0);           // no amount for variable source
assert.equal(c.JillWallet.earn("nope"),0);
assert.equal(c.JillWallet.spend(100,"x"),false);
assert.equal(c.JillWallet.spend(9,"x"),true);
assert.equal(c.JillWallet.balance(),10);
c.JillWallet.PAY["town:build-tile"].dailyCap=3;
assert.equal([1,1,1,1].map(()=>c.JillWallet.earn("town:build-tile")).reduce((a,b)=>a+b),3);
assert.equal(c.JillWallet.importOld("yard",25),true);
assert.equal(c.JillWallet.importOld("yard",25),false);
assert.equal(c.JillWallet.balance(),38);
c=boot(store);                                            // reload keeps it
assert.equal(c.JillWallet.balance(),38);
assert.equal(c.JillWallet.log()[0].src,"yard:old-save");
assert.ok(c.JillWallet.log()[0].id);
assert.equal(store.jillsAccount,'{"name":"X"}');          // account untouched
store.jillsProfile="{broken";c=boot(store);               // damaged save
assert.equal(c.JillWallet.balance(),0);
assert.ok(Object.keys(store).some(k=>k.startsWith("jillsProfile-damaged-")));
console.log("all kit tests passed");
