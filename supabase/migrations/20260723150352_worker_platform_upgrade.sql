/*
# Worker Platform Upgrade
1. Add city, state, pincode, aadhaar_number, pan_number, aadhaar_back_url to workers table
2. Add generate_otp() SQL function for 4-digit OTP generation
*/

ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS city text DEFAULT '';
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS state text DEFAULT '';
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS pincode text DEFAULT '';
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS aadhaar_number text DEFAULT '';
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS pan_number text DEFAULT '';
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS aadhaar_back_url text DEFAULT '';

-- Function to generate a random 4-digit OTP
CREATE OR REPLACE FUNCTION public.generate_otp()
RETURNS text AS $$
BEGIN
  RETURN lpad(floor(random() * 10000)::text, 4, '0');
END;
$$ LANGUAGE plpgsql;
