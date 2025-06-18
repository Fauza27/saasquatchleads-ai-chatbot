import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import * as cheerio from "cheerio";

const { OPENAI_API_KEY } = process.env;

if (!OPENAI_API_KEY) {
  throw new Error("OpenAI environment variables must be set.");
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function scrapeWebsiteContent(url: string): Promise<string> {
  try {
    const fullUrl = url.startsWith("http") ? url : `http://${url}`;
    const response = await fetch(fullUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    $('nav, footer, script, style, header, [role="navigation"], [role="banner"]').remove();
    const textContent = $("body").text();
    const cleanedText = textContent.replace(/\s\s+/g, " ").trim();
    return cleanedText.substring(0, 2500);
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return `Failed to scrape ${url}. The site may be inaccessible or protected.`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { companyData } = await req.json();

    if (!companyData || !companyData.Website || !companyData.Company) {
      return NextResponse.json({ error: "Incomplete company data." }, { status: 400 });
    }

    const scrapedText = await scrapeWebsiteContent(companyData.Website);

    const systemPrompt = `
      You are an elite "Intelligence Analyst" at Caprae Capital.
      Your task is to create a comprehensive "Executive Brief" about a target company based on the provided data.
      - Analyze and synthesize information from TWO sources: (1) Internal data from our database, and (2) Raw text from the company's website.
      - Structure your response using Markdown (headings, bullet points) for maximum clarity.
      - Start with a brief Executive Summary.
      - Create separate sections for 'Company Profile (from Database)' and 'Insights from Website'.
      - At the end, provide a 'Combined Analysis' that summarizes the business model, target market, and its unique potential based on both data sources.
      - If website scraping fails, state that clearly in the 'Insights from Website' section and proceed with the analysis based only on the database data.
      - Remain objective, professional, and fact-based. DO NOT FABRICATE.
    `;

    const userContent = `
      Please create an Executive Brief for the following company.

      **1. INTERNAL DATABASE DATA:**
      ---
      Company Name: ${companyData.Company}
      Industry: ${companyData.Industry}
      Product/Service Category: ${companyData["Product/Service Category"]}
      Business Type: ${companyData["Business Type (B2B, B2B2C)"]}
      Employee Count: ${companyData["Employees Count"]}
      ---

      **2. WEBSITE SCRAPING RESULTS (${companyData.Website}):**
      ---
      ${scrapedText}
      ---
    `;

    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.4,
    });

    const summary = chatCompletion.choices[0].message?.content || "Could not generate summary.";

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Error in analyze-company API route:", error);
    return NextResponse.json({ error: "An internal server error occurred." }, { status: 500 });
  }
}
