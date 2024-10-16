import '../../assets/styles/BlockChallengeHandler.css';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { playAgain } from '../../store/actions/gameActions';
import PropTypes from 'prop-types';

const GameOver = ({ gameId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const winner = useSelector(state => state.game.currentGame.winner);

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
        <h3>The game is over</h3>
        {winner && <p className="winner-text">Winner: {winner}</p>}
        <div className="handler-buttons">
          <button className="btn btn-primary" onClick={handlePlayAgain}>Play Again</button>
          <button className="btn btn-secondary" onClick={handleGoToHome}>Go to Home</button>
        </div>
      </div>
    </div>
  );
};

GameOver.propTypes = {
  gameId: PropTypes.string.isRequired,
};

export default GameOver;