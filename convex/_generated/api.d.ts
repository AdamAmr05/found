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
import type * as aiModel from "../aiModel.js";
import type * as appOrigins from "../appOrigins.js";
import type * as auth from "../auth.js";
import type * as candidatePartMessages from "../candidatePartMessages.js";
import type * as candidateParts from "../candidateParts.js";
import type * as http from "../http.js";
import type * as outreachContent from "../outreachContent.js";
import type * as outreachDelivery from "../outreachDelivery.js";
import type * as outreachDrafts from "../outreachDrafts.js";
import type * as outreachInbox from "../outreachInbox.js";
import type * as outreachMailText from "../outreachMailText.js";
import type * as outreachMailbox from "../outreachMailbox.js";
import type * as outreachModel from "../outreachModel.js";
import type * as outreachReplyState from "../outreachReplyState.js";
import type * as outreachRevision from "../outreachRevision.js";
import type * as savedCandidates from "../savedCandidates.js";
import type * as thread from "../thread.js";
import type * as threadAccess from "../threadAccess.js";
import type * as threadHistory from "../threadHistory.js";
import type * as tools_firecrawlAdapter from "../tools/firecrawlAdapter.js";
import type * as tools_maps from "../tools/maps.js";
import type * as tools_mapsAdapter from "../tools/mapsAdapter.js";
import type * as tools_outreach from "../tools/outreach.js";
import type * as tools_outreachMailbox from "../tools/outreachMailbox.js";
import type * as tools_presentation from "../tools/presentation.js";
import type * as tools_research from "../tools/research.js";
import type * as tools_toolOwner from "../tools/toolOwner.js";
import type * as users from "../users.js";
import type * as viewer from "../viewer.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agent: typeof agent;
  agentInstructions: typeof agentInstructions;
  aiModel: typeof aiModel;
  appOrigins: typeof appOrigins;
  auth: typeof auth;
  candidatePartMessages: typeof candidatePartMessages;
  candidateParts: typeof candidateParts;
  http: typeof http;
  outreachContent: typeof outreachContent;
  outreachDelivery: typeof outreachDelivery;
  outreachDrafts: typeof outreachDrafts;
  outreachInbox: typeof outreachInbox;
  outreachMailText: typeof outreachMailText;
  outreachMailbox: typeof outreachMailbox;
  outreachModel: typeof outreachModel;
  outreachReplyState: typeof outreachReplyState;
  outreachRevision: typeof outreachRevision;
  savedCandidates: typeof savedCandidates;
  thread: typeof thread;
  threadAccess: typeof threadAccess;
  threadHistory: typeof threadHistory;
  "tools/firecrawlAdapter": typeof tools_firecrawlAdapter;
  "tools/maps": typeof tools_maps;
  "tools/mapsAdapter": typeof tools_mapsAdapter;
  "tools/outreach": typeof tools_outreach;
  "tools/outreachMailbox": typeof tools_outreachMailbox;
  "tools/presentation": typeof tools_presentation;
  "tools/research": typeof tools_research;
  "tools/toolOwner": typeof tools_toolOwner;
  users: typeof users;
  viewer: typeof viewer;
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
  agentmail: import("@agentmail/convex/_generated/component.js").ComponentApi<"agentmail">;
  auth: import("@convex-dev/auth/core/_generated/component.js").ComponentApi<"auth">;
  oauthGoogle: import("@convex-dev/auth/providers/oauth/_generated/component.js").ComponentApi<"oauthGoogle">;
  authPasswordProvider: import("@convex-dev/auth/providers/password/_generated/component.js").ComponentApi<"authPasswordProvider">;
  authUsername: import("@convex-dev/auth/username/_generated/component.js").ComponentApi<"authUsername">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  firecrawl: import("@firecrawl/firecrawl-convex/_generated/component.js").ComponentApi<"firecrawl">;
};
