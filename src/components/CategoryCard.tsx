import { Link } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import type { Category } from '@/lib/types';

interface CategoryCardProps {
  category: Category;
}

export default function CategoryCard({ category }: CategoryCardProps) {
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
    category.icon
  ] || LucideIcons.Wrench;

  return (
    <Link
      to={`/workers?category=${category.id}`}
      className="group flex flex-col items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-700 transition-all duration-300"
    >
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
        <IconComponent className="w-7 h-7 text-blue-600 dark:text-blue-400" />
      </div>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {category.name}
      </span>
    </Link>
  );
}
