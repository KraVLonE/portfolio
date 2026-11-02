import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { User, Briefcase, FolderGit2, LogOut, Terminal, Trophy, Layers, MessageSquare, PenSquare, Tags, MessagesSquare, Image, Menu, X } from 'lucide-react';
import Login from './pages/Login';
import ProfileEditor from './pages/ProfileEditor';
import ExperienceEditor from './pages/ExperienceEditor';
import ProjectsEditor from './pages/ProjectsEditor';
import AchievementsEditor from './pages/AchievementsEditor';
import SkillsEditor from './pages/SkillsEditor';
import ChatLogsViewer from './pages/ChatLogsViewer';
import BlogPosts from './pages/blog/BlogPosts';
import PostEditor from './pages/blog/PostEditor';
import TagManager from './pages/blog/TagManager';
import CommentModeration from './pages/blog/CommentModeration';
import MediaLibrary from './pages/blog/MediaLibrary';
import { COMMENTS_CHANGED, blogApi } from './pages/blog/blogApi';

function App() {
  const [token, setToken] = useState(localStorage.getItem('adminToken'));
  const [pendingComments, setPendingComments] = useState(0);
  const [navOpen, setNavOpen] = useState(false); // mobile sidebar

  // BLG-35: pending-comments badge; refreshes every minute and after moderation actions.
  useEffect(() => {
    if (!token) return;
    const refresh = () => blogApi.pendingCount().then(setPendingComments).catch(() => {});
    refresh();
    const t = setInterval(refresh, 60_000);
    window.addEventListener(COMMENTS_CHANGED, refresh);
    return () => { clearInterval(t); window.removeEventListener(COMMENTS_CHANGED, refresh); };
  }, [token]);

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

  const NavItem = ({ to, icon: Icon, label, badge, end }: { to: string; icon: React.ComponentType<any>; label: string; badge?: number; end?: boolean }) => (
    <NavLink
      to={to}
      end={end}
      onClick={() => setNavOpen(false)}
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
      {!!badge && (
        <span className="ml-auto rounded-full bg-pink-500/20 px-2 py-0.5 text-[10px] text-pink-300" aria-label={`${badge} pending`}>
          {badge}
        </span>
      )}
    </NavLink>
  );

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-slate-950 font-sans selection:bg-cyan-500/30">
        {/* Sidebar */}
        {/* Mobile: sidebar slides over content; md+: static column */}
        {navOpen && <div className="fixed inset-0 z-30 bg-slate-950/70 md:hidden" onClick={() => setNavOpen(false)} aria-hidden="true" />}
        <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-950 border-r border-cyan-500/20 flex flex-col transition-transform md:static md:translate-x-0 ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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
            <NavItem to="/skills" icon={Layers} label="Skills" />

            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-600 mb-3 mt-6 px-4">// CONTENT</p>
            <NavItem to="/blog" icon={PenSquare} label="Blog" end />
            <NavItem to="/blog/tags" icon={Tags} label="Tags" />
            <NavItem to="/blog/comments" icon={MessagesSquare} label="Comments" badge={pendingComments} />
            <NavItem to="/blog/media" icon={Image} label="Media" />

            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-600 mb-3 mt-6 px-4">// ANALYTICS</p>
            <NavItem to="/chat-logs" icon={MessageSquare} label="Chat Logs" />
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
        <main className="flex-1 min-w-0 overflow-y-auto no-scrollbar">
          <div className="md:hidden sticky top-0 z-20 flex items-center gap-3 border-b border-slate-800 bg-slate-950/90 backdrop-blur px-4 py-3">
            <button onClick={() => setNavOpen((o) => !o)} aria-label={navOpen ? 'Close menu' : 'Open menu'} aria-expanded={navOpen}
              className="p-1.5 rounded text-slate-400 hover:text-cyan-400 cursor-pointer">
              {navOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span className="font-bold text-white">Admin<span className="text-cyan-400">Panel</span></span>
            {pendingComments > 0 && <span className="ml-auto rounded-full bg-pink-500/20 px-2 py-0.5 text-[10px] text-pink-300">{pendingComments} pending</span>}
          </div>
          <div className="max-w-5xl mx-auto p-4 md:p-8">
            <Routes>
              <Route path="/profile" element={<ProfileEditor />} />
              <Route path="/experience" element={<ExperienceEditor />} />
              <Route path="/projects" element={<ProjectsEditor />} />
              <Route path="/achievements" element={<AchievementsEditor />} />
              <Route path="/skills" element={<SkillsEditor />} />
              <Route path="/chat-logs" element={<ChatLogsViewer />} />
              <Route path="/blog" element={<BlogPosts />} />
              <Route path="/blog/new" element={<PostEditor />} />
              <Route path="/blog/tags" element={<TagManager />} />
              <Route path="/blog/comments" element={<CommentModeration />} />
              <Route path="/blog/media" element={<MediaLibrary />} />
              <Route path="/blog/:id" element={<PostEditor />} />
              <Route path="*" element={<Navigate to="/profile" />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
