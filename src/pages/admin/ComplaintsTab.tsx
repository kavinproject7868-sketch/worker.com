import EmptyState from '@/components/EmptyState';
import type { Complaint } from '@/lib/types';

interface ComplaintsTabProps {
  complaints: Complaint[];
  onUpdateStatus: (id: string, status: string) => void;
}

const STATUS_BADGES: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export default function ComplaintsTab({ complaints, onUpdateStatus }: ComplaintsTabProps) {
  return (
    <div className="space-y-4">
      {complaints.length === 0 ? (
        <EmptyState title="No complaints" description="All complaints have been resolved." />
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <div key={c.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900 dark:text-white">{c.subject}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGES[c.status] || ''}`}>{c.status.replace('_', ' ')}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{c.description}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
                    <span>ID: {c.id.slice(0, 8)}</span>
                    <span>{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <select
                  value={c.status}
                  onChange={(e) => onUpdateStatus(c.id, e.target.value)}
                  className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolve</option>
                  <option value="closed">Close</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
