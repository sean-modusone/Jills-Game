/* ============================================================================
   JillWallet — one coin purse for every game. Needs shared/profile.js first.

     JillWallet.balance()                       -> 42
     JillWallet.earn("yard:muck-out")           -> 2  (what was actually paid)
     JillWallet.earn("yard:show", total)        -> pays a variable amount
     JillWallet.spend(30, "town:furniture-pack")-> true / false
     JillWallet.onChange((coins, entry) => ...)

   Every way of earning is listed in PAY so the economy can be tuned in one
   place. See docs/shared-kit.md.
   ========================================================================== */
(function(){
  if(!window.JillProfile){ console.error("JillWallet: load shared/profile.js first"); return; }

  /* amount: coins paid when the game doesn't pass one (null = game must pass one)
     dailyCap: most coins this source can pay in one day (null = no cap)
     Amounts copied from the games as they are today (5 Oct 2026). */
  const PAY = {
    "town:build-tile":    { amount: 1,    dailyCap: null, what: "placing a tile in the town" },
    "yard:muck-out":      { amount: 2,    dailyCap: null, what: "mucking out a pile" },
    "yard:show":          { amount: null, dailyCap: null, what: "show day score" },
    "yard:quest":         { amount: null, dailyCap: null, what: "a yard rider's job" },
    "yard:perfect-jump":  { amount: 3,    dailyCap: null, what: "a perfect jump" },
    "yard:sat-the-spook": { amount: 2,    dailyCap: null, what: "staying on through a spook" },
    "yard:calm-past-dog": { amount: 1,    dailyCap: null, what: "riding calmly past the dog" },
    "new-game:pick-up":   { amount: 1,    dailyCap: 50,   what: "picking up a coin in the new game (starter)" }
  };

  const LOG_LENGTH = 50;

  function today(){
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /* every entry gets an id so cloud sync can merge two devices' coins later */
  function note(p, entry){
    entry.id = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
    p.log.unshift(entry);
    if(p.log.length > LOG_LENGTH) p.log.length = LOG_LENGTH;
  }

  function earn(source, amount){
    const rule = PAY[source];
    if(!rule){ console.error("JillWallet: unknown way to earn '" + source + "' — add it to PAY"); return 0; }
    let n = (amount != null) ? amount : rule.amount;
    if(typeof n !== "number" || !isFinite(n) || n <= 0){
      if(n !== 0) console.error("JillWallet: bad amount for " + source, amount);
      return 0;
    }
    n = Math.floor(n);
    let paid = 0;
    JillProfile.update(p => {
      if(!p.earnedToday || p.earnedToday.day !== today()) p.earnedToday = { day: today(), bySource: {} };
      const soFar = p.earnedToday.bySource[source] || 0;
      paid = (rule.dailyCap == null) ? n : Math.max(0, Math.min(n, rule.dailyCap - soFar));
      if(!paid) return;
      p.earnedToday.bySource[source] = soFar + paid;
      p.coins += paid;
      note(p, { t: Date.now(), n: paid, src: source });
    }, "earn");
    return paid;
  }

  function spend(price, item){
    if(typeof price !== "number" || !isFinite(price) || price < 0){
      console.error("JillWallet: bad price for " + item, price);
      return false;
    }
    if(JillProfile.get().coins < price) return false;
    JillProfile.update(p => {
      p.coins -= price;
      note(p, { t: Date.now(), n: -price, item: item || "?" });
    }, "spend");
    return true;
  }

  /* Copy an old per-game balance in, once per game. How old balances combine
     is Sean's decision (docs/shared-kit.md) — nothing calls this yet. */
  function importOld(game, coins){
    const p = JillProfile.get();
    if(p.imported[game]) return false;
    JillProfile.update(p => {
      p.imported[game] = true;
      if(typeof coins === "number" && coins > 0){
        p.coins += Math.floor(coins);
        note(p, { t: Date.now(), n: Math.floor(coins), src: game + ":old-save" });
      }
    }, "import");
    return true;
  }

  const listeners = [];
  JillProfile.onChange((p, why) => {
    const entry = p.log[0] || null;
    for(const fn of listeners){
      try { fn(p.coins, entry, why); }
      catch(e){ console.error("JillWallet: a listener failed", e); }
    }
  });

  window.JillWallet = {
    PAY,
    balance(){ return JillProfile.get().coins; },
    earn, spend, importOld,
    log(){ return JillProfile.get().log.slice(); },
    onChange(fn){ listeners.push(fn); return () => listeners.splice(listeners.indexOf(fn), 1); }
  };
})();
