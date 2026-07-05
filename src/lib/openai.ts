import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is missing. Article generation will fail until it is configured.");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
