import React, { useState, useContext, useEffect } from 'react';
import { Game, CardImages, Action, backCard, cardImages } from '@utils/types';
import { Button, Modal, Container, Row, Col, Card as BootstrapCard, ListGroup, Badge, Tooltip, OverlayTrigger, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaCoins, FaUserShield, } from 'react-icons/fa';
import { motion } from 'framer-motion';
import ActionSelectionModal from '@pages/Game/ActionSelectionModal';
import { GameContext } from '@context/GameContext';
import WaitingScreen from '@pages/Game/WaitingScreen';

interface GameBoardProps {
  game: Game;
  currentUserId: string;
  onActionSelect: (action: Action) => void;
  onRestartGame: () => void;
  onSwitchToSpectator: () => void;
  isSpectator: boolean;
}

const GameBoard: React.FC<GameBoardProps> = ({ game, currentUserId, onActionSelect, onRestartGame, onSwitchToSpectator, isSpectator }) => {
  const currentUser = game.players.find(p => p.userId === currentUserId);
  const isGameOver = game.isGameOver;
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<Action | null>(null);
  const { gameState, setGameState } = useContext(GameContext);

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
    setPendingAction(action);
    closeActionModal();
    onActionSelect(action);
  };

  const renderTooltip = (props: any) => (
    <Tooltip id="button-tooltip" {...props}>
      Click to switch to spectator mode
    </Tooltip>
  );

  useEffect(() => {
    if (game.isGameOver) {
      setGameState('GAME_OVER');
    } else if (!game.isStarted) {
      setGameState('LOBBY');
    } else if (game.pendingAction) {
      setGameState('WAITING_FOR_ACTION');
    } else if (game.currentTurnUserId === currentUserId) {
      setGameState('ACTIVE');
    } else {
      setGameState('WAITING_FOR_TURN');
    }
  }, [game, setGameState, currentUserId]);

  if (gameState === 'WAITING_FOR_PLAYERS') {
    return <WaitingScreen />;
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
                {game.actionsHistory.map((log, index) => {
                  const player = game.players.find(p => p.userId === log.playerId);
                  const targetPlayer = log.targetId ? game.players.find(p => p.userId === log.targetId) : null;
                  return (
                    <ListGroup.Item key={index}>
                      <strong>{player?.username}:</strong> {log.action}
                      {targetPlayer && ` → ${targetPlayer.username}`}
                    </ListGroup.Item>
                  );
                })}
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
              <BootstrapCard className={`text-center ${player.userId === currentUserId && !isSpectator ? 'border-primary' : ''}`}>
                <BootstrapCard.Header className="bg-primary text-white">
                  {player.username}
                  {player.userId === game.leaderId && <Badge bg="success" className="ms-2">Leader</Badge>}
                </BootstrapCard.Header>
                <BootstrapCard.Body>
                  <p><FaCoins /> {player.coins} Coins</p>
                  <div className="d-flex justify-content-center gap-2">
                    {player.hand.map((card, index) => {
                      const isCurrentUser = player.userId === currentUserId;
                      return isCurrentUser ? (
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
                      ) : (
                        <div className="img-fluid">
                            <img
                            src={backCard}
                            alt={card.name}
                            style={{ width: '90px', height: '135px' }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </BootstrapCard.Body>
              </BootstrapCard>
            </motion.div>
          </Col>
        ))}
      </Row>

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
      <ActionSelectionModal
        show={showActionModal}
        onHide={closeActionModal}
        onSelectAction={handleActionSelect}
        game={game}
        currentUserId={currentUserId}
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
          <Button variant="primary" onClick={confirmSwitch}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default GameBoard;
