import PropTypes from 'prop-types';
import Player from './Player';
import { useDispatch } from 'react-redux';
import { performAction, performExchange, fetchGame } from '../../store/actions/gameActions';
import { Container, Row, Col } from 'react-bootstrap'; // Import Bootstrap components

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
          { left: '50%', top: '20%', transform: 'translate(-50%, -40%)', position: 'absolute' },
          { left: '50%', top: '80%', transform: 'translate(-50%, -50%)', position: 'absolute' },
        ];
      case 3:
        return [
          { left: '31%', top: '20%', transform: 'translate(-50%, -40%)', position: 'absolute' },
          { left: '69%', top: '20%', transform: 'translate(-49%, -40%)', position: 'absolute' },
          { left: '20%', top: '20%', transform: 'translate(-50%, -50%) rotate(-90deg)', position: 'absolute' },
        ];
      case 4:
        return [
          { left: '25%', top: '20%', transform: 'translate(-50%, -40%)', position: 'absolute' },
          { left: '50%', top: '20%', transform: 'translate(-50%, -40%)', position: 'absolute' },
          { left: '75%', top: '20%', transform: 'translate(-50%, -40%)', position: 'absolute' },
          { left: '100%', top: '80%', transform: 'translate(-50%, -50%)', position: 'absolute' },
        ];
      // Add more cases as needed
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
    console.log('actionType', actionType);
    if (
      ['coup', 'assassin', 'captain'].includes(actionType) &&
      !selectedTarget
    ) {
      alert('Please select a target to perform the action.');
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

  const handleCardSelection = (targetId) => {
    if (game.players[game.currentPlayerIndex]?.playerProfile.user._id === currentUserId && targetId !== currentUserId) {
      setSelectedTarget(targetId);
    }
  };

  let currentPlayerStyle = {};

  // If it is the current player turn, set the style to the current player style
  if (game.players[game.currentPlayerIndex]?.playerProfile.user._id === currentUserId && !game.pendingAction) {
    currentPlayerStyle = {
      left: '75%',
      bottom: '20px',
      transform: 'translateX(-75%)',
      position: 'absolute',
    }
  } else {
    currentPlayerStyle = {
      left: '50%',
      bottom: '20px',
      transform: 'translateX(-50%)',
      position: 'absolute',
    }
  }


  // Calculate accepted and required counts for the pending action
  const acceptedCount = game.pendingAction?.acceptedPlayers?.length || 0;
  const requiredCount = game.pendingAction?.requiredPlayers || game.players.length;

  return (
    <Container fluid className="game-board">
      {game.pendingAction && (
        <div style={{
          position: 'absolute',
          bottom: '120px',
          left: '20px',
          zIndex: 1000,
          padding: '10px',
          backgroundColor: '#cce5ff',
          border: '1px solid #b8daff',
          borderRadius: '4px',
          color: '#004085',
          maxWidth: '300px'
        }}>
          {acceptedCount}/{requiredCount-1} players have accepted the pending action.
        </div>
      )}
      <Row className="players-container">
        <Col
          xs={12}
          md={6}
          className="d-flex justify-content-center align-items-center mb-4"
        >
          <Player
            key={currentUserId}
            player={game.players.find((p) => p.playerProfile.user._id === currentUserId)}
            isCurrentPlayer={true}
            isCurrentTurn={game.players[game.currentPlayerIndex]?.playerProfile.user._id === currentUserId}
            style={currentPlayerStyle}
            handleCardClick={handleCardClick}
            selectedTarget={selectedTarget}
            setSelectedTarget={setSelectedTarget}
            game={game}
            handleCardSelection={handleCardSelection}
          />
        </Col>

        {/* Other Players */}
        {otherPlayers.map((player, index) => {
          const position = positions[index];
          return (
            <Col
              key={player.playerProfile.user._id}
              xs={12}
              md={6}
              className="d-flex justify-content-center align-items-center mb-4"
            >
              <Player
                player={player}
                isCurrentPlayer={false}
                isCurrentTurn={game.players[game.currentPlayerIndex]?.playerProfile.user._id === player.playerProfile.user._id}
                style={{
                  position: 'absolute', // Ensure absolute positioning
                  left: position.left,
                  top: position.top,
                  transform: position.transform,
                }}
                handleCardClick={handleCardClick}
                selectedTarget={selectedTarget}
                setSelectedTarget={setSelectedTarget}
                nameOnBottom={false}
                game={game}
                handleCardSelection={handleCardSelection}
              />
            </Col>
          );
        })}
      </Row>
    </Container>
  );
};

GameBoard.propTypes = {
  game: PropTypes.object.isRequired,
  currentUserId: PropTypes.string.isRequired,
  selectedTarget: PropTypes.string,
  setSelectedTarget: PropTypes.func,
};

export default GameBoard;