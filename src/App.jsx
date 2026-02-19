import { useState, useEffect } from 'react';
import './App.css';
import LoadingScreen from './components/LoadingScreen';
import HomeScreen from './components/HomeScreen';
import SplatViewer from './SplatViewer.jsx';

function App() {
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [showSplatViewer, setShowSplatViewer] = useState(false);

  useEffect(() => {
    if (showContent) return;

    const timer = setInterval(() => {
      setProgress((prevProgress) => {
        if (prevProgress >= 100) {
          clearInterval(timer);
          setShowContent(true);
          return 100;
        }
        const diff = Math.random() * 25;
        return Math.min(prevProgress + diff, 100);
      });
    }, 100);

    return () => clearInterval(timer);
  }, [showContent]);

  if (!showContent) {
    return <LoadingScreen progress={progress} />;
  }

  if (showSplatViewer) {
    return <SplatViewer onBack={() => setShowSplatViewer(false)} />;
  }

  return <HomeScreen onOpenSplatViewer={() => setShowSplatViewer(true)} />;
}

export default App;
