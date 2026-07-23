/*
# Create OTP generation trigger for bookings

1. Functions
- `set_booking_otp()` — trigger function that generates a 6-digit OTP when a new booking is created
  and sets it on the booking row.
2. Triggers
- `booking_otp_trigger` — fires AFTER INSERT on bookings to set the OTP.
*/

CREATE OR REPLACE FUNCTION public.set_booking_otp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.otp := lpad(floor(random() * 1000000)::text, 6, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS booking_otp_trigger ON public.bookings;
CREATE TRIGGER booking_otp_trigger
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_booking_otp();
