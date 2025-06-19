import { NextRequest, NextResponse } from "next/server";
import { DataAPIClient } from "@datastax/astra-db-ts";
import OpenAI from "openai";

interface AstraDocument {
  _id: string;
  text: string;
  Company: string;
  Website: string;
  Industry: string;
  "Product/Service Category": string;
  "Business Type (B2B, B2B2C)": string;
  "Employees Count": string;
  Revenue: string;
  "Year Founded": string;
  "BBB Rating": string;
  Street: string;
  City: string;
  State: string;
  "Company Phone": string;
  "Company LinkedIn": string;
  "Owner's First Name": string;
  "Owner's Last Name": string;
  "Owner's Title": string;
  "Owner's LinkedIn": string;
  "Owner's Phone Number": string;
  "Owner's Email": string;
  Source: string;
}

interface ClientMessage {
  role: "user" | "ai";
  content: string;
}

interface OpenAIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const { ASTRA_DB_APPLICATION_TOKEN, ASTRA_DB_API_ENDPOINT, ASTRA_DB_NAMESPACE, ASTRA_DB_COLLECTION, OPENAI_API_KEY } = process.env;

if (!ASTRA_DB_APPLICATION_TOKEN || !ASTRA_DB_API_ENDPOINT || !ASTRA_DB_NAMESPACE || !ASTRA_DB_COLLECTION || !OPENAI_API_KEY) {
  throw new Error("Environment variables for Astra DB and OpenAI must be set.");
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const astraClient = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = astraClient.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE });
const collection = db.collection<AstraDocument>(ASTRA_DB_COLLECTION);

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { message, chatHistory } = (await req.json()) as { message: string; chatHistory: ClientMessage[] };
    if (!message) return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: message,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    const cursor = await collection.find(
      {},
      {
        sort: { $vector: queryEmbedding },
        limit: 5,
        projection: {
          $vector: 0,
        },
      }
    );
    const relevantDocuments = await cursor.toArray();

    if (relevantDocuments.length === 0) {
      return NextResponse.json({
        answer: "Sorry, I couldn't find any companies matching that criteria in the database.",
        sources: [],
      });
    }

    const context = relevantDocuments.map((doc) => doc.text).join("\n---\n");

    const systemPrompt = `
      You are "Caprae AI Analyst", a sophisticated AI assistant for the Private Equity firm Caprae Capital.
      Your task is to help analysts find and evaluate company prospects for acquisition.
      - Answer the user's questions ONLY based on the provided context from the company database.
      - DO NOT FABRICATE or make assumptions about data not present in the context. If information is missing, state "Information not available in the database".
      - Provide concise, professional, and to-the-point answers.
      - If you are providing a list of companies as a recommendation, ALWAYS start your answer with an introductory sentence like "Certainly, here are some suitable companies:" or "Based on your criteria, I found the following prospects:", then describe the companies.
      - Prioritize mentioning the company name, industry, and its business type.
      - Never mention "Based on the context...". Provide a direct answer.
      - Use formal and clear business language.
    `;

    const formattedHistory: OpenAIMessage[] = (chatHistory || []).map((msg) => ({
      role: msg.role === "ai" ? "assistant" : "user",
      content: msg.content,
    }));

    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...formattedHistory,
        {
          role: "user",
          content: `
            CONTEXT FROM DATABASE:
            ---
            ${context}
            ---

            ANALYST'S QUESTION:
            ${message}
          `,
        },
      ],
      temperature: 0.3,
    });

    const aiResponse = chatCompletion.choices[0].message?.content || "Sorry, an error occurred while processing your request.";

    const uniqueCompanyNames = new Set(relevantDocuments.map((doc) => doc.Company));
    const isDetailRequest = uniqueCompanyNames.size === 1;

    const sourcesForRecommendation = relevantDocuments.slice(0, 1);

    return NextResponse.json({
      answer: aiResponse,
      sources: isDetailRequest ? [] : sourcesForRecommendation,
    });
  } catch (error) {
    console.error("Error in API route:", error);
    return NextResponse.json({ error: "An internal server error occurred." }, { status: 500 });
  }
}
