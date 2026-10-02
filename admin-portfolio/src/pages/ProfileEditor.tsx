import { useState, useEffect } from 'react';
import { Save, CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '../api';

export default function ProfileEditor() {
  const [profile, setProfile] = useState<Record<string, any>>({});
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    api.get('/profile').then((res) => setProfile(res.data)).catch(console.error);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('saving');
    setErrorMsg('');
    try {
      await api.put('/profile', profile);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || err.message || 'Unknown error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  const fields = [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'tagline', label: 'Tagline', type: 'text' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'location', label: 'Location', type: 'text' },
    { key: 'github_url', label: 'GitHub URL', type: 'url' },
    { key: 'linkedin_url', label: 'LinkedIn URL', type: 'url' },
    { key: 'resume_url', label: 'Resume URL', type: 'url' },
    { key: 'codeforces_card_url', label: 'Codeforces Card URL', type: 'url' },
    { key: 'leetcode_card_url', label: 'LeetCode Card URL', type: 'url' },
  ];

  return (
    <div className="animate-fade-in">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Profile <span className="text-cyan-500 text-sm font-mono tracking-widest font-normal">// CONFIG</span>
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-1">Update personal brand identity</p>
        </div>

        {status === 'success' && (
          <div className="flex items-center gap-2 text-green-400 bg-green-500/5 border border-green-500/20 px-4 py-2 rounded text-xs font-mono">
            <CheckCircle2 size={14} /> SAVED
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-2 text-pink-400 bg-pink-500/5 border border-pink-500/20 px-4 py-2 rounded text-xs font-mono max-w-sm truncate">
            <AlertTriangle size={14} /> SAVE FAILED: {errorMsg}
          </div>
        )}
      </header>

      <form onSubmit={handleSave} className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-mono text-slate-500 mb-1.5 tracking-wider uppercase">{f.label}</label>
              <input
                type={f.type}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                value={profile[f.key] || ''}
                onChange={(e) => setProfile({ ...profile, [f.key]: e.target.value })}
              />
            </div>
          ))}
          <div className="md:col-span-2">
            <label className="block text-xs font-mono text-slate-500 mb-1.5 tracking-wider uppercase">Short Bio</label>
            <textarea
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors resize-none"
              rows={4}
              value={profile.bio_short || ''}
              onChange={(e) => setProfile({ ...profile, bio_short: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-800 pt-5">
          <button
            disabled={status === 'saving'}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-6 py-2.5 rounded font-mono text-sm font-bold transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)] disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {status === 'saving' ? 'SAVING...' : 'SAVE'}
          </button>
        </div>
      </form>
    </div>
  );
}
