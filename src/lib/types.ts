export type UserRole = 'user' | 'worker' | 'admin';

export type WorkerStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'on_the_way'
  | 'arrived'
  | 'otp_verified'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type PaymentMethod = 'upi' | 'credit_card' | 'debit_card' | 'wallet' | 'net_banking' | 'cash';

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  address: string;
  profile_photo_url: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  image_url: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Worker {
  id: string;
  category_id: string | null;
  full_name: string;
  email: string | null;
  phone: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  profile_photo_url: string;
  aadhaar_url: string;
  aadhaar_back_url: string;
  pan_url: string;
  aadhaar_number: string;
  pan_number: string;
  city: string;
  state: string;
  pincode: string;
  skills: string[];
  experience_years: number;
  hourly_rate: number;
  working_hours: string;
  languages: string[];
  bio: string;
  availability: boolean;
  status: WorkerStatus;
  is_verified: boolean;
  rating: number;
  total_ratings: number;
  total_jobs: number;
  booking_success_rate: number;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface Booking {
  id: string;
  user_id: string;
  worker_id: string;
  category_id: string | null;
  service_name: string;
  service_description: string;
  scheduled_date: string;
  scheduled_time: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  amount: number;
  status: BookingStatus;
  otp: string;
  otp_verified: boolean;
  worker_latitude: number | null;
  worker_longitude: number | null;
  last_location_update: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  started_journey_at: string | null;
  arrived_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  worker?: Worker;
  user_profile?: Profile;
}

export interface Payment {
  id: string;
  booking_id: string;
  user_id: string;
  worker_id: string;
  amount: number;
  payment_method: PaymentMethod | string;
  payment_id: string;
  transaction_id: string;
  status: PaymentStatus;
  created_at: string;
}

export interface Invoice {
  id: string;
  booking_id: string;
  payment_id: string | null;
  user_id: string;
  worker_id: string;
  invoice_number: string;
  subtotal: number;
  gst: number;
  platform_fee: number;
  grand_total: number;
  payment_status: 'unpaid' | 'paid' | 'refunded';
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  user_id: string;
  worker_id: string;
  rating: number;
  comment: string;
  images: string[];
  is_hidden: boolean;
  created_at: string;
  user_profile?: Profile;
  worker?: Worker;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  booking_id: string | null;
  admin_id: string | null;
  created_at: string;
}

export interface GalleryImage {
  id: string;
  worker_id: string;
  image_url: string;
  caption: string;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  worker_id: string;
  created_at: string;
  worker?: Worker;
}

export interface TrackingPoint {
  id: string;
  booking_id: string;
  worker_id: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
}

export interface Complaint {
  id: string;
  user_id: string;
  booking_id: string | null;
  worker_id: string | null;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  ip_address: string;
  created_at: string;
  admin_profile?: Profile;
}
