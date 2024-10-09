import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { startGame } from '../store/actions/gameActions';
import socketService from '../services/socket'; // Use the singleton service
import { FaSignOutAlt, FaCopy, FaEye, FaEyeSlash, FaPlay, FaCheckCircle, FaTimesCircle } from 'react-icons/fa'; // Importing icons from react-icons

const LobbyPage = () => {
  const { roomName } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const socket = socketService.getSocket(); // Use the singleton socket
  const gameFromRedux = useSelector(state => state.game.currentGame);
  const gameId = gameFromRedux._id;
  const userId = useSelector(state => state.auth.user._id);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  const [showRoomId, setShowRoomId] = useState(false);

  useEffect(() => {
    // Emit joinGame event
    socket.emit('joinGame', { roomName, userId }, (response) => {
      if (!response.success) {
        setError(response.message);
        navigate('/');
      }
    });

    // Cleanup on component unmount
    return () => {
      socket.emit('leaveGame', { roomName, userId }, (response) => {
        if (response.success) {
          console.log('Successfully left the game.');
        } else {
          console.error('Error leaving the game:', response.message);
        }
      });
      // Optionally, remove any listeners if added
      socket.off('playerUpdate');
    };
  }, [roomName, userId, socket, navigate]);

  useEffect(() => {
    if (gameFromRedux && gameFromRedux.status === 'in_progress') {
      navigate(`/game/${roomName}`);
    }
  }, [gameFromRedux, navigate, roomName]);

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomName)
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

  const handleLeaveGame = () => {
    socket.emit('leaveGame', { roomName, userId }, (response) => {
      if (response.success) {
        navigate('/');
      } else {
        setError(response.message);
      }
    });
  };

  if (!gameFromRedux) return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <span className="visually-hidden">Loading...</span>
    </div>
  );

  if (error) return <div className="alert alert-danger text-center">{error}</div>;

  return (
    <div className="container py-5">
      <div className="card shadow-sm">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h2 className="mb-0">Game Lobby</h2>
          <button className="btn btn-danger btn-sm" onClick={handleLeaveGame}>
            <FaSignOutAlt className="me-2" /> Leave Game
          </button>
        </div>
        <div className="card-body">
          <div className="d-flex justify-content-between mb-3">
            <div>
              {showRoomId ? (
                <div className="d-flex align-items-center text-light">
                  <span>Room ID: <strong>{roomName}</strong></span>
                  <button className="btn btn-outline-secondary btn-sm ms-2 border-1 border-light border border-opacity-75" onClick={copyRoomId}>
                    <FaCopy className="me-1" /> Copy
                  </button>
                  <button className="btn btn-outline-secondary btn-sm ms-2 border-1 border-light border border-opacity-75" onClick={() => setShowRoomId(false)}>
                    <FaEyeSlash className="me-1" /> Hide
                  </button>
                </div>
              ) : (
                <button className="btn btn-outline-primary btn-sm border-1 border-light border border-opacity-75" onClick={() => setShowRoomId(true)}>
                  <FaEye className="me-1" /> Show Room ID
                </button>
              )}
            </div>
            <div>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleStartGame}
                disabled={!(gameFromRedux.status === 'waiting' && gameFromRedux.players.length >= 2)}
              >
                Start Game
              </button>
            </div>
          </div>
          <div>
            {copySuccess && <span className="text-success ms-2">{copySuccess}</span>}
          </div>
          <p className="text-center mb-4 text-light">Waiting for players... ({gameFromRedux.players.length}/{gameFromRedux.maxPlayers})</p>
          <ul className="list-group">
            {gameFromRedux.players.map((player, index) => (
              <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <span>{player.username}</span>
                  {!player.isConnected && (
                    <span className="badge bg-warning ms-2">
                      <FaTimesCircle className="me-1" /> Disconnected
                    </span>
                  )}
                </div>
                {player.isConnected ? 
                  <span className="badge bg-success">
                    <FaCheckCircle className="me-1" /> Connected
                  </span> : 
                  <span className="badge bg-danger">
                    <FaTimesCircle className="me-1" /> Disconnected
                  </span>
                }
              </li>
            ))}
          </ul>
        </div>
      </div>
      {error && <div className="alert alert-danger mt-3 text-center">{error}</div>}
    </div>
  );
};

export default LobbyPage;