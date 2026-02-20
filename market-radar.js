require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- Config ---
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// RSS Feeds for Indonesian Health News
const RSS_FEEDS = [
    'https://news.google.com/rss/search?q=obat+apotek+Indonesia&hl=id&gl=ID&ceid=ID:id',
    'https://news.google.com/rss/search?q=kesehatan+farmasi+Indonesia&hl=id&gl=ID&ceid=ID:id',
    'https://news.google.com/rss/search?q=vitamin+suplemen+trend+Indonesia&hl=id&gl=ID&ceid=ID:id',
];

// Keywords for Pre-Filtering (Case Insensitive)
const HEALTH_KEYWORDS = [
    'obat', 'apotek', 'farmasi', 'vitamin', 'suplemen', 'wabah', 'virus',
    'penyakit', 'kemenkes', 'bpom', 'masker', 'vaksin', 'imun', 'herbal',
    'diabetes', 'kolesterol', 'hipertensi', 'flu', 'batuk', 'demam', 'anak'
];

// --- RSS Parser (simple XML to items) ---
async function fetchRSSFeed(url) {
    try {
        const response = await fetch(url);
        const xml = await response.text();

        const items = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;

        while ((match = itemRegex.exec(xml)) !== null) {
            const itemXml = match[1];
            const title = (itemXml.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
            const source = (itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1] || 'Google News';

            if (title) {
                items.push({
                    title: title.replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
                    source: source.replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
                });
            }
        }

        return items;
    } catch (err) {
        console.error(`  ⚠️ Failed to fetch RSS: ${url}`, err.message);
        return [];
    }
}

// --- Mega-Batching Analysis ---
async function analyzeMegaBatch(newsItems) {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Create one giant list
    const newsList = newsItems.map((item, index) => `${index + 1}. ${item.title} (Sumber: ${item.source})`).join('\n');

    const prompt = `
Kamu adalah Analis Pasar Farmasi senior untuk Apotek Alpro.
Tugas: Analisa daftar berita berikut secara kolektif untuk menemukan potensi tren yang berdampak pada penjualan apotek.

DAFTAR BERITA:
${newsList}

INSTRUKSI:
1. Filter berita yang TIDAK relevan dengan bisnis apotek retail (misal: kebijakan RS, politik kesehatan makro, kriminal).
2. Fokus pada: wabah penyakit, tren obat/vitamin baru, gaya hidup sehat, atau kelangkaan produk.
3. Berikan Impact Score (0-10).
4. KEMBALIKAN HANYA BERITA DENGAN SCORE > 7.

FORMAT OUTPUT HARUS JSON ARRAY MURNI (tanpa markdown code block):
[
  {
    "title": "judul berita persis sama dengan input",
    "score": 9,
    "reason": "alasan singkat kenapa impact tinggi",
    "recommendation": "saran stok barang atau promosi"
  }
]
Jika tidak ada yang relevan > 7, kembalikan array kosong [].
  `;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        // Clean up markdown if present
        const cleanText = text.replace(/```json|```/g, '').trim();

        return JSON.parse(cleanText);
    } catch (err) {
        console.error('  ⚠️ Gemini Mega-Batch analysis failed:', err.message);
        return [];
    }
}

// --- Save to Supabase ---
async function saveToSupabase(analyzedItems) {
    if (analyzedItems.length === 0) {
        console.log('\n📊 No high-impact trends found (score > 7).');
        return;
    }

    console.log(`\n🔥 Saving ${analyzedItems.length} high-impact trends...`);

    const payload = analyzedItems.map(item => ({
        source_type: 'RSS - AI Analysis',
        title: item.title,
        summary: `${item.reason} | Rekomendasi: ${item.recommendation}`,
        sentiment_score: 0.8, // Default positive for opportunities
        is_viral: item.score >= 9,
    }));

    const { data, error } = await supabase.from('market_trends').insert(payload).select();

    if (error) {
        console.error('❌ Failed to save to Supabase:', error);
    } else {
        console.log(`✅ Success! Saved ${data.length} trends.`);
        data.forEach((trend, i) => {
            console.log(`  ${i + 1}. ${trend.title.substring(0, 50)}...`);
        });
    }
}

// --- Main ---
async function main() {
    console.log('📡 Market Radar (Mega-Batch Mode) - Alpro Intelligence Hub');
    console.log('=======================================================\n');

    // Step 1: Fetch RSS
    console.log('Step 1: Fetching RSS feeds...');
    let allNews = [];
    for (const feedUrl of RSS_FEEDS) {
        const items = await fetchRSSFeed(feedUrl);
        allNews = allNews.concat(items);
    }

    // Deduplicate
    const seen = new Set();
    const uniqueNews = allNews.filter(item => {
        if (seen.has(item.title)) return false;
        seen.add(item.title);
        return true;
    });

    console.log(`  ✓ Raw Articles: ${uniqueNews.length}`);

    // Step 2: Pre-Filter (Keyword Matching)
    console.log('Step 2: Pre-Filtering (Keyword Cleaning)...');
    const filteredNews = uniqueNews.filter(item => {
        const text = item.title.toLowerCase();
        return HEALTH_KEYWORDS.some(keyword => text.includes(keyword));
    });

    console.log(`  ✓ Relevant Articles: ${filteredNews.length} (Discarded ${uniqueNews.length - filteredNews.length} irrelevant/duplicate items)`);

    if (filteredNews.length === 0) {
        console.log('No relevant articles found after filtering. Exiting.');
        return;
    }

    // Limit to avoid Token Limit (Gemini Flash context window is large, but let's be safe with top 100)
    const batch = filteredNews.slice(0, 100);
    console.log(`\nStep 3: Sending Mega-Bundle (${batch.length} items) to Gemini...`);

    const startTime = Date.now();
    const analyzed = await analyzeMegaBatch(batch);
    const duration = (Date.now() - startTime) / 1000;

    console.log(`  ✓ AI Analysis Complete in ${duration}s`);
    console.log(`  ✓ AI Identified ${analyzed.length} High-Impact Trends`);

    // Step 4: Save
    await saveToSupabase(analyzed);

    console.log('\n🏁 Operations Complete.');
    console.log(`💡 RPD Savings: We processed ${batch.length} articles with just 1 API Call!`);
}

main();
