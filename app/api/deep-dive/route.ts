// app/api/deep-dive/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import * as cheerio from "cheerio";

// Inisialisasi Klien OpenAI
const { OPENAI_API_KEY } = process.env;

if (!OPENAI_API_KEY) {
  throw new Error("Variabel lingkungan OpenAI harus diatur.");
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Fungsi untuk mengambil dan mem-parsing konten web
async function scrapeWebsiteContent(url: string): Promise<string> {
  try {
    // Menambahkan http:// jika tidak ada, karena fetch memerlukannya
    const fullUrl = url.startsWith("http") ? url : `http://${url}`;

    const response = await fetch(fullUrl, {
      headers: {
        // Menyamar sebagai browser biasa untuk menghindari pemblokiran sederhana
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Gagal fetch URL: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Menghapus elemen yang tidak relevan (navigasi, footer, script)
    $('nav, footer, script, style, header, [role="navigation"], [role="banner"]').remove();

    // Mengambil teks dari body dan membersihkannya
    const textContent = $("body").text();
    const cleanedText = textContent.replace(/\s\s+/g, " ").trim(); // Menghapus spasi berlebih

    // Mengambil hanya 2000 karakter pertama untuk efisiensi
    return cleanedText.substring(0, 2000);
  } catch (error) {
    console.error(`Error saat scraping ${url}:`, error);
    // Mengembalikan pesan error yang bisa ditampilkan ke pengguna
    return `Gagal melakukan scraping dari ${url}. Mungkin situs tersebut dilindungi atau tidak dapat diakses.`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url, companyName } = await req.json();

    if (!url || !companyName) {
      return NextResponse.json({ error: "URL dan Nama Perusahaan dibutuhkan." }, { status: 400 });
    }

    // 1. Lakukan scraping secara real-time
    const scrapedText = await scrapeWebsiteContent(url);

    // Jika scraping gagal, kembalikan pesan errornya
    if (scrapedText.startsWith("Gagal melakukan scraping")) {
      return NextResponse.json({ summary: scrapedText });
    }

    // 2. Siapkan prompt untuk merangkum hasil scraping
    const systemPrompt = `
      Anda adalah "Intelligence Analyst" yang sangat ahli. Tugas Anda adalah membaca teks mentah dari website sebuah perusahaan dan menyusun "Intelligence Brief" yang ringkas dan padat.
      - Fokus pada informasi kunci yang relevan untuk investor: Apa produk utama mereka? Siapa target pasar mereka? Apa model bisnis mereka (B2B/B2C)? Apa keunikan mereka?
      - Gunakan format Markdown dengan heading (#) dan bullet points (-) untuk keterbacaan.
      - Mulai dengan judul "Intelligence Brief: [Nama Perusahaan]".
      - Jika teks tidak mengandung informasi yang jelas, sebutkan bahwa "Informasi detail tidak dapat diekstrak dari halaman utama website."
      - Jaga agar ringkasan tetap objektif dan berdasarkan teks yang diberikan. JANGAN MENGARANG.
    `;

    // 3. Panggil LLM untuk membuat rangkuman
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `
            Nama Perusahaan: ${companyName}
            Teks dari Website (${url}):
            ---
            ${scrapedText}
            ---
          `,
        },
      ],
      temperature: 0.4,
    });

    const summary = chatCompletion.choices[0].message?.content || "Tidak dapat menghasilkan ringkasan.";

    // 4. Kirim ringkasan kembali ke client
    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Terjadi error di API route deep-dive:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal pada server." }, { status: 500 });
  }
}
