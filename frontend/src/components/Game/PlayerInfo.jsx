import PropTypes from 'prop-types';
import '../../assets/styles/PlayerInfo.css';

const PlayerInfo = ({ game, currentUserId }) => {
  const player = game.players.find(p => p.playerProfile.user._id === currentUserId);
  
  return (
    <div className="player-info">
      <h2 className="player-info__title">Your Information</h2>
      <p className="player-info__name">Name: {player.username}</p>
      <p className="player-info__coins">Coins: {player.coins}</p>
      <div className="player-info__characters">
        <h3>Characters:</h3>
        <ul>
          {player.characters.map((char, index) => (
            <li key={index}>{char}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

PlayerInfo.propTypes = {
  game: PropTypes.object.isRequired,
  currentUserId: PropTypes.string.isRequired,
};

export default PlayerInfo;