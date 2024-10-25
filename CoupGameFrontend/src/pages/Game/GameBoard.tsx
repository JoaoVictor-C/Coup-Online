import React, { useState, useEffect } from 'react';
import { Game, CardImages, Action, backCard, cardImages, ActionResponse, PendingAction, Card, Spectator, Player } from '@utils/types';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Container, Grid, Card as MuiCard, Typography, List, ListItem, Tooltip, CircularProgress, CardContent, CardHeader, Box, Badge } from '@mui/material';
import { FaCoins, FaUserShield, FaCrown, FaFlag, FaUser } from 'react-icons/fa';
import { FiWifiOff } from "react-icons/fi";
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['game', 'common']);
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
        alert(t('game:actions.selectTarget'));
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
    <Tooltip title={t('game:spectator.switchTooltip')}>
      <span></span>
    </Tooltip>
  );

  useEffect(() => {
    const hasBlock = Object.values(game.pendingAction?.responses || {}).includes('block');
    const hasChallenge = Object.values(game.pendingAction?.responses || {}).includes('challenge');

    if (game.isGameOver) {
      console.log(t('game:status.gameOver'));
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
  }, [game, setGameState, currentUserId, t]);

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

  // New function to determine card styles based on user status
  const getCardStyle = (player: Player) => {
    let styles: React.CSSProperties = {};
    if (!player.isActive) {
      styles.filter = 'grayscale(100%)';
    }
    return styles;
  };

  if (gameState === 'WAITING_FOR_PLAYERS') {
    return <WaitingScreen />;
  }

  if (gameState === 'GAME_OVER') {
    return <GameOverScreen winnerName={game.players.find(p => p.userId === game.winnerId)?.username || t('game:player.unknown')} onRestart={onRestartGame} onExit={onReturnToLobby} game={game} currentUserId={currentUserId} />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={2} justifyContent="center" sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <MuiCard variant="outlined">
            <CardHeader sx={{ bgcolor: 'grey.900', color: 'common.white' }} title={<><FaUserShield /> {t('game:actionLog.title')}</>} />
            <CardContent sx={{ maxHeight: '200px', overflowY: 'auto' }}>
              <List>
                {game.actionsHistory.map((log, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <ListItem>
                      <Typography variant="body2">
                        <strong>{game.players.find(p => p.userId === log.playerId)?.username}:</strong> {log.action}
                        {log.targetId && ` → ${game.players.find(p => p.userId === log.targetId)?.username}`}
                      </Typography>
                    </ListItem>
                  </motion.div>
                ))}
              </List>
            </CardContent>
          </MuiCard>
        </Grid>
      </Grid>

      {/* Players Section */}
      <Grid container spacing={3} justifyContent="center" sx={{ mb: 4 }}>
        {game.players.map(player => {
          const isLeader = player.userId === game.leaderId;
          const isCurrentTurn = player.userId === game.currentTurnUserId;
          const isCurrentUser = player.userId === currentUserId;

          return (
            <Grid item key={player.userId} xs={12} sm={6} md={3}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <MuiCard
                  sx={{
                    textAlign: 'center',
                    border: isCurrentTurn ? '1px solid #1976d2' : '1px solid rgba(0, 0, 0, 0.12)',
                    bgcolor: isCurrentTurn ? 'grey.100' : 'background.paper',
                    position: 'relative',
                    boxShadow: isCurrentTurn ? '0px 0px 15px 0px #1976d2' : 'none',
                    transition: 'border 0.3s, box-shadow 0.3s',
                  }}
                >
                  {/* Disconnected Indicator */}
                  {!player.isConnected && (
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                      badgeContent={<FiWifiOff color="error" />}
                    />
                  )}

                  <CardHeader
                    sx={{ bgcolor: isLeader ? 'goldenrod' : (isCurrentUser ? 'primary.dark' : 'primary.main'), color: 'common.white' }}
                    title={
                      <Box display="flex" alignItems="center" justifyContent="center" flexWrap="wrap">
                        <Typography variant="subtitle1" sx={{ mr: 1, fontWeight: isCurrentUser ? 'bold' : 'normal' }}>
                          {player.username} {isCurrentUser && `(${t('common:labels.you')})`}
                        </Typography>
                        {isLeader && (
                          <Tooltip title={t('game:status.leader')}>
                            <FaCrown color="warning" size="1em" />
                          </Tooltip>
                        )}
                        {!isCurrentUser && (
                          <Tooltip title={isCurrentUser ? t('common:labels.you') : ''}>
                            <span></span>
                          </Tooltip>
                        )}
                      </Box>
                    }
                  />
                  <CardContent>
                    <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FaCoins /> {player.coins} {t('game:resources.coins')}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
                      {player.hand.slice(0, 2).map((card, index) => {
                        if (card.isRevealed || isSpectator) {
                          return (
                            <Box key={index}>
                              <img
                                src={cardImages[card.name.toLowerCase() as keyof CardImages]}
                                alt={card.name}
                                style={{
                                  width: '90px',
                                  height: '135px',
                                  borderRadius: '8px',
                                  ...getCardStyle(player)
                                }}
                              />
                            </Box>
                          );
                        } else if (isCurrentUser) {
                          return (
                            <Box
                              key={index}
                              sx={{
                                position: 'relative',
                                width: '90px',
                                height: '135px',
                                perspective: '500px',
                              }}
                            >
                              <motion.div
                                className="card-face"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  position: 'absolute',
                                  backfaceVisibility: 'hidden',
                                  transition: 'transform 0.25s ease',
                                  transformStyle: 'preserve-3d',
                                  cursor: 'pointer',
                                  ...getCardStyle(player)
                                }}
                                whileHover={{ rotateY: 180 }}
                              >
                                <img
                                  src={backCard}
                                  alt={t('game:cards.back')}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '8px',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    backfaceVisibility: 'hidden',
                                  }}
                                />
                                <img
                                  src={cardImages[card.name.toLowerCase() as keyof CardImages]}
                                  alt={card.name}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '8px',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    transform: 'rotateY(180deg)',
                                    backfaceVisibility: 'hidden',
                                    ...getCardStyle(player)
                                  }}
                                />
                              </motion.div>
                            </Box>
                          );
                        } else {
                          return (
                            <Box key={index}>
                              <img
                                src={backCard}
                                alt={card.name}
                                style={{
                                  width: '90px',
                                  height: '135px',
                                  borderRadius: '8px',
                                  ...getCardStyle(player)
                                }}
                              />
                            </Box>
                          );
                        }
                      })}
                    </Box>
                  </CardContent>
                </MuiCard>
              </motion.div>
            </Grid>
          );
        })}
      </Grid>

      {/* Spectators Section */}
      {isSpectator && (
        <Grid container spacing={2} justifyContent="center" sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <MuiCard variant="outlined">
              <CardHeader sx={{ bgcolor: 'secondary.main', color: 'common.white' }} title={<><FaUserShield /> {t('game:spectator.title')} ({game.spectators.length})</>} />
              <CardContent sx={{ maxHeight: '200px', overflowY: 'auto' }}>
                {spectators.length === 0 ? (
                  <Typography variant="body2">{t('game:spectator.none')}</Typography>
                ) : (
                  <List>
                    {spectators.map((spectator, index) => (
                      <ListItem key={index}>
                        <Typography variant="body1">{spectator.username}</Typography>
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </MuiCard>
          </Grid>
        </Grid>
      )}

      {/* Action Button */}
      {!isSpectator && !isGameOver && gameState === 'ACTIVE' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <Button variant="contained" color="primary" onClick={openActionModal}>
            {t('game:actions.choose')}
          </Button>
        </Box>
      )}

      {/* Waiting for turn */}
      {gameState === 'WAITING_FOR_TURN' && (
        <Container sx={{ textAlign: 'center', my: 5 }}>
          <CircularProgress color="primary" />
          <Typography variant="h6" sx={{ mt: 2 }}>
            {t('game:turn.waiting')}
          </Typography>
        </Container>
      )}

      {/* Switch to Spectator Button */}
      {!isSpectator && (
        <Tooltip title={t('game:spectator.switchTooltip')}>
          <Button variant="outlined" color="secondary" onClick={handleSwitchClick} sx={{ display: 'block', margin: '0 auto', mt: 2 }}>
            {t('game:spectator.switchButton')}
          </Button>
        </Tooltip>
      )}

      {/* Action Selection Modal */}
      {!isSpectator && !game.isGameOver && gameState === 'ACTIVE' && (
        <ActionSelectionModal
          open={showActionModal}
          onClose={closeActionModal}
          onSelectAction={handleActionSelect}
          game={game}
          currentUserId={currentUserId}
        />
      )}

      {/* Pending Action Modal */}
      <PendingActionModal
        open={
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
        onClose={() => setCurrentPendingAction(null)}
        pendingAction={currentPendingAction || undefined}
        currentUserId={currentUserId}
        players={game.players}
        respondToBlock={respondToBlock}
        respondToExchangeSelect={respondToExchangeSelect}
        gameId={game.roomCode}
      />

      {/* Switch Dialog */}
      <Dialog open={showSwitchModal} onClose={cancelSwitch}>
        <DialogTitle>{t('game:spectator.switchTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('game:spectator.switchConfirm')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelSwitch} color="primary">
            {t('common:buttons.cancel')}
          </Button>
          <Button onClick={confirmSwitch} color="secondary">
            {t('game:spectator.switchButton')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showReturnCardModal} onClose={() => setShowReturnCardModal(false)}>
        <DialogTitle>{t('game:cards.selectReturn')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} justifyContent="center">
            {cardsToReturn.map((card, index) => (
              <Grid item key={`${card.name}-${index}`}>
                <Button
                  onClick={card.isRevealed ? () => {} : () => handleCardReturn(card.name)}
                  sx={{
                    minWidth: '120px',
                    height: '220px',
                    padding: 0,
                    border: '1px solid rgba(0, 0, 0, 0.23)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundImage: `url(${cardImages[card.name.toLowerCase() as keyof CardImages]})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    cursor: card.isRevealed ? 'default' : 'pointer',
                    filter: card.isRevealed ? 'grayscale(100%)' : 'none',
                    ...(card.isRevealed ? {} : {
                      '&:hover': {
                        opacity: 0.8,
                        border: '1px solid rgba(0, 0, 0, 0.54)',
                      }
                    })
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReturnCardModal(false)} color="primary">
            {t('common:buttons.cancel')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default GameBoard;
