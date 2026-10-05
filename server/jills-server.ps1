# =============================================================================
#  Jill's Game — the server
#
#  This is the always-on computer that lets lots of people ride in the same
#  world at once. Everyone's game connects to it, tells it where they are ten
#  times a second, and it passes that on to everybody else.
#
#  TO RUN IT:  right-click this file and pick "Run with PowerShell"
#              (or, in a terminal:  powershell -ExecutionPolicy Bypass -File jills-server.ps1)
#
#  It needs NOTHING installed — no Node, no Python, no downloads. It is built
#  out of what Windows already has.
#
#  WHAT IT KEEPS: nothing. Names and positions live in memory while people are
#  playing and vanish the moment the window is closed. Nothing is written to
#  disk, so no child's details are ever stored anywhere.
#
#  WHO CAN JOIN: anyone who can reach this computer. On your own wifi that's
#  everyone in the house. For friends in other houses the server has to live
#  somewhere on the internet instead — that part costs money and is Dad's call.
# =============================================================================

param([int]$Port = 8787)

$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;

namespace JillsGame {

  // one person playing
  public class Rider {
    public int Id;
    public string Name = "";
    // What they look like — coat, clothes, helmet, whether they're tacked up.
    // The game sends it as one base64 lump so this server never has to
    // understand it; it just hands it on to everybody else.
    public string Look = "";
    public TcpClient Client;
    public NetworkStream Stream;
    public volatile bool Alive = true;
  }

  public class Server {
    // A raw TCP listener rather than HttpListener, because HttpListener needs
    // administrator rights to accept connections from other machines, and the
    // whole point is that a friend on the same wifi can join.
    TcpListener listener;
    readonly List<Rider> riders = new List<Rider>();
    int nextId = 1;
    public bool Running = true;

    // Printing has to happen inside C#. Handing PowerShell a script block and
    // calling it from one of these background threads takes the whole process
    // down — that is exactly what killed the first version.
    static readonly object printLock = new object();
    static void Log(string m) {
      lock (printLock) { Console.WriteLine("  " + m); }
    }

    public void Start(int port) {
      listener = new TcpListener(IPAddress.Any, port);
      listener.Start();
      Log("Listening on port " + port);
      while (Running) {
        TcpClient c;
        try { c = listener.AcceptTcpClient(); } catch { break; }
        Thread t = new Thread(delegate() { Handle(c); });
        t.IsBackground = true;
        t.Start();
      }
    }

    public void Stop() {
      Running = false;
      try { listener.Stop(); } catch { }
      lock (riders) { foreach (Rider r in riders) { try { r.Client.Close(); } catch { } } }
    }

    // ---- the WebSocket handshake -------------------------------------------
    // The browser asks to upgrade the connection. We prove we understood by
    // hashing the key it sent with a fixed magic string, which is what the
    // WebSocket rules say to do.
    bool Handshake(NetworkStream stream) {
      byte[] buf = new byte[4096];
      int len = stream.Read(buf, 0, buf.Length);
      if (len <= 0) return false;
      string req = Encoding.UTF8.GetString(buf, 0, len);
      if (!Regex.IsMatch(req, "^GET", RegexOptions.IgnoreCase)) return false;
      Match m = Regex.Match(req, "Sec-WebSocket-Key: (.*)");
      if (!m.Success) return false;
      string key = m.Groups[1].Value.Trim() + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
      string accept = Convert.ToBase64String(SHA1.Create().ComputeHash(Encoding.UTF8.GetBytes(key)));
      byte[] resp = Encoding.UTF8.GetBytes(
        "HTTP/1.1 101 Switching Protocols\r\n" +
        "Connection: Upgrade\r\n" +
        "Upgrade: websocket\r\n" +
        "Sec-WebSocket-Accept: " + accept + "\r\n\r\n");
      stream.Write(resp, 0, resp.Length);
      return true;
    }

    // ---- reading one message from the browser ------------------------------
    // Everything a browser sends is masked with four bytes it picks, so each
    // byte has to be un-masked on the way in.
    string ReadFrame(NetworkStream stream) {
      byte[] head = new byte[2];
      if (!ReadExactly(stream, head, 2)) return null;
      int opcode = head[0] & 0x0F;
      if (opcode == 8) return null;                     // they said goodbye
      bool masked = (head[1] & 0x80) != 0;
      long len = head[1] & 0x7F;
      if (len == 126) {
        byte[] e = new byte[2];
        if (!ReadExactly(stream, e, 2)) return null;
        len = (e[0] << 8) | e[1];
      } else if (len == 127) {
        byte[] e = new byte[8];
        if (!ReadExactly(stream, e, 8)) return null;
        len = 0;
        for (int i = 0; i < 8; i++) len = (len << 8) | e[i];
      }
      if (len > 1 << 20) return null;                   // nobody needs a megabyte
      byte[] mask = new byte[4];
      if (masked && !ReadExactly(stream, mask, 4)) return null;
      byte[] data = new byte[len];
      if (len > 0 && !ReadExactly(stream, data, (int)len)) return null;
      if (masked) for (int i = 0; i < len; i++) data[i] = (byte)(data[i] ^ mask[i % 4]);
      return Encoding.UTF8.GetString(data);
    }

    bool ReadExactly(NetworkStream stream, byte[] buf, int count) {
      int got = 0;
      while (got < count) {
        int n;
        try { n = stream.Read(buf, got, count - got); } catch { return false; }
        if (n <= 0) return false;
        got += n;
      }
      return true;
    }

    // ---- sending one message back ------------------------------------------
    // The server never masks, which keeps this short.
    byte[] Frame(string text) {
      byte[] body = Encoding.UTF8.GetBytes(text);
      List<byte> f = new List<byte>();
      f.Add(0x81);                                      // final frame, text
      if (body.Length < 126) {
        f.Add((byte)body.Length);
      } else if (body.Length <= 0xFFFF) {
        f.Add(126);
        f.Add((byte)(body.Length >> 8));
        f.Add((byte)(body.Length & 0xFF));
      } else {
        f.Add(127);
        for (int i = 7; i >= 0; i--) f.Add((byte)((body.Length >> (8 * i)) & 0xFF));
      }
      f.AddRange(body);
      return f.ToArray();
    }

    void SendTo(Rider r, string text) {
      if (!r.Alive) return;
      try { byte[] f = Frame(text); lock (r) { r.Stream.Write(f, 0, f.Length); } }
      catch { r.Alive = false; }
    }

    void SendToAll(string text, int exceptId) {
      Rider[] copy;
      lock (riders) { copy = riders.ToArray(); }
      foreach (Rider r in copy) if (r.Id != exceptId) SendTo(r, text);
    }

    static string Esc(string s) {
      if (s == null) return "";
      StringBuilder b = new StringBuilder();
      foreach (char c in s) {
        if (c == '"' || c == '\\') { b.Append('\\'); b.Append(c); }
        else if (c < ' ') b.Append(' ');
        else b.Append(c);
      }
      return b.ToString();
    }

    // "so-and-so is here, and this is what they look like"
    static string Joined(Rider r) {
      return "{\"t\":\"join\",\"id\":" + r.Id + ",\"n\":\"" + Esc(r.Name) +
             "\",\"lk\":\"" + Esc(r.Look) + "\"}";
    }

    // pull one "key":value out of the little messages the game sends
    static string Field(string json, string key) {
      Match m = Regex.Match(json, "\"" + key + "\"\\s*:\\s*\"([^\"]*)\"");
      if (m.Success) return m.Groups[1].Value;
      m = Regex.Match(json, "\"" + key + "\"\\s*:\\s*(-?[0-9.]+)");
      return m.Success ? m.Groups[1].Value : null;
    }

    void Handle(TcpClient client) {
      Rider me = null;
      try {
        NetworkStream stream = client.GetStream();
        if (!Handshake(stream)) { client.Close(); return; }

        me = new Rider();
        me.Client = client;
        me.Stream = stream;
        lock (riders) { me.Id = nextId++; riders.Add(me); }

        while (me.Alive) {
          string msg = ReadFrame(stream);
          if (msg == null) break;
          string t = Field(msg, "t");

          if (t == "hi") {
            string n = Field(msg, "n");
            me.Name = string.IsNullOrEmpty(n) ? ("Rider " + me.Id) : n;
            if (me.Name.Length > 20) me.Name = me.Name.Substring(0, 20);
            string lk = Field(msg, "lk");
            me.Look = (lk == null || lk.Length > 4000) ? "" : lk;
            SendTo(me, "{\"t\":\"you\",\"id\":" + me.Id + "}");
            // tell the newcomer who's already here, and everyone else about them
            Rider[] copy;
            lock (riders) { copy = riders.ToArray(); }
            foreach (Rider r in copy)
              if (r.Id != me.Id && r.Alive)
                SendTo(me, Joined(r));
            SendToAll(Joined(me), me.Id);
            Log(me.Name + " joined (" + copy.Length + " riding)");

          } else if (t == "look") {
            // they've changed their clothes or swapped horse mid-game
            string lk = Field(msg, "lk");
            if (lk != null && lk.Length <= 4000) {
              me.Look = lk;
              SendToAll(Joined(me), me.Id);
            }

          } else if (t == "m") {
            // where they are — passed straight on, never kept
            string x = Field(msg, "x"), z = Field(msg, "z"), y = Field(msg, "y"), g = Field(msg, "g");
            if (x != null && z != null)
              SendToAll("{\"t\":\"m\",\"id\":" + me.Id + ",\"x\":" + x + ",\"z\":" + z +
                        ",\"y\":" + (y ?? "0") + ",\"g\":" + (g ?? "0") + "}", me.Id);
          }
        }
      } catch { }

      if (me != null) {
        me.Alive = false;
        lock (riders) { riders.Remove(me); }
        SendToAll("{\"t\":\"bye\",\"id\":" + me.Id + "}", me.Id);
        if (me.Name != "") Log(me.Name + " left");
      }
      try { client.Close(); } catch { }
    }
  }
}
'@

$server = New-Object JillsGame.Server

# what to tell friends to type in
$ips = @()
foreach ($a in [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName())) {
  if ($a.AddressFamily -eq "InterNetwork") { $ips += $a.IPAddressToString }
}

Write-Host ""
Write-Host "  ===================================================="
Write-Host "         Jill's Game - the server is starting"
Write-Host "  ===================================================="
Write-Host ""
Write-Host "  In the game, press Friends -> Join the world, and type:"
Write-Host ""
Write-Host ("     On this computer:  localhost:" + $Port)
foreach ($ip in $ips) { Write-Host ("     On the same wifi:  " + $ip + ":" + $Port) }
Write-Host ""
Write-Host "  Nothing is saved. Close this window to stop the server."
Write-Host ""

try { $server.Start($Port) }
finally { $server.Stop(); Write-Host "  Server stopped." }
