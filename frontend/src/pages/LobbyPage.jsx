import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchGame, startGame } from '../store/actions/gameActions';
import { getSocket } from '../services/socket';

const LobbyPage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const socket = getSocket();
  const gameFromRedux = useSelector(state => state.game.currentGame);
  const userId = useSelector(state => state.auth.user._id);
  const [game, setGame] = useState(null);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  const [isDisconnected, setIsDisconnected] = useState(false);

  useEffect(() => {
    setGame(gameFromRedux);
  }, [gameFromRedux]);

  useEffect(() => {
    if (game && game.status === 'in_progress') {
      navigate(`/game/${gameId}`);
    }
  }, [game, navigate, gameId]);

  useEffect(() => {
    // Emit joinGame event
    socket.emit('joinGame', { gameId, userId }, (response) => {
      if (!response.success) {
        setError(response.message);
      }
    });

    const fetchGameData = () => {
      dispatch(fetchGame(gameId));
    };

    // Fetch game data initially and set up an interval to fetch it regularly
    fetchGameData();
    const intervalId = setInterval(fetchGameData, 5000); // Fetch every 5 seconds

    const handleGameUpdate = (updatedGame) => {
      dispatch({ type: 'UPDATE_GAME', payload: updatedGame });
      setGame(updatedGame);
      if (updatedGame.status === 'in_progress') {
        navigate(`/game/${gameId}`);
      }
    };

    const handleActionError = (error) => {
      setError(error.message);
    };

    const HandlePlayerDisconnected = ({ userId: disconnectedUserId, reason }) => {
      if (disconnectedUserId === userId) {
        setIsDisconnected(true);
        setError('You have been disconnected from the game.');
      } else {
        setError(`A player has been disconnected: ${reason}`);
      }
      fetchGameData(); // Fetch updated game data when a player disconnects
    };

    const HandleGameOver = ({ winner }) => {
      if (winner === userId) {
        alert('Congratulations! You have won the game!');
      } else {
        alert('Game Over! You have lost.');
      }
      navigate('/');
    };

    const HandleGameStarted = ({ gameId }) => {
      console.log('Game Started')
      navigate(`/game/${gameId}`);
    };

    socket.on('gameUpdate', handleGameUpdate);
    socket.on('actionError', handleActionError);
    socket.on('playerDisconnected', HandlePlayerDisconnected);
    socket.on('gameOver', HandleGameOver);
    socket.on('gameStarted', HandleGameStarted);

    return () => {
      clearInterval(intervalId);
      socket.off('gameUpdate', handleGameUpdate);
      socket.off('actionError', handleActionError);
      socket.off('playerDisconnected', HandlePlayerDisconnected);
      socket.off('gameOver', HandleGameOver);
      socket.off('gameStarted', HandleGameStarted);
    };
  }, [dispatch, gameId, navigate, userId, socket]);

  const copyRoomId = () => {
    navigator.clipboard.writeText(gameId)
      .then(() => {
        setCopySuccess('Room ID copied!');
        setTimeout(() => setCopySuccess(''), 3000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        setCopySuccess('Failed to copy');
      });
  };

  const handleStartGame = async () => {
    try {
      await dispatch(startGame(gameId));
    } catch (err) {
      console.error('Start Game Failed:', err);
      setError(err.message);
    }
  };

  if (!game) return <div>Loading...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (isDisconnected) return <div className="alert alert-warning">You have been disconnected from the game.</div>;

  return (
    <div className="container py-5">
      <h2>Game Lobby</h2>
      <div className="mb-3">
        <p>Room ID: {gameId}</p>
        <button className="btn btn-secondary btn-sm pr-2 pl-2" onClick={copyRoomId}>Copy Room ID</button>
        {copySuccess && <span className="text-success ml-2 pl-2">{copySuccess}</span>}
      </div>
      <p>Waiting for players... ({game.players.length}/{game.maxPlayers})</p>
      <ul className="list-group">
        {game.players.map((player, index) => (
          <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
            {player.username}
            {player.isConnected ? 
              <span className="badge bg-success">Connected</span> : 
              <span className="badge bg-danger">Disconnected</span>
            }
          </li>
        ))}
      </ul>
      {game.status === 'waiting' && game.players.length >= 2 && (
        <button className="btn btn-primary mt-3" onClick={handleStartGame}>Start Game</button>
      )}
    </div>
  );
};

export default LobbyPage;