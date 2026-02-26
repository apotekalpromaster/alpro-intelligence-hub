require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Groq = require('groq-sdk');
const axios = require('axios');

// --- Config ---
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const { sendCustomerPulseAlert } = require('./mailer');
const AI_MODEL = 'llama-3.3-70b-versatile';
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// --- Real Data Scraper (Google Maps) ---
async function scrapeGoogleMapReviews() {
    if (!GOOGLE_PLACES_API_KEY) {
        console.error('❌ GOOGLE_PLACES_API_KEY is not defined in .env! Cannot scrape reviews.');
        return [];
    }

    // Fetch active outlets
    const { data: outlets, error } = await supabase
        .from('outlets')
        .select('id, name, region, address')
        .eq('is_active', true);

    if (error || !outlets || outlets.length === 0) {
        console.error('❌ Failed to fetch outlets:', error?.message);
        return [];
    }

    // Process a random batch of 20 outlets daily to manage API limits and execution time
    const shuffled = outlets.sort(() => 0.5 - Math.random());
    const batch = shuffled.slice(0, 20);

    let newReviews = [];

    for (const outlet of batch) {
        try {
            // 1. Find Place ID
            const searchQuery = encodeURIComponent(`${outlet.name} Apotek Alpro ${outlet.region || ''}`);
            const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${searchQuery}&key=${GOOGLE_PLACES_API_KEY}`;
            const searchRes = await axios.get(searchUrl);

            if (!searchRes.data.results || searchRes.data.results.length === 0) continue;

            const placeId = searchRes.data.results[0].place_id;

            // 2. Get Place Details (Reviews)
            const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,reviews,url&key=${GOOGLE_PLACES_API_KEY}`;
            const detailsRes = await axios.get(detailsUrl);
            const placeData = detailsRes.data.result;

            if (!placeData || !placeData.reviews) continue;

            // 3. Deduplication Check against Supabase
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data: existingReviews } = await supabase
                .from('review_sentiments')
                .select('reviewer_name, comment')
                .eq('outlet_id', outlet.id)
                .gte('created_at', thirtyDaysAgo.toISOString());

            const existingSet = new Set((existingReviews || []).map(r => `${r.reviewer_name}_${r.comment}`.toLowerCase()));

            // 4. Filter and prepare new reviews
            for (const r of placeData.reviews) {
                if (!r.text) continue; // Skip reviews without comments

                const uniqueKey = `${r.author_name}_${r.text}`.toLowerCase();
                if (!existingSet.has(uniqueKey)) {
                    newReviews.push({
                        outlet_id: outlet.id,
                        reviewer_name: r.author_name,
                        rating: r.rating,
                        comment: r.text,
                        source_url: r.author_url || placeData.url
                    });
                }
            }
        } catch (err) {
            console.error(`  ⚠️ Failed to scrape [${outlet.name}]: ${err.message}`);
        }
    }

    return newReviews;
}

// --- Mega-Batching Analysis (Groq / Llama 3.3) ---
async function analyzeReviewsMegaBatch(reviews) {
    // Bundle reviews into one text block
    const reviewsList = reviews.map((r, i) =>
        `Review #${i + 1}: "${r.comment}" (Rating: ${r.rating}/5)`
    ).join('\n');

    const systemPrompt = `Kamu adalah Customer Experience Manager Apotek Alpro. Kamu HANYA merespons dalam format JSON Array murni, tanpa teks tambahan atau markdown code block.`;

    const userPrompt = `Klasifikasikan ${reviews.length} ulasan berikut ke dalam kategori sentimen operasional.

KATEGORI TARGET:
1. POSITIVE (Pujian, kepuasan, umum)
2. STOK_ISSUE (Keluhan barang habis/kosong/tidak lengkap)
3. SERVICE_ISSUE (Keluhan pelayanan lambat, jutek, antri, salah obat)

DAFTAR REVIEW:
${reviewsList}

INSTRUKSI:
- Analisa berdasarkan konteks komentar.
- Abaikan rating angka, fokus pada teks.
- Kembalikan JSON Array berisi klasifikasi untuk SETIAP review, urut sesuai input.

FORMAT OUTPUT JSON ARRAY MURNI:
[{"index": 1, "category": "POSITIVE"}, {"index": 2, "category": "STOK_ISSUE"}, ...]`;

    console.log(`\n🤖 Sending Mega-Batch of ${reviews.length} reviews to Groq (${AI_MODEL})...`);

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            model: AI_MODEL,
            temperature: 0.2,
            max_tokens: 4096,
        });

        const text = chatCompletion.choices[0]?.message?.content?.trim() || '[]';
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (err) {
        console.error('❌ Groq Error:', err.message);
        return [];
    }
}

async function main() {
    console.log('🗣️ Review Sentiment Analyzer - Alpro Hub');
    console.log('========================================\n');

    // 1. Fetch Real Data
    console.log('Step 1: Scraping new reviews from Google Maps...');
    const rawReviews = await scrapeGoogleMapReviews();

    if (rawReviews.length === 0) {
        console.log('ℹ️ No new reviews found to analyze. Exiting.');
        return;
    }
    console.log(`✅ Scraped ${rawReviews.length} new unique reviews.`);

    // 2. Analyze with Gemini
    const analysisResults = await analyzeReviewsMegaBatch(rawReviews);

    if (analysisResults.length === 0) {
        console.log('❌ Analysis failed or returned empty.');
        return;
    }

    console.log(`✅ AI Classification Complete. Received ${analysisResults.length} results.`);

    // 3. Merge & Save
    console.log('\nStep 3: Merging & Saving to Supabase...');

    // Map analysis back to raw reviews (assuming order is preserved, or use ID logic in real app)
    const payload = rawReviews.map((review, i) => {
        const result = analysisResults.find(r => r.index === i + 1);
        return {
            outlet_id: review.outlet_id,
            reviewer_name: review.reviewer_name,
            rating: review.rating,
            comment: review.comment,
            source_url: review.source_url,
            sentiment_category: result ? result.category : 'NEUTRAL',
            sentiment_score: result && result.category === 'POSITIVE' ? 0.9 : 0.2 // Simplified score
        };
    });

    const { data, error } = await supabase.from('review_sentiments').insert(payload).select();

    if (error) {
        console.error('❌ Insert Failed:', error);
    } else {
        console.log(`🎉 Success! Saved ${data.length} analyzed reviews.`);

        // Stats
        const counts = payload.reduce((acc, curr) => {
            acc[curr.sentiment_category] = (acc[curr.sentiment_category] || 0) + 1;
            return acc;
        }, {});

        console.log('\n📊 Batch Summary:');
        console.log(`   - POSITIVE: ${counts['POSITIVE'] || 0}`);
        console.log(`   - STOK_ISSUE: ${counts['STOK_ISSUE'] || 0} 🔴`);
        console.log(`   - SERVICE_ISSUE: ${counts['SERVICE_ISSUE'] || 0} 🟠`);

        console.log(`\nStep 4: Sending Customer Pulse Alert Email...`);
        await sendCustomerPulseAlert(payload);
    }
}

main();
