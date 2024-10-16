    import { useDispatch, useSelector } from 'react-redux';
    import { performBlock, performChallenge, acceptAction } from '../../store/actions/gameActions';
    import '../../assets/styles/BlockChallengeHandler.css';
    import PropTypes from 'prop-types';
    
    const BlockChallengeHandler = () => {
      const dispatch = useDispatch();
      const game = useSelector((state) => state.game.currentGame);
      const currentUserId = useSelector((state) => state.auth.userId);
    
      const getActionName = (type) => {
        const actionNames = {
          income: 'Income',
          foreignAid: 'Foreign Aid',
          coup: 'Coup',
          steal: 'Steal',
          taxes: 'Taxes',
          assassinate: 'Assassinate',
          exchange: 'Exchange',
          challengeSuccess: 'Challenge Success',
          challengeSuccessSelection: 'Challenge Success Selection',
        };
        return actionNames[type] || type;
      };
    
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
    
      const isAssassinate = game.pendingAction.type === 'assassinate';
      const isTargetUser = game.pendingAction.targetUserId === currentUserId;
      const canShowBlock = game.pendingAction.canBeBlocked && (!isAssassinate || isTargetUser);
    
      return (
        <div className="block-challenge-handler">
          <div className="handler-content card p-4 shadow-sm text-light">
            <h3 className="mb-3">Action Pending:</h3>
            <p className="lead">
              <strong>{game.players.find(p => p.playerProfile.user._id === game.pendingAction.userId)?.playerProfile.user.username || 'Unknown'}</strong>
              {' '}is attempting to{' '}
              <strong>{getActionName(game.pendingAction.type).toLowerCase()}</strong>
              {game.pendingAction.targetUserId && (
                <>
                  {' '}against{' '}
                  <strong>
                    {game.players.find(p => p.playerProfile.user._id === game.pendingAction.targetUserId)?.playerProfile.user.username || 'Unknown'}
                  </strong>
                </>
              )}
            </p>
            <p>
              Do you want to {game.pendingAction.canBeBlocked ? 'block' : ''}{' '}
              {game.pendingAction.canBeChallenged ? 'or challenge' : ''} this action?
            </p>
            <div className="handler-buttons d-flex justify-content-around mt-3">
              {canShowBlock && (
                <button
                  className="btn btn-warning"
                  onClick={handleBlock}
                >
                  Block
                </button>
              )}
              {game.pendingAction?.canBeChallenged && (
                <button
                  className="btn btn-danger"
                  onClick={handleChallenge}
                >
                  Challenge
                </button>
              )}
              <button
                className="btn btn-success"
                onClick={handleAcceptAction}
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      );
    };
    
    BlockChallengeHandler.propTypes = {
      alreadyClicked: PropTypes.bool.isRequired,
      setAlreadyClicked: PropTypes.func.isRequired,
    };
    
    export default BlockChallengeHandler;