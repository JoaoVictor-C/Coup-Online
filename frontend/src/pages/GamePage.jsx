import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchGame } from '../store/actions/gameActions';
import GameBoard from '../components/Game/GameBoard';
import GameMenu from '../components/Game/GameMenu';
import socketService from '../services/socket';
import '../assets/styles/GamePage.css';
import ExchangeHandler from '../components/Game/ExchangeHandler';
import WaitActionContainer from '../components/Game/WaitActionContainer';
import BlockChallengeHandler from '../components/Game/BlockChallengeHandler';
import ChallengeBlockHandler from '../components/Game/ChallengeBlockHandler';
import WarningComponent from '../components/Game/WarningComponent';
import { Container } from 'react-bootstrap'; // Import Bootstrap Container
import GameOver from '../components/Game/GameOver';

const GamePage = () => {
  const { roomName } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const gameFromRedux = useSelector(state => state.game.currentGame);
  const { userId, isAuthenticated, loading: authLoading } = useSelector(state => state.auth);
  const [isLoading, setIsLoading] = useState(true);
  const [alreadyClicked, setAlreadyClicked] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => { 
    if (userId && roomName) {
      setIsLoading(true);
      
      const fetchData = () => {
        dispatch(fetchGame(roomName))
          .then(() => setIsLoading(false))
          .catch(() => {
            setIsLoading(false);
          });
      };
      
      // Initial fetch
      fetchData();
      
      // Set interval to refetch every 3 seconds
      const intervalId = setInterval(fetchData, 3000);
      
      // Cleanup interval on component unmount or when dependencies change
      return () => clearInterval(intervalId);
    }
  }, [dispatch, roomName, userId]);

  useEffect(() => {
    if (gameFromRedux && gameFromRedux.status === 'in_progress') {
      navigate(`/game/${roomName}`);
    }
  }, [gameFromRedux, navigate, roomName]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Emit leaveGame event when component unmounts
      socketService.getSocket().emit('leaveGame', { roomName, userId }, (response) => {
        if (response.success) {
          console.log('Successfully left the game.');
        } else {
          console.error('Error leaving the game:', response.message);
        }
      });
    };
  }, [roomName, userId]);

  const handleLeaveGame = () => {
    window.location.href = '/game/join';
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status" style={{ width: '100px', height: '100px' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }
  if (!gameFromRedux) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-body">
                <h2 className="card-title mb-4 text-center">Game Not Found</h2>
                <p className="text-center">The game you&apos;re trying to join does not exist. Please check the room name or choose an option below:</p>
                <div className="d-flex justify-content-center mt-4">
                  <Link to="/game/create" className="btn btn-primary me-2">
                    Create a New Game
                  </Link>
                  <Link to="/game/join" className="btn btn-secondary ms-2 justify-content-center align-items-center d-flex">
                    Join Another Game
                  </Link>
                </div>
                <div className="text-center mt-3">
                  <Link to="/" className="text-decoration-none">
                    <i className="bi bi-house-door"></i> Return to Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Container fluid className="game-page">
      <GameMenu onLeaveGame={handleLeaveGame} />
      <WarningComponent />
      <GameBoard 
        game={gameFromRedux} 
        currentUserId={userId} 
        selectedTarget={selectedTarget} 
        setSelectedTarget={setSelectedTarget}
      />
      {(gameFromRedux.pendingAction?.type === 'exchange' && 
       gameFromRedux.pendingAction.userId === userId &&
       gameFromRedux.pendingAction.accepted === true) || 
       (gameFromRedux.pendingAction?.type === 'challengeSuccess' &&
       gameFromRedux.pendingAction.userId === userId) ? (
        <ExchangeHandler />
      ) : null}
      {gameFromRedux.pendingAction && 
       gameFromRedux.pendingAction.userId !== userId && 
       gameFromRedux.pendingAction.blockPending === false && 
       gameFromRedux.pendingAction.type !== 'challengeSuccess' &&
       !(gameFromRedux.pendingAction.acceptedPlayers.includes(userId)) && (
          <BlockChallengeHandler alreadyClicked={alreadyClicked} setAlreadyClicked={setAlreadyClicked}/>
      )}
      {gameFromRedux.pendingAction &&
       gameFromRedux.pendingAction.blockPending &&
       gameFromRedux.pendingAction.userId === userId &&
       gameFromRedux.pendingAction.type !== 'challengeSuccess' && (
        <ChallengeBlockHandler />
      )}
      {gameFromRedux.pendingAction &&
       gameFromRedux.pendingAction.blockPending === false &&
       !(gameFromRedux.pendingAction.userId !== userId) &&
       !(gameFromRedux.pendingAction.type === 'exchange' && gameFromRedux.pendingAction.accepted === true) &&
       !(gameFromRedux.pendingAction.type === 'challengeSuccess') && (
        <WaitActionContainer />
      )}
      {gameFromRedux.status === 'finished' && (
        <GameOver gameId={gameFromRedux._id} />
      )}
    </Container>
  );
};

export default GamePage;