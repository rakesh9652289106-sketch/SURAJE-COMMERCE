-- SQL Migration for SURAJ Coin Loyalty System

-- 1. Update Users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0;

-- 2. Update Orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coins_earned INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coins_used INTEGER DEFAULT 0;

-- 3. Update Settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS coins_system_active INTEGER DEFAULT 0;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS coin_reward_rate INTEGER DEFAULT 1000;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS coin_reward_amount INTEGER DEFAULT 30;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS coin_value_per_rupee INTEGER DEFAULT 10;

-- Optional: Initialize settings if the table is empty
-- INSERT INTO settings (id, coins_system_active, coin_reward_rate, coin_reward_amount, coin_value_per_rupee)
-- VALUES (1, 0, 1000, 30, 10)
-- ON CONFLICT (id) DO NOTHING;
