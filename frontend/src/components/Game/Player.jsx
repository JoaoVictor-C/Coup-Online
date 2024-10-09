import PropTypes from 'prop-types';
import Card from './Card';
import Coin from './Coin';
import { useEffect, useState } from 'react';
import ActionButtons from './ActionButtons';

const Player = ({
  player,
  isCurrentPlayer,
  isCurrentTurn,
  style,
  handleCardClick,
  selectedTarget,
  setSelectedTarget,
  nameOnBottom,
  game,
  handleCardSelection,
}) => {
  const [isSelected, setIsSelected] = useState(false);

  const actionCards = ['duke', 'assassin', 'ambassador', 'captain'];

  useEffect(() => {
    if (selectedTarget === player.playerProfile.user._id) {
      setIsSelected(true);
    } else {
      setIsSelected(false);
    }
  }, [selectedTarget, player.playerProfile.user._id]);

  const style2 = {
    position: 'absolute',
    left: '30%',
    bottom: '20px',
    transform: 'translateX(-30%)',
  };

  return (
    <div className={`player ${isCurrentPlayer ? 'current-player' : 'other-player'} ${isCurrentTurn ? 'current-turn' : ''}`}>
      <div
        className={`card ${isCurrentPlayer ? 'border-warning' : 'border-secondary'} 
        ${isCurrentTurn ? 'shadow' : ''} ${isSelected ? 'shadow-lg border-danger' : ''} 
        ${!isCurrentPlayer && !isCurrentTurn ? 'cursor-pointer' : ''} game-card ${isCurrentPlayer ? 'selectable' : ''}`}
        onClick={() => handleCardSelection(player.playerProfile.user._id)}
        style={style}
      >
        <div className="card-body text-center">
          {!nameOnBottom && (
            <h5 className="card-title text-light d-flex align-items-center justify-content-center gap-3">
              {player.username}
              <Coin count={player.coins} />
            </h5>
          )}

          <div className="card-container mt-2 d-flex flex-row">
            {player.characters.map((character, index) => (
              <Card
                key={index}
                character={character}
                isRevealed={isCurrentPlayer}
                isSelectable={false}
                className={`me-2 mb-2 ${!isCurrentTurn ? 'opacity-50 disabled' : ''}`}
              />
            ))}
            {player.deadCharacters.map((character, index) => (
              <Card
                key={index}
                character={character}
                isRevealed={true}
                isSelectable={false}
                className="action-card dead-card me-2 mb-2"
                style={{ filter: 'grayscale(100%)', opacity: '0.7' }}
                enabled={false}
              />
            ))}
          </div>
          {nameOnBottom && (
            <h5 className="card-title text-light mt-2">{player.username}</h5>
          )}
          {isCurrentTurn && (
            <div className="text-success fw-bold">Current Turn</div>
          )}
        </div>
      </div>
      {isCurrentTurn && isCurrentPlayer && !game.pendingAction && (
        <div className="card mt-3" style={style2}>
          <div className="card-body text-center">
            <p className="card-text">Your Action</p>
            <div className="d-flex justify-content-center flex-row">
              {isCurrentPlayer &&
                actionCards.map((character, index) => (
                  <Card
                    key={index}
                    character={character}
                    isRevealed={isCurrentPlayer}
                    isSelectable={isCurrentPlayer}
                    onClick={() => handleCardClick(character)}
                    className="action-card me-3 mb-2 p-0"
                    enabled={isCurrentTurn}
                  />
                ))}
            </div>
            <div className="mt-3">
              {isCurrentTurn &&
                isCurrentPlayer &&
                !game.pendingAction && (
                  <ActionButtons
                    gameId={game._id}
                    currentUserId={player.playerProfile.user._id}
                    selectedTarget={selectedTarget}
                    setSelectedTarget={setSelectedTarget}
                  />
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

Player.propTypes = {
  player: PropTypes.object.isRequired,
  isCurrentPlayer: PropTypes.bool.isRequired,
  isCurrentTurn: PropTypes.bool.isRequired,
  style: PropTypes.object,
  handleCardClick: PropTypes.func,
  selectedTarget: PropTypes.string,
  setSelectedTarget: PropTypes.func,
  nameOnBottom: PropTypes.bool,
  game: PropTypes.object,
  handleCardSelection: PropTypes.func,
};

export default Player;