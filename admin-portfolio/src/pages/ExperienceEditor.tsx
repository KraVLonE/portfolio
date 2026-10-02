import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Briefcase, Save, AlertTriangle } from 'lucide-react';
import api from '../api';
import { ConfirmModal } from '../components/ConfirmModal';

interface ExperienceItem {
  id?: number;
  company: string;
  role: string;
  location?: string;
  start_date: string;
  end_date?: string;
  pointers: string[];
  tech_stack: string[];
  order: number;
  description?: string;
}

const emptyForm: ExperienceItem = {
  company: '',
  role: '',
  location: '',
  start_date: '',
  end_date: '',
  pointers: [],
  tech_stack: [],
  order: 0,
  description: '',
};

export default function ExperienceEditor() {
  const [items, setItems] = useState<ExperienceItem[]>([]);
  const [editing, setEditing] = useState<ExperienceItem | null>(null);
  const [pointersText, setPointersText] = useState('');
  const [techStack, setTechStack] = useState<string[]>([]);
  const [techInput, setTechInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = () => api.get('/experience').then((res) => setItems(res.data));
  useEffect(() => { load(); }, []);

  const openForm = (item?: ExperienceItem) => {
    const data = item || emptyForm;
    setEditing(data);
    setPointersText((data.pointers || []).join('\n'));
    setTechStack(data.tech_stack || []);
    setTechInput('');
    setErrorMsg('');
  };

  const closeForm = () => {
    setEditing(null);
    setPointersText('');
    setTechStack([]);
    setTechInput('');
    setErrorMsg('');
  };

  const addTech = (e: React.KeyboardEvent | React.FocusEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const val = techInput.trim();
    if (val && !techStack.includes(val)) {
      setTechStack([...techStack, val]);
    }
    setTechInput('');
  };

  const removeTech = (tag: string) => {
    setTechStack(techStack.filter(t => t !== tag));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setErrorMsg('');
    const data = {
      ...editing,
      order: Number(editing.order) || 0,
      pointers: pointersText.split('\n').map((s) => s.trim()).filter(Boolean),
      tech_stack: techStack,
      end_date: editing.end_date || null,
      start_date: editing.start_date || null
    };
    try {
      if (data.id) await api.put(`/experience/${data.id}`, data);
      else await api.post('/experience', data);
      closeForm();
      load();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || err.message || 'Unknown error');
    }
  };

  const executeDelete = async () => {
    if (deleteId === null) return;
    await api.delete(`/experience/${deleteId}`);
    setDeleteId(null);
    load();
  };

  // When editing, show ONLY the form. When not editing, show the list.
  if (editing) {
    return (
      <div className="animate-fade-in">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              {editing.id ? 'Edit' : 'New'} Experience <span className="text-cyan-500 text-sm font-mono tracking-widest font-normal">// EDIT</span>
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
              <label className="block text-xs font-mono text-slate-500 mb-1.5 tracking-wider uppercase">Company</label>
              <input className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors" value={editing.company} onChange={(e) => setEditing({ ...editing, company: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1.5 tracking-wider uppercase">Role</label>
              <input className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors" value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1.5 tracking-wider uppercase">Location</label>
              <input className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors" value={editing.location || ''} onChange={(e) => setEditing({ ...editing, location: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1.5 tracking-wider uppercase">Display Order</label>
              <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors" value={editing.order} onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1.5 tracking-wider uppercase">Start Date</label>
              <input type="date" className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors" value={editing.start_date || ''} onChange={(e) => setEditing({ ...editing, start_date: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1.5 tracking-wider uppercase">End Date <span className="text-slate-700">(empty = present)</span></label>
              <input type="date" className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors" value={editing.end_date || ''} onChange={(e) => setEditing({ ...editing, end_date: e.target.value || undefined })} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-500 mb-1.5 tracking-wider uppercase">Bullet Points <span className="text-slate-700">(one per line)</span></label>
            <textarea rows={5} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors resize-y min-h-[100px] font-mono" value={pointersText} onChange={(e) => setPointersText(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-500 mb-1.5 tracking-wider uppercase">Tech Stack <span className="text-slate-700">(Press Enter to add)</span></label>
            <div className="w-full bg-slate-950 border border-slate-800 rounded p-2 min-h-11 flex flex-wrap gap-2 focus-within:border-cyan-500/50 transition-colors">
              {techStack.map(tag => (
                <span key={tag} className="flex items-center gap-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-1 rounded text-xs font-mono">
                  {tag}
                  <button type="button" onClick={() => removeTech(tag)} className="text-cyan-600 hover:text-cyan-300"><X size={12}/></button>
                </span>
              ))}
              <input
                type="text"
                className="flex-1 min-w-[120px] bg-transparent outline-none text-slate-200 text-sm font-mono placeholder:text-slate-700"
                placeholder="Add technology..."
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={addTech}
                onBlur={addTech}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-800 pt-5">
            <button type="button" onClick={closeForm} className="px-5 py-2.5 text-slate-500 hover:text-slate-200 border border-slate-800 hover:border-slate-700 rounded font-mono text-sm transition-colors">
              CANCEL
            </button>
            <button className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2.5 rounded font-mono text-sm font-bold transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)] cursor-pointer">
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
            Experience <span className="text-cyan-500 text-sm font-mono tracking-widest font-normal">// LOG</span>
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-1">Manage career history</p>
        </div>
        <button onClick={() => openForm()} className="flex items-center gap-2 bg-slate-900 text-cyan-400 border border-cyan-500/20 px-4 py-2.5 rounded font-mono text-sm hover:bg-cyan-500/10 hover:border-cyan-500/40 transition-all cursor-pointer">
          <Plus size={16} /> ADD
        </button>
      </header>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-slate-900/50 border border-slate-800 hover:border-cyan-500/20 rounded-lg p-5 transition-all group flex items-center gap-5">
            <div className="w-10 h-10 rounded bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center shrink-0">
              <Briefcase size={18} className="text-cyan-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-white">{item.role}</h3>
              <p className="text-sm text-cyan-400 font-mono">{item.company}</p>
              <p className="text-xs text-slate-600 font-mono mt-1">{item.start_date} — {item.end_date || 'PRESENT'}</p>
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
            No experience entries. Click ADD to create one.
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Experience"
        message="Are you sure you want to delete this experience entry? This action cannot be undone."
        onConfirm={executeDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
