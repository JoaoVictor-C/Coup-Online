import PropTypes from 'prop-types';

const GameMenu = ({ onLeaveGame }) => {
  return (
    <div className="game-menu">
      <button onClick={onLeaveGame}>Leave Game</button>
      {/* Add more menu options here */}
    </div>
  );
};

GameMenu.propTypes = {
  onLeaveGame: PropTypes.func.isRequired,
};

export default GameMenu;