import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Mail, Lock, User, Phone, MapPin, Eye, EyeOff, Wrench,
  Upload, Briefcase, DollarSign, Clock, Languages, FileText, X, CheckCircle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase, STORAGE_BUCKETS } from '@/lib/supabase';
import type { Category } from '@/lib/types';

interface WorkerRegisterForm {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  category_id: string;
  skills: string;
  experience_years: number;
  hourly_rate: number;
  working_hours: string;
  languages: string;
  bio: string;
  aadhaar_number: string;
  pan_number: string;
}

export default function WorkerRegisterPage() {
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [aadhaarFront, setAadhaarFront] = useState<File | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [availability, setAvailability] = useState(true);
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [languageInput, setLanguageInput] = useState('');
  const [languagesList, setLanguagesList] = useState<string[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<WorkerRegisterForm>();
  const password = watch('password');

  useEffect(() => {
    supabase.from('categories').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => data && setCategories(data as Category[]));
  }, []);

  const getLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          toast('Location captured successfully', 'success');
        },
        () => toast('Unable to get location. Please allow location access.', 'error')
      );
    }
  }, [toast]);

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const addLanguage = () => {
    if (languageInput.trim() && !languagesList.includes(languageInput.trim())) {
      setLanguagesList([...languagesList, languageInput.trim()]);
      setLanguageInput('');
    }
  };

  const uploadFile = async (file: File, bucket: string, path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) { toast(`Upload failed: ${error.message}`, 'error'); return null; }
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const onSubmit = async (data: WorkerRegisterForm) => {
    setLoading(true);
    try {
      const { error: signUpError } = await signUp(data.email, data.password, {
        full_name: data.full_name,
        phone: data.phone,
        role: 'worker',
      });
      if (signUpError) { toast(signUpError, 'error'); setLoading(false); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast('Registration failed - no user session', 'error'); setLoading(false); return; }

      let profilePhotoUrl = '';
      if (profilePhoto) {
        profilePhotoUrl = await uploadFile(profilePhoto, STORAGE_BUCKETS.workers, `${user.id}/profile.${profilePhoto.name.split('.').pop()}`) || '';
      }
      let aadhaarUrl = '';
      if (aadhaarFront) {
        aadhaarUrl = await uploadFile(aadhaarFront, STORAGE_BUCKETS.documents, `${user.id}/aadhaar_front.${aadhaarFront.name.split('.').pop()}`) || '';
      }
      let aadhaarBackUrl = '';
      if (aadhaarBack) {
        aadhaarBackUrl = await uploadFile(aadhaarBack, STORAGE_BUCKETS.documents, `${user.id}/aadhaar_back.${aadhaarBack.name.split('.').pop()}`) || '';
      }
      let panUrl = '';
      if (panFile) {
        panUrl = await uploadFile(panFile, STORAGE_BUCKETS.documents, `${user.id}/pan.${panFile.name.split('.').pop()}`) || '';
      }

      const { error: workerError } = await supabase.from('workers').insert({
        id: user.id,
        category_id: data.category_id || null,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        latitude: currentLocation?.lat || null,
        longitude: currentLocation?.lng || null,
        profile_photo_url: profilePhotoUrl,
        aadhaar_url: aadhaarUrl,
        aadhaar_back_url: aadhaarBackUrl,
        pan_url: panUrl,
        aadhaar_number: data.aadhaar_number,
        pan_number: data.pan_number,
        skills: skills,
        experience_years: Number(data.experience_years) || 0,
        hourly_rate: Number(data.hourly_rate) || 0,
        working_hours: data.working_hours,
        languages: languagesList,
        bio: data.bio,
        availability: availability,
        status: 'pending',
        is_verified: false,
      });
      if (workerError) { toast(workerError.message, 'error'); setLoading(false); return; }

      for (const file of galleryFiles) {
        const url = await uploadFile(file, STORAGE_BUCKETS.gallery, `${user.id}/${Date.now()}-${file.name}`);
        if (url) {
          await supabase.from('gallery').insert({ worker_id: user.id, image_url: url });
        }
      }

      toast('Registration submitted successfully. Your profile will become visible after Admin Approval.', 'success');
      navigate('/worker-login');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Registration failed', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-2xl text-gray-900 dark:text-white mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            worker<span className="text-blue-600 dark:text-blue-400">.com</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Worker Registration</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Join our marketplace of skilled professionals</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Info */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input {...register('full_name', { required: 'Required' })} type="text" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="John Doe" />
                  </div>
                  {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input {...register('email', { required: 'Required', pattern: { value: /^\S+@\S+$/, message: 'Invalid email' } })} type="email" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="john@example.com" />
                  </div>
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input {...register('phone', { required: 'Required' })} type="tel" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="+91 98765 43210" />
                  </div>
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address *</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input {...register('address', { required: 'Required' })} type="text" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="123 Main St, City" />
                  </div>
                  {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City *</label>
                  <input {...register('city', { required: 'Required' })} type="text" className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Mumbai" />
                  {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State *</label>
                  <input {...register('state', { required: 'Required' })} type="text" className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Maharashtra" />
                  {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pincode *</label>
                  <input {...register('pincode', { required: 'Required', pattern: { value: /^[0-9]{6}$/, message: 'Invalid pincode' } })} type="text" maxLength={6} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="400001" />
                  {errors.pincode && <p className="text-xs text-red-500 mt-1">{errors.pincode.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input {...register('password', { required: 'Required', minLength: { value: 6, message: 'Min 6 chars' } })} type={showPassword ? 'text' : 'password'} className="w-full pl-10 pr-10 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                  </div>
                  {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input {...register('confirmPassword', { required: 'Required', validate: (v) => v === password || 'Passwords do not match' })} type={showPassword ? 'text' : 'password'} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="••••••••" />
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Location</label>
              <button type="button" onClick={getLocation} className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm font-medium">
                <MapPin className="w-4 h-4" /> Capture Current Location
              </button>
              {currentLocation && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Location: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                </p>
              )}
            </div>

            {/* Professional Info */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Professional Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Service Category *</label>
                  <select {...register('category_id', { required: 'Required' })} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Select a category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {errors.category_id && <p className="text-xs text-red-500 mt-1">{errors.category_id.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Experience (Years) *</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input {...register('experience_years', { required: 'Required', valueAsNumber: true })} type="number" min="0" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="5" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hourly Rate (₹) *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input {...register('hourly_rate', { required: 'Required', valueAsNumber: true })} type="number" min="0" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Working Hours</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input {...register('working_hours')} type="text" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="9:00 AM - 6:00 PM" />
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Skills</label>
                <div className="flex gap-2">
                  <input type="text" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., Pipe fitting, Leak repair" />
                  <button type="button" onClick={addSkill} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Add</button>
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {skills.map((s, i) => (
                      <span key={i} className="flex items-center gap-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm">
                        {s}<button type="button" onClick={() => setSkills(skills.filter((_, idx) => idx !== i))} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Languages */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Languages</label>
                <div className="flex gap-2">
                  <input type="text" value={languageInput} onChange={(e) => setLanguageInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., English, Hindi" />
                  <button type="button" onClick={addLanguage} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Add</button>
                </div>
                {languagesList.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {languagesList.map((l, i) => (
                      <span key={i} className="flex items-center gap-1 px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-sm">
                        <Languages className="w-3 h-3" />{l}<button type="button" onClick={() => setLanguagesList(languagesList.filter((_, idx) => idx !== i))} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
                <textarea {...register('bio')} rows={3} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="Tell us about yourself and your expertise..." />
              </div>
            </div>

            {/* Documents */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Documents & Photos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profile Photo</label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
                      <Upload className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-500">{profilePhoto ? profilePhoto.name : 'Upload photo'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && setProfilePhoto(e.target.files[0])} />
                    </label>
                    {profilePhoto && <button type="button" onClick={() => setProfilePhoto(null)} className="text-red-500"><X className="w-5 h-5" /></button>}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Submitting...' : 'Submit Registration'}
              </button>
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                Your profile will be reviewed by our admin team before going live.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
