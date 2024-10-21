import React, { createContext, useState, useContext, ReactNode } from 'react';
import { PendingAction } from '@utils/types';
import { AuthContext } from './AuthContext';

interface GameContextProps {
  gameState: string;
  setGameState: (state: string) => void;
  currentUserId: string | null;
  handlePendingAction: (action: PendingAction | null) => void;
  currentPendingAction: PendingAction | null;
  setCurrentPendingAction: (action: PendingAction | null) => void;
}

export const GameContext = createContext<GameContextProps>({
  gameState: 'LOBBY',
  setGameState: () => {},
  currentUserId: null,
  handlePendingAction: () => {},
  currentPendingAction: null,
  setCurrentPendingAction: () => {},
});

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<string>('LOBBY');
  const { user } = useContext(AuthContext);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [currentPendingAction, setCurrentPendingAction] = useState<PendingAction | null>(null);

  const handlePendingAction = (action: PendingAction | null) => {
    setPendingAction(action);
  };

  return (
    <GameContext.Provider value={{ 
      gameState, 
      setGameState, 
      currentUserId: user?.id || null, 
      handlePendingAction,
      currentPendingAction,
      setCurrentPendingAction
    }}>
      {children}
    </GameContext.Provider>
  );
};
