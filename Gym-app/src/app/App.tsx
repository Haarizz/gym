"use client";

import { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import Splash from './components/Splash';
import ModeSelection from './components/ModeSelection';

type Screen = 'splash' | 'mode-selection' | 'app';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');

  useEffect(() => {
    if (currentScreen === 'splash') {
      const timer = setTimeout(() => {
        setCurrentScreen('mode-selection');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  const handleModeSelect = (mode: 'member' | 'admin' | 'trainer' | 'staff') => {
    setCurrentScreen('app');
    // Navigate to the selected mode after screen transition
    setTimeout(() => {
      router.navigate(`/${mode}`);
    }, 0);
  };

  if (currentScreen === 'splash') {
    return <Splash />;
  }

  if (currentScreen === 'mode-selection') {
    return <ModeSelection onModeSelect={handleModeSelect} />;
  }

  return <RouterProvider router={router} />;
}
