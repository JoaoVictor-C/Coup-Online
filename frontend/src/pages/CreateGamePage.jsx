import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { createGame } from '../store/actions/gameActions';

const CreateGamePage = () => {
  const [playerCount, setPlayerCount] = useState(4);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const result = await dispatch(createGame(playerCount));
      if (result._id) {
        navigate(`/lobby/${result._id}`);
      } else {
        throw new Error('Game creation failed');
      }
    } catch (error) {
      console.error('Failed to create game:', error);
      setError('Failed to create game. Please try again.');
    }
  };

  return (
    <div className="container py-5">
      <h2 className="mb-4">Create a New Game</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="playerCount" className="form-label">Number of Players:</label>
          <select
            className="form-select"
            id="playerCount"
            value={playerCount}
            onChange={(e) => setPlayerCount(Number(e.target.value))}
          >
            {[2, 3, 4, 5, 6].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">Create Game</button>
      </form>
    </div>
  );
};

export default CreateGamePage;
