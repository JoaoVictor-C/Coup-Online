import { useDispatch, useSelector } from 'react-redux';
import { respondToBlock } from '../../store/actions/gameActions';
import '../../assets/styles/ChallengeBlockHandler.css';

const ChallengeBlockHandler = () => {
  const dispatch = useDispatch();
  const game = useSelector((state) => state.game.currentGame);
  const currentUserId = useSelector((state) => state.auth.userId);
  const blocker = game.players.find(p => p.playerProfile.user._id === game.pendingAction.blockerId)?.username || 'Unknown';

  const handleAcceptBlock = () => {
    dispatch(respondToBlock(game._id, 'accept', currentUserId))
      .catch((error) => {
        console.error('Accept Block failed:', error);
      });
  };

  const handleChallengeBlock = () => {
    dispatch(respondToBlock(game._id, 'challenge', currentUserId))
      .catch((error) => {
        console.error('Challenge Block failed:', error);
      });
  };

  return (
    <div className="challenge-block-handler">
      <div className="handler-content">
        <h3>Action Blocked</h3>
        <p>{blocker} has blocked your action.</p>
        <p>Do you want to accept the block or challenge it?</p>
        <div className="handler-buttons">
          <button className="btn btn-accept" onClick={handleAcceptBlock}>
            Accept Block
          </button>
          <button className="btn btn-challenge" onClick={handleChallengeBlock}>
            Challenge Block
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChallengeBlockHandler;