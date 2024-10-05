import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { performAction, performChallenge, performBlock, acceptAction, respondToBlock } from '../../store/actions/gameActions';

const PlayerActions = ({ game, currentUserId }) => {
  const dispatch = useDispatch();
  const isCurrentPlayerTurn = game.players[game.currentPlayerIndex]?.playerProfile.user._id === currentUserId;
  const [selectedTarget, setSelectedTarget] = useState(null);

  // Get challenge and block states from Redux
  const { challenge, block } = useSelector(state => state.game);

  const handleAction = (actionType) => {
    if ((actionType === 'coup' || actionType === 'assassinate' || actionType === 'steal') && !selectedTarget) {
      alert('Please select a target player.');
      return;
    }

    try {
      dispatch(performAction(game._id, actionType, selectedTarget, currentUserId));
      setSelectedTarget(null);
      console.log(JSON.stringify(game, null, 2));
    } catch (error) {
      console.error('Action failed:', error);
      alert(`Action failed: ${error}`);
    }
  };

  const handleSelectChange = (e) => {
    setSelectedTarget(e.target.value);
  };

  const handleChallenge = () => {
    if (!game.pendingAction.canBeChallenged) {
      alert('This action cannot be challenged.');
      return;
    }
    dispatch(performChallenge(game._id, currentUserId, 'action'));
  };

  const handleBlock = () => {
    if (!game.pendingAction.canBeBlocked) {
      alert('This action cannot be blocked.');
      return;
    }
    dispatch(performBlock(game._id, currentUserId, game.pendingAction.type));
  };

  const handleAcceptAction = () => {
    dispatch(acceptAction(game._id));
  };

  const handleRespondToBlock = (response) => {
    dispatch(respondToBlock(game._id, response, currentUserId));
  };

  // Determine if a challenge or block is active
  const isChallenging = challenge.isChallenging;
  const isBlocking = block.isBlocking;

  useEffect(() => {
    if (challenge.success !== null) {
      console.log(challenge.message);
    }
    // eslint-disable-next-line
  }, [challenge.success]);

  useEffect(() => {
    if (block.success !== null) {
      console.log(block.message);
    }
    // eslint-disable-next-line
  }, [block.success]);

  if (isChallenging || isBlocking) {
    return <div className="alert alert-info">Processing...</div>;
  }

  if (game.pendingAction && game.pendingAction.blockedBy && game.pendingAction.userId === currentUserId) {
    return (
      <div className="player-actions card">
        <div className="card-body">
          <h3 className="card-title mb-3 text-light">Your Action Was Blocked</h3>
          <div className="d-grid gap-2">
            {game.pendingAction.canBeChallenged && (
              <>
                <p className='text-light'>Challenged by: {game.pendingAction.challengedBy}</p>
                <button className="btn btn-outline-success" onClick={() => handleRespondToBlock('accept')}>Accept Challenge</button>
                <button className="btn btn-outline-danger" onClick={() => handleRespondToBlock('challenge')}>Challenge Action</button>
              </>
            )}
            {game.pendingAction.canBeBlocked && (
              <>
                <p className='text-light'>Blocked by: {game.pendingAction.blockedBy}</p>
                <button className="btn btn-outline-success" onClick={() => handleRespondToBlock('accept')}>Accept Block</button>
                <button className="btn btn-outline-danger" onClick={() => handleRespondToBlock('challenge')}>Challenge Action</button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (game.pendingAction) {
    if (game.pendingAction.userId === currentUserId) {
      return (
        <div className="player-actions card">
          <div className="card-body">
            <h3 className="card-title mb-3">Pending Action</h3>
            <p className="alert alert-info">Waiting for other players to respond...</p>
          </div>
        </div>
      );
    } else if (game.currentPlayerIndex !== game.players.findIndex(player => player.playerProfile.user._id === currentUserId)) {
      // Verify if the action can be blocked or challenged
      const canChallenge = game.pendingAction.canBeChallenged;
      const canBlock = game.pendingAction.canBeBlocked;

      return (
        <div className="player-actions card">
          <div className="card-body">
            <h3 className="card-title mb-3">Pending Action</h3>
            <div className="d-grid gap-2">
              {canChallenge && <button className="btn btn-outline-warning" onClick={handleChallenge}>Challenge Action</button>}
              {canBlock && <button className="btn btn-outline-secondary" onClick={handleBlock}>Block Action</button>}
              <button className="btn btn-outline-success" onClick={handleAcceptAction}>Accept Action</button>
            </div>
          </div>
        </div>
      );
    }
  }

  if (!isCurrentPlayerTurn) {
    return <div className="alert alert-info">Waiting for your turn...</div>;
  }

  if (game.pendingAction && game.currentPlayerIndex === game.players.findIndex(player => player.playerProfile.user.id === currentUserId)) {
    return <div className="alert alert-info">Waiting for the other player to perform an action..</div>;
  }

  return (
    <div className="player-actions card">
      <div className="card-body">
        <h3 className="card-title mb-3 text-light">Your Turn</h3>
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
            <label htmlFor="targetPlayer" className="form-label text-light">Select Target Player:</label>
            <select
              id="targetPlayer"
              className="form-select"
              value={selectedTarget || ''}
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