/* ============================================================================
   JillProfile — the one save every game shares (coins, character, owned
   things, unlocks). Plain script, no three.js, so it works in the town game
   (classic scripts), the yard game (modules) and from file://.

   Games never touch localStorage for these things themselves: they go
   through JillProfile / JillWallet. The account (jillsAccount) is separate
   and this file never writes to it — the passcode can't be recovered.

   See docs/shared-kit.md.
   ========================================================================== */
(function(){
  const KEY = "jillsProfile";
  const VERSION = 1;

  function blank(){
    return {
      v: VERSION,
      createdAt: Date.now(),
      coins: 0,
      log: [],          /* last few earns/spends, newest first — see wallet.js */
      earnedToday: {},  /* { day: "2026-10-05", bySource: { "town:build-tile": 12 } } */
      character: null,  /* the character recipe — see docs/shared-kit.md */
      owned: {},        /* item id -> true */
      unlocks: {},      /* game-specific flags, namespaced: "yard:trail" */
      imported: {}      /* old per-game saves already copied in: { yard: true } */
    };
  }

  /* Upgrade an older save one version at a time. Add a step here whenever
     VERSION goes up; never edit an old step. */
  const STEPS = {
    /* 1: { ... } -> 2: function(p){ ...; p.v = 2; return p; } */
  };

  function migrate(p){
    if(!p || typeof p !== "object") return blank();
    const base = blank();
    for(const k in base) if(!(k in p)) p[k] = base[k];
    if(p.v > VERSION){
      /* saved by a newer copy of the game — leave it alone rather than damage it */
      console.error("JillProfile: save is version " + p.v + ", this game knows " + VERSION);
      return p;
    }
    if(p.v < VERSION){
      backup(p);
      while(p.v < VERSION){
        const step = STEPS[p.v];
        if(!step){ console.error("JillProfile: no upgrade step from version " + p.v); break; }
        p = step(p);
      }
    }
    return p;
  }

  function backup(p){
    try { localStorage.setItem(KEY + "-backup-v" + p.v, JSON.stringify(p)); }
    catch(e){ console.error("JillProfile: backup failed", e); }
  }

  let profile = null;
  let storageOk = true;

  function read(){
    let raw = null;
    try { raw = localStorage.getItem(KEY); }
    catch(e){ storageOk = false; console.error("JillProfile: can't read storage", e); }
    let p = null;
    if(raw){
      try { p = JSON.parse(raw); }
      catch(e){
        console.error("JillProfile: save is damaged, keeping a copy and starting fresh", e);
        try { localStorage.setItem(KEY + "-damaged-" + Date.now(), raw); }
        catch(e2){ console.error("JillProfile: couldn't keep the damaged copy", e2); }
      }
    }
    return migrate(p);
  }

  function save(){
    if(!storageOk) return false;
    try { localStorage.setItem(KEY, JSON.stringify(profile)); return true; }
    catch(e){ console.error("JillProfile: save failed", e); return false; }
  }

  const listeners = [];
  function changed(why){
    for(const fn of listeners){
      try { fn(profile, why); }
      catch(e){ console.error("JillProfile: a listener failed", e); }
    }
  }

  profile = read();

  /* another tab (or another game in the same browser) changed the save */
  addEventListener("storage", e => {
    if(e.key !== KEY) return;
    profile = read();
    changed("other-tab");
  });

  window.JillProfile = {
    VERSION,
    /* the live save; read freely, but change it through update() */
    get(){ return profile; },
    /* JillProfile.update(p => { p.unlocks["yard:trail"] = true; }, "trail") */
    update(fn, why){
      fn(profile);
      save();
      changed(why || "update");
      return profile;
    },
    onChange(fn){ listeners.push(fn); return () => listeners.splice(listeners.indexOf(fn), 1); },
    /* true when this browser can't keep saves (private window, file:// in some browsers) */
    get storageOk(){ return storageOk; },
    /* for tests and the debug console only */
    _reset(){ profile = blank(); save(); changed("reset"); }
  };
})();
