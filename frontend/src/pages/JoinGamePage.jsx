import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { joinGame } from '../store/actions/gameActions';

const JoinGamePage = () => {
  const [gameId, setGameId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const result = await dispatch(joinGame(gameId));
      console.log(result)
      if (result.gameId) {
        navigate(`/lobby/${result.gameId}`);
      } else {
        throw new Error('Game join failed');
      }
    } catch (error) {
      console.error('Failed to join game:', error);
      if (error.message === 'Cannot join a game that has already started') {
        setErrorMessage('Oops! This game has already started. Try joining another game or create a new one!');
      } else {
        setErrorMessage('Failed to join game. Please try again.');
      }
    }
  };

  return (
    <div className="container py-5">
      <h2 className="mb-4">Join a Game</h2>
      {errorMessage && (
        <div className="alert alert-warning" role="alert">
          {errorMessage}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="gameId" className="form-label">Game ID:</label>
          <input
            type="text"
            className="form-control"
            id="gameId"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary">Join Game</button>
      </form>
    </div>
  );
};

export default JoinGamePage;
