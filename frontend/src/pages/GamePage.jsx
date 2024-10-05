import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchGame } from '../store/actions/gameActions';
import GameBoard from '../components/Game/GameBoard';
import GameStatus from '../components/Game/GameStatus';
import PlayerActions from '../components/Game/PlayerActions';
import 'bootstrap/dist/css/bootstrap.min.css';
import socketService from '../services/socket';

const GamePage = () => {
  const { gameId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const socket = socketService.getSocket();
  const gameFromRedux = useSelector(state => state.game.currentGame);
  const { userId, isAuthenticated, loading: authLoading } = useSelector(state => state.auth);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!gameFromRedux) return <div>Game not found</div>;

  return (
    <div className="game-page container py-5">
      <h2>Game {gameId}</h2>
      <GameBoard game={gameFromRedux} currentUserId={userId} />
      <GameStatus game={gameFromRedux} />
      <PlayerActions game={gameFromRedux} currentUserId={userId} />
    </div>
  );
};

export default GamePage;