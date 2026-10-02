import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Trophy, Save, AlertTriangle } from 'lucide-react';
import api from '../api';
import { ConfirmModal } from '../components/ConfirmModal';

interface AchievementItem {
  id?: number;
  title: string;
  description: string;
  date?: string;
  order: number;
}

const emptyForm: AchievementItem = {
  title: '',
  description: '',
  date: '',
  order: 0,
};

export default function AchievementsEditor() {
  const [items, setItems] = useState<AchievementItem[]>([]);
  const [editing, setEditing] = useState<AchievementItem | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = () => api.get('/achievements').then((res) => setItems(res.data));
  useEffect(() => { load(); }, []);

  const openForm = (item?: AchievementItem) => {
    setEditing(item || emptyForm);
    setErrorMsg('');
  };

  const closeForm = () => {
    setEditing(null);
    setErrorMsg('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setErrorMsg('');
    const data = {
      ...editing,
      order: Number(editing.order) || 0,
      date: editing.date || null
    };
    try {
      if (data.id) await api.put(`/achievements/${data.id}`, data);
      else await api.post('/achievements', data);
      closeForm();
      load();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || err.message || 'Unknown error');
    }
  };

  const executeDelete = async () => {
    if (deleteId === null) return;
    await api.delete(`/achievements/${deleteId}`);
    setDeleteId(null);
    load();
  };

  // Form view
  if (editing) {
    return (
      <div className="animate-fade-in">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              {editing.id ? 'Edit' : 'New'} Achievement <span className="text-yellow-500 text-sm font-mono tracking-widest font-normal">// AWARD</span>
            </h1>
          </div>
          <button onClick={closeForm} className="p-2 text-slate-500 hover:text-pink-400 hover:bg-pink-500/5 rounded transition-colors">
            <X size={20} />
          </button>
        </header>

        {errorMsg && (
          <div className="mb-4 px-4 py-3 bg-pink-500/10 border border-pink-500/30 rounded text-pink-400 text-sm font-mono flex items-center gap-2">
            <AlertTriangle size={16} /> ERROR: {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1.5 tracking-wider uppercase">Title</label>
              <input className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-yellow-500/50 transition-colors" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1.5 tracking-wider uppercase">Date</label>
              <input type="date" className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-yellow-500/50 transition-colors" value={editing.date || ''} onChange={(e) => setEditing({ ...editing, date: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-500 mb-1.5 tracking-wider uppercase">Description</label>
            <textarea rows={4} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-yellow-500/50 transition-colors resize-y min-h-[100px] font-mono" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} required />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-500 mb-1.5 tracking-wider uppercase">Display Order</label>
            <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-yellow-500/50 transition-colors md:w-1/2" value={editing.order} onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })} />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-800 pt-5">
            <button type="button" onClick={closeForm} className="px-5 py-2.5 text-slate-500 hover:text-slate-200 border border-slate-800 hover:border-slate-700 rounded font-mono text-sm transition-colors">
              CANCEL
            </button>
            <button className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white px-6 py-2.5 rounded font-mono text-sm font-bold transition-all shadow-[0_0_10px_rgba(234,179,8,0.2)] cursor-pointer">
              <Save size={16} /> SAVE
            </button>
          </div>
        </form>
      </div>
    );
  }

  // List view
  return (
    <div className="animate-fade-in">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Achievements <span className="text-yellow-500 text-sm font-mono tracking-widest font-normal">// AWARD</span>
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-1">Manage milestones and awards</p>
        </div>
        <button onClick={() => openForm()} className="flex items-center gap-2 bg-slate-900 text-cyan-400 border border-cyan-500/20 px-4 py-2.5 rounded font-mono text-sm hover:bg-cyan-500/10 hover:border-cyan-500/40 transition-all cursor-pointer">
          <Plus size={16} /> ADD
        </button>
      </header>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-slate-900/50 border border-slate-800 hover:border-yellow-500/20 rounded-lg p-5 transition-all group flex items-center gap-5">
            <div className="w-10 h-10 rounded bg-yellow-500/5 border border-yellow-500/10 flex items-center justify-center shrink-0">
              <Trophy size={18} className="text-yellow-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-white">{item.title}</h3>
              <p className="text-xs text-slate-500 font-mono mt-1">{item.date || 'No Date'}</p>
              <p className="text-sm text-slate-400 mt-2 line-clamp-2">{item.description}</p>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => openForm(item)} className="p-2 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/5 rounded transition-colors cursor-pointer">
                <Edit2 size={16} />
              </button>
              <button onClick={() => setDeleteId(item.id!)} className="p-2 text-slate-500 hover:text-pink-400 hover:bg-pink-500/5 rounded transition-colors cursor-pointer">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-center py-16 text-slate-600 font-mono text-sm border border-dashed border-slate-800 rounded-lg">
            No achievements found. Click ADD to create one.
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Achievement"
        message="Are you sure you want to delete this achievement? This action cannot be undone."
        onConfirm={executeDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
