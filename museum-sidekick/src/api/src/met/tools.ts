// OpenAI function-tool definitions for the Met tool layer, plus a dispatcher
// that maps a tool call to the corresponding client function.
//
// The agent (Azure OpenAI GPT-4o) receives `metTools` in its `tools` array and
// emits tool calls; `dispatchTool` executes them and returns a JSON string to
// feed back as the tool message content.

import type { ChatCompletionTool } from "openai/resources/index";
import {
  findRelated,
  getObject,
  listDepartments,
  searchCollection,
  toArtworkCard,
} from "./client.js";

/** The four function tools exposed to the agent. */
export const metTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_collection",
      description:
        "Search the Met's public-domain collection for artworks matching a " +
        "theme or keyword. Returns hydrated artwork cards (title, artist, " +
        "image) for public-domain works that have images. Use this to plan " +
        "tours or find works on a subject.",
      parameters: {
        type: "object",
        properties: {
          q: {
            type: "string",
            description:
              "Search term or theme, e.g. 'sunflowers', 'samurai armor'.",
          },
          departmentId: {
            type: "integer",
            description:
              "Optional department ID to restrict the search (from " +
              "list_departments).",
          },
          medium: {
            type: "string",
            description:
              "Optional medium/object type filter, e.g. 'Paintings' or " +
              "'Ceramics|Sculpture' (pipe-separated, case-sensitive).",
          },
          geoLocation: {
            type: "string",
            description:
              "Optional geographic filter, e.g. 'France' or 'Japan|China'.",
          },
          dateBegin: {
            type: "integer",
            description:
              "Optional start year (use together with dateEnd). Negative=B.C.",
          },
          dateEnd: {
            type: "integer",
            description:
              "Optional end year (use together with dateBegin). Negative=B.C.",
          },
          isHighlight: {
            type: "boolean",
            description: "Optional. Restrict to highlight (notable) works.",
          },
          isOnView: {
            type: "boolean",
            description: "Optional. Restrict to works currently on view.",
          },
          limit: {
            type: "integer",
            description:
              "Optional max number of cards to return after filtering " +
              "(default 12).",
            minimum: 1,
            maximum: 40,
          },
        },
        required: ["q"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_object",
      description:
        "Fetch the full metadata and image for a single Met artwork by its " +
        "object ID. Use this to explain or describe one specific work in detail.",
      parameters: {
        type: "object",
        properties: {
          objectID: {
            type: "integer",
            description: "The Met object ID, e.g. 45734.",
          },
        },
        required: ["objectID"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_departments",
      description:
        "List the Met's curatorial departments with their IDs and display " +
        "names. Use the returned departmentId to scope a search_collection call.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_related",
      description:
        "Given an object ID, find other public-domain works related to it by " +
        "its dominant subject tag, culture, or medium. Excludes the original. " +
        "Use this for 'if you liked this, see also…' recommendations.",
      parameters: {
        type: "object",
        properties: {
          objectID: {
            type: "integer",
            description: "The source Met object ID to find related works for.",
          },
          limit: {
            type: "integer",
            description:
              "Optional max number of related cards to return (default 6).",
            minimum: 1,
            maximum: 20,
          },
        },
        required: ["objectID"],
      },
    },
  },
];

/** Arguments the model may pass, loosely typed before coercion. */
interface ToolArgs {
  q?: string;
  departmentId?: number;
  medium?: string;
  geoLocation?: string;
  dateBegin?: number;
  dateEnd?: number;
  isHighlight?: boolean;
  isOnView?: boolean;
  objectID?: number;
  limit?: number;
}

/**
 * Execute a tool call by name with the model-provided JSON arguments. Returns a
 * JSON string suitable for a `role: "tool"` message.
 */
export async function dispatchTool(
  name: string,
  argsJson: string,
): Promise<string> {
  const args = (argsJson ? JSON.parse(argsJson) : {}) as ToolArgs;

  switch (name) {
    case "search_collection": {
      if (!args.q) throw new Error("search_collection requires 'q'");
      const { limit, q, ...rest } = args;
      const cards = await searchCollection(
        { q, ...rest },
        limit ?? 12,
      );
      return JSON.stringify({ results: cards });
    }
    case "get_object": {
      if (args.objectID === undefined) {
        throw new Error("get_object requires 'objectID'");
      }
      const obj = await getObject(args.objectID);
      return JSON.stringify(obj ? toArtworkCard(obj) : { error: "not found" });
    }
    case "list_departments": {
      const departments = await listDepartments();
      return JSON.stringify({ departments });
    }
    case "find_related": {
      if (args.objectID === undefined) {
        throw new Error("find_related requires 'objectID'");
      }
      const cards = await findRelated(args.objectID, args.limit ?? 6);
      return JSON.stringify({ results: cards });
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
