import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMode } from '../context/ModeContext';
import { fetchProfile, fetchExperience, fetchProjects, fetchSkills, fetchAchievements } from '../api';
import { VirtualFileSystem } from './vfs';
import { API_URL } from '../api';
import type { VFSNode } from './vfs';
import { Loader2 } from 'lucide-react';

// Levenshtein distance for "did you mean"
const levenshtein = (a: string, b: string) => {
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) matrix[i][j] = matrix[i - 1][j - 1];
      else matrix[i][j] = Math.min(matrix[i - 1][j - 1], matrix[i][j - 1], matrix[i - 1][j]) + 1;
    }
  }
  return matrix[a.length][b.length];
};

const AVAILABLE_COMMANDS = ['ls', 'cd', 'cat', 'pwd', 'clear', 'help', 'whoami', 'history', 'man', 'exit', 'gui'];

const CLILayout: React.FC = () => {
  const { toggleMode } = useMode();
  const navigate = useNavigate();
  const location = useLocation();

  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{ command?: string; output: React.ReactNode; path: string }[]>([]);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [vfs, setVfs] = useState<VirtualFileSystem | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => { 
    mountedRef.current = true;
    return () => { mountedRef.current = false; }; 
  }, []);

  // Sync current path from URL
  const currentPath = useMemo(() => {
    let p = location.pathname.replace('/cli', '');
    if (p.startsWith('/')) p = p.substring(1);
    if (!p) return '~';
    // Always normalize to start with ~
    if (!p.startsWith('~')) p = '~/' + p;
    return p;
  }, [location]);

  useEffect(() => {
    let cancelled = false;
    // Load VFS data
    Promise.all([
      fetchProfile().catch(() => null),
      fetchExperience().catch(() => []),
      fetchProjects().catch(() => []),
      fetchSkills().catch(() => []),
      fetchAchievements().catch(() => [])
    ]).then(([p, e, pr, s, ach]) => {
      if (cancelled) return;
      setVfs(new VirtualFileSystem(p, e, pr, s, ach));
      setLoading(false);
      
      // Load stored command history (capped at 500)
      const savedHist = localStorage.getItem('kravlone_cli_history');
      if (savedHist) {
        try {
          setCmdHistory(JSON.parse(savedHist).slice(-500));
        } catch(e) {}
      }

      setHistory([{ 
        output: 'Welcome to Kravlone CLI v1.0.0.\nType "help" for a list of commands, or "gui" to switch to graphical mode.',
        path: currentPath
      }]);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    // Scroll to bottom on new output
    if (containerRef.current) {
      window.scrollTo(0, document.body.scrollHeight);
    }
  }, [history]);

  useEffect(() => {
    // Focus input on mount and clicks
    const handleGlobalClick = () => inputRef.current?.focus();
    window.addEventListener('click', handleGlobalClick);
    inputRef.current?.focus();
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const changeDir = (target: string) => {
    navigate(`/cli${target.startsWith('~') ? target.substring(1) : '/' + target}`);
  };

  const handleCommand = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'c' && e.ctrlKey) {
      // Cancel input
      setHistory(prev => [...prev, { command: input, output: '^C', path: currentPath }]);
      setInput('');
      return;
    }
    
    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setHistory([]);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length > 0 && historyIdx < cmdHistory.length - 1) {
        const nextIdx = historyIdx + 1;
        setHistoryIdx(nextIdx);
        setInput(cmdHistory[cmdHistory.length - 1 - nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        setInput(cmdHistory[cmdHistory.length - 1 - nextIdx]);
      } else if (historyIdx === 0) {
        setHistoryIdx(-1);
        setInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (!vfs) return;

      const words = input.split(' ');
      const lastWord = words[words.length - 1];
      const cmd = words[0];
      
      if (words.length === 1) {
        // Autocomplete command
        const matches = AVAILABLE_COMMANDS.filter(c => c.startsWith(lastWord));
        if (matches.length === 1) {
          setInput(matches[0] + ' ');
        } else if (matches.length > 1) {
          setHistory(prev => [...prev, { command: input, output: matches.join('  '), path: currentPath }]);
        }
      } else {
        // Autocomplete path
        const isDirOnly = cmd === 'cd';
        const parts = lastWord.split('/');
        const partialName = parts.pop() || '';
        const basePath = parts.length > 0 ? parts.join('/') : '.';
        
        const res = vfs.resolvePath(currentPath, basePath);
        if (!res.error && res.node && res.node.type === 'dir' && res.node.children) {
          const childrenNames = Object.keys(res.node.children).filter(name => {
             if (!name.startsWith(partialName)) return false;
             if (isDirOnly && res.node!.children![name].type !== 'dir') return false;
             return true;
          });

          if (childrenNames.length === 1) {
            const newLastWord = (parts.length > 0 ? parts.join('/') + '/' : '') + childrenNames[0] + (res.node.children[childrenNames[0]].type === 'dir' ? '/' : '');
            words[words.length - 1] = newLastWord;
            setInput(words.join(' '));
          } else if (childrenNames.length > 1) {
             setHistory(prev => [...prev, { command: input, output: childrenNames.join('  '), path: currentPath }]);
          }
        }
      }
    } else if (e.key === 'Enter') {
      const rawCmd = input.trim();
      setInput('');
      setHistoryIdx(-1);
      
      if (!rawCmd) {
        setHistory(prev => [...prev, { command: '', output: '', path: currentPath }]);
        return;
      }

      // Update history (capped at 500)
      const newCmdHistory = [...cmdHistory, rawCmd].slice(-500);
      setCmdHistory(newCmdHistory);
      localStorage.setItem('kravlone_cli_history', JSON.stringify(newCmdHistory));

      // Tokenize
      const args = rawCmd.match(/[^\s"']+|"([^"]*)"|'([^']*)'/g)?.map(arg => arg.replace(/^['"]|['"]$/g, '')) || [];
      const cmd = args[0].toLowerCase();
      
      let output: React.ReactNode = '';
      let newPath = currentPath;

      if (!vfs) {
        output = 'System is loading... please wait.';
      } else {
        switch (cmd) {
          case 'gui':
          case 'exit':
            toggleMode();
            return;
            

          case 'chat':
            const msg = args.slice(1).join(" ");
            if (!msg) {
              output = "Usage: chat <your question>";
              break;
            }
            output = <div className="text-cyan-400 animate-pulse">Communicating with Agent...</div>;
            setHistory(prev => [...prev, { command: rawCmd, output, path: currentPath }]);
            setInput('');
            try {
              const res = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  message: msg,
                  history: history
                    .filter(h => h.command.startsWith('chat '))
                    .map(h => ({ role: 'user', content: h.command.replace('chat ', '') }))
                    .slice(-5) 
                })
              });
              const data = await res.json();
              if (mountedRef.current) {
                setHistory(prev => {
                  const newHist = [...prev];
                  newHist[newHist.length - 1].output = <div className="text-pink-400 font-bold whitespace-pre-wrap">{data.reply}</div>;
                  return newHist;
                });
              }
            } catch (err) {
              if (mountedRef.current) {
                setHistory(prev => {
                  const newHist = [...prev];
                  newHist[newHist.length - 1].output = <div className="text-red-500">Error connecting to agent.</div>;
                  return newHist;
                });
              }
            }
            return;

          case 'clear':
            setHistory([]);
            return;
            
          case 'pwd':
            output = currentPath;
            break;
            
          case 'whoami':
            output = 'guest (but you should totally hire me!)';
            break;
            
          case 'history':
            output = newCmdHistory.map((c, i) => ` ${i + 1}  ${c}`).join('\n');
            break;
            
          case 'help':
            output = (
              <div className="space-y-1">
                <div><span className="text-blue-400">ls [dir]</span> - List directory contents</div>
                <div><span className="text-blue-400">cd &lt;dir&gt;</span> - Change directory</div>
                <div><span className="text-blue-400">cat &lt;file&gt;</span> - Print file contents</div>
                <div><span className="text-blue-400">pwd</span> - Print working directory</div>
                <div><span className="text-blue-400">clear</span> - Clear terminal</div>
                <div><span className="text-blue-400">whoami</span> - Print current user</div>
                <div><span className="text-blue-400">history</span> - Show command history</div>
                <div><span className="text-blue-400">chat &lt;msg&gt;</span> - Talk to the AI Agent</div>
                <div><span className="text-blue-400">gui / exit</span> - Return to graphical UI</div>
              </div>
            );
            break;
            
          case 'man':
            const topic = args[1];
            if (!topic) output = 'What manual page do you want?';
            else if (AVAILABLE_COMMANDS.includes(topic)) output = `No manual entry for ${topic}, but it does exactly what you'd expect.`;
            else output = `No manual entry for ${topic}`;
            break;

          case 'cd':
            const targetDir = args[1] || '~';
            const cdRes = vfs.resolvePath(currentPath, targetDir);
            if (cdRes.error) {
              output = `cd: ${cdRes.error}`;
            } else if (cdRes.node?.type !== 'dir') {
              output = `cd: not a directory: ${targetDir}`;
            } else {
              newPath = cdRes.path!;
              changeDir(newPath);
            }
            break;
            
          case 'ls':
            let showHidden = false;
            let showDetails = false;
            
            const flags = args.filter(a => a.startsWith('-') && a !== '-');
            for (const flag of flags) {
              if (flag.includes('a')) showHidden = true;
              if (flag.includes('l')) showDetails = true;
            }
            
            const targetLs = args.filter(a => !a.startsWith('-'))[1] || '.';
            const lsRes = vfs.resolvePath(currentPath, targetLs);
            
            if (lsRes.error) {
              output = `ls: ${lsRes.error}`;
            } else if (lsRes.node?.type === 'file') {
              output = lsRes.node.name;
            } else if (lsRes.node?.children) {
              const allChildren = Object.values(lsRes.node.children);
              const children = showHidden ? allChildren : allChildren.filter(c => !c.name.startsWith('.'));
              
              if (showDetails) {
                output = (
                  <div className="space-y-1">
                    {showHidden && <div>drwxr-xr-x  guest  staff  .</div>}
                    {showHidden && <div>drwxr-xr-x  guest  staff  ..</div>}
                    {children.map(c => (
                      <div key={c.name} className={c.type === 'dir' ? 'text-blue-400' : 'text-slate-300'}>
                        {c.type === 'dir' ? 'd' : '-'}rw-r--r--  guest  staff  {c.name}
                      </div>
                    ))}
                  </div>
                );
              } else {
                output = (
                  <div className="flex flex-wrap gap-4">
                    {children.map(c => (
                      <span key={c.name} className={c.type === 'dir' ? 'text-blue-400' : 'text-slate-300'}>
                        {c.name}{c.type === 'dir' ? '/' : ''}
                      </span>
                    ))}
                  </div>
                );
              }
            }
            break;
            
          case 'cat':
            const targetFile = args[1];
            if (!targetFile) {
              output = 'cat: missing file operand';
              break;
            }
            
            const catRes = vfs.resolvePath(currentPath, targetFile);
            if (catRes.error) {
              output = `cat: ${catRes.error}`;
            } else if (catRes.node?.type === 'dir') {
              output = `cat: ${targetFile}: Is a directory`;
            } else {
              output = catRes.node?.content || '';
            }
            break;
            
          case 'sudo':
            if (args[1] === 'hire-me') {
              output = <div className="text-yellow-400 font-bold">ACCESS GRANTED. Initiating hire protocols... Send an email to b.sai.sannidh@gmail.com!</div>;
            } else {
              output = `${args[1] || ''}: command not found`;
            }
            break;

          default:
            // Levenshtein check
            let closest = '';
            let minDistance = Infinity;
            AVAILABLE_COMMANDS.forEach(c => {
              const d = levenshtein(cmd, c);
              if (d < minDistance) {
                minDistance = d;
                closest = c;
              }
            });
            
            output = (
              <div>
                <div>command not found: {cmd}</div>
                {minDistance <= 2 && <div className="text-slate-400 mt-1">Did you mean <span className="text-blue-400 font-bold">{closest}</span>?</div>}
              </div>
            );
            break;
        }
      }

      setHistory(prev => [...prev, { command: rawCmd, output, path: currentPath }]);
    }
  };

  return (
    <div 
      className="min-h-screen bg-[#0d1117] text-slate-300 p-6 font-mono text-sm sm:text-base cursor-text selection:bg-slate-700 pb-32"
      ref={containerRef}
    >
      <div className="w-full">
        {loading && (
          <div className="flex items-center gap-3 text-slate-400 mb-6">
            <Loader2 className="animate-spin" size={16} />
            Establishing secure shell connection to backend...
          </div>
        )}
        
        {!loading && history.map((item, i) => (
          <div key={i} className="mb-4">
            {item.command !== undefined && (
              <div className="flex flex-wrap gap-2 text-slate-400 mb-1">
                <span className="text-green-400 font-bold">guest@kravlone</span>
                <span className="text-purple-400">in</span>
                <span className="text-blue-400 font-bold">{item.path}</span>
                <span className="text-slate-300">❯</span>
                <span className="text-slate-100">{item.command}</span>
              </div>
            )}
            <div className="whitespace-pre-wrap break-words leading-relaxed">{item.output}</div>
          </div>
        ))}
        
        {!loading && (
          <div className="flex flex-wrap gap-2 text-slate-400 items-center">
            <span className="text-green-400 font-bold">guest@kravlone</span>
            <span className="text-purple-400">in</span>
            <span className="text-blue-400 font-bold">{currentPath}</span>
            <span className="text-slate-300">❯</span>
            <input 
              ref={inputRef}
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleCommand}
              className="flex-1 min-w-[200px] bg-transparent border-none outline-none text-slate-100 font-mono caret-slate-100"
              autoFocus
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CLILayout;
