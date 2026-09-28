import React, { useEffect, useState } from 'react';
import { useMode } from '../context/ModeContext';
import { Terminal, Download, Mail, ExternalLink, GitBranch } from 'lucide-react';
import { GithubIcon } from './icons';
import { fetchProfile, fetchExperience, fetchProjects, fetchSkills, fetchGithubStats, fetchAchievements } from '../api';
import { CommandPalette } from './CommandPalette';
import { FadeIn } from './FadeIn';
import { Typewriter } from './Typewriter';
import { ChatWidget } from './ChatWidget';

const GUILayout: React.FC = () => {
  const { toggleMode } = useMode();
  const [profile, setProfile] = useState<any>(null);
  const [experience, setExperience] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [githubStats, setGithubStats] = useState<any>(null);
  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchProfile().catch(() => null),
      fetchExperience().catch(() => []),
      fetchProjects().catch(() => []),
      fetchSkills().catch(() => []),
      fetchGithubStats().catch(() => null),
      fetchAchievements().catch(() => [])
    ]).then(([p, e, pr, s, gh, ach]) => {
      if (cancelled) return;
      setProfile(p);
      setExperience(e);
      setProjects(pr);
      setSkills(s);
      setGithubStats(gh);
      setAchievements(ach);
    });
    return () => { cancelled = true; };
  }, []);

  const skillsByCategory = skills.reduce((acc: any, skill: any) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill.name);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-cyan-500/30">
      <CommandPalette profile={profile} />
      <nav className="fixed top-0 w-full p-4 flex justify-between items-center bg-slate-950/80 backdrop-blur-md z-50 border-b border-cyan-500/20">
        <div className="text-xl font-bold tracking-tight text-white">{profile?.name}</div>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline-flex text-xs px-2 py-1 bg-slate-900 text-cyan-400 rounded-sm border border-cyan-500/20 font-mono tracking-widest">Cmd + K</span>
          <button
            onClick={toggleMode}
            className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md transition-all text-sm font-medium border border-slate-800 hover:border-cyan-500/50"
          >
            <Terminal size={16} className="text-cyan-400" />
            CLI Mode
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto pt-28 px-6 pb-24">
        {/* Hero Section */}
        <FadeIn>
        <section className="mb-24">
          <h1 className="text-5xl font-extrabold mb-4 text-white tracking-tight">
            Hello, I'm <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">{profile ? profile.name.split(' ')[1] : '...'}</span>
          </h1>
          <div className="text-2xl font-mono text-cyan-400 mb-6 h-8">
            <Typewriter strings={['Full Stack Developer', 'GenAI Engineer']} />
          </div>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl leading-relaxed">
            {profile?.tagline || 'Software Engineer building production AI applications.'}
          </p>
          <div className="flex flex-wrap gap-4 font-medium">
            <a href={profile?.resume_url || "#"} target="_blank" className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md transition-colors">
              <Download size={18} /> Resume
            </a>
            <a href="#contact" className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-pink-400 rounded-md transition-colors border border-pink-500/30 hover:border-pink-500/60">
              <Mail size={18} /> Contact Me
            </a>
            {profile?.github_url && (
              <a href={profile.github_url} target="_blank" className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md transition-colors border border-slate-800 hover:border-slate-600">
                <GitBranch size={18} /> GitHub
              </a>
            )}
          </div>
        </section>
        </FadeIn>

        {/* Experience Section */}
        <FadeIn>
        <section id="experience" className="mb-24">
          <h2 className="text-2xl font-bold mb-8 border-b border-slate-800 pb-2 text-white flex items-center gap-2">
            Experience <span className="text-cyan-500 text-sm font-mono tracking-widest font-normal">// LOG</span>
          </h2>
          {experience.length === 0 ? (
            <div className="animate-pulse bg-slate-900 h-32 rounded-lg border border-slate-800 mb-4"></div>
          ) : (
            <div className="space-y-12">
              {experience.map((exp: any) => (
                <div key={exp.id} className="relative pl-6 border-l border-slate-800 hover:border-cyan-500/50 transition-colors">
                  <div className="absolute w-2 h-2 bg-pink-500 rounded-none -left-[4.5px] top-2 shadow-[0_0_8px_rgba(236,72,153,0.8)]"></div>
                  <h3 className="text-xl font-semibold text-white">{exp.role}</h3>
                  <div className="text-cyan-400 mb-4 font-mono text-sm">{exp.company}</div>
                  <ul className="list-disc pl-5 space-y-2 text-slate-300 mb-5 marker:text-slate-600">
                    {exp.pointers.map((ptr: string, i: number) => <li key={i} className="leading-relaxed">{ptr}</li>)}
                  </ul>
                  <div className="flex flex-wrap gap-2">
                    {exp.tech_stack.map((tech: string) => (
                      <span key={tech} className="px-2.5 py-1 bg-slate-900 text-slate-400 border border-slate-800 text-xs rounded-md font-mono">{tech}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        </FadeIn>

        {/* Projects Section */}
        <FadeIn>
        <section id="projects" className="mb-24">
          <h2 className="text-2xl font-bold mb-8 border-b border-slate-800 pb-2 text-white flex items-center gap-2">
            Projects <span className="text-pink-500 text-sm font-mono tracking-widest font-normal">// EXE</span>
          </h2>
          {projects.length === 0 ? (
            <div className="animate-pulse bg-slate-900 h-48 rounded-lg border border-slate-800 mb-4"></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.map((proj: any) => (
                <div key={proj.id} className="bg-slate-900/50 p-6 rounded-lg border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col h-full group hover:shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                  <div className="flex justify-between items-start mb-3 gap-4">
                    <h3 className="text-xl font-semibold text-white group-hover:text-cyan-400 transition-colors break-words">{proj.title}</h3>
                    <div className="flex items-center gap-3 shrink-0 mt-1">
                      {proj.links?.repo && (
                        <a href={proj.links.repo} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-white transition-colors" title="GitHub Repository">
                          <GithubIcon size={18}/>
                        </a>
                      )}
                      {proj.links?.live_demo && (
                        <a href={proj.links.live_demo} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-pink-400 transition-colors" title="Live Demo">
                          <ExternalLink size={18}/>
                        </a>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-400 mb-6 flex-grow leading-relaxed">{proj.one_liner}</p>
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {proj.tech_stack.map((tech: string) => (
                      <span key={tech} className="px-2 py-1 bg-slate-950 text-pink-300/80 text-xs font-mono border border-slate-800 rounded-md">{tech}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        </FadeIn>

        {/* Skills Section */}
        <FadeIn>
        <section id="skills" className="mb-24">
          <h2 className="text-2xl font-bold mb-8 border-b border-slate-800 pb-2 text-white flex items-center gap-2">
            Skills <span className="text-yellow-400 text-sm font-mono tracking-widest font-normal">// SYS</span>
          </h2>
          {skills.length === 0 ? (
            <div className="animate-pulse bg-slate-900 h-32 rounded-lg border border-slate-800 mb-4"></div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {Object.entries(skillsByCategory).map(([category, items]: [string, any]) => (
                 <div key={category} className="bg-slate-900/30 p-5 rounded-lg border border-slate-800 hover:border-yellow-400/30 transition-colors">
                   <h3 className="text-base font-semibold mb-4 text-slate-200">{category}</h3>
                   <div className="flex flex-wrap gap-2">
                     {items.map((skill: string) => (
                       <span key={skill} className="px-2.5 py-1 bg-slate-950 text-slate-300 text-xs font-mono border border-slate-800 rounded-md">{skill}</span>
                     ))}
                   </div>
                 </div>
               ))}
             </div>
          )}
        </section>
        </FadeIn>

        {/* Stats & Profiles Section */}
        <FadeIn>
        <section id="stats" className="mb-24">
          <h2 className="text-2xl font-bold mb-8 border-b border-slate-800 pb-2 text-white flex items-center gap-2">
            Coding Profiles <span className="text-purple-400 text-sm font-mono tracking-widest font-normal">// NET</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 flex flex-col items-center hover:border-cyan-500/30 transition-colors">
              {/*<h3 className="text-sm font-semibold mb-3 text-slate-400 font-mono tracking-wider">LeetCode</h3>*/}
              <img src={profile?.leetcode_card_url?.replace(/%22$/, '') || "https://leetcard.jacoblin.cool/kravlone?theme=dark&font=Inter"} alt="Leetcode Stats" className="w-full rounded-md"/>
            </div>
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 flex flex-col items-center hover:border-pink-500/30 transition-colors">
              {/*<h3 className="text-sm font-semibold mb-3 text-slate-400 font-mono tracking-wider">Codeforces</h3>*/}
              <img
                src={profile?.codeforces_card_url?.replace(/\/api\?username=([^&]+)/, '/api/$1?').replace(/\?&/, '?') || "https://codeforces-readme-stats.vercel.app/api/card?username=kravlone&theme=dark"}
                alt="Codeforces Stats"
                className="w-full rounded-md"
              />
            </div>
          </div>

          {githubStats && (
            <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-800">
               <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-white"><GitBranch size={20} className="text-cyan-500"/> GitHub Overview</h3>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                 <div className="bg-slate-950 p-4 rounded-md border border-slate-800 text-center">
                   <div className="text-2xl font-bold text-cyan-400">{githubStats.total_commits}</div>
                   <div className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-widest">Commits</div>
                 </div>
                 <div className="bg-slate-950 p-4 rounded-md border border-slate-800 text-center">
                   <div className="text-2xl font-bold text-pink-400">{githubStats.total_prs}</div>
                   <div className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-widest">PRs</div>
                 </div>
                 <div className="bg-slate-950 p-4 rounded-md border border-slate-800 text-center">
                   <div className="text-2xl font-bold text-yellow-400">{githubStats.total_repos}</div>
                   <div className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-widest">Repos</div>
                 </div>
                 <div className="bg-slate-950 p-4 rounded-md border border-slate-800 text-center flex flex-col justify-center items-center">
                   <div className="text-[10px] text-slate-500 font-mono mb-2 uppercase tracking-widest">Languages</div>
                   <div className="flex gap-1.5 flex-wrap justify-center">
                     {githubStats.top_languages.slice(0, 3).map((l: any) => (
                       <span key={l.name} className="text-[9px] px-1.5 py-0.5 bg-slate-900 text-slate-300 font-mono rounded border border-slate-700">{l.name}</span>
                     ))}
                   </div>
                 </div>
               </div>
            </div>
          )}
        </section>
        </FadeIn>

        {/* Achievements Section */}
        {achievements.length > 0 && (
          <FadeIn>
          <section id="achievements" className="mb-24">
            <h2 className="text-2xl font-bold mb-8 border-b border-slate-800 pb-2 text-white flex items-center gap-2">
              Achievements <span className="text-cyan-500 text-sm font-mono tracking-widest font-normal">// MILESTONES</span>
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {achievements.map((ach: any) => (
                <div key={ach.id} className="bg-slate-900/30 p-6 rounded-lg border border-slate-800 hover:border-cyan-500/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-white text-lg">{ach.title}</h3>
                  </div>
                  <p className="text-slate-400 text-sm">{ach.description}</p>
                </div>
              ))}
            </div>
          </section>
          </FadeIn>
        )}

        {/* Currently Exploring Section */}
        <FadeIn>
        <section id="exploring" className="mb-24">
          <h2 className="text-2xl font-bold mb-8 border-b border-slate-800 pb-2 text-white flex items-center gap-2">
            Currently Exploring <span className="text-cyan-500 text-sm font-mono tracking-widest font-normal">// R&D</span>
          </h2>
          <div className="bg-slate-900/30 p-8 rounded-lg border border-slate-800 max-w-4xl mx-auto flex items-start gap-6">
            <div className="hidden md:flex bg-slate-900 p-3 rounded-md text-cyan-500 border border-slate-800 shrink-0">
               <Terminal size={24} />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3 text-white">Deepening AI & Backend Architectures</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Right now, I'm actively exploring advanced Retrieval-Augmented Generation (RAG) paradigms, agentic frameworks like LangGraph, and optimizing high-performance Postgres schemas for complex natural language queries. I'm always looking for opportunities to build resilient, AI-powered enterprise tools.
              </p>
            </div>
          </div>
        </section>
        </FadeIn>

        {/* Contact Section */}
        <FadeIn>
        <section id="contact" className="mb-24">
          <h2 className="text-2xl font-bold mb-8 border-b border-slate-800 pb-2 text-white flex items-center gap-2">
            Get In Touch <span className="text-pink-500 text-sm font-mono tracking-widest font-normal">// MSG</span>
          </h2>
          <div className="bg-slate-900/50 p-8 rounded-lg border border-slate-800 max-w-2xl mx-auto">
            <form className="space-y-5" onSubmit={async (e: any) => {
              e.preventDefault();
              setFormStatus('loading');
              const formData = new FormData(e.target);
              const name = formData.get('name') as string;
              const email = formData.get('email') as string;
              const message = formData.get('message') as string;
              try {
                const { submitContact } = await import('../api');
                await submitContact({ name, email, message });
                setFormStatus('success');
                e.target.reset();
              } catch(err) {
                setFormStatus('error');
              }
            }}>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 font-mono">Name</label>
                <input name="name" type="text" className="w-full bg-slate-950 border border-slate-800 rounded-md p-3 text-slate-100 focus:outline-none focus:border-cyan-500/50 transition-colors" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 font-mono">Email</label>
                <input name="email" type="email" className="w-full bg-slate-950 border border-slate-800 rounded-md p-3 text-slate-100 focus:outline-none focus:border-cyan-500/50 transition-colors" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 font-mono">Message</label>
                <textarea name="message" rows={4} className="w-full bg-slate-950 border border-slate-800 rounded-md p-3 text-slate-100 focus:outline-none focus:border-cyan-500/50 transition-colors resize-none" required></textarea>
              </div>
              <button type="submit" disabled={formStatus === 'loading'} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-md font-medium transition-colors flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(6,182,212,0.2)] disabled:shadow-none cursor-pointer disabled:cursor-not-allowed">
                <Mail size={18} /> {formStatus === 'loading' ? 'Transmitting...' : 'Send Message'}
              </button>
            </form>
          </div>
        </section>
        </FadeIn>


        {formStatus === 'success' && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-cyan-500/50 rounded-lg p-6 max-w-sm w-full text-center shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col items-center animate-in fade-in zoom-in duration-200">
               <div className="w-12 h-12 bg-cyan-500/10 rounded-full flex items-center justify-center mb-4 text-cyan-400">
                 <Mail size={24} />
               </div>
               <h3 className="text-xl font-bold text-slate-100 mb-2">Message Sent!</h3>
               <p className="text-slate-400 text-sm mb-6">Your transmission has been encrypted and delivered securely.</p>
               <button onClick={() => setFormStatus('idle')} className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md font-mono text-sm transition-colors cursor-pointer">
                 Acknowledge
               </button>
            </div>
          </div>
        )}

        {formStatus === 'error' && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-pink-500/50 rounded-lg p-6 max-w-sm w-full text-center shadow-[0_0_30px_rgba(236,72,153,0.15)] flex flex-col items-center animate-in fade-in zoom-in duration-200">
               <div className="w-12 h-12 bg-pink-500/10 rounded-full flex items-center justify-center mb-4 text-pink-400">
                 <Mail size={24} />
               </div>
               <h3 className="text-xl font-bold text-slate-100 mb-2">Transmission Failed</h3>
               <p className="text-slate-400 text-sm mb-6">The connection was lost. Please check your network and try again.</p>
               <button onClick={() => setFormStatus('idle')} className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md font-mono text-sm transition-colors cursor-pointer">
                 Retry
               </button>
            </div>
          </div>
        )}

      </main>
      <ChatWidget />
    </div>
  );
};

export default GUILayout;
