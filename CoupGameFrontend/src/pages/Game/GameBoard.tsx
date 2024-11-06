import React, { useState, useEffect } from 'react';
import { Game, CardImages, Action, backCard, cardImages, ActionResponse, PendingAction, Card, Spectator, Player } from '@utils/types';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Container, Grid, Card as MuiCard, Typography, List, ListItem, Tooltip, CircularProgress, CardContent, CardHeader, Box, Badge, useMediaQuery, useTheme } from '@mui/material';
import { FaCoins, FaUserShield, FaCrown } from 'react-icons/fa';
import { FiWifiOff } from "react-icons/fi";
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import ActionSelectionModal from './ActionSelectionModal';
import WaitingScreen from './WaitingScreen';
import PendingActionModal from './PendingActionModal';
import GameOverScreen from './GameOverScreen';

// Define animation variants for player cards
const playerCardVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
    },
  }),
};

// Define animation variants for action logs
const actionLogVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Define animation variants for actions
const actionVariants = {
  coup: {
    scale: [1, 1.2, 1],
    rotate: [0, 10, -10, 0],
    transition: { duration: 0.6 },
  },
  // Define more action types as needed
};

interface GameBoardProps {
  game: Game;
  currentUserId: string;
  onActionSelect: (action: Action) => void;
  onRestartGame: () => void;
  onReturnToLobby: () => void;
  onSwitchToSpectator: () => void;
  isSpectator: boolean;
  handleRespondToPendingAction: (response: ActionResponse, blockOption?: string) => void;
  respondToReturnCard: (gameId: string, cardId: string) => void;
  respondToBlock: (gameId: string, isChallenge: boolean) => void;
  respondToExchangeSelect: (gameId: string, card1: string, card2: string) => void;
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
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const currentUser = game.players.find(p => p.userId === currentUserId);
  const isGameOver = game.isGameOver;
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [gameState, setGameState] = useState<string>('LOBBY');
  const [currentPendingAction, setCurrentPendingAction] = useState<PendingAction | null>(null);
  const [showReturnCardModal, setShowReturnCardModal] = useState(false);
  const [cardsToReturn, setCardsToReturn] = useState<Card[]>([]);
  const [showPendingActionModal, setShowPendingActionModal] = useState(true);
  const [showButton, setShowButton] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [forceShowGame, setForceShowGame] = useState(false);

  useEffect(() => {
    if (!showPendingActionModal && !!currentPendingAction) {
      setShowButton(true);
    } else {
      setShowButton(false);
    }
  }, [showPendingActionModal, currentPendingAction]);

  useEffect(() => {
    // Removed console logs for cleaner mobile experience
  }, [showPendingActionModal, currentPendingAction, isSpectator, currentUserId, gameState]);

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

  // Updated function to determine card styles based on user status
  const getCardStyle = (player: Player) => {
    let styles: React.CSSProperties = {};
    if (!player.isActive) {
      styles.filter = 'grayscale(100%)';
    }
    return styles;
  };

  const handlePendingActionClose = (deletePendingAction: boolean = false) => {
    setShowPendingActionModal(false);
    if (deletePendingAction) {
      if (currentPendingAction?.actionType !== 'exchangeSelect') {
        setCurrentPendingAction(null);
      }
      setShowPendingActionModal(true);
      setShowButton(false);
    }
  };

  const toggleCardFlip = (index: number) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  useEffect(() => {
    console.log('showPendingActionModal:', showPendingActionModal);
    console.log('game.currentTurnUserId === currentUserId:', game.currentTurnUserId === currentUserId);
    console.log('!game.pendingAction:', !game.pendingAction);
    console.log('game.currentTurnUserId !== currentUserId:', game.currentTurnUserId !== currentUserId);
    console.log('game.pendingAction:', game.pendingAction);
    console.log('forceShowGame:', forceShowGame);
    console.log('currentPendingAction?.actionType:', currentPendingAction?.actionType);
  }, [showPendingActionModal, game.currentTurnUserId, currentUserId, game.pendingAction, forceShowGame, currentPendingAction]);

  if (gameState === 'WAITING_FOR_PLAYERS') {
    return <WaitingScreen />;
  }

  if (gameState === 'GAME_OVER' && !forceShowGame) {
    return <GameOverScreen winnerName={game.players.find(p => p.userId === game.winnerId)?.username || t('game:player.unknown')} onRestart={onRestartGame} onExit={onReturnToLobby} game={game} currentUserId={currentUserId} showGame={() => setForceShowGame(true)} />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={2} justifyContent="center" sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <MuiCard variant="outlined">
            <CardHeader sx={{ bgcolor: 'grey.900', color: 'common.white' }} title={<><FaUserShield /> {t('game:actionLog.title')}</>} />
            <CardContent sx={{ maxHeight: isSmallScreen ? '150px' : '200px', overflowY: 'auto' }}>
              <List>
                {game.actionsHistory.map((log, index) => (
                  <motion.div
                    key={index}
                    variants={actionLogVariants} // Applying the variants here
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: index * 0.1 }}
                  >
                    <ListItem>
                      <Typography variant={isSmallScreen ? 'body2' : 'body1'}>
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
        {game.players.map((player, index) => (
          <Grid item key={player.userId} xs={12} sm={6} md={3}>
            <motion.div
              variants={playerCardVariants}
              initial="hidden"
              animate="visible"
              custom={index}
            >
              <MuiCard
                sx={{
                  textAlign: 'center',
                  border: player.userId === game.currentTurnUserId ? '1px solid #1976d2' : '1px solid rgba(0, 0, 0, 0.12)',
                  bgcolor: player.userId === game.currentTurnUserId ? 'grey.100' : 'background.paper',
                  position: 'relative',
                  boxShadow: player.userId === game.currentTurnUserId ? '0px 0px 15px 0px #1976d2' : 'none',
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
                  sx={{ bgcolor: player.userId === game.leaderId ? 'goldenrod' : (player.userId === currentUserId ? 'primary.dark' : 'primary.main'), color: 'common.white' }}
                  title={
                    <Box display="flex" alignItems="center" justifyContent="center" flexWrap="wrap">
                      <Typography variant={isSmallScreen ? 'subtitle2' : 'subtitle1'} sx={{ mr: 1, fontWeight: player.userId === currentUserId ? 'bold' : 'normal' }}>
                        {player.username} {player.userId === currentUserId && `(${t('common:labels.you')})`}
                      </Typography>
                      {player.userId === game.leaderId && (
                        <Tooltip title={t('game:status.leader')}>
                          <FaCrown color="warning" size={isSmallScreen ? '0.8em' : '1em'} />
                        </Tooltip>
                      )}
                      {player.userId !== currentUserId && (
                        <Tooltip title={player.userId === currentUserId ? t('common:labels.you') : ''}>
                          <span></span>
                        </Tooltip>
                      )}
                    </Box>
                  }
                />
                <CardContent>
                  <Typography variant={isSmallScreen ? 'body2' : 'body1'} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaCoins /> {player.coins} {t('game:resources.coins')}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: isSmallScreen ? 0.5 : 1, mt: 2, flexWrap: 'wrap' }}>
                    {player.hand.slice(0, 2).map((card, index) => {
                      if (card.isRevealed || isSpectator) {
                        return (
                          <Box key={index} sx={{ width: isSmallScreen ? '60px' : '105px', height: isSmallScreen ? '90px' : '175px' }}>
                            <img
                              src={cardImages[card.name.toLowerCase() as keyof CardImages]}
                              alt={card.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '8px',
                                objectFit: 'cover',
                                ...getCardStyle(player)
                              }}
                            />
                          </Box>
                        );
                      } else if (player.userId === currentUserId) {
                        return (
                          <Box
                            key={index}
                            sx={{
                              position: 'relative',
                              width: isSmallScreen ? '60px' : '105px',
                              height: isSmallScreen ? '90px' : '175px',
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
                              whileHover={!isSmallScreen ? { rotateY: 180 } : {}}
                              animate={
                                isSmallScreen
                                  ? { rotateY: flippedCards.has(index) ? 180 : 0 }
                                  : {}
                              }
                              onClick={
                                isSmallScreen
                                  ? () => toggleCardFlip(index)
                                  : undefined
                              }
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
                                  objectFit: 'cover',
                                  ...getCardStyle(player)
                                }}
                              />
                            </motion.div>
                          </Box>
                        );
                      } else {
                        return (
                          <Box key={index} sx={{ width: isSmallScreen ? '60px' : '105px', height: isSmallScreen ? '90px' : '170px' }}>
                            <img
                              src={backCard}
                              alt={card.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '8px',
                                objectFit: 'cover',
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
        ))}
      </Grid>

      {/* Spectators Section */}
      {isSpectator && (
        <Grid container spacing={2} justifyContent="center" sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <MuiCard variant="outlined">
              <CardHeader sx={{ bgcolor: 'secondary.main', color: 'common.white' }} title={<><FaUserShield /> {t('game:spectator.title')} ({game.spectators.length})</>} />
              <CardContent sx={{ maxHeight: isSmallScreen ? '150px' : '200px', overflowY: 'auto' }}>
                {spectators.length === 0 ? (
                  <Typography variant={isSmallScreen ? 'body2' : 'body1'}>{t('game:spectator.none')}</Typography>
                ) : (
                  <List>
                    {spectators.map((spectator, index) => (
                      <ListItem key={index}>
                        <Typography variant={isSmallScreen ? 'body2' : 'body1'}>{spectator.username}</Typography>
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
          <Button variant="contained" color="primary" onClick={openActionModal} fullWidth={isSmallScreen} size={isSmallScreen ? 'small' : 'medium'}>
            {t('game:actions.choose')}
          </Button>
        </Box>
      )}

      {!showPendingActionModal &&
        !isSpectator &&
        ((game.currentTurnUserId === currentUserId && game.pendingAction) ||
         (game.currentTurnUserId !== currentUserId) ||
         forceShowGame ||
         currentPendingAction?.actionType === 'exchangeSelect') && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setShowPendingActionModal(true);
                setForceShowGame(false);
              }}
              fullWidth={isSmallScreen}
              size={isSmallScreen ? 'small' : 'medium'}
              sx={{
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                  backgroundColor: 'primary.dark',
                },
                fontWeight: 'bold',
                padding: isSmallScreen ? '8px 16px' : '10px 20px',  
                borderRadius: '8px',
              }}
            >
              {t('common:buttons.continue')}
            </Button>
          </Box>
        )}
      {/* Waiting for turn */}
      {gameState === 'WAITING_FOR_TURN' && (
        <Container sx={{ textAlign: 'center', my: 5 }}>
          <CircularProgress color="primary" />
          <Typography variant={isSmallScreen ? 'h6' : 'h5'} sx={{ mt: 2 }}>
            {t('game:turn.waiting')}
          </Typography>
        </Container>
      )}

      {/* Switch to Spectator Button */}
      {!isSpectator && (
        <Tooltip title={t('game:spectator.switchTooltip')}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleSwitchClick}
            fullWidth={isSmallScreen}
            size={isSmallScreen ? 'small' : 'medium'}
            sx={{ display: 'block', margin: '0 auto', mt: 2 }}
          >
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
          showPendingActionModal &&
          !!currentPendingAction &&
          !isSpectator &&
          gameState !== 'ACTION_CHALLENGED' &&
          gameState !== 'GAME_OVER' &&
          (currentPendingAction.initiatorId !== currentUserId || currentPendingAction.actionType === 'exchangeSelect') &&
          currentPendingAction.actionType !== 'ReturnCard' &&
          (currentPendingAction.actionType !== 'exchangeSelect' || currentPendingAction.initiatorId === currentUserId) &&
          !currentPendingAction.responses[currentUserId] &&
          !!game.players.find(p => p.userId === currentUserId)?.isActive
        }
        action={currentPendingAction as Action | undefined}
        onRespond={handleRespond}
        onClose={handlePendingActionClose}
        pendingAction={currentPendingAction || undefined}
        currentUserId={currentUserId}
        players={game.players}
        respondToBlock={respondToBlock}
        respondToExchangeSelect={respondToExchangeSelect}
        gameId={game.roomCode}
      />

      {/* Switch Dialog */}
      <Dialog
        open={showSwitchModal}
        onClose={cancelSwitch}
        fullScreen={isSmallScreen}
        aria-labelledby="switch-dialog-title"
      >
        <DialogTitle id="switch-dialog-title">{t('game:spectator.switchTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('game:spectator.switchConfirm')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelSwitch} color="primary" size={isSmallScreen ? 'small' : 'medium'}>
            {t('common:buttons.cancel')}
          </Button>
          <Button onClick={confirmSwitch} color="secondary" size={isSmallScreen ? 'small' : 'medium'}>
            {t('game:spectator.switchButton')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showReturnCardModal}
        onClose={() => setShowReturnCardModal(false)}
        fullScreen={isSmallScreen}
        aria-labelledby="return-card-dialog-title"
        maxWidth={isSmallScreen ? 'xs' : 'sm'}
      >
        <DialogTitle id="return-card-dialog-title">{t('game:cards.selectReturn')}</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 2,
            }}
          >
            {cardsToReturn.map((card, index) => (
              <Box
                key={`${card.name}-${index}`}
                sx={{
                  flexBasis: {
                    xs: 'calc(33.333% - 16px)',
                    sm: 'calc(33.333% - 16px)',
                    md: 'calc(33.333% - 16px)',
                  },
                }}
              >
                <Button
                  onClick={() => handleCardReturn(card.name)}
                  disabled={card.isRevealed}
                  sx={{
                    height: 'auto',
                    width: isSmallScreen ? '200px' : '140px',
                    paddingTop: '150%',
                    position: 'relative',
                    border: '1px solid rgba(0, 0, 0, 0.23)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: card.isRevealed ? 'default' : 'pointer',
                    filter: card.isRevealed ? 'grayscale(100%)' : 'none',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundImage: `url(${cardImages[card.name.toLowerCase() as keyof CardImages]})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    },
                    ...(card.isRevealed
                      ? {}
                      : !isSmallScreen && {
                          '&:hover': {
                            opacity: 0.8,
                            border: '1px solid rgba(0, 0, 0, 0.54)',
                          },
                        }),
                  }}
                />
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReturnCardModal(false)} color="primary" size={isSmallScreen ? 'medium' : 'large'}>
            {t('common:buttons.cancel')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default GameBoard;
