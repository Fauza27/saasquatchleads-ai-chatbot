import { DataAPIClient } from "@datastax/astra-db-ts";
import OpenAI from "openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import fs from "fs";
import csv from "csv-parser";
import "dotenv/config";

// Define the structure of the object produced by csv-parser
interface CompanyData {
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

type SimilarityMetric = "cosine" | "dot_product" | "euclidean";

const { ASTRA_DB_NAMESPACE, ASTRA_DB_COLLECTION, ASTRA_DB_API_ENDPOINT, ASTRA_DB_APPLICATION_TOKEN, OPENAI_API_KEY } = process.env;

if (!ASTRA_DB_NAMESPACE || !ASTRA_DB_COLLECTION || !ASTRA_DB_API_ENDPOINT || !ASTRA_DB_APPLICATION_TOKEN || !OPENAI_API_KEY) {
  throw new Error("Ensure all environment variables (ASTRA_DB_* and OPENAI_API_KEY) are set.");
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE });

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 100,
});

const createCollection = async (similarityMetric: SimilarityMetric = "cosine") => {
  try {
    const collections = await db.listCollections();
    if (collections.some((c) => c.name === ASTRA_DB_COLLECTION)) {
      await db.dropCollection(ASTRA_DB_COLLECTION);
      console.log(`Old collection '${ASTRA_DB_COLLECTION}' successfully deleted.`);
    }

    const res = await db.createCollection(ASTRA_DB_COLLECTION, {
      vector: {
        dimension: 1536,
        metric: similarityMetric,
      },
    });
    console.log(`Collection '${ASTRA_DB_COLLECTION}' successfully created:`, res);
  } catch (e) {
    console.error("Failed to create collection:", e);
  }
};

const loadDataFromCSV = async () => {
  const collection = await db.collection(ASTRA_DB_COLLECTION);
  const results: CompanyData[] = [];
  let counter = 0;

  fs.createReadStream("./companies_data.csv")
    .pipe(csv())
    .on("data", (data: CompanyData) => results.push(data))
    .on("end", async () => {
      console.log(`Successfully loaded ${results.length} rows from CSV.`);

      for (const row of results) {
        counter++;
        console.log(`Processing company ${counter} of ${results.length}: ${row.Company}`);

        const combinedText = `
                Company Name: ${row.Company || "Not available"}.
                Website: ${row.Website || "Not available"}.
                Industry: ${row.Industry || "Not available"}.
                Product/Service Category: ${row["Product/Service Category"] || "Not available"}.
                Business Type: ${row["Business Type (B2B, B2B2C)"] || "Not available"}.
                Employee Count: ${row["Employees Count"] || "Not available"}.
                Year Founded: ${row["Year Founded"] || "Not available"}.
                Additional Description: This company operates in the ${row.Industry} industry with a focus on ${row["Product/Service Category"]}. They target the ${row["Business Type (B2B, B2B2C)"]} market.
            `
          .trim()
          .replace(/\s+/g, " ");

        const chunks = await splitter.splitText(combinedText);

        for (const chunk of chunks) {
          try {
            const embedding = await openai.embeddings.create({
              model: "text-embedding-3-small",
              input: chunk,
              encoding_format: "float",
            });

            const vector = embedding.data[0].embedding;

            const docToInsert = {
              ...row,
              text: chunk,
              $vector: vector,
            };

            await collection.insertOne(docToInsert);
          } catch (embeddingError) {
            console.error(`Failed to process company ${row.Company}:`, embeddingError);
          }
        }
      }
      console.log("All company data has been successfully loaded and saved to Astra DB.");
    });
};

const main = async () => {
  await createCollection("cosine");
  await loadDataFromCSV();
};

main().catch(console.error);
