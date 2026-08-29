/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agent from "../agent.js";
import type * as agentInstructions from "../agentInstructions.js";
import type * as candidatePartMessages from "../candidatePartMessages.js";
import type * as candidateParts from "../candidateParts.js";
import type * as savedCandidates from "../savedCandidates.js";
import type * as thread from "../thread.js";
import type * as threadAccess from "../threadAccess.js";
import type * as tools_firecrawlAdapter from "../tools/firecrawlAdapter.js";
import type * as tools_maps from "../tools/maps.js";
import type * as tools_mapsAdapter from "../tools/mapsAdapter.js";
import type * as tools_presentation from "../tools/presentation.js";
import type * as tools_research from "../tools/research.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agent: typeof agent;
  agentInstructions: typeof agentInstructions;
  candidatePartMessages: typeof candidatePartMessages;
  candidateParts: typeof candidateParts;
  savedCandidates: typeof savedCandidates;
  thread: typeof thread;
  threadAccess: typeof threadAccess;
  "tools/firecrawlAdapter": typeof tools_firecrawlAdapter;
  "tools/maps": typeof tools_maps;
  "tools/mapsAdapter": typeof tools_mapsAdapter;
  "tools/presentation": typeof tools_presentation;
  "tools/research": typeof tools_research;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  firecrawl: import("@firecrawl/firecrawl-convex/_generated/component.js").ComponentApi<"firecrawl">;
};
