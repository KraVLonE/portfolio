import { useState } from 'react';
import { Terminal, AlertTriangle } from 'lucide-react';
import api from '../api';

export default function Login({ onLogin }: { onLogin: (t: string) => void }) {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/admin/login', { key });
      onLogin(key);
    } catch {
      setError('ACCESS DENIED — Invalid secret key.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Terminal header bar */}
        <div className="bg-slate-900 border border-slate-800 border-b-0 rounded-t-lg px-4 py-2.5 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-pink-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs font-mono text-slate-500 ml-2">admin@kravlone:~</span>
        </div>

        {/* Terminal body */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-b-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <Terminal size={28} className="text-cyan-400" />
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">SYSTEM ACCESS</h1>
              <p className="text-xs font-mono text-slate-600 tracking-wider">// AUTHENTICATION REQUIRED</p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 mb-5 bg-pink-500/5 border border-pink-500/20 rounded text-pink-400 text-xs font-mono">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-2 tracking-wider uppercase">Secret Key</label>
              <input
                type="password"
                required
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="block w-full bg-slate-950 border border-slate-800 rounded px-4 py-3 text-slate-100 font-mono text-sm focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-700"
                placeholder="••••••••••••"
              />
            </div>

            <button
              disabled={loading || !key}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded font-mono text-sm font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? '> AUTHENTICATING...' : '> AUTHENTICATE'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
