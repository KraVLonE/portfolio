import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ModeProvider, useMode } from './context/ModeContext';
import GUILayout from './components/GUILayout';
import CLILayout from './cli/CLILayout';

const AppContent: React.FC = () => {
  const { mode } = useMode();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (mode === 'cli' && !location.pathname.startsWith('/cli')) {
      navigate('/cli/~');
    } else if (mode === 'gui' && location.pathname.startsWith('/cli')) {
      navigate('/');
    }
  }, [mode, navigate, location]);

  if (mode === 'cli' || location.pathname.startsWith('/cli')) {
    return <CLILayout />;
  }

  return <GUILayout />;
};

function App() {
  return (
    <ModeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </BrowserRouter>
    </ModeProvider>
  );
}

export default App;
