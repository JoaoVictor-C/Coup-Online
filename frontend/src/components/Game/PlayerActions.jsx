import PropTypes from 'prop-types';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { performAction, performChallenge, performBlock, acceptAction, respondToBlock, selectExchangeCards, performExchange, performChallengeSuccess, playAgain } from '../../store/actions/gameActions';
import Card from './Card';
import '../../assets/styles/PlayerActions.css';

const PlayerActions = ({ game, currentUserId }) => {
  const dispatch = useDispatch();
  const isCurrentPlayerTurn = game.players[game.currentPlayerIndex]?.playerProfile.user._id === currentUserId;
  const [selectedTarget, setSelectedTarget] = useState('');
  const [selectedExchangeCards, setSelectedExchangeCards] = useState([]);
  const [selectedChallengeCards, setSelectedChallengeCards] = useState([]);

  // Get challenge and block states from Redux
  const { challenge, block } = useSelector((state) => state.game);

  const handleAction = (actionType) => {
    if (
      ['coup', 'assassinate', 'steal'].includes(actionType) &&
      !selectedTarget
    ) {
      console.error('Please select a target player.');
      return;
    }

    dispatch(performAction(game._id, actionType, selectedTarget))
      .then(() => {
        setSelectedTarget('');
      })
      .catch((error) => {
        console.error('Action failed:', error);
      });
  };

  const handleSelectChange = (e) => {
    setSelectedTarget(e.target.value);
  };

  const handleChallenge = () => {
    if (!game.pendingAction) {
      console.error('No pending action to challenge.');
      return;
    }
    dispatch(
      performChallenge(game._id, currentUserId)
    )
      .then((message) => {
        console.log(message); // Log success message
      })
      .catch((error) => {
        console.error('Challenge failed:', error);
      });
  };

  const handleBlock = () => {
    if (!game.pendingAction) {
      console.error('No pending action to block.');
      return;
    }
    dispatch(
      performBlock(game._id, currentUserId, game.pendingAction.type)
    )
      .then((message) => {
        console.log(message); // Log success message
      })
      .catch((error) => {
        console.error('Block failed:', error);
      });
  };

  const handleAcceptAction = () => {
    dispatch(acceptAction(game._id))
      .then((message) => {
        console.log(message); // Log success message
      })
      .catch((error) => {
        console.error('Accept action failed:', error);
      });
  };

  // New handler for Exchange
  const handleExchange = () => {
    dispatch(performExchange(game._id))
      .then((message) => {
        console.log(message); // Log success message
      })
      .catch((error) => {
        console.error('Exchange failed:', error);
      });
  };

  const handleRespondToBlock = (response) => {
    dispatch(respondToBlock(game._id, response, currentUserId))
      .then((message) => {
        console.log(message); // Log success message
      })
      .catch((error) => {
        console.error('Response failed:', error);
      });
  };
  
  const toggleExchangeCardSelection = (card, index) => {
    const user = game.players.find(p => p.playerProfile.user._id === currentUserId);
    const userCardCount = user.characters.length;
    const requiredSelections = userCardCount === 1 ? 1 : 2;

    setSelectedExchangeCards((prevSelected) => {
      const cardIndex = prevSelected.findIndex(c => c.card === card && c.index === index);
      if (cardIndex !== -1) {
        // If card is already selected, remove it
        return prevSelected.filter((_, i) => i !== cardIndex);
      } else if (prevSelected.length < requiredSelections) {
        // If less than required cards are selected, add the new card
        return [...prevSelected, { card, index }];
      } else {
        // If required cards are already selected, replace the first one if there are 2
        if (prevSelected.length === 2) {
          return [{ card, index }, prevSelected[1]];
        }
        return [{ card, index }];
      }
    });
  }

  // New function to toggle challenge card selection
  const toggleChallengeCardSelection = (card, index) => {
    const user = game.players.find(p => p.playerProfile.user._id === currentUserId);
    const userCardCount = user.characters.length;
    const requiredSelections = userCardCount;

    setSelectedChallengeCards((prevSelected) => {
      const cardIndex = prevSelected.findIndex(c => c.card === card && c.index === index);
      if (cardIndex !== -1) {
        // If card is already selected, remove it
        return prevSelected.filter((_, i) => i !== cardIndex);
      } else if (prevSelected.length < requiredSelections) {
        // If less than required cards are selected, add the new card
        return [...prevSelected, { card, index }];
      } else {
        // If required cards are already selected, replace the first one
        return [{ card, index }, ...prevSelected.slice(1)];
      }
    });
  }

  // Handler for selecting exchange cards
  const handleExchangeSelection = () => {
    const user = game.players.find(p => p.playerProfile.user._id === currentUserId);
    const userCardCount = user.characters.length;

    const requiredSelections = userCardCount === 1 ? 1 : 2;

    if (selectedExchangeCards.length !== requiredSelections) {
      alert(`Please select exactly ${requiredSelections} card(s) to keep.`);
      return;
    }
    dispatch(selectExchangeCards(game._id, selectedExchangeCards.map(item => item.card)))
      .then(() => {
        setSelectedExchangeCards([]);
      })
      .catch((error) => {
        console.error('Exchange selection failed:', error);
      });
  };

  // New handler for challenge success selection
  const handleChallengeSelection = () => {
    const user = game.players.find(p => p.playerProfile.user._id === currentUserId);
    const userCardCount = user.characters.length;
    const requiredSelections = userCardCount;

    if (selectedChallengeCards.length !== requiredSelections) {
      alert(`Please select exactly ${requiredSelections} card(s) to keep.`);
      return;
    }
    dispatch(performChallengeSuccess(game._id, selectedChallengeCards.map(item => item.card)))
      .then(() => {
        setSelectedChallengeCards([]);
      })
      .catch((error) => {
        console.error('Challenge selection failed:', error);
      });
  };

  const handlePlayAgain = () => {
    dispatch(playAgain(game._id))
      .then(() => {
        console.log('Play again successful');
      })
      .catch((error) => {
        console.error('Play again failed:', error);
      });
  };

  // Determine if a challenge or block is active
  const isChallenging = challenge.isChallenging;
  const isBlocking = block.isBlocking;

  if (isChallenging || isBlocking) {
    return <div className="alert alert-info">Processing...</div>;
  }

  // Check if the game is over
  if (game.status === 'finished') {
    return (
      <div className="game-over card">
        <div className="card-body">
          <h3 className="card-title mb-3 text-light">Game Over</h3>
          <p className="text-light">Winner: {game.winner}</p>
          <button
            className="btn btn-primary"
            onClick={() => handlePlayAgain()}
          >
            Play Again
          </button>
        </div>
      </div>
    )
  }

  // Check if user is dead
  const user = game.players.find(p => p.playerProfile.user._id === currentUserId);
  if (!user.isAlive) {
    return <div className="alert alert-info">You are dead. Waiting for the game to finish.</div>;
  }

  // Handle UI when all acceptances have been received
  if (game.pendingAction && game.pendingAction.type !== 'exchange' && game.pendingAction.requiredToAccept && game.pendingAction.acceptedPlayers.length === game.players.length - 1) {
    return <div className="alert alert-success">All players have accepted the action. Executing...</div>;
  }

  // Handle UI when pending action requires acceptance
  if (game.pendingAction && !isCurrentPlayerTurn && game.pendingAction.canBeAccepted) {
    const acceptedCount = game.pendingAction.acceptedPlayers?.length || 0;
    const requiredAccepts = game.players.length - 1;

    return (
      <div className="alert alert-info">
        <p>Waiting for other players to accept the action...</p>
        <p>
          Accepted by {acceptedCount}/{requiredAccepts} players.
        </p>
        <button
          className="btn btn-primary"
          onClick={handleAcceptAction}
          disabled={game.pendingAction.acceptedPlayers.includes(currentUserId)}
        >
          Accept Action
        </button>
      </div>
    );
  }

  // Handle UI when challenge is successful and player needs to select card(s) to keep
  if (game.pendingAction && game.pendingAction.type === 'challengeSuccess' && game.pendingAction.userId === currentUserId) {
    const user = game.players.find(p => p.playerProfile.user._id === currentUserId);
    const userCharacters = game.pendingAction.exchange?.combinedCards || [];
    const requiredSelections = user.characters.length;

    return (
      <div className="challenge-success card">
        <div className="card-body">
          <h3 className="card-title mb-3 text-light">Challenge Successful</h3>
          <p className="text-light">Select {requiredSelections} card(s) to keep:</p>
          <div className="d-flex flex-wrap justify-content-center gap-3 mb-3">
            {userCharacters.map((card, index) => (
              <div 
                key={index} 
                className={`card ${selectedChallengeCards.some(item => item.card === card && item.index === index) ? 'border-primary' : ''}`} 
                onClick={() => toggleChallengeCardSelection(card, index)}
                style={{ cursor: 'pointer' }}
              >
                <div className="card-body text-center">
                  <h5 className="card-title text-light">{card}</h5>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center">
            <button 
              className="btn btn-primary" 
              onClick={handleChallengeSelection}
              disabled={selectedChallengeCards.length !== requiredSelections}
            >
              Confirm Selection ({selectedChallengeCards.length}/{requiredSelections})
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle UI when there is a pending exchange action
  if (game.pendingAction && game.pendingAction.type === 'exchange' && game.pendingAction.userId === currentUserId && game.pendingAction.accepted) {
    const combinedCards = game.pendingAction.exchange?.combinedCards || [];
    const user = game.players.find(p => p.playerProfile.user._id === currentUserId);
    const userCardCount = user.characters.length;

    const selectLimit = userCardCount === 1 ? 1 : 2;

    return (
      <div className="exchange-selection card">
        <div className="card-body">
          <h3 className="card-title mb-3 text-light">Exchange Action</h3>
          <p className="text-light">Select {selectLimit} card(s) to keep:</p>
          <div className="d-flex flex-wrap justify-content-center gap-3 mb-3">
            {combinedCards.map((card, index) => (
              <div 
                key={index} 
                className={`card ${selectedExchangeCards.some(item => item.card === card && item.index === index) ? 'border-primary' : ''}`} 
                onClick={() => toggleExchangeCardSelection(card, index)}
                style={{ cursor: 'pointer' }}
              >
                <div className="card-body text-center">
                  <h5 className="card-title text-light">{card}</h5>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center">
            <button 
              className="btn btn-primary" 
              onClick={handleExchangeSelection} 
              disabled={selectedExchangeCards.length !== selectLimit}
            >
              Confirm Selection ({selectedExchangeCards.length}/{selectLimit})
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle UI when your action is blocked
  if (
    game.pendingAction &&
    game.pendingAction.blockPending  &&
    game.pendingAction.userId === currentUserId
  ) {
    return (
      <div className="player-actions card">
        <div className="card-body">
          <h3 className="card-title mb-3 text-light">Your Action Was Blocked</h3>
          <div className="d-grid gap-2">
            <p className="text-light">
              Blocked by: {game.pendingAction.blocker} 
            </p>
            <button
              className="btn btn-outline-success"
              onClick={() => handleRespondToBlock('accept')}
            >
              Accept Block
            </button>
            <button
              className="btn btn-outline-danger"
              onClick={() => handleRespondToBlock('challenge')}
            >
              Challenge Block
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle UI when someone blocked another person (just a screen to wait for their actions)
  if (game.pendingAction && game.pendingAction.blockPending && game.pendingAction.userId !== currentUserId) {
    const respondingPlayer = game.players.find(player => player.playerProfile.user._id === game.pendingAction.userId);
    return (
      <div className="player-actions card">
        <div className="card-body">
          <h3 className="card-title mb-3 text-light">Action Blocked</h3>
          <p className="text-light">
            Waiting for {respondingPlayer ? respondingPlayer.username : 'player'} to respond...
          </p>
        </div>
      </div>
    );
  }

  // Handle UI when there is a pending action to challenge or block
  if (game.pendingAction && game.pendingAction.userId !== currentUserId) {
    const canChallenge = game.pendingAction.canBeChallenged;
    const canBlock = game.pendingAction.canBeBlocked;

    return (
      <div className="player-actions card">
        <div className="card-body">
          <h3 className="card-title mb-3 text-light">Pending Action</h3>
          <div className="d-grid gap-2">
            {canChallenge && (
              <button
                className="btn btn-outline-warning"
                onClick={handleChallenge}
              >
                Challenge Action
              </button>
            )}
            {canBlock && (
              <button
                className="btn btn-outline-secondary"
                onClick={handleBlock}
              >
                Block Action
              </button>
            )}
            <button
              className="btn btn-outline-success"
              onClick={handleAcceptAction}
            >
              Accept Action
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (game.pendingAction && game.pendingAction.userId === currentUserId) {
    return <div className="alert alert-info">Waiting for other players to make their moves...</div>;
  }

  if (!isCurrentPlayerTurn) {
    return <div className="alert alert-info">Waiting for your turn...</div>;
  }

  return (
    <div>
      {isCurrentPlayerTurn && (
        <div className="player-actions card">
          <div className="card-body">
            <h3 className="card-title mb-3 text-light">Your Turn</h3>
            <div className="d-grid gap-2">
              {/* Action Buttons */}
              <button
                className="btn btn-primary"
                onClick={() => handleAction('income')}
              >
                Take Income
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleAction('foreignAid')}
              >
                Foreign Aid
              </button>
              <button
                className="btn btn-success"
                onClick={() => handleAction('taxes')}
              >
                Taxes
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleAction('coup')}
              >
                Coup
              </button>
              <button
                className="btn btn-warning"
                onClick={() => handleAction('assassinate')}
              >
                Assassinate
              </button>
              <button
                className="btn btn-info"
                onClick={handleExchange}
              >
                Exchange
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleAction('steal')}
              >
                Steal
              </button>
            </div>
            {/* Target Selection */}
            <div className="mt-3">
              <label htmlFor="targetPlayer" className="form-label text-light">Select Target Player:</label>
              <select
                id="targetPlayer"
                className="form-select"
                value={selectedTarget}
                onChange={handleSelectChange}
              >
                <option value="">-- Select --</option>
                {game.players
                  .filter(
                    (player) =>
                      player.playerProfile.user._id !== currentUserId &&
                      player.isAlive
                  )
                  .map((player) => (
                    <option key={player.playerProfile.user._id} value={player.playerProfile.user._id}>
                      {player.playerProfile.user.username}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>
      )}
      
      {/* Display Real Cards to the Right of the User */}
      {user && (
        <div className="user-cards">
          {user.characters.map((character, index) => (
            <Card 
              key={index} 
              character={character} 
              isRevealed={true} 
              isSelectable={false} 
              onClick={null}
            />
          ))}
        </div>
      )}
    </div>
  );
};

PlayerActions.propTypes = {
  game: PropTypes.object.isRequired,
  currentUserId: PropTypes.string.isRequired,
};

export default PlayerActions;