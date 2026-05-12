import { StateGraph } from "@langchain/langgraph";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { GraphStateAnnotation } from "./state";
import { createRetrieveNode } from "./nodes/retrieve";
import { createCitationFollowNode } from "./nodes/citation-follow";
import { createRerankNode } from "./nodes/rerank";
import { createGenerateNode } from "./nodes/generate";
import { bumpBuild, logMemory } from "./instrument";

type Pipeline = {
  graph: ReturnType<typeof compileFullGraph>;
  retrievalGraph: ReturnType<typeof compileRetrievalGraph>;
  openai: OpenAI;
};

function compileFullGraph(
  pinecone: Pinecone,
  vectorStore: ReturnType<Pinecone["index"]>,
  openai: OpenAI,
) {
  return new StateGraph(GraphStateAnnotation)
    .addNode("retrieve", createRetrieveNode(vectorStore))
    .addNode("citation-follow", createCitationFollowNode(vectorStore))
    .addNode("rerank", createRerankNode(pinecone))
    .addNode("generate", createGenerateNode(openai))
    .addEdge("__start__", "retrieve")
    .addEdge("retrieve", "citation-follow")
    .addEdge("citation-follow", "rerank")
    .addEdge("rerank", "generate")
    .addEdge("generate", "__end__")
    .compile();
}

// Retrieval-only graph: same retrieve → citation-follow → rerank chain
// without the generate node. Used by the eval (and the streaming retrieval
// endpoint) so chunks scored by the metrics are exactly what the production
// pipeline assembles — without paying for an OpenAI generation call on
// every benchmark item.
function compileRetrievalGraph(
  pinecone: Pinecone,
  vectorStore: ReturnType<Pinecone["index"]>,
) {
  return new StateGraph(GraphStateAnnotation)
    .addNode("retrieve", createRetrieveNode(vectorStore))
    .addNode("citation-follow", createCitationFollowNode(vectorStore))
    .addNode("rerank", createRerankNode(pinecone))
    .addEdge("__start__", "retrieve")
    .addEdge("retrieve", "citation-follow")
    .addEdge("citation-follow", "rerank")
    .addEdge("rerank", "__end__")
    .compile();
}

function buildPipeline(): Pipeline {
  const n = bumpBuild();
  logMemory(`graph:build#${n}`);
  if (n > 1) {
    console.warn(
      `[pipeline] rebuilding graph (count=${n}). ` +
        `globalThis cache missed — likely a new worker or VM context.`,
    );
  }
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const vectorStore = pinecone.index(process.env.PINECONE_INDEX!);
  const openai = new OpenAI();
  return {
    graph: compileFullGraph(pinecone, vectorStore, openai),
    retrievalGraph: compileRetrievalGraph(pinecone, vectorStore),
    openai,
  };
}

// Cache clients + compiled graphs on globalThis so Next.js dev HMR doesn't
// leak a new Pinecone client, OpenAI client, and LangGraph instance on
// every module re-evaluation.
type GlobalWithPipeline = typeof globalThis & {
  __pipeline?: Pipeline;
};

const g = globalThis as GlobalWithPipeline;

// Detect a stale cache shape — e.g. an old `Pipeline` object cached on
// globalThis from a previous HMR generation that pre-dates a new field on
// the type. Plain `??=` only checks for null/undefined, so a stale object
// missing newer fields would silently survive.
function getPipeline(): Pipeline {
  const p = g.__pipeline;
  if (!p || !p.graph || !p.retrievalGraph || !p.openai) {
    g.__pipeline = buildPipeline();
  }
  return g.__pipeline!;
}

export function getGraph() {
  return getPipeline().graph;
}

export function getRetrievalGraph() {
  return getPipeline().retrievalGraph;
}
