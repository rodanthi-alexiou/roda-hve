import type { ChatResponse, ChatTurn } from "./types.ts";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export async function sendChat(
  message: string,
  history: ChatTurn[],
  image?: string,
): Promise<ChatResponse> {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, image }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Chat request failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as ChatResponse;
}
