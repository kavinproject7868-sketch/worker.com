import { useEffect, useState } from 'react';
import { User, Mail, Phone, MapPin, Camera, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase, STORAGE_BUCKETS } from '@/lib/supabase';
import { useForm } from 'react-hook-form';

interface ProfileForm {
  full_name: string;
  phone: string;
  address: string;
}

interface PasswordForm {
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const { register, handleSubmit, setValue } = useForm<ProfileForm>();
  const [pwForm, setPwForm] = useState<PasswordForm>({ newPassword: '', confirmPassword: '' });

  useEffect(() => {
    if (profile) {
      setValue('full_name', profile.full_name);
      setValue('phone', profile.phone);
      setValue('address', profile.address);
    }
  }, [profile, setValue]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from(STORAGE_BUCKETS.profiles).upload(path, file, { upsert: true });
    if (error) { toast(error.message, 'error'); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from(STORAGE_BUCKETS.profiles).getPublicUrl(path);
    await updateProfile({ profile_photo_url: urlData.publicUrl });
    toast('Profile photo updated', 'success');
    setUploading(false);
  };

  const onSubmit = async (data: ProfileForm) => {
    setSaving(true);
    const { error } = await updateProfile(data);
    if (error) toast(error, 'error');
    else toast('Profile updated successfully', 'success');
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast('Passwords do not match', 'error'); return; }
    if (pwForm.newPassword.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword });
    if (error) toast(error.message, 'error');
    else { toast('Password changed successfully', 'success'); setPwForm({ newPassword: '', confirmPassword: '' }); }
    setChangingPassword(false);
  };

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">My Profile</h1>

      {/* Photo */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-4">
          {profile.profile_photo_url ? (
            <img src={profile.profile_photo_url} alt="" className="w-20 h-20 rounded-2xl object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-blue-100 dark:bg-gray-700 flex items-center justify-center text-2xl font-bold text-blue-600">{profile.full_name?.charAt(0) || 'U'}</div>
          )}
          <div>
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm font-medium">
              <Camera className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Change Photo'}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
            </label>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Personal Information</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input {...register('full_name')} type="text" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="email" value={profile.email || ''} disabled className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input {...register('phone')} type="tel" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input {...register('address')} type="text" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Lock className="w-5 h-5" /> Change Password</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
            <input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
            <input type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <button onClick={handleChangePassword} disabled={changingPassword} className="w-full py-2.5 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg disabled:opacity-50">{changingPassword ? 'Updating...' : 'Update Password'}</button>
        </div>
      </div>
    </div>
  );
}
