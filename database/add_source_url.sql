-- Migration: Add source_url column to market_trends
-- Run this in the Supabase SQL Editor (supabase.com > SQL Editor > New Query)

ALTER TABLE market_trends ADD COLUMN IF NOT EXISTS source_url TEXT;
