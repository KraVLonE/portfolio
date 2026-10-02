import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { User, Briefcase, FolderGit2, LogOut, Terminal, Trophy } from 'lucide-react';
import Login from './pages/Login';
import ProfileEditor from './pages/ProfileEditor';
import ExperienceEditor from './pages/ExperienceEditor';
import ProjectsEditor from './pages/ProjectsEditor';
import AchievementsEditor from './pages/AchievementsEditor';

function App() {
  const [token, setToken] = useState(localStorage.getItem('adminToken'));

  const saveToken = (t: string) => {
    localStorage.setItem('adminToken', t);
    setToken(t);
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    setToken(null);
  };

  if (!token) {
    return <Login onLogin={saveToken} />;
  }

  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<any>; label: string }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-md font-mono text-sm tracking-wide transition-all duration-200 border ${
          isActive
            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
            : 'text-slate-500 border-transparent hover:text-slate-200 hover:bg-slate-900/50 hover:border-slate-800'
        }`
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  );

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-slate-950 font-sans selection:bg-cyan-500/30">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-950 border-r border-cyan-500/20 flex flex-col">
          <div className="p-5 flex items-center gap-3 border-b border-slate-800">
            <Terminal size={22} className="text-cyan-400" />
            <span className="text-lg font-bold tracking-tight text-white">
              Admin<span className="text-cyan-400">Panel</span>
            </span>
          </div>

          <nav className="flex-1 p-4 space-y-1.5">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-600 mb-3 px-4">// MODULES</p>
            <NavItem to="/profile" icon={User} label="Profile" />
            <NavItem to="/experience" icon={Briefcase} label="Experience" />
            <NavItem to="/projects" icon={FolderGit2} label="Projects" />
            <NavItem to="/achievements" icon={Trophy} label="Achievements" />
          </nav>

          <div className="p-4 border-t border-slate-800">
            <button
              onClick={logout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-md font-mono text-sm text-slate-600 hover:text-pink-400 hover:bg-pink-500/5 hover:border-pink-500/20 border border-transparent transition-all"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto no-scrollbar">
          <div className="max-w-5xl mx-auto p-8">
            <Routes>
              <Route path="/profile" element={<ProfileEditor />} />
              <Route path="/experience" element={<ExperienceEditor />} />
              <Route path="/projects" element={<ProjectsEditor />} />
              <Route path="/achievements" element={<AchievementsEditor />} />
              <Route path="*" element={<Navigate to="/profile" />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
