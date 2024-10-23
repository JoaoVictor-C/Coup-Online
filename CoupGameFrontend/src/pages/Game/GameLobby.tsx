import React, { useState } from 'react';
import { Game } from '@utils/types';
import { Button, Container, Alert, Card, ListGroup, Badge, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface GameLobbyProps {
  game: Game;
  currentUserId: string;
  onSwitchToSpectator: () => void;
  onRejoinAsPlayer: () => void;
  onStartGame: () => void;
  isSpectator?: boolean;
}

const GameLobby: React.FC<GameLobbyProps> = ({ game, currentUserId, onSwitchToSpectator, onRejoinAsPlayer, onStartGame, isSpectator = false }) => {
  const { t } = useTranslation(['game', 'common']);
  const [clipBoard, setClipBoard] = useState(false);

  return (
    <Container fluid className="text-dark min-vh-100 d-flex align-items-center justify-content-center">
      <Row className="justify-content-center w-100">
        <Col md={8} lg={6} className="w-75">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-white text-dark shadow-lg border-0">
              <Card.Header as="h2" className="bg-primary text-white text-center py-4">
                <i className="bi bi-joystick me-2"></i>
                {t('game:room.lobby.title', { gameName: game.gameName })}
              </Card.Header>
              <Card.Body>
                <Card.Title as="h4" className="text-center mb-4">
                  {t('game:room.lobby.waiting')}
                </Card.Title>
                <Card.Text as="h5" className="text-center mb-3">
                  {t('game:room.lobby.players', { current: game.players.length, max: game.playerCount })}
                </Card.Text>
                <ListGroup variant="flush" className="mb-4">
                  <AnimatePresence>
                    {game.players.map((player) => (
                      <motion.div
                        key={`player-${player.userId}`}
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ListGroup.Item className="d-flex justify-content-between align-items-center py-3">
                          <span>
                            <i className="bi bi-person-circle me-2"></i>
                            {player.username}
                          </span>
                          {!player.isActive && (
                            <Badge bg="danger" pill>
                              {t('game:room.lobby.inactive')}
                            </Badge>
                          )}
                          {player.userId === game.leaderId && (
                            <Badge bg="success" pill>{t('game:room.lobby.leader')}</Badge>
                          )}
                        </ListGroup.Item>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </ListGroup>
                {!isSpectator && game.leaderId === currentUserId && (
                  <div className="d-grid gap-3">
                    <Link to={`/game/${game.roomCode}`} className="d-grid" style={{ cursor: `${game.players.length < 2 ? 'not-allowed' : 'pointer'}` }} onClick={() => {
                      if (game.players.length < 2) {
                        alert(t('game:room.lobby.needMorePlayers'));
                      }
                      else {
                        onStartGame();
                      }
                    }}>
                      <Button variant="success" size="lg" className="py-3" disabled={game.players.length < 2}>
                        <i className="bi bi-play-fill me-2"></i>{t('common:buttons.start')}
                      </Button>
                    </Link>
                  </div>
                )}
                <div className="d-grid gap-3 mt-3">
                  {!isSpectator ? (
                    <Button variant="warning" size="lg" onClick={onSwitchToSpectator} className="py-3">
                      <i className="bi bi-eye me-2"></i>{t('game:spectator.switchButton')}
                    </Button>
                  ) : (
                    <Button variant="warning" size="lg" onClick={onRejoinAsPlayer} className="py-3">
                      <i className="bi bi-person-fill-add me-2"></i>{t('game:spectator.rejoinButton')}
                    </Button>
                  )}
                </div>
                {game.isGameOver && game.winnerId && (
                  <Alert variant="success" className="mt-4 text-center">
                    <i className="bi bi-trophy-fill me-2"></i>
                    {t('game:status.gameOver')} {t('game:status.winner')}:{' '}
                    {game.winnerId === currentUserId
                      ? t('game:status.you')
                      : game.players.find(p => p.userId === game.winnerId)?.username || t('game:player.unknown')}
                  </Alert>
                )}
              </Card.Body>
              <Card.Footer className="text-center py-3 d-flex flex-column">
                <h5 className="mb-0" onClick={() => {
                  setClipBoard(true);
                  setTimeout(() => {
                    setClipBoard(false);
                  }, 2000);
                  navigator.clipboard.writeText(game.roomCode);
                }} style={{ cursor: 'pointer' }}>
                  {t('game:room.code')}: <Badge bg="info">{game.roomCode}</Badge>
                </h5>
                {clipBoard && <p className="text-success">{t('game:room.codeCopied')}</p>}
              </Card.Footer>
            </Card>
          </motion.div>
        </Col>
      </Row>
      {game.spectators.length > 0 && (
        <Row className="justify-content-center mt-4 w-50">
          <Col md={8} lg={6}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="bg-light shadow-sm">
                <Card.Header className="bg-secondary text-white">
                  <h5 className="mb-0 text-center">
                    <i className="bi bi-binoculars me-2"></i>
                    {t('game:spectator.title')} ({game.spectators.length})
                  </h5>
                </Card.Header>
                <Card.Body>
                  <ListGroup variant="flush">
                    <AnimatePresence>
                      {game.spectators.map((spectator) => (
                        <motion.div
                          key={`spectator-${spectator.userId}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <ListGroup.Item className="d-flex align-items-center bg-light">
                            <i className="bi bi-eye me-3 text-muted"></i>
                            <span>{spectator.username}</span>
                          </ListGroup.Item>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </ListGroup>
                </Card.Body>
              </Card>
            </motion.div>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default GameLobby;
