// Museum Sidekick API server: a thin Express layer over the agent.
//
// Endpoints:
//   GET  /health    — liveness/readiness probe for Container Apps.
//   POST /api/chat  — one chat turn; returns the reply text plus artwork cards.

import "dotenv/config";
import cors from "cors";
import express from "express";
import type {
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
} from "openai/resources/index";
import { runAgent } from "./agent/agent.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" })); // room for a base64 image data URL

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  /** The latest user message. */
  message: string;
  /** Prior turns (excluding the new message), oldest first. */
  history?: ChatTurn[];
  /** Optional image as a URL or data URL, sent to GPT-4o vision. */
  image?: string;
}

app.post("/api/chat", async (req, res) => {
  const body = req.body as ChatRequestBody;
  if (!body?.message || typeof body.message !== "string") {
    res.status(400).json({ error: "'message' (string) is required" });
    return;
  }

  // Prior conversation turns.
  const history: ChatCompletionMessageParam[] = (body.history ?? []).map(
    (t) => ({ role: t.role, content: t.content }),
  );

  // Latest user message — multimodal when an image is attached.
  let latest: ChatCompletionMessageParam;
  if (body.image) {
    const parts: ChatCompletionContentPart[] = [
      { type: "text", text: body.message },
      { type: "image_url", image_url: { url: body.image } },
    ];
    latest = { role: "user", content: parts };
  } else {
    latest = { role: "user", content: body.message };
  }

  try {
    const result = await runAgent([...history, latest]);
    res.json({ reply: result.content, cards: result.cards });
  } catch (err) {
    console.error("chat error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "internal error",
    });
  }
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`Museum Sidekick API listening on :${port}`);
});
