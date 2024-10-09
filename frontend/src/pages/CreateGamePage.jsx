import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { createGame } from '../store/actions/gameActions';

const CreateGamePage = () => {
  const [playerCount, setPlayerCount] = useState(4);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);
    try {
      const result = await dispatch(createGame(playerCount));
      console.log('result', result);
      if (result.roomName) {
        navigate(`/lobby/${result.roomName}`);
      } else {
        throw new Error('Game creation failed');
      }
    } catch (error) {
      console.error('Failed to create game:', error);
      if (error.message === 'Specific error condition') {
        setErrorMessage('A specific error occurred. Please try a different option.');
      } else {
        setErrorMessage('Failed to create game. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="card-title mb-4 text-center text-light">Create a New Game</h2>
              {errorMessage && (
                <div className="alert alert-warning alert-dismissible fade show" role="alert">
                  {errorMessage}
                  <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
              )}
              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-4">
                  <label htmlFor="playerCount" className="form-label text-light">Number of Players:</label>
                  <select
                    className="form-select form-select-lg"
                    id="playerCount"
                    value={playerCount}
                    onChange={(e) => setPlayerCount(Number(e.target.value))}
                    aria-label="Select number of players"
                  >
                    {[2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num}>{num} Players</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary w-100" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Creating...
                    </>
                  ) : (
                    'Create Game'
                  )}
                </button>
              </form>
            </div>
          </div>
          <div className="mt-3 text-center">
            <small className="text-muted">
              Choose between 2 to 6 players to start your game. Once created, share the Room ID with friends to join.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateGamePage;
