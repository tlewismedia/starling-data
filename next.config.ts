import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@langchain/langgraph",
    "@langchain/core",
    "@pinecone-database/pinecone",
    "openai",
  ],
};

export default nextConfig;
