import { useState, useEffect } from 'react';
import { Plus, X, Layers, AlertTriangle } from 'lucide-react';
import api from '../api';
import { ConfirmModal } from '../components/ConfirmModal';

interface SkillItem {
  id: number;
  name: string;
  category: string;
  order: number;
}

export default function SkillsEditor() {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [localCategories, setLocalCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [skillInputs, setSkillInputs] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = () => {
    api.get('/skills').then((res) => {
      setSkills(res.data);
      // Clean up local categories that now exist in DB
      const dbCategories = new Set(res.data.map((s: SkillItem) => s.category));
      setLocalCategories(prev => prev.filter(c => !dbCategories.has(c)));
    }).catch(err => {
      setErrorMsg(err.response?.data?.detail?.[0]?.msg || err.message || 'Failed to load skills');
    });
  };

  useEffect(() => { load(); }, []);

  // Group skills from DB
  const groupedSkills = skills.reduce((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<string, SkillItem[]>);

  // Combine DB categories with empty local categories
  const allCategories = Array.from(new Set([...Object.keys(groupedSkills), ...localCategories]));

  const addLocalCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (name && !allCategories.includes(name)) {
      setLocalCategories([...localCategories, name]);
    }
    setNewCategoryName('');
    setShowCategoryInput(false);
  };

  const addSkill = async (category: string) => {
    const name = (skillInputs[category] || '').trim();
    if (!name) return;

    setErrorMsg('');
    try {
      await api.post('/skills', {
        name,
        category,
        order: (groupedSkills[category]?.length || 0) + 1
      });
      setSkillInputs(prev => ({ ...prev, [category]: '' }));
      load();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail?.[0]?.msg || err.message || 'Failed to add skill');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, category: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill(category);
    }
  };

  const executeDelete = async () => {
    if (deleteId === null) return;
    setErrorMsg('');
    try {
      await api.delete(`/skills/${deleteId}`);
      setDeleteId(null);
      load();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail?.[0]?.msg || err.message || 'Failed to delete skill');
      setDeleteId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Skills <span className="text-indigo-500 text-sm font-mono tracking-widest font-normal">// SYS</span>
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-1">Manage technical stack and proficiencies</p>
        </div>
        {!showCategoryInput ? (
          <button 
            onClick={() => setShowCategoryInput(true)} 
            className="flex items-center gap-2 bg-slate-900 text-indigo-400 border border-indigo-500/20 px-4 py-2.5 rounded font-mono text-sm hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all cursor-pointer"
          >
            <Plus size={16} /> NEW CATEGORY
          </button>
        ) : (
          <form onSubmit={addLocalCategory} className="flex items-center gap-2">
            <input 
              autoFocus
              className="bg-slate-950 border border-indigo-500/50 rounded px-3 py-2 text-slate-200 text-sm focus:outline-none w-48 font-mono" 
              placeholder="Category Name" 
              value={newCategoryName} 
              onChange={(e) => setNewCategoryName(e.target.value)} 
              onBlur={() => !newCategoryName.trim() && setShowCategoryInput(false)}
            />
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded font-mono text-sm font-bold transition-colors cursor-pointer">
              ADD
            </button>
          </form>
        )}
      </header>

      {errorMsg && (
        <div className="mb-6 px-4 py-3 bg-pink-500/10 border border-pink-500/30 rounded text-pink-400 text-sm font-mono flex items-center gap-2">
          <AlertTriangle size={16} /> ERROR: {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {allCategories.map(category => (
          <div key={category} className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
              <div className="w-8 h-8 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Layers size={16} className="text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-200 tracking-tight">{category}</h3>
            </div>

            <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
              {(groupedSkills[category] || []).map(skill => (
                <span key={skill.id} className="flex items-center gap-1.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2.5 py-1.5 rounded text-sm font-mono group transition-colors hover:bg-indigo-500/20 hover:border-indigo-500/40">
                  {skill.name}
                  <button type="button" onClick={() => setDeleteId(skill.id)} className="text-indigo-500/50 hover:text-pink-400 transition-colors ml-1 cursor-pointer">
                    <X size={14} />
                  </button>
                </span>
              ))}
              {(!groupedSkills[category] || groupedSkills[category].length === 0) && (
                <span className="text-slate-600 text-xs font-mono py-1.5 flex items-center">No skills added yet</span>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors font-mono placeholder:text-slate-700"
                placeholder={`Add skill to ${category}...`}
                value={skillInputs[category] || ''}
                onChange={(e) => setSkillInputs({ ...skillInputs, [category]: e.target.value })}
                onKeyDown={(e) => handleKeyDown(e, category)}
              />
              <span className="absolute right-3 top-2.5 text-[10px] text-slate-600 font-mono tracking-widest pointer-events-none">ENTER</span>
            </div>
          </div>
        ))}

        {allCategories.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-600 font-mono text-sm border border-dashed border-slate-800 rounded-lg">
            No skill categories found. Click NEW CATEGORY to start.
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteId !== null}
        title="Remove Skill"
        message="Are you sure you want to remove this skill? It will be deleted immediately."
        onConfirm={executeDelete}
        onCancel={() => setDeleteId(null)}
        confirmText="Remove"
      />
    </div>
  );
}
