const http = require("http");
const { spawn } = require("child_process");
const path = require("path");

const PORT = 17888;
const clients = new Set();
const watcherPath = path.join(__dirname, "watcher.ps1");
const mediaSessionPath = path.join(__dirname, "media-session.ps1");
let latestMediaState = null;

function broadcast(payload) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) {
    client.write(data);
  }
}

function runPowerShellJson(args = []) {
  return new Promise((resolve, reject) => {
    const worker = spawn(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", mediaSessionPath, ...args],
      { stdio: ["ignore", "pipe", "pipe"] }
    );

    let stdout = "";
    let stderr = "";

    worker.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    worker.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    worker.on("error", reject);

    worker.on("exit", (code) => {
      const trimmed = stdout.trim();

      if (code !== 0 && !trimmed) {
        reject(new Error(stderr.trim() || `PowerShell exited with code ${code}`));
        return;
      }

      try {
        resolve(trimmed ? JSON.parse(trimmed) : {});
      } catch (error) {
        reject(new Error(`Invalid JSON from PowerShell: ${trimmed || stderr}`));
      }
    });
  });
}

function startWatcher() {
  const watcher = spawn(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", watcherPath],
    { stdio: ["ignore", "pipe", "pipe"] }
  );

  let buffer = "";

  watcher.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const payload = JSON.parse(trimmed);
        if (payload.type === "bridge") continue;
        if (payload.type === "music") {
          latestMediaState = {
            ...(latestMediaState ?? {}),
            source: payload.app ?? latestMediaState?.source ?? "UNKNOWN",
            app: payload.app ?? latestMediaState?.app ?? "UNKNOWN",
            title: payload.title ?? latestMediaState?.title ?? "",
            artist: payload.artist ?? latestMediaState?.artist ?? "",
            status: payload.status ?? latestMediaState?.status ?? "paused"
          };
        }
        broadcast(payload);
      } catch {
        // Ignore malformed watcher output.
      }
    }
  });

  watcher.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
  });

  watcher.on("exit", (code) => {
    console.error(`Watcher exited (${code}). Restarting in 3s...`);
    setTimeout(startWatcher, 3000);
  });
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end();
    return;
  }

  if (req.url === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });
    res.write("\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, clients: clients.size }));
    return;
  }

  if (req.url === "/media-state" && req.method === "GET") {
    runPowerShellJson(["-Mode", "state"])
      .then((payload) => {
        if (payload?.ok && payload?.available) {
          latestMediaState = payload;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(payload));
      })
      .catch((error) => {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          ok: false,
          available: false,
          error: error.message
        }));
      });
    return;
  }

  if (req.url === "/media-control" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      let payload;
      try {
        payload = body ? JSON.parse(body) : {};
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "invalid_json" }));
        return;
      }

      const args = [
        "-Mode", "command",
        "-Action", String(payload.action ?? "")
      ];

      if (typeof payload.value === "number") {
        args.push("-Value", String(payload.value));
      }

      runPowerShellJson(args)
        .then((commandResult) => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(commandResult));
        })
        .catch((error) => {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            ok: false,
            error: error.message
          }));
        });
    });
    return;
  }

  if (req.url === "/notify" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        broadcast({
          type: "notification",
          app: payload.app ?? "TEST",
          title: payload.title ?? "",
          body: payload.body ?? ""
        });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`QUTE notification bridge on http://127.0.0.1:${PORT}`);
  console.log("SSE stream: /events");
  startWatcher();
});
