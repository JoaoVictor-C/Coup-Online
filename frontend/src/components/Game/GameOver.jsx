import '../../assets/styles/BlockChallengeHandler.css';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { playAgain } from '../../store/actions/gameActions';
import PropTypes from 'prop-types';
const GameOver = ({ gameId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handlePlayAgain = () => {
    dispatch(playAgain(gameId))
      .catch((error) => {
        console.error('Failed to restart game:', error);
      });
  };

  const handleGoToHome = () => {
    navigate('/');
  };
  return (
    <div className="block-challenge-handler">
        <div className="handler-content border border-light">
            <h3 className="">The game is over</h3>
            <div className="handler-buttons">
                <button className="btn btn-primary" onClick={handlePlayAgain}>Play again</button>
                <button className="btn btn-secondary" onClick={handleGoToHome}>Go to home</button>
            </div>
        </div>
    </div>
  );
};

GameOver.propTypes = {
  gameId: PropTypes.string.isRequired,
};

export default GameOver;