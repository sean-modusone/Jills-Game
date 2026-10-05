/* =============================================================================
   Jill's Game — the server, ready to live on the internet

   `jills-server.ps1` is the same server for running at home on Windows. This
   one is for when it lives on a hosting company's computer instead, because
   almost all of them run Node rather than PowerShell.

   It needs NOTHING installed — no npm install, no package.json, no libraries.
   Everything here is built out of what Node already has, so hosting it is just
   "upload and run".

     node server.js            (uses port 8787, or whatever PORT the host sets)

   IT STORES NOTHING. Names and positions live in memory while people are
   playing and vanish when it stops. Nothing is written to disk, no database,
   no accounts. That is on purpose: it means the server never holds anything
   belonging to somebody else's child.

   THERE IS NO CHAT, also on purpose. Riding together without typing to each
   other avoids by far the biggest risk of a game children can join.
   ===========================================================================*/

const http = require("http");
const crypto = require("crypto");

const PORT = process.env.PORT || 8787;
const MAGIC = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

let nextId = 1;
const riders = new Map();               // id -> { socket, name }

/* ---- an ordinary page, so you can check it's alive in a browser ---- */
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Jill's Game server is running. " + riders.size + " riding.\n");
});

/* ---- the WebSocket handshake ---------------------------------------------
   The browser asks to upgrade the connection and sends a key. We prove we
   understood by hashing that key with a fixed magic string, which is what the
   WebSocket rules say to do. */
server.on("upgrade", (req, socket) => {
  const key = req.headers["sec-websocket-key"];
  if(!key){ socket.destroy(); return; }
  const accept = crypto.createHash("sha1").update(key + MAGIC).digest("base64");
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
    "Connection: Upgrade\r\n" +
    "Upgrade: websocket\r\n" +
    "Sec-WebSocket-Accept: " + accept + "\r\n\r\n");
  socket.setNoDelay(true);
  join(socket);
});

/* ---- sending: the server never masks, which keeps this short ---- */
function frame(text){
  const body = Buffer.from(text, "utf8");
  let head;
  if(body.length < 126){
    head = Buffer.from([0x81, body.length]);
  } else if(body.length <= 0xFFFF){
    head = Buffer.alloc(4);
    head[0] = 0x81; head[1] = 126; head.writeUInt16BE(body.length, 2);
  } else {
    head = Buffer.alloc(10);
    head[0] = 0x81; head[1] = 127; head.writeBigUInt64BE(BigInt(body.length), 2);
  }
  return Buffer.concat([head, body]);
}
function sendTo(id, text){
  const r = riders.get(id);
  if(!r) return;
  try { r.socket.write(frame(text)); } catch(e){ drop(id); }
}
function sendToAll(text, exceptId){
  for(const id of riders.keys()) if(id !== exceptId) sendTo(id, text);
}

/* ---- one person playing ---- */
function join(socket){
  const id = nextId++;
  riders.set(id, { socket, name: "" });
  let buf = Buffer.alloc(0);

  socket.on("data", chunk => {
    buf = Buffer.concat([buf, chunk]);
    /* a chunk may hold several messages, or half of one */
    for(;;){
      const msg = readFrame();
      if(msg === null) break;
      if(msg === false){ drop(id); return; }
      handle(id, msg);
    }
  });
  socket.on("close", () => drop(id));
  socket.on("error", () => drop(id));

  /* everything a browser sends is masked with four bytes it picks, so each
     byte has to be un-masked on the way in */
  function readFrame(){
    if(buf.length < 2) return null;
    const opcode = buf[0] & 0x0F;
    if(opcode === 8) return false;                      // they said goodbye
    const masked = (buf[1] & 0x80) !== 0;
    let len = buf[1] & 0x7F, at = 2;
    if(len === 126){
      if(buf.length < 4) return null;
      len = buf.readUInt16BE(2); at = 4;
    } else if(len === 127){
      if(buf.length < 10) return null;
      len = Number(buf.readBigUInt64BE(2)); at = 10;
    }
    if(len > (1 << 20)) return false;                   // nobody needs a megabyte
    const need = at + (masked ? 4 : 0) + len;
    if(buf.length < need) return null;                  // the rest is still coming
    let mask = null;
    if(masked){ mask = buf.slice(at, at + 4); at += 4; }
    const data = Buffer.from(buf.slice(at, at + len));
    if(mask) for(let i = 0; i < data.length; i++) data[i] ^= mask[i % 4];
    buf = buf.slice(need);
    return data.toString("utf8");
  }
}

function handle(id, text){
  let d;
  try { d = JSON.parse(text); } catch(e){ return; }
  const me = riders.get(id);
  if(!me) return;

  if(d.t === "hi"){
    me.name = String(d.n || "").slice(0, 20) || ("Rider " + id);
    sendTo(id, JSON.stringify({ t: "you", id }));
    for(const [otherId, r] of riders)
      if(otherId !== id && r.name) sendTo(id, JSON.stringify({ t: "join", id: otherId, n: r.name }));
    sendToAll(JSON.stringify({ t: "join", id, n: me.name }), id);
    console.log(me.name + " joined (" + riders.size + " riding)");

  } else if(d.t === "m"){
    /* where they are — passed straight on, never kept */
    if(typeof d.x !== "number" || typeof d.z !== "number") return;
    sendToAll(JSON.stringify({ t: "m", id, x: d.x, z: d.z, y: d.y || 0, g: d.g || 0 }), id);
  }
}

function drop(id){
  const r = riders.get(id);
  if(!r) return;
  riders.delete(id);
  try { r.socket.destroy(); } catch(e){}
  sendToAll(JSON.stringify({ t: "bye", id }), id);
  if(r.name) console.log(r.name + " left (" + riders.size + " riding)");
}

server.listen(PORT, () => {
  console.log("Jill's Game server listening on port " + PORT);
  console.log("Nothing is stored. Stop it to clear everyone.");
});
