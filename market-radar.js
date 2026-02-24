require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Groq = require('groq-sdk');

// --- Config ---
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const AI_MODEL = 'llama-3.3-70b-versatile';

// ============================================================
// STRATEGIC RSS FEEDS - High Authority Sources
// ============================================================
const RSS_FEEDS = [
    // BPOM (Recall & Press Releases)
    { url: 'https://news.google.com/rss/search?q=site:pom.go.id+intitle:%22siaran+pers%22&hl=id&gl=ID&ceid=ID:id', label: 'BPOM Siaran Pers' },
    { url: 'https://news.google.com/rss/search?q=site:pom.go.id+intitle:%22penjelasan+publik%22&hl=id&gl=ID&ceid=ID:id', label: 'BPOM Penjelasan Publik' },

    // Kemenkes (Wabah & Regulasi)
    { url: 'https://kemkes.go.id/id/rss/article/rilis-berita', label: 'Kemenkes Rilis' },
    { url: 'https://pusatkrisis.kemkes.go.id/feed/rss.php?cat=eo', label: 'Kemenkes Krisis' },

    // Competitor Watch
    { url: 'https://news.google.com/rss/search?q=%22Kimia+Farma%22+OR+%22Apotek+K24%22+OR+%22Guardian%22+OR+%22Watson%22+OR+%22Apotek+Roxy%22&hl=id&gl=ID&ceid=ID:id', label: 'Competitor Watch' },
];

// ============================================================
// NOISE vs SIGNAL PROTOCOL
// ============================================================
const NOISE_KEYWORDS = [
    'penghargaan', 'csr', 'ulang tahun', 'seremonial', 'mou',
    'kunjungan kerja', 'lomba', 'wisuda', 'bakti sosial', 'donor darah'
];

const SIGNAL_KEYWORDS = [
    'tarik', 'recall', 'obat ilegal', 'klb', 'wabah', 'izin edar',
    'kenaikan harga', 'akuisisi', 'cabang baru', 'promo', 'diskon',
    'outbreak', 'pandemi', 'darurat', 'langka', 'ditarik', 'palsu',
    'merger', 'ekspansi', 'tutup', 'bangkrut', 'regulasi baru'
];

// --- RSS Parser ---
async function fetchRSSFeed(feedObj) {
    try {
        const response = await fetch(feedObj.url);
        const xml = await response.text();

        const items = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;

        while ((match = itemRegex.exec(xml)) !== null) {
            const itemXml = match[1];
            const title = (itemXml.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
            const link = (itemXml.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '';
            const source = (itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1] || feedObj.label;
            const pubDateStr = (itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '';

            if (title) {
                let isValidDate = true;
                if (pubDateStr) {
                    const pubDate = new Date(pubDateStr);
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                    if (pubDate < sevenDaysAgo) {
                        isValidDate = false; // Discard older than 7 days
                    }
                }

                if (isValidDate) {
                    items.push({
                        title: title.replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
                        link: link.replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
                        source: source.replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
                        feed_label: feedObj.label,
                    });
                }
            }
        }

        return items;
    } catch (err) {
        console.error(`  ⚠️ Failed to fetch [${feedObj.label}]: ${err.message}`);
        return [];
    }
}

// --- Pre-AI Filter: Noise vs Signal ---
function classifyNoiseSignal(items) {
    const signals = [];
    const noise = [];

    for (const item of items) {
        const titleLower = item.title.toLowerCase();

        // Check if it's noise first
        const isNoise = NOISE_KEYWORDS.some(kw => titleLower.includes(kw));

        // Bypass noise filter for Competitor Watch to capture all competitor news
        if (isNoise && item.feed_label !== 'Competitor Watch') {
            noise.push(item);
            continue;
        }

        // Check if it's a strong signal
        const isSignal = SIGNAL_KEYWORDS.some(kw => titleLower.includes(kw));
        item.is_priority_signal = isSignal;
        signals.push(item);
    }

    return { signals, noise };
}

// --- Mega-Batch Strategic Analysis (Groq / Llama 3.3) ---
async function analyzeStrategicBatch(newsItems) {
    const newsList = newsItems.map((item, index) =>
        `${index + 1}. [${item.feed_label}] ${item.title}`
    ).join('\n');

    const systemPrompt = `Kamu adalah Analis Strategi Farmasi senior untuk Apotek Alpro (200+ cabang, Jabodetabek & Bandung). Kamu HANYA merespons dalam format JSON Array murni, tanpa teks tambahan atau markdown code block.`;

    const userPrompt = `Klasifikasikan dan analisis daftar berita berikut secara kolektif.

KATEGORI KLASIFIKASI:
1. COMPETITOR_MOVE - Aktivitas kompetitor strategis (ekspansi, promo besar, akuisisi, tutup cabang)
2. REGULATORY_CHANGE - Perubahan regulasi BPOM/Kemenkes (izin edar, aturan baru, recall)
3. PUBLIC_HEALTH_ISSUE - Isu kesehatan masyarakat (wabah, KLB, outbreak, pandemi)
4. PRODUCT_SAFETY - Keamanan produk (obat palsu, obat ilegal, produk ditarik, recall)
5. COMPETITOR_UPDATE - Berita umum kompetitor (CSR, penghargaan, liputan acara biasa)

DAFTAR BERITA:
${newsList}

INSTRUKSI:
1. Analisis setiap berita dan tentukan kategorinya.
2. Berikan Impact Score (0-10) berdasarkan dampak terhadap bisnis apotek retail.
3. Untuk Kategori 1-4, HANYA kembalikan berita dengan Score > 7.
4. KHUSUS Kategori 5 (COMPETITOR_UPDATE), kembalikan SEMUA berita yang masuk kategori ini, dengan Score berapapun.
5. Berikan recommendation yang actionable (boleh kosong untuk COMPETITOR_UPDATE).
6. WAJIB sertakan nomor urut berita ("index") dari daftar di atas.

FORMAT OUTPUT JSON ARRAY MURNI:
[{"index": 1, "title": "judul berita", "category": "COMPETITOR_MOVE", "score": 9, "reason": "alasan singkat", "recommendation": "langkah aksi"}]
Jika tidak ada yang relevan untuk dikembalikan, kembalikan array kosong [].`;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            model: AI_MODEL,
            temperature: 0.3,
            max_tokens: 4096,
        });

        const text = chatCompletion.choices[0]?.message?.content?.trim() || '[]';
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (err) {
        console.error('  ❌ Groq Strategic Analysis failed:', err.message);
        return [];
    }
}

// --- Save to Supabase ---
async function saveToSupabase(analyzedItems, originalItems) {
    if (analyzedItems.length === 0) {
        console.log('\n📊 No high-impact strategic items found (score > 7).');
        return;
    }

    console.log(`\n🔥 Saving ${analyzedItems.length} strategic intelligence items...`);

    const payload = analyzedItems.map(item => {
        // Use index-based lookup (AI returns 1-based index)
        const originalItem = originalItems[(item.index || 0) - 1];
        const sourceUrl = originalItem?.link || '';

        return {
            source_type: item.category,
            title: item.title,
            summary: `${item.reason} | Rekomendasi: ${item.recommendation}`,
            sentiment_score: item.score / 10,
            is_viral: item.score >= 9,
            source_url: sourceUrl,
        };
    });

    const { data, error } = await supabase.from('market_trends').insert(payload).select();

    if (error) {
        console.error('❌ Failed to save to Supabase:', error);
    } else {
        console.log(`✅ Saved ${data.length} items to market_trends.`);
        data.forEach((item, i) => {
            console.log(`  ${i + 1}. [${item.source_type}] ${item.title.substring(0, 50)}...`);
            console.log(`     🔗 ${item.source_url || '(no url)'}`);
        });
    }
}

// --- Main ---
async function main() {
    console.log('🎯 Strategic Market Radar - Alpro Intelligence Hub');
    console.log('===================================================\n');

    // Step 1: Fetch all RSS Feeds
    console.log('Step 1: Fetching Strategic RSS Feeds...');
    let allNews = [];
    for (const feed of RSS_FEEDS) {
        const items = await fetchRSSFeed(feed);
        console.log(`  ✓ [${feed.label}] ${items.length} articles`);
        allNews = allNews.concat(items);
    }

    // Deduplicate by title
    const seen = new Set();
    const uniqueNews = allNews.filter(item => {
        if (seen.has(item.title)) return false;
        seen.add(item.title);
        return true;
    });

    console.log(`\n  📰 Total Unique Articles: ${uniqueNews.length}`);

    // Step 2: Noise vs Signal Pre-Filter
    console.log('\nStep 2: Applying Noise vs Signal Filter...');
    const { signals, noise } = classifyNoiseSignal(uniqueNews);

    const prioritySignals = signals.filter(s => s.is_priority_signal);
    console.log(`  ✓ Signals:  ${signals.length} articles (${prioritySignals.length} high-priority)`);
    console.log(`  ✗ Noise:    ${noise.length} articles discarded`);

    if (signals.length === 0) {
        console.log('\nNo signal articles found. Exiting.');
        return;
    }

    // Limit batch size (top 100 signals, prioritize strong signals first)
    const sortedSignals = [...signals].sort((a, b) => (b.is_priority_signal ? 1 : 0) - (a.is_priority_signal ? 1 : 0));
    const batch = sortedSignals.slice(0, 100);

    // Step 3: Strategic AI Analysis (Single API Call)
    console.log(`\nStep 3: Sending Mega-Bundle (${batch.length} signals) to Groq (${AI_MODEL})...`);
    const startTime = Date.now();
    const analyzed = await analyzeStrategicBatch(batch);
    const duration = (Date.now() - startTime) / 1000;

    console.log(`  ✓ AI Analysis Complete in ${duration.toFixed(1)}s`);
    console.log(`  ✓ High-Impact Items Found: ${analyzed.length}`);

    // Log categories
    if (analyzed.length > 0) {
        const catCount = analyzed.reduce((acc, item) => {
            acc[item.category] = (acc[item.category] || 0) + 1;
            return acc;
        }, {});
        console.log('\n  📊 Category Breakdown:');
        Object.entries(catCount).forEach(([cat, count]) => {
            console.log(`     - ${cat}: ${count}`);
        });
    }

    // Step 4: Save to Supabase
    await saveToSupabase(analyzed, batch);

    console.log('\n🏁 Strategic Radar Scan Complete.');
    console.log(`💡 RPD Used: 1 API Call for ${batch.length} articles.`);
}

main();
