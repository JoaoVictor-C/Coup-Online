import { useDispatch, useSelector } from 'react-redux';
import { respondToBlock } from '../../store/actions/gameActions';
import '../../assets/styles/ChallengeBlockHandler.css';

const ChallengeBlockHandler = () => {
  const dispatch = useDispatch();
  const game = useSelector((state) => state.game.currentGame);
  const blocker = game.players.find(p => p.playerProfile.user._id === game.pendingAction.blockerId)?.username || 'Unknown';

  const handleAcceptBlock = () => {
    dispatch(respondToBlock(game._id, 'accept'))
      .catch((error) => {
        console.error('Accept Block failed:', error);
      });
  };

  const handleChallengeBlock = () => {
    dispatch(respondToBlock(game._id, 'challenge'))
      .catch((error) => {
        console.error('Challenge Block failed:', error);
      });
  };

  return (
    <div className="challenge-block-handler">
      <div className="handler-content card p-4 shadow-sm text-light">
        <h3>
          Action Blocked: {game.pendingAction.type} by{' '}
          {game.players.find(p => p.playerProfile.user._id === game.pendingAction.userId)?.playerProfile.user.username || 'Unknown'}
        </h3>
        <p>
          {blocker} has blocked your action with {game.pendingAction.claimedRole}.
        </p>
        <p>Do you want to accept the block or challenge it?</p>
        <div className="handler-buttons d-flex justify-content-around mt-3">
          <button className="btn btn-success btn-lg" onClick={handleAcceptBlock} title="Proceed despite the block">
            Accept Block
          </button>
          <button className="btn btn-danger btn-lg" onClick={handleChallengeBlock} title="Challenge the validity of the block">
            Challenge Block
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChallengeBlockHandler;