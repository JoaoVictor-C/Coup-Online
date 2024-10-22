 // Start of Selection
import React, { useContext, useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import GameHub from './GameHub';
import { Game, ActionLog, Action, PendingAction, ActionResponse } from '@utils/types';
import { Container, Spinner, Alert, Modal, Button } from 'react-bootstrap';
import GameBoard from './GameBoard';
import GameLobby from './GameLobby';
import { getToken } from '@utils/auth';
import authService from '@services/authService';
import { GameContext } from '@context/GameContext';

const GameRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const isSpectatorRoute = location.pathname.startsWith('/spectator/');
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showRejoinModal, setShowRejoinModal] = useState<boolean>(false);
  const [isSpectator, setIsSpectator] = useState<boolean>(isSpectatorRoute);
  const { handlePendingAction } = useContext(GameContext);
  const [gameHub, setGameHub] = useState<GameHub | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError('User not authenticated.');
      setLoading(false);
      return;
    }

    const newGameHub = new GameHub(token);

    newGameHub.connect()
      .then(() => {
        console.log('Connected to GameHub');
        return newGameHub.reconnect(id || '');
      })
      .then(() => {
        return newGameHub.getGameState(id || '');
      })
      .catch((err: any) => {
        console.error('Connection failed: ', err);
        setError('Failed to connect to the game server.');
        setLoading(false);
      });

    setGameHub(newGameHub);

    return () => {
      newGameHub.disconnect()
        .then(() => console.log('Disconnected from GameHub'))
        .catch((err: any) => console.error('Error disconnecting:', err));
    };
  }, [id, isSpectator]);

  // If the user isn't active, but he is on the page, try to reconnect
  useEffect(() => {
    if (!gameHub) return;
    gameHub.on('ReconnectFailed', (message: string) => {
      if (message === 'Player is not active.') {
        gameHub.reconnect(id || '');
      }
    });
  }, [gameHub, id]);

  useEffect(() => {
    authService.getUser(getToken() || '').then(user => {
      setCurrentUserId(user.id);
    }).catch(err => {
      console.error('Failed to get user:', err);
    });
  }, []);

  useEffect(() => {
    if (!gameHub) return;

    // Event listeners
    gameHub.on('Connected', (message: string) => {
      console.log(message);
    });

    gameHub.on('GameState', (gameState: Game) => {
      console.log('Received GameState:', gameState);
      setGame(gameState);
      setLoading(false);
    });

    gameHub.on('GameStarted', (gameId: string) => {
      console.log(`Game ${gameId} has started.`);
    });

    gameHub.on('PendingAction', (pendingAction: PendingAction) => {
      handlePendingAction(pendingAction);
    });

    gameHub.on('ActionResolved', (resolvedAction: PendingAction) => {
      console.log('Action resolved:', resolvedAction);
      handlePendingAction(null);
    });

    gameHub.on('ActionResponseReceived', (userId: string, response: ActionResponse) => {
      console.log(`User ${userId} responded with ${response}`);
    });

    gameHub.on('ActionPerformed', (actionLog: ActionLog) => {
      console.log('Action performed:', actionLog);
    });

    gameHub.on('ActionSucceeded', (playerId: string, action: string, targetId?: string) => {
      const newLog: ActionLog = {
        timestamp: new Date(),
        playerId,
        action,
        targetId,
      };
      setGame(prevGame => {
        if (prevGame) {
          return {
            ...prevGame,
            actionsHistory: [...prevGame.actionsHistory, newLog],
          };
        }
        return prevGame;
      });
    });

    // Additional SignalR event handlers
    gameHub.on('ActionChallenged', (challengerId: string, challengedUserId: string, message: string) => {
      const challengeLog: ActionLog = {
        timestamp: new Date(),
        playerId: challengerId,
        action: 'Challenged',
        targetId: challengedUserId,
      };
      setGame(prevGame => {
        if (prevGame) {
          return {
            ...prevGame,
            actionsHistory: [...prevGame.actionsHistory, challengeLog],
          };
        }
        return prevGame;
      });
      console.log(`${challengerId} challenged ${challengedUserId}'s action: ${message}`);
    });

    gameHub.on('ActionBlocked', (blockerId: string, blockedUserId: string, action: string) => {
      const blockLog: ActionLog = {
        timestamp: new Date(),
        playerId: blockerId,
        action: `Blocked ${action}`,
        targetId: blockedUserId,
      };
      setGame(prevGame => {
        if (prevGame) {
          return {
            ...prevGame,
            actionsHistory: [...prevGame.actionsHistory, blockLog],
          };
        }
        return prevGame;
      });
      console.log(`${blockerId} blocked ${blockedUserId}'s action: ${action}`);
    });

    gameHub.on('ReceivePendingAction', (data: any) => {
      handlePendingAction(data);
    });

    gameHub.on('ReconnectSucceeded', (message: string) => {
      console.log(message);
      // Optional: Refresh game state or notify the user
    });

    gameHub.on('ReconnectFailed', (message: string) => {
      console.error(message);
      if (message === 'Game not found.') {
        navigate('/rooms');
      }
    });

    gameHub.on('Error', (message: string) => {
      console.error(message);
      if (message === 'Game not found.') {
        navigate('/rooms');
      }
    });

    gameHub.on('PlayerJoined', (playerId: string) => {
      console.log(`${playerId} joined the game.`);
    });

    gameHub.on('SpectatorJoined', (spectatorId: string) => {
      console.log(`${spectatorId} joined the game as a spectator.`);
    });

    gameHub.on('JoinGameInProgressSucceeded', (message: string) => {
      console.log(message);
      // Optional: Notify the user they've joined a game in progress
    });

    gameHub.on('JoinGameFailed', (message: string) => {
      console.error(message);
      setError('Failed to join the game.');
    });

    gameHub.on('ActionFailed', (message: string) => {
      console.error(`Action failed: ${message}`);
      setError('An action failed. Please try again.');
    });

    gameHub.on('ChallengeFailed', (message: string) => {
      console.error(`Challenge failed: ${message}`);
    });

    gameHub.on('BlockFailed', (message: string) => {
      console.error(`Block failed: ${message}`);
      setError('Block action failed. Please try again.');
    });

    // Listen for game over event
    gameHub.on('GameOver', (winnerId: string) => {
      console.log(`Game over! Winner: ${winnerId}`);
      setLoading(false);
    });

    // Listen for game restarted event
    gameHub.on('GameRestarted', (newGame: Game) => {
      console.log('Game has been restarted.');
      setLoading(false);
    });

    // Listen for spectator switch
    gameHub.on('PlayerSwitchedToSpectator', (userId: string) => {
      console.log(`${userId} switched to spectator.`);
    });
    
    gameHub.on('SpectatorRejoinedAsPlayer', (userId: string) => {
      console.log(`${userId} rejoined as a player.`);
    });

    return () => {
      // Optionally remove event listeners
      // Assuming GameHub has off method similar to on
      // Remove all listeners here if needed
    };
  }, [gameHub, handlePendingAction, navigate]);

  const handleActionSelect = (action: Action) => {
    if (gameHub && game?.id) {
      gameHub.performAction(game.id, action.actionType, action.targetUserId)
        .catch(err => console.error('Action invocation error:', err));
    }
  };

  const handleSwitchToSpectator = () => {
    if (game && game.isStarted && !game.isGameOver) {
      setShowConfirmModal(true);
    } else {
      performSwitchToSpectator();
    }
  };

  const performSwitchToSpectator = async () => {
    if (gameHub && game && currentUserId) {
      try {
        await gameHub.switchToSpectator(game.id);
        setIsSpectator(true);
        setShowConfirmModal(false);
      } catch (err: any) {
        console.error('Failed to switch to spectator:', err);
        setError('Failed to switch to spectator. Please try again.');
      }
    }
  };

  const handleRespondToPendingAction = (response: ActionResponse, blockOption?: string) => {
    if (gameHub && game?.id) {
      gameHub.respondToPendingAction(game.id, response, blockOption);
    }
  };

  useEffect(() => {
    if (location.pathname.startsWith('/game') && isSpectator) {
      navigate(`/spectator/${id}`);
    } else if (location.pathname.startsWith('/spectator') && !isSpectator) {
      navigate(`/game/${id}`);
    }
  }, [location.pathname, isSpectator, navigate, id]);

  const handleConfirmSwitch = () => {
    setShowConfirmModal(false);
    performSwitchToSpectator();
  };

  const handleRejoinAsPlayer = async () => {
    if (gameHub && game && currentUserId) {
      try {
        await gameHub.rejoinAsPlayer(game.id);
        setIsSpectator(false);
        setShowRejoinModal(false);
      } catch (err: any) {
        console.error('Failed to rejoin as player:', err);
        setError('Failed to rejoin as player. Please try again.');
      }
    }
  };

  const handleStartGame = async () => {
    if (game && gameHub) {
      try {
        await gameHub.startGame(game.id);
      } catch (err: any) {
        console.error('Failed to start game:', err);
        setError('Failed to start the game. Please try again.');
      }
    } else {
      console.error('Game or GameHub is not available');
      setError('Unable to start the game. Please try again.');
    }
  };

  const respondToReturnCard = (gameId: string, cardId: string) => {
    if (gameHub) {
      gameHub.respondToReturnCard(gameId, cardId);
    }
  };

  const respondToBlock = (gameId: string, isChallenge: boolean) => {
    if (gameHub) {
      gameHub.respondToBlock(gameId, isChallenge);
    }
  };

  const respondToExchangeSelect = (gameId: string, card1: string, card2: string) => {
    if (gameHub) {
      gameHub.respondToExchangeSelect(gameId, card1, card2);
    }
  };

  const handleRestartGame = () => {
    if (gameHub && game) {
      gameHub.restartGame(game);
    }
  };

  const handleReturnToLobby = () => {
    if (gameHub && game && game.id) {
      gameHub.returnToLobby(game.id);
    }
  };

  if (error) {
    return (
      <Container className="d-flex flex-column align-items-center justify-content-center" style={{ height: '100vh' }}>
        <Alert variant="danger">{error}</Alert>
        <Button variant="primary" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Container>
    );
  }

  if (loading || !game) {
    if (!game) {
      gameHub?.reconnect(id || '');
    }
    return (
      <Container className="d-flex flex-column align-items-center justify-content-center" style={{ height: '100vh' }}>
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Connecting to the game...</p>
      </Container>
    );
  }

  return (
    <Container className="my-5">
      {!game.isStarted ? (
        <GameLobby
          game={game}
          currentUserId={currentUserId || ''}
          onSwitchToSpectator={handleSwitchToSpectator}
          onRejoinAsPlayer={handleRejoinAsPlayer}
          onStartGame={handleStartGame}
          isSpectator={isSpectator}
        />
      ) : (
        <GameBoard
          game={game}
          currentUserId={currentUserId || ''}
          onActionSelect={handleActionSelect}
          onRestartGame={() => { handleRestartGame() }}
          onReturnToLobby={() => { handleReturnToLobby() }} 
          onSwitchToSpectator={handleSwitchToSpectator}
          isSpectator={isSpectator}
          handleRespondToPendingAction={handleRespondToPendingAction}
          respondToReturnCard={respondToReturnCard}
          respondToBlock={respondToBlock}
          respondToExchangeSelect={respondToExchangeSelect}
          spectators={game.spectators}
        />
      )}

      {/* Confirmation Modal */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Switch to Spectator</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to switch to spectator mode? You will be removed from the game and can only rejoin once the game ends.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmSwitch}>
            Switch to Spectator
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Rejoin as Player Modal */}
      {game.isGameOver && game.spectators.some(s => s.userId === currentUserId) && (
        <Modal show={showRejoinModal} onHide={() => setShowRejoinModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Rejoin as Player</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            The game has ended. Would you like to rejoin as a player?
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowRejoinModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRejoinAsPlayer}>
              Rejoin Game
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </Container>
  );
};

export default GameRoom;
