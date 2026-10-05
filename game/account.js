/* ============================================================================
   Jill's account + friends system — shared by every page of the game.

   Jill's rules, in her words:
     - Creating your account comes BEFORE anything else, before you design your
       rider, before anything.
     - It only happens ONCE. Your name and passcode can never be changed.
     - Every time you come back it just asks for your passcode.

   Drop <script src="account.js"></script> into a page and it looks after
   itself: it injects its own styling and its own overlay, and nothing else on
   the page can be reached until you're in.

   Works with no internet at all. The one thing that still needs a real server
   is a friend appearing live in your world, and the button says so honestly.
   ==========================================================================*/
(function(){
"use strict";

/* ---- how the passcode is kept -------------------------------------------
   Never as you typed it. Only a scrambled version is saved, so nobody reading
   the save file can read your passcode — but it still knows the right one. */
function scramble(text){
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for(let i = 0; i < text.length; i++){
    h1 = (h1 ^ text.charCodeAt(i)) >>> 0;
    h1 = (h1 * 0x01000193) >>> 0;
    h2 = (h2 + text.charCodeAt(i) * (i + 7)) >>> 0;
    h2 = (h2 ^ (h2 << 5)) >>> 0;
  }
  return h1.toString(36) + "-" + h2.toString(36);
}

/* ---- friend codes -------------------------------------------------------
   How a REAL person gets added with no server. Everyone's game builds a code
   out of their own rider name, so a code carries the name inside it and the
   receiving game doesn't have to look anybody up. The four characters on the
   end are a check, so a typo is refused instead of adding a stranger. */
const CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";  /* no 0/O/1/I — too easy to misread */
function codeTail(name){
  const h = scramble("code:" + name.toUpperCase());
  let n = 0;
  for(let i = 0; i < h.length; i++) n = (n * 33 + h.charCodeAt(i)) >>> 0;
  let out = "";
  for(let i = 0; i < 4; i++){ out += CODE_CHARS[n % 32]; n = Math.floor(n / 32); }
  return out;
}
function codeFor(name){ return name.toUpperCase() + "-" + codeTail(name); }
function readCode(text){
  const bits = text.trim().toUpperCase().split("-");
  if(bits.length !== 2) return null;
  const name = bits[0].replace(/[^A-Z0-9]/g, "");
  if(name.length < 2) return null;
  if(codeTail(name) !== bits[1]) return null;
  return name[0] + name.slice(1).toLowerCase();   /* MILLIE -> Millie, not shouting */
}

/* ---- a little round profile picture, drawn from the name ---------------- */
function avatarFor(name){
  const c = document.createElement("canvas");
  c.width = c.height = 84;
  const g = c.getContext("2d");
  const seed = name.toUpperCase();      /* so a friend's picture matches their own game's */
  let n = 0;
  for(let i = 0; i < seed.length; i++) n = (n * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = n % 360;
  g.fillStyle = "hsl(" + hue + ",42%,62%)";
  g.beginPath(); g.arc(42, 42, 42, 0, 7); g.fill();
  g.fillStyle = "hsl(" + ((hue + 40) % 360) + ",38%,42%)";
  g.beginPath(); g.arc(42, 70, 26, 0, 7); g.fill();
  g.fillStyle = "#fff";
  g.font = "bold 40px Nunito, Fredoka, sans-serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText((name[0] || "?").toUpperCase(), 42, 34);
  return c.toDataURL();
}

/* the pretend riders who already live on Jill's yard — clearly labelled */
const YARD_RIDERS = ["Poppy", "Maya", "Ella", "Sophie", "Ruby", "Jess", "Amelia", "Niamh"];

/* ---- what's saved -------------------------------------------------------- */
let account = null;
try { account = JSON.parse(localStorage.getItem("jillsAccount") || "null"); } catch(e){}
let friends = (account && Array.isArray(account.friends)) ? account.friends : [];
friends = friends.map(f => (typeof f === "string") ? {n: f} : f);   /* older saves */
const hasFriend = n => friends.some(f => f.n.toLowerCase() === n.toLowerCase());
function saveAccount(){
  account.friends = friends;
  try { localStorage.setItem("jillsAccount", JSON.stringify(account)); } catch(e){}
}
/* unlocked once per visit — moving between pages doesn't ask again, but
   closing the game and coming back does */
function unlocked(){ try { return sessionStorage.getItem("jillsUnlocked") === "1"; } catch(e){ return false; } }
function markUnlocked(){ try { sessionStorage.setItem("jillsUnlocked", "1"); } catch(e){} }

/* ---- styling ------------------------------------------------------------- */
const css = document.createElement("style");
css.textContent = `
/* align-items:flex-start + margin:auto on the box is deliberate. With plain
   "center", a box taller than the screen gets its top cut off and there is no
   way to scroll up to it — which is exactly what happens on a tablet once the
   on-screen keyboard eats half the height. Auto margins centre it when it fits
   and let it scroll when it doesn't. */
#acctWrap{position:fixed;inset:0;z-index:9000;background:rgba(28,24,20,.82);
  display:flex;align-items:flex-start;justify-content:center;
  overflow-y:auto;-webkit-overflow-scrolling:touch;padding:10px;
  font-family:Nunito,Fredoka,system-ui,sans-serif;}
#acctBox{margin:auto;}
#acctWrap.hidden,#friendPanel.hidden{display:none;}
#acctBox,#friendPanel{background:#faf6ee;border:3px solid #3d3227;border-radius:18px;
  padding:18px 20px;width:min(92vw,420px);color:#3d3227;box-shadow:0 8px 0 rgba(61,50,39,.4);
  font-family:Nunito,Fredoka,system-ui,sans-serif;text-align:left;}
#friendPanel{position:fixed;z-index:8900;top:50%;left:50%;transform:translate(-50%,-50%);
  max-height:76vh;overflow-y:auto;}
#acctBox h2,#friendPanel h2{margin:0 0 10px;font-size:21px;font-weight:900;}
.acctLabel{font-weight:900;font-size:14px;margin-top:12px;}
.acctHint{font-size:12px;font-weight:700;opacity:.7;margin:2px 0 5px;}
.acctIn{width:100%;font-family:inherit;font-weight:800;font-size:16px;padding:9px 10px;
  border:2px solid #3d3227;border-radius:10px;background:#fff;color:#3d3227;box-sizing:border-box;}
.acctIn:disabled{background:#efe7d6;color:#6c6459;}
#acctPassRow{position:relative;}
#acctPassRow .acctIn{padding-right:52px;}      /* leave room for the eye */
#acctEye{position:absolute;right:4px;top:50%;transform:translateY(-50%);
  width:40px;height:38px;padding:0;line-height:1;font-size:21px;cursor:pointer;
  border:2px solid #b3a892;background:#efe7d6;border-radius:9px;}
#acctEye:hover{background:#e3d8c2;}
#acctEye:active{transform:translateY(-50%) scale(.92);}
#acctEye.on{background:#d7e5cd;border-color:#5f7d4f;}
.acctBtn{width:100%;font-family:inherit;font-weight:900;font-size:16px;margin-top:14px;
  border:2px solid #3d3227;border-radius:10px;padding:11px;cursor:pointer;background:#5f7d4f;color:#fff;}
.acctBtn.grey{background:#8b8378;}
#acctErr{color:#b0392c;font-weight:800;font-size:13px;min-height:17px;margin-top:7px;}
.frRow{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #e0d8c8;}
.frPic{width:42px;height:42px;border-radius:50%;border:2px solid #3d3227;flex:0 0 auto;}
.frName{font-weight:900;font-size:15px;flex:1;}
.frAdd{font-family:inherit;font-weight:900;font-size:18px;width:34px;height:34px;cursor:pointer;
  border:2px solid #3d3227;border-radius:50%;background:#5f7d4f;color:#fff;line-height:1;}
.frAdd.added{background:#cfc7b8;color:#6c6459;cursor:default;}
.frJoin{font-family:inherit;font-weight:800;font-size:12px;padding:6px 9px;cursor:pointer;
  border:2px solid #3d3227;border-radius:9px;background:#e8e0cf;color:#6c6459;}
.frTag{font-size:11px;font-weight:700;color:#8b8171;margin-left:8px;}
#frMyCode{display:flex;align-items:center;gap:10px;margin:2px 0 4px;}
#frCodeText{flex:1;font-weight:900;font-size:20px;letter-spacing:2px;color:#3d3227;
  background:#efe7d6;border:2px dashed #b3a892;border-radius:11px;padding:9px 12px;text-align:center;}
.frCopy{font-family:inherit;font-weight:800;font-size:13px;padding:9px 13px;cursor:pointer;
  border:2px solid #3d3227;border-radius:11px;background:#5f7d4f;color:#fff;}
#yardWrap.hidden,#rideWrap.hidden,#worldWrap.hidden{display:none;}
#worldState{font-weight:900;font-size:13px;margin:4px 0 6px;color:#5f7d4f;min-height:16px;}
#rideState{font-weight:900;font-size:13px;margin:4px 0 2px;color:#5f7d4f;min-height:16px;}
#rideBox .acctBtn{margin-top:8px;}
#rideBox textarea{width:100%;height:74px;font-family:monospace;font-size:11px;font-weight:700;
  margin-top:8px;padding:8px;border:2px solid #3d3227;border-radius:10px;
  background:#fff;color:#3d3227;resize:none;box-sizing:border-box;}
#yardCode{width:100%;height:74px;font-family:monospace;font-size:11px;font-weight:700;
  margin-top:8px;padding:8px;border:2px solid #3d3227;border-radius:10px;
  background:#fff;color:#3d3227;resize:none;box-sizing:border-box;}
#yardBox .acctBtn{margin-top:8px;}
#acctToast{position:fixed;z-index:9100;top:16px;left:50%;transform:translateX(-50%);
  background:rgba(250,246,238,.96);border:2px solid #3d3227;border-radius:12px;
  padding:9px 16px;font-weight:800;font-size:14px;color:#3d3227;
  font-family:Nunito,Fredoka,system-ui,sans-serif;transition:opacity .4s;}
#acctToast.hidden{display:none;}
`;
document.head.appendChild(css);

/* ---- the overlay and the panel ------------------------------------------- */
const holder = document.createElement("div");
holder.innerHTML = `
<div id="acctWrap" class="hidden"><div id="acctBox">
  <h2 id="acctTitle">🐴 Create an account</h2>
  <div class="acctLabel">Your name</div>
  <div class="acctHint acctMakeOnly">Don't choose your real name</div>
  <input id="acctName" class="acctIn" maxlength="14" autocomplete="off" placeholder="Rider name">
  <div class="acctLabel">Passcode</div>
  <div class="acctHint acctMakeOnly">Create at least a six digit passcode</div>
  <div id="acctPassRow">
    <input id="acctPass" class="acctIn" type="password" inputmode="numeric" maxlength="20"
           autocomplete="off" placeholder="••••••">
    <button id="acctEye" type="button" title="Show my passcode" aria-label="Show my passcode">👁️</button>
  </div>
  <div id="acctErr"></div>
  <button id="acctGo" class="acctBtn">Create my account</button>
  <div class="acctHint" id="acctFoot">You can't change these later, so pick carefully.</div>
</div></div>
<div id="friendPanel" class="hidden">
  <h2>👥 Friends</h2>
  <div class="acctHint" id="frWho"></div>
  <div class="acctLabel">Your friend code</div>
  <div class="acctHint">Give this to a real friend so they can add you</div>
  <div id="frMyCode"></div>
  <div class="acctLabel">Add a friend</div>
  <div class="acctHint">Type your friend's name — spaces are fine — then press +</div>
  <input id="frSearch" class="acctIn" maxlength="24" autocomplete="off" placeholder="Your friend's name">
  <div id="frResults"></div>
  <div class="acctLabel">Your friends</div>
  <div id="frList"></div>
  <div id="yardWrap">
    <div class="acctLabel">Yards</div>
    <div class="acctHint">Your friend has their own yard, on their own computer.
      Swap yard codes and you can go and look round each other's.</div>
    <button id="yardShare" class="acctBtn">📤 Share my yard</button>
    <div id="yardBox"></div>
  </div>
  <div id="worldWrap">
    <div class="acctLabel">🌍 The world</div>
    <div class="acctHint">Everybody who joins the same server rides in the same
      world at the same time. Type the address the server window shows you.</div>
    <div id="worldState"></div>
    <input id="worldAddr" class="acctIn" maxlength="60" autocomplete="off" placeholder="localhost:8787">
    <button id="worldGo" class="acctBtn">🌍 Join the world</button>
  </div>
  <div id="rideWrap">
    <div class="acctLabel">Ride together — really</div>
    <div class="acctHint">You both play at the same time and swap two codes. Then you
      can see each other riding. Works best on the same wifi.</div>
    <div id="rideState"></div>
    <button id="rideStart" class="acctBtn">🐴 Start — I'll send the code</button>
    <button id="rideJoin" class="acctBtn grey">📥 Join — my friend sent me a code</button>
    <div id="rideBox"></div>
  </div>
  <button id="frClose" class="acctBtn grey">Done</button>
</div>
<div id="acctToast" class="hidden"></div>`;
while(holder.firstChild) document.body.appendChild(holder.firstChild);

const $ = id => document.getElementById(id);
const acctWrap = $("acctWrap"), acctTitle = $("acctTitle"), acctName = $("acctName");
const acctPass = $("acctPass"), acctErr = $("acctErr"), acctGo = $("acctGo"), acctFoot = $("acctFoot");
const toast = $("acctToast");
let toastTimer = null;
function say(text, ms){
  toast.textContent = text;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), ms || 2600);
}

/* ---- the gate ------------------------------------------------------------ */
let touched = false;   /* has a real person typed in the box yet? */
["keydown", "input", "paste"].forEach(ev => {
  acctPass.addEventListener(ev, () => touched = true);
  acctName.addEventListener(ev, () => touched = true);
});
const onLogin = [];
function letThemIn(){
  acctWrap.classList.add("hidden");
  markUnlocked();
  for(const fn of onLogin){ try { fn(account); } catch(e){} }
}
function showGate(){
  if(account && unlocked()){ letThemIn(); return; }     /* already in, just moved page */
  acctWrap.classList.remove("hidden");
  if(account){
    /* coming back — your name is fixed, it only wants the passcode */
    acctTitle.textContent = "🐴 Welcome back, " + account.name;
    acctName.value = account.name;
    acctName.disabled = true;
    acctGo.textContent = "Log in";
    acctFoot.textContent = "Enter your passcode to play.";
    /* the two hints are advice for making an account, not for coming back */
    document.querySelectorAll(".acctMakeOnly").forEach(h => h.style.display = "none");
    setTimeout(() => acctPass.focus(), 60);
  } else {
    setTimeout(() => acctName.focus(), 60);
  }
}
acctGo.onclick = () => {
  const nm = acctName.value.trim();
  const pc = acctPass.value.trim();
  if(account){
    if(scramble(pc) !== account.pass){
      /* only tell them off if they actually tried — a password filler can hit
         this button on its own, and an error waiting on arrival is confusing */
      acctErr.textContent = touched ? "That passcode isn't right." : "";
      return;
    }
    acctErr.textContent = "";
    letThemIn();
    say("Welcome back, " + account.name + "! 🐴");
    return;
  }
  if(nm.length < 2){ acctErr.textContent = "Pick a rider name (2 letters or more)."; return; }
  if(!/^\d{6,}$/.test(pc)){ acctErr.textContent = "Your passcode needs at least six digits."; return; }
  account = { name: nm, pass: scramble(pc), friends: [] };
  friends = [];
  saveAccount();
  acctErr.textContent = "";
  letThemIn();
  say("Account made. Welcome, " + nm + "! 🎉", 3200);
};
acctPass.addEventListener("keydown", e => { if(e.key === "Enter") acctGo.click(); });
acctName.addEventListener("keydown", e => { if(e.key === "Enter") acctPass.focus(); });
/* the browser's own password filler can trip the button before you've touched
   anything — never leave a telling-off sitting there while they're still typing */
acctPass.addEventListener("input", () => acctErr.textContent = "");
acctName.addEventListener("input", () => acctErr.textContent = "");

/* the eye — peek at your passcode while you're typing it */
const acctEye = $("acctEye");
acctEye.onclick = () => {
  const showing = acctPass.type === "text";
  acctPass.type = showing ? "password" : "text";
  acctEye.textContent = showing ? "👁️" : "🙈";
  acctEye.classList.toggle("on", !showing);
  const label = showing ? "Show my passcode" : "Hide my passcode";
  acctEye.title = label; acctEye.setAttribute("aria-label", label);
  acctPass.focus();
};

/* ---- the friends panel --------------------------------------------------- */
const friendPanel = $("friendPanel"), frSearch = $("frSearch");
const frResults = $("frResults"), frList = $("frList");

function note(text){
  const d = document.createElement("div");
  d.className = "acctHint"; d.textContent = text;
  return d;
}
function friendRow(name, mode, real){
  const row = document.createElement("div");
  row.className = "frRow";
  const pic = document.createElement("img");
  pic.className = "frPic"; pic.src = avatarFor(name);
  const nm = document.createElement("div");
  nm.className = "frName"; nm.textContent = name;
  if(!real){
    const tag = document.createElement("span");
    tag.className = "frTag"; tag.textContent = "on your yard";
    nm.appendChild(tag);
  }
  row.appendChild(pic); row.appendChild(nm);
  if(mode === "find"){
    const b = document.createElement("button");
    const has = hasFriend(name);
    b.className = "frAdd" + (has ? " added" : "");
    b.textContent = has ? "✓" : "+";
    b.onclick = () => {
      if(hasFriend(name)) return;
      friends.push({n: name, real: !!real}); saveAccount();
      b.textContent = "✓"; b.className = "frAdd added";
      say(name + " is your friend now! 👥");
      renderFriends();
    };
    row.appendChild(b);
  } else {
    const j = document.createElement("button");
    j.className = "frJoin"; j.textContent = "🏡 Visit yard";
    j.onclick = () => askForYard(name);
    row.appendChild(j);
  }
  return row;
}
/* "millie  smith" -> "Millie Smith" */
function tidyName(s){
  return s.trim().replace(/\s+/g, " ").split(" ")
          .map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(" ");
}
function renderFinds(){
  const raw = frSearch.value.trim();
  frResults.innerHTML = "";
  if(!raw) return;

  /* a friend code, if they've been given one */
  if(raw.indexOf("-") >= 0){
    const name = readCode(raw);
    if(!name){ frResults.appendChild(note("That code isn't right — check every letter.")); return; }
    if(account && name.toUpperCase() === account.name.toUpperCase()){
      frResults.appendChild(note("That's your own code! Give it to your friend instead.")); return;
    }
    frResults.appendChild(friendRow(name, "find", true));
    return;
  }

  /* otherwise: just their name. Anyone can be added by name — spaces and all. */
  const q = raw.toLowerCase();
  const typed = tidyName(raw);
  const onYard = YARD_RIDERS.filter(n => n.toLowerCase().indexOf(q) === 0);
  const isYardName = YARD_RIDERS.some(n => n.toLowerCase() === q);
  if(typed.length >= 2 && !isYardName) frResults.appendChild(friendRow(typed, "find", true));
  for(const n of onYard) frResults.appendChild(friendRow(n, "find", false));
  if(typed.length < 2) frResults.appendChild(note("Type a bit more of their name."));
}
function renderFriends(){
  frList.innerHTML = "";
  if(!friends.length){ frList.appendChild(note("No friends yet — type your friend's name above and press +")); return; }
  for(const f of friends) frList.appendChild(friendRow(f.n, "have", !!f.real));
}
frSearch.addEventListener("input", renderFinds);
$("frClose").onclick = () => friendPanel.classList.add("hidden");

/* ---- yards ---------------------------------------------------------------
   Everybody's yard lives on their own computer, so there's no server to ask.
   Instead your yard turns into a code you can send your friend, and theirs
   turns into one you can paste in here — then you're standing in their yard.
   The page that owns a yard (the 3D ride) fills in window.JillYard. */
const yardWrap = $("yardWrap"), yardBox = $("yardBox");
const yard = () => window.JillYard || null;

function showYardCode(){
  const y = yard(); if(!y) return;
  yardBox.innerHTML = "";
  const ta = document.createElement("textarea");
  ta.id = "yardCode"; ta.readOnly = true; ta.value = y.export();
  const copy = document.createElement("button");
  copy.className = "acctBtn"; copy.textContent = "Copy my yard code";
  copy.onclick = () => {
    ta.select();
    if(navigator.clipboard) navigator.clipboard.writeText(ta.value).catch(()=>{});
    copy.textContent = "Copied! Send it to your friend 💌";
    setTimeout(() => copy.textContent = "Copy my yard code", 2200);
  };
  yardBox.appendChild(ta); yardBox.appendChild(copy);
}
function askForYard(who){
  const y = yard();
  if(!y){ say("Open the 3D Ride first, then you can visit a yard. 🐴", 3200); return; }
  yardBox.innerHTML = "";
  const label = document.createElement("div");
  label.className = "acctHint";
  label.textContent = "Paste " + who + "'s yard code here, then press Go:";
  const ta = document.createElement("textarea");
  ta.id = "yardCode"; ta.placeholder = "Paste the code " + who + " sent you";
  const go = document.createElement("button");
  go.className = "acctBtn"; go.textContent = "🏡 Go to " + who + "'s yard";
  go.onclick = () => {
    const ok = y.visit(ta.value.trim(), who);
    if(!ok) say("That yard code didn't work — make sure you copied all of it. 🤔", 3400);
  };
  yardBox.appendChild(label); yardBox.appendChild(ta); yardBox.appendChild(go);
  ta.focus();
}
$("yardShare").onclick = showYardCode;

/* ---- riding together ------------------------------------------------------
   Two games talking straight to each other. There's no server to introduce
   them, so you do the introducing: send your friend one code, paste her reply
   back, and you're joined up. */
const rideWrap = $("rideWrap"), rideBox = $("rideBox"), rideState = $("rideState");
const linkOf = () => window.JillLink || null;
const WORDS = { idle: "", waiting: "Waiting for your friend…",
                joining: "Joining up…", riding: "🟢 You're riding together!",
                lost: "Your friend's game has gone." };

function bigBox(value, placeholder){
  const ta = document.createElement("textarea");
  if(value !== null){ ta.value = value; ta.readOnly = true; } else ta.placeholder = placeholder;
  rideBox.appendChild(ta);
  return ta;
}
function bigBtn(text, grey, fn){
  const b = document.createElement("button");
  b.className = "acctBtn" + (grey ? " grey" : "");
  b.textContent = text; b.onclick = fn;
  rideBox.appendChild(b);
  return b;
}
function copyBtn(ta, label){
  return bigBtn(label, false, () => {
    ta.select();
    if(navigator.clipboard) navigator.clipboard.writeText(ta.value).catch(()=>{});
    say("Copied — send it to your friend 💌");
  });
}
function showRideState(){ rideState.textContent = WORDS[(linkOf() || {}).state] || ""; }
/* keep the panel's wording in step with the link, WITHOUT stacking up a new
   wrapper every time the panel is opened */
let watching = false;
function watchLink(){
  const L = linkOf();
  if(!L || watching) return;
  watching = true;
  const gameHandler = L.onchange;
  L.onchange = s => { showRideState(); if(gameHandler) gameHandler(s); };
}

/* ---- the world (one server, everybody on it) ---- */
const worldWrap = $("worldWrap"), worldAddr = $("worldAddr"), worldGo = $("worldGo");
const worldState = $("worldState");
const worldOf = () => window.JillWorld || null;
const WORLD_WORDS = { out: "", knocking: "Knocking on the door…",
                      in: "🟢 You're in the world", nope: "Couldn't reach that server." };
let worldWatching = false;
function showWorldState(){
  const W = worldOf(); if(!W) return;
  let t = WORLD_WORDS[W.state] || "";
  if(W.state === "in") t += W.count ? " — " + W.count + (W.count === 1 ? " other rider" : " other riders")
                                    : " — nobody else here yet";
  worldState.textContent = t;
  worldGo.textContent = (W.state === "in" || W.state === "knocking") ? "👋 Leave the world" : "🌍 Join the world";
}
function watchWorld(){
  const W = worldOf();
  if(!W || worldWatching) return;
  worldWatching = true;
  W.onchange = () => showWorldState();
}
worldGo.onclick = () => {
  const W = worldOf(); if(!W) return;
  if(W.state === "in" || W.state === "knocking"){ W.leave(); showWorldState(); return; }
  const addr = worldAddr.value.trim() || worldAddr.placeholder;
  try { localStorage.setItem("jillsWorldAddr", addr); } catch(e){}
  W.join(addr, account ? account.name : "A rider");
  showWorldState();
};

$("rideStart").onclick = async () => {
  const L = linkOf(); if(!L) return;
  rideBox.innerHTML = "";
  rideBox.appendChild(note("Making your code…"));
  let code;
  try { code = await L.invite(account ? account.name : "Your friend"); }
  catch(e){ rideBox.innerHTML = ""; rideBox.appendChild(note("That didn't work — try again.")); return; }
  rideBox.innerHTML = "";
  rideBox.appendChild(note("1. Send this code to your friend:"));
  copyBtn(bigBox(code, null), "Copy my code");
  rideBox.appendChild(note("2. She'll send one back — paste it here:"));
  const back = bigBox(null, "Paste your friend's reply");
  bigBtn("✅ We're in!", false, async () => {
    try { await L.finish(back.value); showRideState(); }
    catch(e){ say("That reply code didn't work — check you copied all of it. 🤔", 3400); }
  });
  showRideState();
};
$("rideJoin").onclick = () => {
  const L = linkOf(); if(!L) return;
  rideBox.innerHTML = "";
  rideBox.appendChild(note("1. Paste the code your friend sent you:"));
  const inBox = bigBox(null, "Paste your friend's code");
  bigBtn("Make my reply", false, async () => {
    let reply;
    try { reply = await L.accept(inBox.value, account ? account.name : "Your friend"); }
    catch(e){ say("That code didn't work — check you copied all of it. 🤔", 3400); return; }
    rideBox.innerHTML = "";
    rideBox.appendChild(note("2. Send this back to your friend, then wait:"));
    copyBtn(bigBox(reply, null), "Copy my reply");
    showRideState();
  });
};

function openFriends(){
  yardWrap.classList.toggle("hidden", !yard());
  yardBox.innerHTML = "";
  rideWrap.classList.toggle("hidden", !linkOf());
  if(linkOf()){ watchLink(); showRideState(); }
  worldWrap.classList.toggle("hidden", !worldOf());
  if(worldOf()){
    watchWorld();
    try { worldAddr.value = localStorage.getItem("jillsWorldAddr") || ""; } catch(e){}
    showWorldState();
  }
  $("frWho").textContent = account ? "You are " + account.name : "";
  const box = $("frMyCode");
  box.innerHTML = "";
  if(account){
    const code = document.createElement("div");
    code.id = "frCodeText"; code.textContent = codeFor(account.name);
    const copy = document.createElement("button");
    copy.className = "frCopy"; copy.textContent = "Copy";
    copy.onclick = () => {
      if(navigator.clipboard) navigator.clipboard.writeText(codeFor(account.name)).catch(()=>{});
      copy.textContent = "Copied!";
      setTimeout(() => copy.textContent = "Copy", 1600);
    };
    box.appendChild(code); box.appendChild(copy);
  }
  frSearch.value = ""; renderFinds(); renderFriends();
  friendPanel.classList.remove("hidden");
}

/* ---- what the rest of the game can use ----------------------------------- */
window.JillAccount = {
  get: () => account,
  name: () => account && account.name,
  friends: () => friends.slice(),
  openFriends: openFriends,
  unlocked: unlocked,
  codeFor: codeFor,
  avatarFor: avatarFor,
  /* run something the moment they're through the gate (or now, if they already are) */
  onLogin: fn => { if(account && unlocked() && acctWrap.classList.contains("hidden")) fn(account); else onLogin.push(fn); }
};

showGate();
})();
