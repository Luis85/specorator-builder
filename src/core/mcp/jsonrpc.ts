import { TOOL_DEFS, callTool, type McpToolDeps } from "./tools";

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: number | string | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string };
}

export const PROTOCOL_VERSION = "2024-11-05";
export const SERVER_INFO = { name: "specorator", version: "0.1.0" };

function err(
  id: number | string | null,
  code: number,
  message: string
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

/**
 * Handle one JSON-RPC message for the MCP server. Returns null for
 * notifications (no response expected).
 */
export async function handleRpc(
  req: JsonRpcRequest,
  deps: McpToolDeps
): Promise<JsonRpcResponse | null> {
  const id = req.id ?? null;
  switch (req.method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        },
      };
    case "ping":
      return { jsonrpc: "2.0", id, result: {} };
    case "tools/list":
      return { jsonrpc: "2.0", id, result: { tools: TOOL_DEFS } };
    case "tools/call": {
      const name = req.params?.["name"];
      const args = (req.params?.["arguments"] as Record<string, unknown>) ?? {};
      if (typeof name !== "string") return err(id, -32602, "Invalid params");
      return { jsonrpc: "2.0", id, result: await callTool(name, args, deps) };
    }
    default:
      if (req.method.startsWith("notifications/")) return null;
      return err(id, -32601, `Method not found: ${req.method}`);
  }
}
