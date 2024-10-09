    // Start of Selection
    import { useDispatch, useSelector } from 'react-redux';
    import { performBlock, performChallenge, acceptAction } from '../../store/actions/gameActions';
    import '../../assets/styles/BlockChallengeHandler.css';
    import PropTypes from 'prop-types';
    
    const BlockChallengeHandler = ({ alreadyClicked, setAlreadyClicked }) => {
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
        setAlreadyClicked(true);
        dispatch(performBlock(game._id, currentUserId, game.pendingAction.type))
          .catch((error) => {
            console.error('Block failed:', error);
            setAlreadyClicked(false);
          });
      };
    
      const handleChallenge = () => {
        setAlreadyClicked(true);
        dispatch(performChallenge(game._id, currentUserId))
          .catch((error) => {
            console.error('Challenge failed:', error);
            setAlreadyClicked(false);
          });
      };
    
      const handleAcceptAction = () => {
        setAlreadyClicked(true);
        dispatch(acceptAction(game._id))
          .catch((error) => {
            console.error('Accept action failed:', error);
            setAlreadyClicked(false);
          });
      };
    
      return (
        <div className="block-challenge-handler">
          <div className="handler-content card p-4 shadow-sm">
            <h3>Action Available: {getActionName(game.pendingAction.type)} by {game.players.find(p => p.playerProfile.user._id === game.pendingAction.userId)?.playerProfile.user.username || 'Unknown'}</h3>
            <p>Do you want to {game.pendingAction.canBeBlocked ? 'block' : ''} {game.pendingAction.canBeChallenged ? 'or challenge' : ''} this action?</p>
            <div className="handler-buttons d-flex justify-content-around mt-3">
              {game.pendingAction?.canBeBlocked && (
                <button
                  className="btn btn-warning"
                  onClick={handleBlock}
                  disabled={alreadyClicked}
                >
                  Block
                </button>
              )}
              {game.pendingAction?.canBeChallenged && (
                <button
                  className="btn btn-danger"
                  onClick={handleChallenge}
                  disabled={alreadyClicked}
                >
                  Challenge
                </button>
              )}
              <button
                className="btn btn-success"
                onClick={handleAcceptAction}
                disabled={alreadyClicked}
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