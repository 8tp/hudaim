import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import NicknamePrompt from './components/NicknamePrompt';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';
import ReactionTime from './pages/ReactionTime';
import AimTrainer from './pages/AimTrainer';
import GridShot from './pages/GridShot';
import Tracking from './pages/Tracking';
import Switching from './pages/Switching';
import Precision from './pages/Precision';
import Leaderboards from './pages/Leaderboards';
import { hasCompletedSetup, completeSetup, initializeLeaderboards } from './utils/leaderboard';

function App() {
  const [showNicknamePrompt, setShowNicknamePrompt] = useState(() => !hasCompletedSetup());

  // Sync leaderboards from server on app load
  useEffect(() => {
    initializeLeaderboards();
  }, []);

  const handleNicknameComplete = (nickname) => {
    completeSetup(nickname);
    setShowNicknamePrompt(false);
  };

  return (
    <Router>
      <div className="h-full bg-slate-900 flex flex-col">
        {showNicknamePrompt && (
          <NicknamePrompt onComplete={handleNicknameComplete} />
        )}
        <Navbar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/reaction" element={<ReactionTime />} />
            <Route path="/aim" element={<AimTrainer />} />
            <Route path="/gridshot" element={<GridShot />} />
            <Route path="/tracking" element={<Tracking />} />
            <Route path="/switching" element={<Switching />} />
            <Route path="/precision" element={<Precision />} />
            <Route path="/leaderboards" element={<Leaderboards />} />
            <Route path="*" element={
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <p className="text-7xl font-bold text-slate-600 mb-4">404</p>
                <p className="text-xl text-slate-400 mb-6">Page not found</p>
                <Link to="/" className="btn-primary bg-gradient-to-r from-cyan-500 to-blue-500 no-underline">
                  Back to Home
                </Link>
              </div>
            } />
          </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </Router>
  );
}

export default App;
