import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchGame } from '../store/actions/gameActions';
import GameBoard from '../components/Game/GameBoard';
import GameMenu from '../components/Game/GameMenu';
import socketService from '../services/socket';
import '../assets/styles/GamePage.css';
import ExchangeHandler from '../components/Game/ExchangeHandler';
import BlockChallengeHandler from '../components/Game/BlockChallengeHandler';
import ChallengeBlockHandler from '../components/Game/ChallengeBlockHandler';
import WarningComponent from '../components/Game/WarningComponent';

const GamePage = () => {
  const { gameId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const socket = socketService.getSocket();
  const gameFromRedux = useSelector(state => state.game.currentGame);
  const { userId, isAuthenticated, loading: authLoading } = useSelector(state => state.auth);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Add selectedTarget state
  const [selectedTarget, setSelectedTarget] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (userId && gameId) {
      setIsLoading(true);
      dispatch(fetchGame(gameId))
        .then(() => setIsLoading(false))
        .catch(err => {
          setError(err.message);
          setIsLoading(false);
        });
    }
  }, [dispatch, gameId, userId]);

  useEffect(() => {
    if (gameFromRedux && gameFromRedux.status === 'in_progress') {
      navigate(`/game/${gameId}`);
    }
  }, [gameFromRedux, navigate, gameId]);

  useEffect(() => {
    // Listen for gameUpdate events
    const handleGameUpdate = (updatedGame) => {
      dispatch({ type: 'GAME_UPDATE', payload: updatedGame });
    };

    socket.on('gameUpdate', handleGameUpdate);

    return () => {
      socket.off('gameUpdate', handleGameUpdate);
    };
  }, [dispatch, socket]);

  const handleLeaveGame = () => {
    // Implement leave game logic here
    navigate('/game/create');
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!gameFromRedux) return <div>Game not found</div>;

  return (
    <div className="game-page">
      <GameMenu onLeaveGame={handleLeaveGame} />
      <WarningComponent />
      <GameBoard 
        game={gameFromRedux} 
        currentUserId={userId} 
        selectedTarget={selectedTarget} 
        setSelectedTarget={setSelectedTarget}
      />
      {gameFromRedux.pendingAction?.type === 'exchange' && 
       gameFromRedux.pendingAction.userId === userId &&
       gameFromRedux.pendingAction.accepted === true && (
        <ExchangeHandler />
      )}
      {gameFromRedux.pendingAction && 
       gameFromRedux.pendingAction.userId !== userId && 
       (gameFromRedux.pendingAction.canBeChallenged || gameFromRedux.pendingAction.canBeBlocked) &&
       gameFromRedux.pendingAction.blockPending === false && (
        <BlockChallengeHandler />
      )}
      {gameFromRedux.pendingAction &&
       gameFromRedux.pendingAction.blockPending &&
       gameFromRedux.pendingAction.userId === userId && (
        <ChallengeBlockHandler />
      )}
    </div>
  );
};

export default GamePage;