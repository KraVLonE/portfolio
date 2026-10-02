import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, FolderGit2, Star, Save, AlertTriangle } from 'lucide-react';
import api from '../api';
import { ConfirmModal } from '../components/ConfirmModal';

interface ProjectItem {
  id?: number;
  title: string;
  one_liner: string;
  role: string;
  location?: string;
  date?: string;
  pointers: string[];
  tech_stack: string[];
  links: Record<string, string>;
  outcome?: string;
  featured: boolean;
  order: number;
}

const emptyForm: ProjectItem = {
  title: '',
  one_liner: '',
  role: '',
  location: '',
  date: '',
  pointers: [],
  tech_stack: [],
  links: {},
  outcome: '',
  featured: false,
  order: 0,
};

export default function ProjectsEditor() {
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [editing, setEditing] = useState<ProjectItem | null>(null);
  const [pointersText, setPointersText] = useState('');
  const [techStack, setTechStack] = useState<string[]>([]);
  const [techInput, setTechInput] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = () => api.get('/projects').then((res) => setItems(res.data));
  useEffect(() => { load(); }, []);

  const openForm = (item?: ProjectItem) => {
    const data = item || emptyForm;
    setEditing(data);
    setPointersText((data.pointers || []).join('\n'));
    setTechStack(data.tech_stack || []);
    setTechInput('');
    setRepoUrl(data.links?.repo || '');
    setLiveUrl(data.links?.live_demo || '');
    setErrorMsg('');
  };

  const closeForm = () => {
    setEditing(null);
    setPointersText('');
    setTechStack([]);
    setTechInput('');
    setRepoUrl('');
    setLiveUrl('');
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
    const links: Record<string, string> = {};
    if (repoUrl.trim()) links.repo = repoUrl.trim();
    if (liveUrl.trim()) links.live_demo = liveUrl.trim();

    const data = {
      ...editing,
      order: Number(editing.order) || 0,
      featured: !!editing.featured,
      pointers: pointersText.split('\n').map((s) => s.trim()).filter(Boolean),
      tech_stack: techStack,
      links,
      date: editing.date || null
    };
    try {
      if (data.id) await api.put(`/projects/${data.id}`, data);
      else await api.post('/projects', data);
      closeForm();
      load();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || err.message || 'Unknown error');
    }
  };

  const executeDelete = async () => {
    if (deleteId === null) return;
    await api.delete(`/projects/${deleteId}`);
    setDeleteId(null);
    load();
  };

  // Form view (completely replaces the list)
  if (editing) {
    return (
      <div className="animate-fade-in">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              {editing.id ? 'Edit' : 'New'} Project <span className="text-pink-500 text-sm font-mono tracking-widest font-normal">// EDIT</span>
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
              <input className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required />
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
              <label className="block text-xs font-mono text-slate-500 mb-1.5 tracking-wider uppercase">Date</label>
              <input type="date" className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors" value={editing.date || ''} onChange={(e) => setEditing({ ...editing, date: e.target.value || undefined })} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-500 mb-1.5 tracking-wider uppercase">One-Liner Description</label>
            <input className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors" value={editing.one_liner} onChange={(e) => setEditing({ ...editing, one_liner: e.target.value })} required />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-500 mb-1.5 tracking-wider uppercase">Detail Bullets <span className="text-slate-700">(one per line)</span></label>
            <textarea rows={4} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors resize-y min-h-[100px] font-mono" value={pointersText} onChange={(e) => setPointersText(e.target.value)} />
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1.5 tracking-wider uppercase">GitHub Repo URL</label>
              <input type="url" className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1.5 tracking-wider uppercase">Live Demo URL</label>
              <input type="url" className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors" value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1.5 tracking-wider uppercase">Outcome</label>
              <input className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors" value={editing.outcome || ''} onChange={(e) => setEditing({ ...editing, outcome: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1.5 tracking-wider uppercase">Display Order</label>
              <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors" value={editing.order} onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded px-4 py-2.5 cursor-pointer hover:border-pink-500/30 transition-colors w-full">
                <input type="checkbox" className="w-4 h-4 accent-pink-500 rounded" checked={editing.featured} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} />
                <span className="text-sm text-slate-400 font-mono">FEATURED</span>
              </label>
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
            Projects <span className="text-pink-500 text-sm font-mono tracking-widest font-normal">// EXE</span>
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-1">Manage project showcase</p>
        </div>
        <button onClick={() => openForm()} className="flex items-center gap-2 bg-slate-900 text-cyan-400 border border-cyan-500/20 px-4 py-2.5 rounded font-mono text-sm hover:bg-cyan-500/10 hover:border-cyan-500/40 transition-all cursor-pointer">
          <Plus size={16} /> ADD
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.id} className="bg-slate-900/50 border border-slate-800 hover:border-pink-500/20 rounded-lg p-5 transition-all group flex flex-col">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-pink-500/5 border border-pink-500/10 flex items-center justify-center shrink-0">
                  <FolderGit2 size={18} className="text-pink-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    {item.title}
                    {item.featured && <Star size={14} className="text-yellow-400 fill-yellow-400" />}
                  </h3>
                  <p className="text-xs text-pink-400 font-mono">{item.role}</p>
                </div>
              </div>
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openForm(item)} className="p-2 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/5 rounded transition-colors cursor-pointer">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => setDeleteId(item.id!)} className="p-2 text-slate-500 hover:text-pink-400 hover:bg-pink-500/5 rounded transition-colors cursor-pointer">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <p className="text-sm text-slate-400 mb-4 flex-1 line-clamp-2">{item.one_liner}</p>

            <div className="flex flex-wrap gap-1.5">
              {(item.tech_stack || []).map((tech, i) => (
                <span key={i} className="px-2 py-0.5 bg-slate-950 text-pink-300/80 text-[11px] font-mono border border-slate-800 rounded">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-600 font-mono text-sm border border-dashed border-slate-800 rounded-lg">
            No projects. Click ADD to create one.
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone."
        onConfirm={executeDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
