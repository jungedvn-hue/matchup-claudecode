// Edge Function: assistant-chat
// POST { session_id?: string, message: string }
// Returns SSE stream:
//   event: text     data: {"delta": "..."}
//   event: tool     data: {"name": "...", "input": {...}, "output": {...}}
//   event: done     data: {"session_id": "...", "message_id": "...", "tokens_in": N, "tokens_out": N}
//   event: error    data: {"message": "..."}

// @ts-ignore
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SYSTEM_PROMPT } from "./system-prompt.ts";
import { TOOL_SCHEMAS, TOOL_MAP } from "./tools.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 800;
const HISTORY_TURNS = 20;
const DAILY_FREE_CAP = 30;
const MAX_TOOL_ITERATIONS = 4;

interface AnthropicContentBlock {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
  tool_use_id?: string;
  content?: unknown;
}

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

// ── SSE helpers ─────────────────────────────────────────────────────────────
function sseEvent(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ── Main handler ────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return jsonError("ANTHROPIC_API_KEY not configured", 500);

  // Auth
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return jsonError("Missing auth", 401);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return jsonError("Invalid session", 401);

  // Body
  let body: { session_id?: string; message?: string };
  try { body = await req.json(); } catch { return jsonError("Invalid JSON", 400); }
  const userMessage = (body.message ?? "").trim();
  if (!userMessage) return jsonError("Empty message", 400);
  if (userMessage.length > 4000) return jsonError("Message too long", 400);

  // Rate limit
  const today = new Date().toISOString().slice(0, 10);
  const { data: limitRow } = await supabase
    .from("ai_rate_limits")
    .select("date, messages_count")
    .eq("user_id", user.id)
    .maybeSingle();
  const isToday = limitRow?.date === today;
  const usedToday = isToday ? (limitRow?.messages_count ?? 0) : 0;
  if (usedToday >= DAILY_FREE_CAP) {
    return jsonError(`Daily limit reached (${DAILY_FREE_CAP} messages/day). Try again tomorrow.`, 429);
  }

  // Resolve or create session
  let sessionId = body.session_id;
  if (!sessionId) {
    const { data: newSession, error: sErr } = await supabase
      .from("ai_chat_sessions")
      .insert({ user_id: user.id, title: userMessage.slice(0, 60) })
      .select("id")
      .single();
    if (sErr || !newSession) return jsonError("Could not create session", 500);
    sessionId = newSession.id;
  }

  // Load history (last N messages)
  const { data: historyRows } = await supabase
    .from("ai_chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(HISTORY_TURNS * 2);

  const history: AnthropicMessage[] = (historyRows ?? []).map((r: any) => ({
    role: r.role === "assistant" ? "assistant" : "user",
    content: r.content as AnthropicContentBlock[] | string,
  }));

  // Persist incoming user message
  await supabase.from("ai_chat_messages").insert({
    session_id: sessionId,
    user_id: user.id,
    role: "user",
    content: [{ type: "text", text: userMessage }],
  });

  history.push({ role: "user", content: [{ type: "text", text: userMessage }] });

  // ── Stream loop ───────────────────────────────────────────────────────────
  const stream = new ReadableStream({
    async start(controller) {
      let totalIn = 0;
      let totalOut = 0;
      let finalAssistantBlocks: AnthropicContentBlock[] = [];

      try {
        for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
          const resp = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: MODEL,
              max_tokens: MAX_TOKENS,
              system: [
                {
                  type: "text",
                  text: SYSTEM_PROMPT,
                  cache_control: { type: "ephemeral" },
                },
              ],
              tools: TOOL_SCHEMAS,
              messages: history,
              stream: true,
            }),
          });

          if (!resp.ok || !resp.body) {
            const errText = await resp.text();
            controller.enqueue(sseEvent("error", { message: `Upstream ${resp.status}: ${errText.slice(0, 200)}` }));
            controller.close();
            return;
          }

          const reader = resp.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          let assistantBlocks: AnthropicContentBlock[] = [];
          let currentBlock: AnthropicContentBlock | null = null;
          let toolInputJson = "";
          let stopReason = "";

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const payload = line.slice(6);
              if (!payload || payload === "[DONE]") continue;
              let evt: any;
              try { evt = JSON.parse(payload); } catch { continue; }

              if (evt.type === "message_start" && evt.message?.usage) {
                totalIn += evt.message.usage.input_tokens ?? 0;
                totalIn += evt.message.usage.cache_read_input_tokens ?? 0;
              }
              if (evt.type === "content_block_start") {
                currentBlock = evt.content_block;
                toolInputJson = "";
                if (currentBlock?.type === "tool_use") {
                  currentBlock = { type: "tool_use", id: evt.content_block.id, name: evt.content_block.name, input: {} };
                }
              }
              if (evt.type === "content_block_delta" && currentBlock) {
                if (evt.delta?.type === "text_delta") {
                  const txt = evt.delta.text as string;
                  currentBlock.text = (currentBlock.text ?? "") + txt;
                  controller.enqueue(sseEvent("text", { delta: txt }));
                } else if (evt.delta?.type === "input_json_delta") {
                  toolInputJson += evt.delta.partial_json ?? "";
                }
              }
              if (evt.type === "content_block_stop" && currentBlock) {
                if (currentBlock.type === "tool_use" && toolInputJson) {
                  try { currentBlock.input = JSON.parse(toolInputJson); } catch { currentBlock.input = {}; }
                }
                assistantBlocks.push(currentBlock);
                currentBlock = null;
              }
              if (evt.type === "message_delta") {
                if (evt.usage?.output_tokens) totalOut += evt.usage.output_tokens;
                if (evt.delta?.stop_reason) stopReason = evt.delta.stop_reason;
              }
            }
          }

          history.push({ role: "assistant", content: assistantBlocks });
          finalAssistantBlocks = assistantBlocks;

          if (stopReason !== "tool_use") break;

          // Execute tool calls
          const toolResults: AnthropicContentBlock[] = [];
          for (const block of assistantBlocks) {
            if (block.type !== "tool_use" || !block.name || !block.id) continue;
            const tool = TOOL_MAP[block.name];
            let output: unknown;
            try {
              if (!tool) output = { error: `Unknown tool ${block.name}` };
              else output = await tool.execute(block.input ?? {}, { userId: user.id, supabase });
            } catch (e) {
              output = { error: (e as Error).message };
            }
            controller.enqueue(sseEvent("tool", { name: block.name, input: block.input, output }));
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(output),
            });
          }
          history.push({ role: "user", content: toolResults });
        }

        // Persist final assistant turn
        const { data: insertedMsg } = await supabase
          .from("ai_chat_messages")
          .insert({
            session_id: sessionId,
            user_id: user.id,
            role: "assistant",
            content: finalAssistantBlocks,
            tokens_in: totalIn,
            tokens_out: totalOut,
            model: MODEL,
          })
          .select("id")
          .single();

        // Update rate limit
        await supabase.from("ai_rate_limits").upsert({
          user_id: user.id,
          date: today,
          messages_count: usedToday + 1,
          tokens_in: (isToday ? (limitRow as any)?.tokens_in ?? 0 : 0) + totalIn,
          tokens_out: (isToday ? (limitRow as any)?.tokens_out ?? 0 : 0) + totalOut,
          updated_at: new Date().toISOString(),
        });

        controller.enqueue(sseEvent("done", {
          session_id: sessionId,
          message_id: insertedMsg?.id,
          tokens_in: totalIn,
          tokens_out: totalOut,
          messages_today: usedToday + 1,
          daily_cap: DAILY_FREE_CAP,
        }));
        controller.close();
      } catch (e) {
        controller.enqueue(sseEvent("error", { message: (e as Error).message }));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...cors,
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      "x-accel-buffering": "no",
    },
  });
});

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}
