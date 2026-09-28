import React, { useState, useEffect, useRef } from 'react';
import { useMode } from '../context/ModeContext';
import { Terminal, Code, Briefcase, FileText, Mail, GitBranch, Download } from 'lucide-react';

export const CommandPalette: React.FC<{ profile: any }> = ({ profile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { toggleMode } = useMode();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const commands = [
    { id: 'experience', name: 'Go to Experience', icon: <Briefcase size={16}/>, action: () => scrollTo('experience') },
    { id: 'projects', name: 'Go to Projects', icon: <Code size={16}/>, action: () => scrollTo('projects') },
    { id: 'skills', name: 'Go to Skills', icon: <Code size={16}/>, action: () => scrollTo('skills') },
    { id: 'stats', name: 'Go to Coding Profiles & Stats', icon: <GitBranch size={16}/>, action: () => scrollTo('stats') },
    { id: 'contact', name: 'Get In Touch (Contact)', icon: <Mail size={16}/>, action: () => scrollTo('contact') },
    { id: 'resume', name: 'Download Resume', icon: <Download size={16}/>, action: () => { if (profile?.resume_url) window.open(profile.resume_url, '_blank'); setIsOpen(false); } },
    { id: 'cli', name: 'Switch to CLI Mode', icon: <Terminal size={16}/>, action: () => { toggleMode(); setIsOpen(false); } }
  ];

  const filteredCommands = commands.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Only handle Cmd+K globally to open. No ESC handling here!
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Sync isOpen state with native dialog open/close methods
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    }
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    setIsOpen(false);
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={() => setIsOpen(false)}
      onClick={(e) => {
        // Close if clicking directly on the dialog backdrop
        if (e.target === dialogRef.current) {
          setIsOpen(false);
        }
      }}
      className="backdrop:bg-slate-950/80 backdrop:backdrop-blur-md bg-transparent p-0 m-0 fixed inset-0 hidden open:flex items-start justify-center pt-[15vh] px-4 w-full h-full max-w-none max-h-none"
    >
      <div className="relative w-full max-w-xl bg-slate-900 border border-cyan-500/30 rounded-lg shadow-2xl overflow-hidden flex flex-col m-auto mt-[15vh]">
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <Terminal size={18} className="text-cyan-400" />
          <input 
            autoFocus
            type="text" 
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            placeholder="Type a command or search..." 
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            className="w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-500 font-mono text-sm"
          />
          <button 
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-xs text-slate-500 bg-slate-800 hover:bg-slate-700 hover:text-slate-300 px-2 py-1 rounded border border-slate-700 font-mono transition-colors cursor-pointer"
          >
            ESC
          </button>
        </div>
        
        <div id="command-palette-list" role="listbox" className="max-h-80 overflow-y-auto p-2 no-scrollbar">
          {filteredCommands.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm font-mono">No commands found.</div>
          ) : (
            filteredCommands.map((cmd, i) => (
              <button 
                key={cmd.id} 
                type="button"
                onClick={cmd.action}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors text-left text-sm cursor-pointer ${
                  i === selectedIndex ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'hover:bg-slate-800 text-slate-300 border border-transparent'
                }`}
              >
                {cmd.icon} {cmd.name}
              </button>
            ))
          )}
        </div>
      </div>
    </dialog>
  );
};
