import Player from './Player';
import PropTypes from 'prop-types';

const GameBoard = ({ game, currentUserId }) => {
  return (
    <div className="game-board card">
      <div className="card-body">
        <h3 className="card-title mb-4 text-light">Players</h3>
        <div className="row">
          {game.players.map((player, index) => (
            <div key={player.playerProfile.user._id} className="col-md-6 mb-3">
              <Player
                player={player}
                isCurrentPlayer={
                  player.playerProfile.user._id === currentUserId
                }
                isCurrentTurn={index === game.currentPlayerIndex}
              />
            </div>
          ))}
        </div>

        {/* Display any pending challenges or blocks */}
        {game.pendingAction && (
          <div className="mt-4 alert alert-info">
            <h4>Pending Action: {game.pendingAction.actionType}</h4>
            <p>Action performed by: {game.pendingAction.userId === currentUserId ? 'You' : game.players.find(player => player.playerProfile.user._id === game.pendingAction.userId).playerProfile.user.username}</p>
            {game.pendingAction.targetUserId && (
              <p>Target player: {game.pendingAction.targetUserId}</p>
            )}
            {/* Optionally display buttons or indicators for challenge/block */}
          </div>
        )}
      </div>
    </div>
  );
};

GameBoard.propTypes = {
  game: PropTypes.shape({
    players: PropTypes.arrayOf(PropTypes.object).isRequired,
    centralTreasury: PropTypes.number.isRequired,
    status: PropTypes.string.isRequired,
    currentPlayerIndex: PropTypes.number.isRequired,
    currentPlayerUsername: PropTypes.string.isRequired,
    pendingAction: PropTypes.shape({
      actionType: PropTypes.string.isRequired,
      userId: PropTypes.string.isRequired,
      targetUserId: PropTypes.string,
    }),
  }).isRequired,
  currentUserId: PropTypes.string.isRequired,
};  

export default GameBoard;