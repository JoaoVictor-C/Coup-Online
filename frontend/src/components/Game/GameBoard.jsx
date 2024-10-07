import PropTypes from 'prop-types';
import Player from './Player';
import { useDispatch } from 'react-redux';
import { performAction, performExchange } from '../../store/actions/gameActions';

const GameBoard = ({ game, currentUserId, selectedTarget, setSelectedTarget }) => {
  const dispatch = useDispatch();
  const players = game.players;
  const numPlayers = players.length;
  const currentPlayerIndex = players.findIndex(
    (player) => player.playerProfile.user._id === currentUserId
  );
  const otherPlayers = [
    ...players.slice(0, currentPlayerIndex),
    ...players.slice(currentPlayerIndex + 1),
  ];

  // Define fixed positions based on the number of players
  const getPositions = (numPlayers) => {
    switch (numPlayers) {
      case 2:
        return [
          { left: '50%', top: '20%', transform: 'translate(-50%, -50%)' },
        ];
      case 3:
        return [
          { left: '50%', top: '20%', transform: 'translate(-50%, -50%)' },
          { left: '80%', top: '50%', transform: 'translate(-50%, -50%) rotate(90deg)' },
        ];
      case 4:
        return [
          { left: '20%', top: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)' },
          { left: '50%', top: '20%', transform: 'translate(-50%, -50%)' },
          { left: '80%', top: '50%', transform: 'translate(-50%, -50%) rotate(90deg)' },
        ];
      case 5:
        return [
          { left: '50%', top: '10%', transform: 'translate(-50%, -50%)' },
          { left: '80%', top: '30%', transform: 'translate(-50%, -50%)' },
          { left: '80%', top: '70%', transform: 'translate(-50%, -50%)' },
          { left: '20%', top: '70%', transform: 'translate(-50%, -50%)' },
        ];
      case 6:
        return [
          { left: '50%', top: '10%', transform: 'translate(-50%, -50%)' },
          { left: '80%', top: '30%', transform: 'translate(-50%, -50%)' },
          { left: '80%', top: '70%', transform: 'translate(-50%, -50%)' },
          { left: '50%', top: '90%', transform: 'translate(-50%, -50%)' },
          { left: '20%', top: '70%', transform: 'translate(-50%, -50%)' },
          { left: '20%', top: '30%', transform: 'translate(-50%, -50%)' },
        ];
      default:
        // Fallback to circular positioning
        return otherPlayers.map((_, index) => {
          const angle = (index / otherPlayers.length) * 360;
          const radius = 40; // Percentage radius from center
          const x = 50 + radius * Math.cos((angle - 90) * (Math.PI / 180));
          const y = 50 + radius * Math.sin((angle - 90) * (Math.PI / 180));
          return { left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' };
        });
    }
  };

  const positions = getPositions(numPlayers);

  const handleCardClick = (character) => {
    if (character === 'ambassador') {
      handleExchange();
    } else {
      handleAction(character);
    }
  };

  const handleAction = (actionType) => {
    if (
      ['coup', 'assassinate', 'steal'].includes(actionType) &&
      !selectedTarget
    ) {
      console.error('Please select a target player.');
      return;
    }
    actionType = actionType.toLowerCase();
    const actions = {
      duke: 'taxes',
      assassin: 'assassinate',
      ambassador: 'exchange',
      captain: 'steal',
      coup: 'coup',
      foreignAid: 'foreignAid',
      income: 'income'
    }

    const action = actions[actionType];
    dispatch(performAction(game._id, action, selectedTarget))
      .then(() => {
        setSelectedTarget('');
      })
      .catch((error) => {
        console.error('Action failed:', error);
      });
  };

  const handleExchange = () => {
    dispatch(performExchange(game._id))
      .then((message) => {
        setSelectedTarget('');
        console.log(message); // Log success message
      })
      .catch((error) => {
        console.error('Exchange failed:', error);
      });
  };

  return (
    <div className="game-board">
      <div className="players-container">
        {/* Current Player */}
        <Player
          key={currentUserId}
          player={game.players.find((p) => p.playerProfile.user._id === currentUserId)}
          isCurrentPlayer={true}
          isCurrentTurn={game.players[game.currentPlayerIndex]?.playerProfile.user._id === currentUserId}
          style={{
            left: '50%',
            bottom: '20px',
            transform: 'translateX(-50%)',
          }}
          handleCardClick={handleCardClick}
          selectedTarget={selectedTarget}
          game={game}
        />

        {/* Other Players */}
        {otherPlayers.map((player, index) => {
          const position = positions[index];
          return (
            <Player
              key={player.playerProfile.user._id}
              player={player}
              isCurrentPlayer={false}
              isCurrentTurn={game.players[game.currentPlayerIndex]?.playerProfile.user._id === player.playerProfile.user._id}
              style={{
                left: position.left,
                top: position.top,
                transform: position.transform,
              }}
              handleCardClick={handleCardClick}
              selectedTarget={selectedTarget}
              setSelectedTarget={setSelectedTarget}
              nameOnBottom={false}
              game={game}
            />
          );
        })}
      </div>
    </div>
  );
};

GameBoard.propTypes = {
  game: PropTypes.object.isRequired,
  currentUserId: PropTypes.string.isRequired,
  selectedTarget: PropTypes.string,
  setSelectedTarget: PropTypes.func,
};

export default GameBoard;