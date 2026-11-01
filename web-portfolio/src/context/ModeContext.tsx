import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Mode = 'gui' | 'cli';

interface ModeContextType {
  mode: Mode;
  toggleMode: () => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export const ModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Mode is derived from the URL on load (not persisted): "/" always opens GUI,
  // while a direct /cli/... link or refresh inside the CLI stays in CLI.
  const [mode, setMode] = useState<Mode>(() =>
    window.location.pathname.startsWith('/cli') ? 'cli' : 'gui'
  );

  useEffect(() => {
    try { localStorage.removeItem('portfolio-mode'); } catch { /* storage unavailable */ }
  }, []);

  const toggleMode = () => {
    setMode((prev) => (prev === 'gui' ? 'cli' : 'gui'));
  };

  return (
    <ModeContext.Provider value={{ mode, toggleMode }}>
      {children}
    </ModeContext.Provider>
  );
};

export const useMode = () => {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
};
