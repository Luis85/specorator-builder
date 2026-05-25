import * as http from "http";
import { handleRpc, type JsonRpcRequest } from "../../core/mcp/jsonrpc";
import type { McpToolDeps } from "../../core/mcp/tools";

/**
 * Minimal MCP server over Streamable-HTTP semantics (JSON-RPC 2.0 on POST /mcp),
 * bound to 127.0.0.1 (ADR-0010). Stateless request/response — sufficient for the
 * tool surface; no SSE streaming. Optional bearer token.
 */
export class McpServer {
  private server: http.Server | null = null;
  private port = 0;

  isRunning(): boolean {
    return !!this.server;
  }

  getPort(): number {
    return this.port;
  }

  async start(
    preferredPort: number,
    deps: McpToolDeps,
    token?: string
  ): Promise<number> {
    if (this.server) return this.port;
    this.port = await this.listen(preferredPort, 0, deps, token);
    return this.port;
  }

  async stop(): Promise<void> {
    const server = this.server;
    if (!server) return;
    this.server = null;
    this.port = 0;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  private listen(
    port: number,
    attempt: number,
    deps: McpToolDeps,
    token?: string
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        void this.handle(req, res, deps, token);
      });
      server.on("error", (e: NodeJS.ErrnoException) => {
        if (e.code === "EADDRINUSE" && attempt < 15) {
          resolve(this.listen(port + 1, attempt + 1, deps, token));
        } else {
          reject(e);
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
    res: http.ServerResponse,
    deps: McpToolDeps,
    token?: string
  ): Promise<void> {
    if (req.method !== "POST") {
      res.writeHead(405).end();
      return;
    }
    if (token && req.headers["authorization"] !== `Bearer ${token}`) {
      res.writeHead(401).end();
      return;
    }
    try {
      const body = await readBody(req);
      const parsed = JSON.parse(body) as JsonRpcRequest | JsonRpcRequest[];
      const requests = Array.isArray(parsed) ? parsed : [parsed];
      const responses = [];
      for (const r of requests) {
        const out = await handleRpc(r, deps);
        if (out) responses.push(out);
      }
      if (responses.length === 0) {
        res.writeHead(202).end();
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(Array.isArray(parsed) ? responses : responses[0]));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error" },
        })
      );
    }
  }
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}
