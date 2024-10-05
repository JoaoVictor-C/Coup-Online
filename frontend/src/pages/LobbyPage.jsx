import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchGame, startGame } from '../store/actions/gameActions';
import socketService from '../services/socket'; // Use the singleton service

const LobbyPage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const socket = socketService.getSocket(); // Use the singleton socket
  const gameFromRedux = useSelector(state => state.game.currentGame);
  const userId = useSelector(state => state.auth.user._id);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  useEffect(() => {
    // Emit joinGame event
    socket.emit('joinGame', { gameId, userId }, (response) => {
      if (!response.success) {
        setError(response.message);
      }
    });

    // Listen for gameUpdate events
    const handleGameUpdate = (updatedGame) => {
      dispatch({ type: 'GAME_UPDATE', payload: updatedGame });
    };

    socket.on('gameUpdate', handleGameUpdate);

    return () => {
      socket.off('gameUpdate', handleGameUpdate);
      // Optionally leave the room or perform cleanup
      // socket.emit('leaveGame', { gameId, userId });
    };
  }, [dispatch, gameId, userId, socket]);

  useEffect(() => {
    if (gameFromRedux && gameFromRedux.status === 'in_progress') {
      navigate(`/game/${gameId}`);
    }
  }, [gameFromRedux, navigate, gameId]);

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

  if (!gameFromRedux) return <div>Loading...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="container py-5">
      <h2>Game Lobby</h2>
      <div className="mb-3">
        <p>Room ID: {gameId}</p>
        <button className="btn btn-secondary btn-sm pr-2 pl-2" onClick={copyRoomId}>Copy Room ID</button>
        {copySuccess && <span className="text-success ml-2 pl-2">{copySuccess}</span>}
      </div>
      <p>Waiting for players... ({gameFromRedux.players.length}/{gameFromRedux.maxPlayers})</p>
      <ul className="list-group">
        {gameFromRedux.players.map((player, index) => (
          <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
            {player.username}
            {player.isConnected ? 
              <span className="badge bg-success">Connected</span> : 
              <span className="badge bg-danger">Disconnected</span>
            }
          </li>
        ))}
      </ul>
      {gameFromRedux.status === 'waiting' && gameFromRedux.players.length >= 2 && (
        <button className="btn btn-primary mt-3" onClick={handleStartGame}>Start Game</button>
      )}
    </div>
  );
};

export default LobbyPage;