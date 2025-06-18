# Caprae CHatbot AI Analyst
https://saasquatchleads-ai-chatbot.vercel.app/

**Caprae Chatbot AI Analyst** is a sophisticated lead generation and analysis tool designed for private equity firms. It leverages a Retrieval-Augmented Generation (RAG) architecture to provide a conversational interface for querying a private database of company prospects. Analysts can ask natural language questions to find companies, and then perform a "Deep Dive" to generate a comprehensive executive brief by combining database information with real-time website scraping.

## Features

- **Conversational Search**: Ask questions in plain English (e.g., "Find B2B companies in the software industry") to query the prospect database.
- **RAG Architecture**: Uses vector embeddings to find the most relevant companies from an Astra DB collection and feeds that context to an LLM for accurate, grounded answers.
- **Interactive Prospect Cards**: Search results are displayed as clean, interactive cards showing key company details.
- **Deep Dive Analysis**: With a single click, generate an "Executive Brief" for any company. This feature:
  1. Scrapes the company's live website for fresh insights.
  2. Combines scraped data with internal database records.
  3. Uses GPT-4o to synthesize the information into a professional, structured report.
- **Modern UI/UX**: Built with Next.js and Tailwind CSS, featuring a clean chat interface, loading indicators, and smooth animations with Framer Motion.
- **Edge-Ready**: API routes are configured to run on the Edge for low-latency responses.

## Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/), [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/)
- **Backend**: [Next.js API Routes (Edge Runtime)](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- **AI & Embeddings**: [OpenAI GPT-4o & `text-embedding-3-small`](https://openai.com/)
- **Vector Database**: [DataStax Astra DB](https://www.datastax.com/products/astra-db)
- **Web Scraping**: [Cheerio](https://cheerio.js.org/)

## Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or later)
- `npm`, `yarn`, or `pnpm`
- An [OpenAI API Key](https://platform.openai.com/api-keys)
- A [DataStax Astra DB](https://astra.datastax.com/) account (the free tier is sufficient)

### 1. Clone the Repository

```bash
git clone https://github.com/Fauza27/saasquatchleads-ai-chatbot.git
cd saasquatchleads-ai-chatbot
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Set Up Environment Variables

Create a new file named `.env` in the root of the project by copying the example file:

```bash
cp .env.example .env
```

Now, open the `.env` file and fill in the required values:

- **`OPENAI_API_KEY`**: Your secret key from the OpenAI API dashboard.
- **`ASTRA_DB_API_ENDPOINT`**: The API Endpoint URL for your Astra DB database. You can find this in your Astra DB dashboard.
- **`ASTRA_DB_APPLICATION_TOKEN`**: An Application Token (with "Database Administrator" role) for your database. Generate this from the "Tokens" section in your Astra DB settings.
- **`ASTRA_DB_NAMESPACE`**: The namespace (keyspace) you want to use within your database. If it doesn't exist, the script can create it. Example: `default_keyspace`.
- **`ASTRA_DB_COLLECTION`**: The name for the collection that will store your company data and vectors. Example: `company_prospects`.

Your `.env` file should look like this:

```env
# OpenAI
OPENAI_API_KEY="sk-..."

# Astra DB
ASTRA_DB_API_ENDPOINT="https://..."
ASTRA_DB_APPLICATION_TOKEN="AstraCS:..."
ASTRA_DB_NAMESPACE="default_keyspace"
ASTRA_DB_COLLECTION="company_prospects"
```

### 4. Prepare Your Data

The database loading script (`scripts/loadDb.ts`) reads data from a CSV file.

1. Create a file named `companies_data.csv` in the root of the project.
2. Ensure your CSV has a header row with the following column names (as defined in the script):
   - `Company`
   - `Website`
   - `Industry`
   - `Product/Service Category`
   - `Business Type (B2B, B2B2C)`
   - `Employees Count`
   - `Revenue`
   - `Year Founded`
   - `BBB Rating`
   - `Street`
   - `City`
   - `State`
   - `Company Phone`
   - `Company LinkedIn`
   - `Owner's First Name`
   - `Owner's Last Name`
   - `Owner's Title`
   - `Owner's LinkedIn`
   - `Owner's Phone Number`
   - `Owner's Email`
   - `Source`

### 5. Load the Database

Run the script to populate your Astra DB collection. This script will:

1.  Drop any existing collection with the same name.
2.  Create a new vector collection.
3.  Read `companies_data.csv`, generate embeddings for each row using OpenAI, and insert the documents into Astra DB.

Execute the following command in your terminal:

```bash
npx run seed
```

Wait for the script to finish. You will see log messages indicating its progress.

### 6. Run the Application

Start the Next.js development server:

```bash
npm run dev
```

Open your browser and navigate to [http://localhost:3000](http://localhost:3000). You should now see the Caprae Chatbot AI Analyst chat interface and be able to interact with it.

---

## How It Works

1.  **Data Ingestion (`scripts/loadDb.ts`)**:

    - A CSV file containing company data is read.
    - For each company, a descriptive text chunk is created.
    - OpenAI's `text-embedding-3-small` model converts this text into a 1536-dimension vector.
    - The original company data, the text chunk, and the vector are stored as a single document in Astra DB.

2.  **Querying (`/api/chat`)**:

    - The user's message is sent to the API.
    - The message is converted into a query vector using the same OpenAI embedding model.
    - Astra DB performs a vector similarity search (`cosine` similarity) to find the most relevant company document(s).
    - The text from these documents is passed as context, along with the user's original question, to the GPT-4o model.
    - GPT-4o generates a natural language response based _only_ on the provided context.

3.  **Deep Dive (`/api/analyze-company`)**:
    - The user clicks the "Deep Dive" button on a prospect card, sending the company's data to the API.
    - The API scrapes the content from the company's website using Cheerio.
    - A detailed prompt is constructed for GPT-4o, containing both the internal database data and the newly scraped website text.
    - GPT-4o analyzes both sources and generates a structured "Executive Brief" in Markdown format.
