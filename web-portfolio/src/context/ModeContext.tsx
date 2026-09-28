import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Mode = 'gui' | 'cli';

interface ModeContextType {
  mode: Mode;
  toggleMode: () => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export const ModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<Mode>(() => {
    const saved = localStorage.getItem('portfolio-mode');
    return (saved === 'cli' || saved === 'gui') ? saved : 'gui';
  });

  useEffect(() => {
    localStorage.setItem('portfolio-mode', mode);
  }, [mode]);

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
