import { useState } from 'react';
import { Eye, CheckCircle, XCircle, Power, Trash2, FileText, MapPin, Briefcase, DollarSign, Clock, Languages } from 'lucide-react';
import { Modal } from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import { formatCurrency } from '@/lib/helpers';
import type { Worker } from '@/lib/types';

interface PendingTabProps {
  workers: Worker[];
  onApprove: (w: Worker) => void;
  onReject: (w: Worker) => void;
  onSuspend: (w: Worker) => void;
  onDelete: (w: Worker) => void;
}

export default function PendingTab({ workers, onApprove, onReject, onSuspend, onDelete }: PendingTabProps) {
  const [selected, setSelected] = useState<Worker | null>(null);

  return (
    <div className="space-y-4">
      {workers.length === 0 ? (
        <EmptyState title="No pending approvals" description="All worker registrations have been reviewed." icon={<CheckCircle className="w-8 h-8 text-gray-400" />} />
      ) : (
        workers.map((w) => (
          <div key={w.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {w.profile_photo_url ? (
                  <img src={w.profile_photo_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-gray-700 flex items-center justify-center font-bold text-blue-600 text-lg">{w.full_name.charAt(0)}</div>
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{w.full_name}</p>
                  <p className="text-sm text-gray-500">{w.email} - {w.phone}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{w.category?.name} - {w.experience_years} yrs exp - {formatCurrency(Number(w.hourly_rate))}/hr</p>
                  <p className="text-xs text-gray-400">Registered: {new Date(w.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSelected(w)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="View Details">
                  <Eye className="w-5 h-5" />
                </button>
                <button onClick={() => onApprove(w)} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
                <button onClick={() => onReject(w)} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Worker Detail Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Worker Registration Details"
        maxWidth="max-w-2xl"
        footer={
          selected && (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { onApprove(selected); setSelected(null); }} className="flex-1 min-w-[100px] py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
              <button onClick={() => { onReject(selected); setSelected(null); }} className="flex-1 min-w-[100px] py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4" /> Reject
              </button>
              <button onClick={() => { onSuspend(selected); setSelected(null); }} className="flex-1 min-w-[100px] py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center justify-center gap-2">
                <Power className="w-4 h-4" /> Suspend
              </button>
              <button onClick={() => { onDelete(selected); setSelected(null); }} className="flex-1 min-w-[100px] py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {selected.profile_photo_url ? (
                <img src={selected.profile_photo_url} alt="" className="w-20 h-20 rounded-2xl object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-blue-100 dark:bg-gray-700 flex items-center justify-center text-2xl font-bold text-blue-600">{selected.full_name.charAt(0)}</div>
              )}
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selected.full_name}</h3>
                <p className="text-sm text-gray-500">{selected.email}</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">{selected.category?.name}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" /> <span className="text-gray-500">Address:</span> {selected.address}</div>
              <div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-gray-400" /> <span className="text-gray-500">Experience:</span> {selected.experience_years} years</div>
              <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-gray-400" /> <span className="text-gray-500">Rate:</span> {formatCurrency(Number(selected.hourly_rate))}/hr</div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /> <span className="text-gray-500">Hours:</span> {selected.working_hours || 'N/A'}</div>
              <div className="flex items-center gap-2"><Languages className="w-4 h-4 text-gray-400" /> <span className="text-gray-500">Languages:</span> {selected.languages.join(', ') || 'N/A'}</div>
              <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" /> <span className="text-gray-500">Registered:</span> {new Date(selected.created_at).toLocaleString()}</div>
            </div>

            {selected.skills.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {selected.skills.map((s, i) => <span key={i} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs">{s}</span>)}
                </div>
              </div>
            )}

            {selected.bio && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Bio</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{selected.bio}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {selected.aadhaar_url && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Aadhaar Document</p>
                  <a href={selected.aadhaar_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <FileText className="w-4 h-4" /> View Aadhaar
                  </a>
                </div>
              )}
              {selected.pan_url && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">PAN Document</p>
                  <a href={selected.pan_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <FileText className="w-4 h-4" /> View PAN
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
