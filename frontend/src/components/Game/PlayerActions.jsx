import PropTypes from 'prop-types';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { performAction, performChallenge, performBlock } from '../../store/actions/gameActions';

const PlayerActions = ({ game, currentUserId }) => {
  const dispatch = useDispatch();
  const isCurrentPlayerTurn = game.players[game.currentPlayerIndex]?.playerProfile.user._id === currentUserId;
  const [selectedTarget, setSelectedTarget] = useState(null);

  const handleAction = async (actionType) => {
    if ((actionType === 'coup' || actionType === 'assassinate') && !selectedTarget) {
      alert('Please select a target player.');
      return;
    }

    try {
      console.log(selectedTarget)
      await dispatch(performAction(game._id, actionType, selectedTarget, currentUserId));
      setSelectedTarget(null); // Reset after action
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  const handleSelectChange = (e) => {
    setSelectedTarget(e.target.value);
  };

  const handleChallenge = () => {
    dispatch(performChallenge(game._id, currentUserId));
    setSelectedTarget(null);
  };

  const handleBlock = () => {
    dispatch(performBlock(game._id, currentUserId, 'blockAction'));
    setSelectedTarget(null);
  };

  if (game.pendingAction && game.currentPlayerIndex !== game.players.findIndex(player => player.playerProfile.user._id === currentUserId)) {
    return (
      <div className="player-actions card">
        <div className="card-body">
          <h3 className="card-title mb-3">Pending Action</h3>
          <div className="d-grid gap-2">
            <button className="btn btn-outline-warning" onClick={handleChallenge}>Challenge Action</button>
            <button className="btn btn-outline-secondary" onClick={handleBlock}>Block Action</button>
          </div>
        </div>
      </div>
    );
  }

  if (!isCurrentPlayerTurn) {
    return <div className="alert alert-info">Waiting for your turn...</div>;
  }

  if (game.pendingAction && game.currentPlayerIndex === game.players.findIndex(player => player.playerProfile.user._id === currentUserId)) {
    return <div className="alert alert-info">Waiting for the other player to perform an action...</div>;
  }

  return (
    <div className="player-actions card">
      <div className="card-body">
        <h3 className="card-title mb-3">Your Turn</h3>
        <div className="d-grid gap-2">
          <button className="btn btn-primary" onClick={() => handleAction('income')}>Take Income</button>
          <button className="btn btn-secondary" onClick={() => handleAction('foreignAid')}>Foreign Aid</button>
          <button className="btn btn-success" onClick={() => handleAction('taxes')}>Taxes</button>
          <button className="btn btn-danger" onClick={() => handleAction('coup')}>Coup</button>
          <button className="btn btn-warning" onClick={() => handleAction('assassinate')}>Assassinate</button>
          <button className="btn btn-info" onClick={() => handleAction('exchange')}>Exchange</button>
        </div>
        {(game.status === 'in_progress') && (game.players.length > 1) && (
          <div className="mt-3">
            <label htmlFor="targetPlayer" className="form-label">Select Target Player:</label>
            <select
              id="targetPlayer"
              className="form-select"
              value={selectedTarget}
              onChange={handleSelectChange}
            >
              <option value="">-- Select --</option>
              {game.players
                .filter(player => player.playerProfile.user._id !== currentUserId && player.isAlive)
                .map(player => (
                  <option key={player.playerProfile.user._id} value={player.playerProfile.user._id}>
                    {player.playerProfile.user.username}
                  </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

PlayerActions.propTypes = {
  game: PropTypes.object.isRequired,
  currentUserId: PropTypes.string.isRequired,
};

export default PlayerActions;