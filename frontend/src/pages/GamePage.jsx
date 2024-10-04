import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchGame } from '../store/actions/gameActions';
import GameBoard from '../components/Game/GameBoard';
import GameStatus from '../components/Game/GameStatus';
import PlayerActions from '../components/Game/PlayerActions';
import 'bootstrap/dist/css/bootstrap.min.css';

const GamePage = () => {
  const { gameId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentGame, error } = useSelector(state => state.game);
  const { userId, isAuthenticated, loading: authLoading } = useSelector(state => state.auth);
  const [isLoading, setIsLoading] = useState(true);
  const [disconnected, setDisconnected] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    const getGame = async () => {
      if (userId) {
        setIsLoading(true);
        await dispatch(fetchGame(gameId));
        setIsLoading(false);
      }
    };

    if (!authLoading && userId) {
      getGame();
    }

  }, [dispatch, gameId, navigate, userId, authLoading]);

  if (authLoading || isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!currentGame) {
    return <div>Game not found</div>;
  }

  if (disconnected) {
    return <div>You have been disconnected from the game.</div>;
  }

  return (
    <div className="game-page container py-5">
      <h2>Game {gameId}</h2>
      <GameBoard game={currentGame} currentUserId={userId} />
      <GameStatus game={currentGame} />
      <PlayerActions game={currentGame} currentUserId={userId} />
    </div>
  );
};

export default GamePage;