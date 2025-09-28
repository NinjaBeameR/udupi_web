-- Create daily bill counters table
CREATE TABLE IF NOT EXISTS daily_bill_counters (
  date TEXT PRIMARY KEY,           -- "2025-09-29"
  last_bill_number INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create function to atomically increment bill counter
CREATE OR REPLACE FUNCTION increment_bill_counter(date_param TEXT)
RETURNS INTEGER AS $$
DECLARE
  new_bill_number INTEGER;
BEGIN
  -- Insert or update the counter for today
  INSERT INTO daily_bill_counters (date, last_bill_number, updated_at)
  VALUES (date_param, 1, NOW())
  ON CONFLICT (date) DO UPDATE SET
    last_bill_number = daily_bill_counters.last_bill_number + 1,
    updated_at = NOW()
  RETURNING last_bill_number INTO new_bill_number;
  
  RETURN new_bill_number;
END;
$$ LANGUAGE plpgsql;

-- Add bill_number column to completed_orders table if it doesn't exist
ALTER TABLE completed_orders 
ADD COLUMN IF NOT EXISTS bill_number TEXT;

-- Create index for faster bill number searches
CREATE INDEX IF NOT EXISTS idx_completed_orders_bill_number ON completed_orders(bill_number);
CREATE INDEX IF NOT EXISTS idx_daily_bill_counters_date ON daily_bill_counters(date);