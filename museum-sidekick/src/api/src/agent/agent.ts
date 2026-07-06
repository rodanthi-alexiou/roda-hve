// Museum Sidekick agent: Azure OpenAI GPT-4o via chat-completions with
// function/tool calling and vision. Auth is passwordless-first — a bearer token
// from DefaultAzureCredential (Managed Identity in Azure) — falling back to an
// API key only for local development.
//
// Grounded in Microsoft Learn:
//   https://learn.microsoft.com/azure/foundry/openai/how-to/gpt-with-vision
//   https://learn.microsoft.com/azure/foundry/openai/supported-languages
//
// The agent is intentionally a plain chat-completions tool loop rather than the
// Foundry Agent Service SDK: it is cheaper, has no server-side agent/thread
// state to provision, and is fully deterministic to test for this POC.

import { AzureOpenAI } from "openai";
import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from "@azure/identity";
import type {
  ChatCompletionMessageParam,
} from "openai/resources/index";
import { dispatchTool, metTools } from "../met/tools.js";
import type { ArtworkCard } from "../met/types.js";

/** Max tool-calling rounds before we force a final answer (cost guardrail). */
const MAX_STEPS = 5;

const SYSTEM_PROMPT =
  "You are Museum Sidekick, a friendly, knowledgeable museum guide for the " +
  "Metropolitan Museum of Art's open-access (public-domain) collection. " +
  "Use the provided tools to ground every artwork claim in real works — never " +
  "invent titles, artists, dates, or object IDs. When a user asks to explore a " +
  "theme or plan a tour, call search_collection. To describe one work in " +
  "detail, call get_object. To suggest similar works, call find_related. " +
  "Use list_departments when the user wants to browse by department. When an " +
  "image is provided, describe what you see and use it to search for related " +
  "works. Keep replies warm and concise; the app renders the returned artwork " +
  "images as a gallery, so refer to works by title and artist rather than " +
  "repeating raw URLs.";

let client: AzureOpenAI | undefined;

/** Lazily create the Azure OpenAI client (key locally, Managed Identity in Azure). */
function getClient(): AzureOpenAI {
  if (client) return client;

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  if (!endpoint) throw new Error("AZURE_OPENAI_ENDPOINT is not set");

  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o";
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21";
  const apiKey = process.env.AZURE_OPENAI_API_KEY;

  if (apiKey) {
    client = new AzureOpenAI({ endpoint, apiKey, apiVersion, deployment });
  } else {
    const azureADTokenProvider = getBearerTokenProvider(
      new DefaultAzureCredential(),
      "https://cognitiveservices.azure.com/.default",
    );
    client = new AzureOpenAI({
      endpoint,
      azureADTokenProvider,
      apiVersion,
      deployment,
    });
  }
  return client;
}

/** Extract artwork cards from a tool's JSON result string. */
function extractCards(resultJson: string): ArtworkCard[] {
  try {
    const parsed = JSON.parse(resultJson) as
      | { results?: ArtworkCard[] }
      | ArtworkCard;
    if (Array.isArray((parsed as { results?: ArtworkCard[] }).results)) {
      return (parsed as { results: ArtworkCard[] }).results;
    }
    if ((parsed as ArtworkCard).objectID !== undefined) {
      return [parsed as ArtworkCard];
    }
  } catch {
    // Non-card tool result (e.g. departments) — ignore.
  }
  return [];
}

export interface AgentResult {
  /** The assistant's final natural-language reply. */
  content: string;
  /** Deduped artwork cards gathered from tool calls, for the gallery. */
  cards: ArtworkCard[];
}

/**
 * Run one agent turn. `messages` is the prior user/assistant conversation
 * (the caller builds the latest user message, optionally with an image content
 * part). Returns the final reply plus any artwork cards the tools surfaced.
 */
export async function runAgent(
  messages: ChatCompletionMessageParam[],
): Promise<AgentResult> {
  const azure = getClient();
  const model = process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o";

  const convo: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages,
  ];

  const cardsById = new Map<number, ArtworkCard>();

  for (let step = 0; step < MAX_STEPS; step++) {
    const completion = await azure.chat.completions.create({
      model,
      messages: convo,
      tools: metTools,
      max_tokens: 800,
    });

    const message = completion.choices[0].message;
    convo.push(message);

    const toolCalls = message.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      return { content: message.content ?? "", cards: [...cardsById.values()] };
    }

    for (const call of toolCalls) {
      if (call.type !== "function") continue;
      let result: string;
      try {
        result = await dispatchTool(call.function.name, call.function.arguments);
      } catch (err) {
        result = JSON.stringify({
          error: err instanceof Error ? err.message : String(err),
        });
      }
      for (const card of extractCards(result)) {
        cardsById.set(card.objectID, card);
      }
      convo.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }

  // Hit the step ceiling — ask for a final answer with no further tools.
  const final = await azure.chat.completions.create({
    model,
    messages: convo,
    max_tokens: 800,
  });
  return {
    content: final.choices[0].message.content ?? "",
    cards: [...cardsById.values()],
  };
}
