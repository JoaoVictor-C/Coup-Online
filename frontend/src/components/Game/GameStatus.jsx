import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

const GameStatus = ({ game }) => {
  const currentPlayerUsername = game.currentPlayerUsername || 'Unknown';
  const [timer, setTimer] = useState(30);

  // Calculate accepted players if there's a pending action
  const acceptedCount = game.pendingAction?.acceptedPlayers?.length || 0;
  const requiredAccepts = game.players.length - 1; // All except acting player

  useEffect(() => {
    let interval;
    if (game.pendingAction && timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [game.pendingAction, timer]);

  useEffect(() => {
    if (game.pendingAction) {
      setTimer(30);
    }
  }, [game.pendingAction]);

  return (
    <div className="game-status card my-4">
      <div className="card-body">
        <h3 className="card-title text-light">Game Status</h3>
        <ul className="list-group list-group-flush">
          {game.status === 'finished' && game.winner && (
            <li className="list-group-item d-flex justify-content-between align-items-center">
              Winner
              <span className="badge bg-success rounded-pill">{game.winner}</span>
            </li>
          )}
          <li className="list-group-item d-flex justify-content-between align-items-center">
            Status
            <span className="badge bg-primary rounded-pill">{game.status}</span>
          </li>
          <li className="list-group-item d-flex justify-content-between align-items-center">
            Current Player
            <span className="badge bg-info rounded-pill">{currentPlayerUsername}</span>
          </li>
          {game.pendingAction && (
            <>
              <li className="list-group-item d-flex justify-content-between align-items-center">
                Acceptances
                <span className="badge bg-warning rounded-pill">
                  {acceptedCount}/{requiredAccepts}
                </span>
              </li>
              <li className="list-group-item d-flex justify-content-between align-items-center">
                Pending Action Timer:
                <span className="badge bg-danger rounded-pill">{timer}s</span>
              </li>
            </>
          )}
          {/* */}
          {/* Add more status items as needed */}
        </ul>
      </div>
    </div>
  );
};

GameStatus.propTypes = {
  game: PropTypes.shape({
    status: PropTypes.string.isRequired,
    winner: PropTypes.string,
    currentPlayerUsername: PropTypes.string.isRequired,
    pendingAction: PropTypes.shape({
      acceptedPlayers: PropTypes.arrayOf(PropTypes.string)
    }),
    players: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
};

export default GameStatus;