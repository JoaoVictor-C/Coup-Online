import { useDispatch } from 'react-redux';
import { performAction } from '../../store/actions/gameActions';
import '../../assets/styles/ActionButtons.css';
import PropTypes from 'prop-types';
const ActionButtons = ({ gameId, currentUserId, selectedTarget, setSelectedTarget }) => {
  const dispatch = useDispatch();

  const handleActionClick = (actionType) => {
    dispatch(performAction(gameId, actionType, selectedTarget))
      .then(() => {
        setSelectedTarget('');
      })
      .catch((error) => {
        console.error(`Action ${actionType} failed:`, error);
      });
  };

  return (
    <div className="action-buttons">
      <button className="btn btn-coup" onClick={() => handleActionClick('coup')}>
        Coup
      </button>
      <button className="btn btn-foreign-aid" onClick={() => handleActionClick('foreignAid')}>
        Foreign Aid
      </button>
      <button className="btn btn-income" onClick={() => handleActionClick('income')}>
        Income
      </button>
    </div>
  );
};

ActionButtons.propTypes = {
  gameId: PropTypes.string.isRequired,
  currentUserId: PropTypes.string.isRequired,
  selectedTarget: PropTypes.string,
  setSelectedTarget: PropTypes.func.isRequired,
};

export default ActionButtons;