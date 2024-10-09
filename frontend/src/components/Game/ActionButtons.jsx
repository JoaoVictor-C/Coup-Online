import { useDispatch } from 'react-redux';
import { performAction } from '../../store/actions/gameActions';
import '../../assets/styles/ActionButtons.css';
import PropTypes from 'prop-types';
const ActionButtons = ({ gameId, currentUserId, selectedTarget, setSelectedTarget }) => {
  const dispatch = useDispatch();

  const handleActionClick = (actionType) => {
    if (['coup', 'assassin', 'captain'].includes(actionType) && !selectedTarget) {
      alert('Please select a target to perform the action.');
      return;
    }
    dispatch(performAction(gameId, actionType, selectedTarget))
      .then(() => {
      })
      .catch((error) => {
        console.error(`Action ${actionType} failed:`, error);
      });
    setSelectedTarget('');
  };

  return (
    <div className="d-flex flex-row gap-2 justify-content-center">
      <button className="btn btn-danger" onClick={() => handleActionClick('coup')} style={{width: 'auto', height: '50px'}}>
        Coup
      </button>
      <button className="btn btn-secondary" onClick={() => handleActionClick('foreignAid')} style={{width: 'auto', height: '50px'}}>
        Foreign Aid
      </button>
      <button className="btn btn-primary" onClick={() => handleActionClick('income')} style={{width: 'auto', height: '50px'}}>
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