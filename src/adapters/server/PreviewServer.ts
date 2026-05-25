import * as http from "http";
import { promises as fs } from "fs";
import * as path from "path";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

/** Local static webserver bound to 127.0.0.1, serving the dist root (ADR-0014). */
export class PreviewServer {
  private server: http.Server | null = null;
  private port = 0;
  private root = "";

  isRunning(): boolean {
    return !!this.server;
  }

  getPort(): number {
    return this.port;
  }

  async start(root: string, preferredPort: number): Promise<number> {
    if (this.server) return this.port;
    this.root = path.resolve(root);
    this.port = await this.listen(preferredPort, 0);
    return this.port;
  }

  async stop(): Promise<void> {
    const server = this.server;
    if (!server) return;
    this.server = null;
    this.port = 0;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  private listen(port: number, attempt: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        void this.handle(req, res);
      });
      server.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE" && attempt < 15) {
          resolve(this.listen(port + 1, attempt + 1));
        } else {
          reject(err);
        }
      });
      server.listen(port, "127.0.0.1", () => {
        this.server = server;
        resolve(port);
      });
    });
  }

  private async handle(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    try {
      let rel = decodeURIComponent((req.url || "/").split("?")[0]).replace(
        /^\/+/,
        ""
      );
      if (rel === "" || rel.endsWith("/")) rel += "index.html";
      const full = path.normalize(path.join(this.root, rel));
      if (!full.startsWith(this.root)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      const data = await fs.readFile(full);
      res.writeHead(200, {
        "Content-Type":
          MIME[path.extname(full).toLowerCase()] || "application/octet-stream",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  }
}
