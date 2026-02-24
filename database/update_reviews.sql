-- Migration: Add source_url to review_sentiments and raw_reviews
ALTER TABLE review_sentiments ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Clear old dummy simulation data
DELETE FROM review_sentiments;
