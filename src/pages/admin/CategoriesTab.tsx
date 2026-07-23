import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Upload, X } from 'lucide-react';
import { Modal } from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import { supabase, STORAGE_BUCKETS } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import type { Category } from '@/lib/types';

interface CategoriesTabProps {
  categories: Category[];
  onChanged: () => void;
}

export default function CategoriesTab({ categories, onChanged }: CategoriesTabProps) {
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setName(''); setDescription(''); setIcon(''); setSortOrder(0); setIconFile(null);
    setShowModal(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setName(c.name); setDescription(c.description); setIcon(c.icon); setSortOrder(c.sort_order);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast('Name is required', 'error'); return; }
    setSaving(true);
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    let iconUrl = icon;

    if (iconFile) {
      const ext = iconFile.name.split('.').pop();
      const path = `${slug}.${ext}`;
      const { error: upErr } = await supabase.storage.from(STORAGE_BUCKETS.workers).upload(path, iconFile, { upsert: true });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from(STORAGE_BUCKETS.workers).getPublicUrl(path);
        iconUrl = urlData.publicUrl;
      }
    }

    if (editing) {
      const { error } = await supabase.from('categories').update({ name, slug, description, icon: iconUrl, sort_order: sortOrder }).eq('id', editing.id);
      if (error) toast(error.message, 'error');
      else toast('Category updated', 'success');
    } else {
      const { error } = await supabase.from('categories').insert({ name, slug, description, icon: iconUrl, sort_order: sortOrder, is_active: true });
      if (error) toast(error.message, 'error');
      else toast('Category added', 'success');
    }
    setSaving(false);
    setShowModal(false);
    onChanged();
  };

  const toggleActive = async (c: Category) => {
    await supabase.from('categories').update({ is_active: !c.is_active }).eq('id', c.id);
    toast(`${c.name} ${c.is_active ? 'hidden' : 'visible'}`, 'info');
    onChanged();
  };

  const handleDelete = async (c: Category) => {
    if (!confirm(`Delete category "${c.name}"? This cannot be undone.`)) return;
    await supabase.from('categories').delete().eq('id', c.id);
    toast('Category deleted', 'info');
    onChanged();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">{categories.length} categories</p>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {categories.length === 0 ? (
        <EmptyState title="No categories yet" description="Add your first service category." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((c) => (
            <div key={c.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{c.name}</p>
                  <p className="text-xs text-gray-400">/{c.slug}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${c.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700'}`}>
                  {c.is_active ? 'Active' : 'Hidden'}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{c.description || 'No description'}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg" title="Edit"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => toggleActive(c)} className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title={c.is_active ? 'Hide' : 'Show'}>
                  {c.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => handleDelete(c)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Category' : 'Add Category'}
        footer={
          <div className="flex gap-3">
            <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., Plumbing" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Category description..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Icon Name (lucide-react)</label>
            <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., Wrench, Zap, Sparkles" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort Order</label>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Icon Image (optional)</label>
            <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
              <Upload className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-500">{iconFile ? iconFile.name : 'Upload icon image'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && setIconFile(e.target.files[0])} />
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
