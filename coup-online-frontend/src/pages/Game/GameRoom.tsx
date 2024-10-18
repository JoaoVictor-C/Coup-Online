import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { Game, ActionLog, Action, ActionParameters } from '@utils/types';
import { SIGNALR_HUB_URL } from '@utils/constants';
import { Container, Spinner, Alert, Modal, Button } from 'react-bootstrap';
import GameBoard from './GameBoard';
import GameLobby from './GameLobby';
import { getToken } from '@utils/auth';
import authService from '@services/authService';

const GameRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const isSpectatorRoute = location.pathname.startsWith('/spectator/');
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showRejoinModal, setShowRejoinModal] = useState<boolean>(false);
  const [isSpectator, setIsSpectator] = useState<boolean>(isSpectatorRoute);

  useEffect(() => {
    const newConnection = new HubConnectionBuilder()
      .withUrl(`${SIGNALR_HUB_URL}?access_token=${getToken()}`)
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);

    return () => {
      if (newConnection.state === 'Connected') {
        newConnection.stop()
          .then(() => console.log('Disconnected from GameHub'))
          .catch(err => console.error('Error disconnecting:', err));
      }
    };
  }, []);

  useEffect(() => {
    authService.getUser(getToken() || '').then(user => {
      setCurrentUserId(user.id);
    }).catch(err => {
      console.error('Failed to get user:', err);
    });
  }, []);

  useEffect(() => {
    if (connection && connection.state === 'Disconnected') {
      connection.start()
        .then(async () => {
          console.log('Connected to GameHub');
          if (isSpectator) {
            await connection.invoke('SwitchToSpectator', id);
          } else if (currentUserId) {
            await connection.invoke('Reconnect', id, currentUserId);
          }
          await connection.invoke('GetGameState', id);
        })
        .catch(err => {
          console.error('Connection failed: ', err);
          setError('Failed to connect to the game server.');
          setLoading(false);
        });

      // Event listeners
      connection.on('Connected', (message: string) => {
        console.log(message);
      });

      connection.on('GameState', (gameState: Game) => {
        console.log('Received GameState:', gameState);
        setGame(gameState);
        setLoading(false);
      });

      connection.on('GameStarted', async (gameId: string) => {
        console.log(`Game ${gameId} has started.`);
      });

      connection.on('ActionPerformed', (actionLog: ActionLog) => {
        setGame(prevGame => {
          if (prevGame) {
            return {
              ...prevGame,
              actionsHistory: [...prevGame.actionsHistory, actionLog],
            };
          }
          return prevGame;
        });
      });

      connection.on('ActionSucceeded', (playerId: string, action: string, targetId?: string) => {
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
      connection.on('ActionChallenged', (challengerId: string, challengedUserId: string, message: string) => {
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

      connection.on('ActionBlocked', (blockerId: string, blockedUserId: string, action: string) => {
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

      connection.on('ReconnectSucceeded', (message: string) => {
        console.log(message);
        // Optional: Refresh game state or notify the user
      });

      connection.on('ReconnectFailed', (message: string) => {
        console.error(message);
        if (message === 'Game not found.') {
          window.location.href = '/rooms';
        }
      });

      connection.on('PlayerJoined', async (playerId: string) => {
        console.log(`${playerId} joined the game.`);
        await connection.invoke('GetGameState', id)
          .catch(err => console.error(err));
      });

      connection.on('SpectatorJoined', async (spectatorId: string) => {
        console.log(`${spectatorId} joined the game as a spectator.`);
        await connection.invoke('GetGameState', id)
          .catch(err => console.error(err));
      });

      connection.on('JoinGameInProgressSucceeded', (message: string) => {
        console.log(message);
        // Optional: Notify the user they've joined a game in progress
      });

      connection.on('JoinGameFailed', (message: string) => {
        console.error(message);
        setError('Failed to join the game.');
      });

      connection.on('ActionFailed', (message: string) => {
        console.error(`Action failed: ${message}`);
        setError('An action failed. Please try again.');
      });

      connection.on('ChallengeFailed', (message: string) => {
        console.error(`Challenge failed: ${message}`);
        setError('Challenge action failed. Please try again.');
      });

      connection.on('BlockFailed', (message: string) => {
        console.error(`Block failed: ${message}`);
        setError('Block action failed. Please try again.');
      });

      // Listen for game over event
      connection.on('GameOver', async (winnerId: string) => {
        console.log(`Game over! Winner: ${winnerId}`);
        await connection.invoke('GetGameState', id)
          .catch(err => console.error(err));
        setLoading(false);
      });

      // Listen for game restarted event
      connection.on('GameRestarted', (newGame: Game) => {
        console.log('Game has been restarted.');
        setGame(newGame);
        setLoading(false);
      });

      // Listen for spectator switch
      connection.on('PlayerSwitchedToSpectator', async (userId: string) => {
        await connection.invoke('GetGameState', id)
          .catch(err => console.error(err));
      });

      connection.on('SpectatorRejoinedAsPlayer', async (userId: string) => {
        await connection.invoke('GetGameState', id)
          .catch(err => console.error(err));
      });
    }
  }, [connection, id, game, isSpectator, currentUserId]);

  const handleActionSelect = async (action: Action) => {
    if (game && connection && currentUserId) {
      try {
        let parameters: ActionParameters | undefined;
        switch (action.type) {
          case 'assassinate':
          case 'steal':
          case 'coup':
            parameters = { targetUserId: action.targetUserId || '' };
            break;
          case 'income':
          case 'foreign_aid':
          case 'tax':
          case 'exchange':
            parameters = undefined;
            break;
          default:
            parameters = undefined;
        }

        await connection.invoke('PerformAction', game.id, currentUserId, action.type, parameters);
      } catch (err: any) {
        console.error('Failed to perform action:', err);
        setError('Failed to perform action. Please try again.');
      }
    } else {
      console.error('Game, connection, or user ID is not available');
      setError('Unable to perform action. Please try again.');
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
    if (connection && game && currentUserId) {
      try {
        await connection.invoke('SwitchToSpectator', game.id, currentUserId);
        await connection.invoke('GetGameState', id)
          .catch(err => console.error(err));
        setIsSpectator(true);
        setShowConfirmModal(false);
      } catch (err: any) {
        console.error('Failed to switch to spectator:', err);
        setError('Failed to switch to spectator. Please try again.');
      }
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
    if (connection && game && currentUserId) {
      try {
        await connection.invoke('RejoinAsPlayer', game.id, currentUserId);
        await connection.invoke('GetGameState', id)
          .catch(err => console.error(err));
        setIsSpectator(false);
        setShowRejoinModal(false);
      } catch (err: any) {
        console.error('Failed to rejoin as player:', err);
        setError('Failed to rejoin as player. Please try again.');
      }
    }
  };

  const handleStartGame = async () => {
    if (game && connection) {
      try {
        await connection.invoke('StartGame', game.id);
      } catch (err: any) {
        console.error('Failed to start game:', err);
        setError('Failed to start the game. Please try again.');
      }
    } else {
      console.error('Game or connection is not available');
      setError('Unable to start the game. Please try again.');
    }
  };

  if (error) {
    return <Container className="my-5"><Alert variant="danger">{error}</Alert></Container>;
  }

  if (loading || !game) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" variant="primary" />
        <div>Loading game...</div>
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
          onRestartGame={() => { /* Implement if needed */ }}
          onSwitchToSpectator={handleSwitchToSpectator}
          isSpectator={isSpectator}
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
