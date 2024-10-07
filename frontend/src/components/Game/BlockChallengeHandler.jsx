import { useDispatch, useSelector } from 'react-redux';
import { performBlock, performChallenge, acceptAction } from '../../store/actions/gameActions';
import '../../assets/styles/BlockChallengeHandler.css';

const BlockChallengeHandler = () => {
  const dispatch = useDispatch();
  const game = useSelector((state) => state.game.currentGame);
  const currentUserId = useSelector((state) => state.auth.userId);

  const handleBlock = () => {
    dispatch(performBlock(game._id, currentUserId, game.pendingAction.type))
      .catch((error) => {
        console.error('Block failed:', error);
      });
  };

  const handleChallenge = () => {
    dispatch(performChallenge(game._id, currentUserId))
      .catch((error) => {
        console.error('Challenge failed:', error);
      });
  };

  const handleAcceptAction = () => {
    dispatch(acceptAction(game._id))
      .catch((error) => {
        console.error('Accept action failed:', error);
      });
  };

  return (
    <div className="block-challenge-handler">
      <div className="handler-content">
        <h3>Action Available</h3>
        <p>Do you want to block or challenge this action?</p>
        <div className="handler-buttons">
          {game.pendingAction?.canBeBlocked && (
            <button className="btn btn-block" onClick={handleBlock}>
              Block
            </button>
          )}
          {game.pendingAction?.canBeChallenged && (
            <button className="btn btn-challenge" onClick={handleChallenge}>
              Challenge
            </button>
          )}
          <button className="btn btn-accept" onClick={handleAcceptAction}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlockChallengeHandler;