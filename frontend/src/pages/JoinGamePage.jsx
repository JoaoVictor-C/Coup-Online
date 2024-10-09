import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { joinGame } from '../store/actions/gameActions';

const JoinGamePage = () => {
  const [roomName, setRoomName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);
    try {
      const result = await dispatch(joinGame(roomName));
      if (result.gameId) {
        navigate(`/lobby/${result.roomName}`);
      } else {
        throw new Error('Game join failed');
      }
    } catch (error) {
      console.error('Failed to join game:', error);
      if (error.message === 'Cannot join a game that has already started') {
        setErrorMessage('Oops! This game has already started. Try joining another game or create a new one!');
      } else if (error.message === 'Room not found') {
        setErrorMessage('The room you are trying to join does not exist. Please check the Room Name and try again.');
      } else {
        setErrorMessage('Failed to join game. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isRoomNameValid = () => {
    const regex = /^[A-Z]{4,4}$/;
    return regex.test(roomName);
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="card-title mb-4 text-center">Join a Game</h2>
              {errorMessage && (
                <div className="alert alert-warning alert-dismissible fade show" role="alert">
                  {errorMessage}
                  <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
              )}
              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-4">
                  <label htmlFor="roomName" className="form-label">Room Name:</label>
                  <input
                    type="text"
                    className={`form-control ${roomName && !isRoomNameValid() ? 'is-invalid' : ''}`}
                    id="roomName"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Enter your Room Name (4 capital letters)"
                    required
                  />
                  {roomName && !isRoomNameValid() && (
                    <div className="invalid-feedback">
                      The room name must be 4 capital letters.
                    </div>
                  )}
                </div>
                <button type="submit" className="btn btn-primary w-100" disabled={isLoading || !isRoomNameValid()}>
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Joining...
                    </>
                  ) : (
                    'Join Game'
                  )}
                </button>
              </form>
            </div>
          </div>
          <div className="mt-3 text-center">
            <small className="text-muted">
              Enter the 4-letter Room Name provided by your friend to join the game.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinGamePage;
