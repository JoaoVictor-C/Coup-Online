import React, { useState, useEffect } from 'react';
import { Game, CardImages, Action, backCard, cardImages, ActionResponse, PendingAction, Player, Card, Spectator } from '@utils/types';
import { Button, Modal, Container, Row, Col, Card as BootstrapCard, ListGroup, Badge, Tooltip, OverlayTrigger, Spinner, Alert } from 'react-bootstrap';
import { FaCoins, FaUserShield } from 'react-icons/fa';
import { motion } from 'framer-motion';
import ActionSelectionModal from './ActionSelectionModal';
import WaitingScreen from './WaitingScreen';
import PendingActionModal from './PendingActionModal';
import GameOverScreen from './GameOverScreen';

interface GameBoardProps {
  game: Game;
  currentUserId: string;
  onActionSelect: (action: Action) => void;
  onRestartGame: () => void;
  onSwitchToSpectator: () => void;
  isSpectator: boolean;
  handleRespondToPendingAction: (response: ActionResponse, blockOption?: string) => void;
  respondToReturnCard: (gameId: string, cardId: string) => void;
  respondToBlock: (gameId: string, isChallenge: boolean) => void;
  respondToExchangeSelect: (gameId: string, card1: string, card2: string) => void;
  onReturnToLobby: () => void;
  spectators: Spectator[];
}

const GameBoard: React.FC<GameBoardProps> = ({
  game,
  currentUserId,
  onActionSelect,
  onRestartGame,
  onReturnToLobby,
  onSwitchToSpectator,
  isSpectator,
  handleRespondToPendingAction,
  respondToReturnCard,
  respondToBlock,
  respondToExchangeSelect,
  spectators
}) => {
  const currentUser = game.players.find(p => p.userId === currentUserId);
  const isGameOver = game.isGameOver;
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [gameState, setGameState] = useState<string>('LOBBY');
  const [currentPendingAction, setCurrentPendingAction] = useState<PendingAction | null>(null);
  const [showReturnCardModal, setShowReturnCardModal] = useState(false);
  const [cardsToReturn, setCardsToReturn] = useState<Card[]>([]);

  const handleSwitchClick = () => {
    if (!isSpectator && currentUser && currentUser.isActive) {
      setShowSwitchModal(true);
    } else if (!isSpectator) {
      onSwitchToSpectator();
    }
  };

  const confirmSwitch = () => {
    setShowSwitchModal(false);
    onSwitchToSpectator();
  };

  const cancelSwitch = () => {
    setShowSwitchModal(false);
  };

  const openActionModal = () => {
    setShowActionModal(true);
  };

  const closeActionModal = () => {
    setShowActionModal(false);
  };

  const handleActionSelect = (action: Action) => {
    if (action.actionType === 'coup' || action.actionType === 'steal' || action.actionType === 'assassinate') {
      if (!action.targetUserId) {
        alert('Please select a target for this action.');
        return;
      }
    }
    closeActionModal();
    onActionSelect(action);
  };

  const handleRespond = (response: ActionResponse, blockOption?: string) => {
    handleRespondToPendingAction(response, blockOption);
    setCurrentPendingAction(null);
  };

  const renderTooltip = (props: any) => (
    <Tooltip id="button-tooltip" {...props}>
      Click to switch to spectator mode
    </Tooltip>
  );

  useEffect(() => {
    const hasBlock = Object.values(game.pendingAction?.responses || {}).includes('block');
    const hasChallenge = Object.values(game.pendingAction?.responses || {}).includes('challenge');

    if (game.isGameOver) {
      console.log('Game is over');
      setGameState('GAME_OVER');
    } else if (!game.isStarted) {
      setGameState('LOBBY');
    } else if (game.pendingAction) {
      if (hasBlock) {
        setGameState('ACTION_BLOCKED');
      } else if (hasChallenge) {
        setGameState('ACTION_CHALLENGED');
      } else {
        setGameState('WAITING_FOR_ACTION');
      }
    } else if (game.currentTurnUserId === currentUserId) {
      setGameState('ACTIVE');
    } else {
      setGameState('WAITING_FOR_TURN');
    }
  }, [game, setGameState, currentUserId]);

  useEffect(() => {
    if (game.pendingAction && game.pendingAction.actionType === "ReturnCard" && game.pendingAction.initiatorId === currentUserId) {
      const player = game.players.find(p => p.userId === currentUserId);
      if (player) {
        setCardsToReturn(player.hand);
        setShowReturnCardModal(true);
      }
    }
  }, [game, currentUserId]);

  useEffect(() => {
    if (game.pendingAction) {
      setCurrentPendingAction(game.pendingAction);
    } else {
      setCurrentPendingAction(null);
    }
  }, [game.pendingAction]);

  const handleCardReturn = (cardId: string) => {
    respondToReturnCard(game.roomCode, cardId);
    setShowReturnCardModal(false);
  };

  if (gameState === 'WAITING_FOR_PLAYERS') {
    return <WaitingScreen />;
  }

  if (gameState === 'GAME_OVER') {
    return <GameOverScreen winnerName={game.players.find(p => p.userId === game.winnerId)?.username || 'Unknown'} onRestart={onRestartGame} onExit={onReturnToLobby} game={game} currentUserId={currentUserId} />;
  }

  return (
    <Container fluid className="d-flex flex-column align-items-center py-4">
      {/* Action Log Section */}
      <Row className="w-75 mb-4 d-flex justify-content-center">
        <Col>
          <BootstrapCard>
            <BootstrapCard.Header className="bg-dark text-white">
              <FaUserShield /> Action History
            </BootstrapCard.Header>
            <BootstrapCard.Body style={{ maxHeight: '200px', overflowY: 'auto' }}>
              <ListGroup variant="flush">
                {game.actionsHistory.map((log, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <ListGroup.Item>
                      <strong>{game.players.find(p => p.userId === log.playerId)?.username}:</strong> {log.action}
                      {log.targetId && ` → ${game.players.find(p => p.userId === log.targetId)?.username}`}
                    </ListGroup.Item>
                  </motion.div>
                ))}
              </ListGroup>
            </BootstrapCard.Body>
          </BootstrapCard>
        </Col>
      </Row>

      {/* Players Section */}
      <Row className="w-100 mb-4 d-flex justify-content-center">
        {game.players.map(player => (
          <Col key={player.userId} md={3} sm={6} className="mb-3">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <BootstrapCard className={`text-center ${player.userId === currentUserId && !isSpectator ? 'border-primary' : ''} ${player.userId === game.currentTurnUserId ? 'bg-light border-warning' : ''}`}>
                <BootstrapCard.Header className="bg-primary text-white">
                  {player.username}
                  {player.userId === game.leaderId && <Badge bg="success" className="ms-2">Leader</Badge>}
                  {player.userId === game.currentTurnUserId && (
                    <Badge bg="warning" className="ms-2">
                      {player.userId === currentUserId ? "Your turn" : "Current turn"}
                    </Badge>
                  )}
                </BootstrapCard.Header>
                <BootstrapCard.Body>
                  <p><FaCoins /> {player.coins} Coins</p>
                  <div className="d-flex justify-content-center gap-2">
                    {player.hand.map((card, index) => {
                      const isCurrentUser = player.userId === currentUserId;
                      
                      if (card.isRevealed || isSpectator) {
                        return (
                          <div className="img-fluid" key={index}>
                            <img
                              src={cardImages[card.name.toLowerCase() as keyof CardImages]}
                              alt={card.name}
                              style={{ width: '90px', height: '135px' }}
                            />
                          </div>
                        );
                      } else if (isCurrentUser) {
                        return (
                          <motion.div
                            key={index}
                            className="img-fluid"
                            style={{ cursor: 'pointer', perspective: '500px' }}
                          >
                            <motion.div
                              className="img-fluid"
                              style={{
                                width: '90px',
                                height: '135px',
                                transformStyle: 'preserve-3d',
                                transition: 'transform 0.25s ease'
                              }}
                              animate={{ rotateY: 0 }}
                              whileHover={{ rotateY: 180 }}
                            >
                              <img
                                src={backCard}
                                alt="card back"
                                className="img-fluid position-absolute top-0 start-0"
                                style={{
                                  backfaceVisibility: 'hidden',
                                  width: 'auto',
                                  height: '135px'
                                }}
                              />
                              <img
                                src={cardImages[card.name.toLowerCase() as keyof CardImages]}
                                alt={card.name}
                                className="img-fluid position-absolute top-0 start-0"
                                style={{
                                  backfaceVisibility: 'hidden',
                                  width: 'auto',
                                  height: '135px',
                                  transform: 'rotateY(180deg)'
                                }}
                              />
                            </motion.div>
                          </motion.div>
                        );
                      } else {
                        return (
                          <div className="img-fluid" key={index}>
                            <img
                              src={backCard}
                              alt={card.name}
                              style={{ width: '90px', height: '135px' }}
                            />
                          </div>
                        );
                      }
                    })}
                  </div>
                </BootstrapCard.Body>
              </BootstrapCard>
            </motion.div>
          </Col>
        ))}
      </Row>

      {/* Spectators Section */}
      {isSpectator && (
        <Row className="w-75 mb-4 d-flex justify-content-center">
          <Col>
            <BootstrapCard>
              <BootstrapCard.Header className="bg-secondary text-white">
                <FaUserShield /> Spectators
              </BootstrapCard.Header>
              <BootstrapCard.Body style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {spectators.length === 0 ? (
                  <p>No spectators currently.</p>
                ) : (
                  <ListGroup variant="flush">
                    {spectators.map((spectator, index) => (
                      <ListGroup.Item key={index}>
                        {spectator.username}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </BootstrapCard.Body>
            </BootstrapCard>
          </Col>
        </Row>
      )}

      {/* Action Button */}
      {!isSpectator && !isGameOver && gameState === 'ACTIVE' && (
        <Button variant="primary" onClick={openActionModal}>
          Choose Action
        </Button>
      )}

      {/* Waiting for turn */}
      {gameState === 'WAITING_FOR_TURN' && (
        <Container className="my-5 text-center">
          <Spinner animation="border" variant="primary" />
          <div>Waiting for the next turn...</div>
        </Container>
      )}

      {/* Switch to Spectator Button */}
      {!isSpectator && (
        <OverlayTrigger
          placement="top"
          delay={{ show: 250, hide: 400 }}
          overlay={renderTooltip}
        >
          <Button variant="secondary" onClick={handleSwitchClick} className="mt-3">
            Switch to Spectator
          </Button>
        </OverlayTrigger>
      )}

      {/* Action Selection Modal */}
      {!isSpectator && !game.isGameOver && gameState === 'ACTIVE' && (
        <ActionSelectionModal
          show={showActionModal}
          onHide={closeActionModal}
          onSelectAction={handleActionSelect}
          game={game}
          currentUserId={currentUserId}
        />
      )}

      {/* Pending Action Modal */}
      <PendingActionModal
        show={
          !!currentPendingAction &&
          !isSpectator &&
          currentPendingAction.initiatorId !== currentUserId &&
          gameState !== 'ACTION_BLOCKED' &&
          gameState !== 'ACTION_CHALLENGED' &&
          gameState !== 'GAME_OVER' &&
          currentPendingAction.actionType !== 'ReturnCard' &&
          currentPendingAction.actionType !== 'blockAttempt' &&
          (currentPendingAction.actionType !== 'exchangeSelect' || currentPendingAction.initiatorId === currentUserId) &&
          !currentPendingAction.responses[currentUserId] &&
          !!game.players.find(p => p.userId === currentUserId)?.isActive
        }
        action={currentPendingAction as Action | undefined}
        onRespond={handleRespond}
        onHide={() => setCurrentPendingAction(null)}
        pendingAction={currentPendingAction || undefined}
        currentUserId={currentUserId}
        players={game.players}
        respondToBlock={respondToBlock}
        respondToExchangeSelect={respondToExchangeSelect}
        gameId={game.roomCode}
      />

      {/* Switch Modal */}
      <Modal show={showSwitchModal} onHide={cancelSwitch} centered>
        <Modal.Header closeButton>
          <Modal.Title>Switch to Spectator</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to switch to spectator mode?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cancelSwitch}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmSwitch}>
            Switch to Spectator
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Return Card Modal */}
      <Modal show={showReturnCardModal} onHide={() => setShowReturnCardModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Select a Card to Return to the Deck</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ListGroup>
            {cardsToReturn.map((card, index) => (
              <ListGroup.Item key={`${card.name}-${index}`} action onClick={() => handleCardReturn(card.name)} disabled={card.isRevealed}>
                {card.name}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReturnCardModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default GameBoard;
