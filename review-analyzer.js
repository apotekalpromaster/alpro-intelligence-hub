require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Groq = require('groq-sdk');

// --- Config ---
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const AI_MODEL = 'llama-3.3-70b-versatile';

// --- Simulation Data ---
const NAMES = ['Budi', 'Siti', 'Agus', 'Dewi', 'Rina', 'Joko', 'Tini', 'Bayu', 'Lestari', 'Hendra'];
// --- Real Data Fetching (Placeholder) ---
/**
 * In a real-world scenario, you would fetch reviews from Google Maps API, 
 * Apotek Alpro Internal Feedback System, or a 'raw_reviews' table.
 * For now, we omit simulated data to prevent bias.
 */
async function fetchRealReviews() {
    // Example: Fetch from a hypothetical raw data table
    const { data, error } = await supabase
        .from('raw_reviews')
        .select('*')
        .is('processed_at', null)
        .limit(50);

    if (error) {
        console.error('❌ Failed to fetch real reviews:', error.message);
        return [];
    }
    return data || [];
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
    console.log('Step 1: Fetching un-processed reviews from raw_reviews table...');
    const rawReviews = await fetchRealReviews();

    if (rawReviews.length === 0) {
        console.log('ℹ️ No new reviews found to analyze. Exiting.');
        return;
    }
    console.log(`✅ Found ${rawReviews.length} reviews.`);

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
    }
}

main();
