import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CategoryCard from '@/components/CategoryCard';
import { CategoryCardSkeleton } from '@/components/Skeletons';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/lib/types';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('categories').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => { setCategories(data as Category[] || []); setLoading(false); });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Service Categories</h1>
        <p className="text-gray-500 dark:text-gray-400">Browse workers by service type</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {loading
          ? Array.from({ length: 12 }).map((_, i) => <CategoryCardSkeleton key={i} />)
          : categories.map((cat) => <CategoryCard key={cat.id} category={cat} />)}
      </div>
    </div>
  );
}
