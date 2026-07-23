import { Link } from 'react-router-dom';
import { Star, MapPin, Briefcase } from 'lucide-react';
import type { Worker } from '@/lib/types';
import { formatCurrency } from '@/lib/helpers';

interface WorkerCardProps {
  worker: Worker;
}

export default function WorkerCard({ worker }: WorkerCardProps) {
  return (
    <Link
      to={`/worker/${worker.id}`}
      className="group block bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-700 transition-all duration-300"
    >
      <div className="relative h-40 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-700 dark:to-gray-600 overflow-hidden">
        {worker.profile_photo_url ? (
          <img
            src={worker.profile_photo_url}
            alt={worker.full_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-gray-600 flex items-center justify-center text-2xl font-bold text-blue-600 dark:text-blue-300">
              {worker.full_name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
        {worker.availability && (
          <span className="absolute top-3 right-3 px-2 py-1 text-xs font-medium bg-green-500 text-white rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            Available
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
            {worker.full_name}
          </h3>
          <div className="flex items-center gap-1 text-sm">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {worker.rating > 0 ? worker.rating.toFixed(1) : 'New'}
            </span>
          </div>
        </div>
        {worker.category && (
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-2">
            {worker.category.name}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
          <span className="flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5" />
            {worker.experience_years} yrs
          </span>
          {worker.address && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5" />
              {worker.address.split(',')[0]}
            </span>
          )}
        </div>
        {worker.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {worker.skills.slice(0, 3).map((skill, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {formatCurrency(Number(worker.hourly_rate))}
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">/hr</span>
          </span>
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:underline">
            View Profile
          </span>
        </div>
      </div>
    </Link>
  );
}
