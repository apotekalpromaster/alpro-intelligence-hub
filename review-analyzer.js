require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Groq = require('groq-sdk');

// --- Config ---
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const AI_MODEL = 'llama-3.3-70b-versatile';

// --- Simulation Data ---
const NAMES = ['Budi', 'Siti', 'Agus', 'Dewi', 'Rina', 'Joko', 'Tini', 'Bayu', 'Lestari', 'Hendra'];
const POSITIVE_COMMENTS = [
    'Pelayanan ramah banget, apotekernya informatif.',
    'Lengkap obatnya, harga standar.',
    'Tempat bersih dan nyaman.',
    'Cepat tanggap, mantap.',
    'Suka belanja di sini, parkir luas.'
];
const STOCK_ISSUES = [
    'Cari obat batuk X kosong terus.',
    'Barang sering habis, padahal butuh urgent.',
    'Vitamin C merek Y ga ada stok.',
    'Kecewa, jauh-jauh datang obatnya kosong.',
    'Stok masker habis melulu.'
];
const SERVICE_ISSUES = [
    'Antrian lama banget, kasir cuma satu.',
    'Pegawainya jutek, ga senyum.',
    'Salah kasih obat, untung saya cek lagi.',
    'Lama nunggu racikan puyer.',
    'Admin WA slow respon.'
];

async function generateSimulatedReviews(count = 50) {
    const { data: outlets } = await supabase.from('outlets').select('id, name');

    if (!outlets || outlets.length === 0) {
        console.error('❌ No outlets found. Run seed-data.js first.');
        process.exit(1);
    }

    const reviews = [];
    for (let i = 0; i < count; i++) {
        const outlet = outlets[Math.floor(Math.random() * outlets.length)];
        const type = Math.random();

        let comment, rating;

        if (type < 0.6) { // 60% Positive
            comment = POSITIVE_COMMENTS[Math.floor(Math.random() * POSITIVE_COMMENTS.length)];
            rating = Math.floor(Math.random() * 2) + 4; // 4 or 5
        } else if (type < 0.8) { // 20% Stock Issues
            comment = STOCK_ISSUES[Math.floor(Math.random() * STOCK_ISSUES.length)];
            rating = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
        } else { // 20% Service Issues
            comment = SERVICE_ISSUES[Math.floor(Math.random() * SERVICE_ISSUES.length)];
            rating = Math.floor(Math.random() * 3) + 1;
        }

        reviews.push({
            outlet_id: outlet.id,
            reviewer_name: NAMES[Math.floor(Math.random() * NAMES.length)] + ' ' + Math.floor(Math.random() * 100),
            rating,
            comment,
            outlet_name: outlet.name // Temp for logging
        });
    }
    return reviews;
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

    // 1. Simulate Data
    console.log('Step 1: Generating 50 simulated reviews...');
    const rawReviews = await generateSimulatedReviews(50);
    console.log('✅ Generated.');

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
