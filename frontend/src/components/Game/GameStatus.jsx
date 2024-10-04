import PropTypes from 'prop-types';

const GameStatus = ({ game }) => {
  const currentPlayerUsername = game.currentPlayerUsername || 'Unknown';

  return (
    <div className="game-status card my-4">
      <div className="card-body">
        <h3 className="card-title text-light">Game Status</h3>
        <ul className="list-group list-group-flush">
          {game.status === 'finished' && game.winner && (
            <li className="list-group-item d-flex justify-content-between align-items-center">
              Winner
              <span className="badge bg-success rounded-pill">{game.winner.username}</span>
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
          {/* Add more status items as needed */}
        </ul>
      </div>
    </div>
  );
};

GameStatus.propTypes = {
  game: PropTypes.object.isRequired,
};

export default GameStatus;