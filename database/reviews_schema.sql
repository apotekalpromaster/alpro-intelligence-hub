-- Create a new table for processed review sentiments
CREATE TABLE IF NOT EXISTS review_sentiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
    reviewer_name TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    sentiment_category VARCHAR(50) CHECK (sentiment_category IN ('POSITIVE', 'STOK_ISSUE', 'SERVICE_ISSUE', 'NEUTRAL')),
    sentiment_score NUMERIC(3,2),   -- Confidence score or raw positivity
    analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Optional: Link to original store_reviews if we were using that table
    -- original_review_id UUID REFERENCES store_reviews(id)
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick dashboard stats
CREATE INDEX IF NOT EXISTS idx_sentiment_category ON review_sentiments(sentiment_category);
