import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Grid, Box, useMediaQuery, useTheme } from '@mui/material';
import { Action, ActionResponse, Card, CardImages, cardImages, PendingAction, Player } from '@utils/types';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

interface PendingActionModalProps {
  open: boolean;
  action?: Action;
  onRespond: (response: ActionResponse, blockOption?: string) => void;
  onClose: (deletePendingAction?: boolean) => void;
  pendingAction?: PendingAction | undefined;
  currentUserId: string;
  players: Player[];
  respondToBlock: (gameId: string, isChallenge: boolean) => void;
  respondToExchangeSelect: (gameId: string, card1: string, card2: string) => void;
  gameId: string;
}

// Define animation variants for the modal
const modalVariants = {
  hidden: { x: '100vw', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
  exit: { x: '100vw', opacity: 0, transition: { ease: 'easeInOut' } },
};

const PendingActionModal: React.FC<PendingActionModalProps> = ({
  open,
  action,
  onRespond,
  onClose,
  pendingAction,
  currentUserId,
  players,
  respondToBlock,
  respondToExchangeSelect,
  gameId
}) => {
  const { t } = useTranslation(['game', 'common']);
  const [showSelectBlockOption, setShowSelectBlockOption] = useState(false);
  const [showRespondToBlock, setShowRespondToBlock] = useState(false);
  const [showRespondToExchangeSelect, setShowRespondToExchangeSelect] = useState(false);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [maxSelections, setMaxSelections] = useState(2);
  const theme = useTheme();
  const isFullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isTarget = pendingAction?.targetId === currentUserId;

  // Define animation variants for buttons
  const buttonVariants = {
    tap: { scale: 0.95 },
  };

  const handleResponse = (response: ActionResponse, blockOption?: string) => {
    if (response === 'block' && action?.actionType === 'steal' && blockOption === undefined) {
      setShowSelectBlockOption(true);
    } else {
      if (action?.actionType === 'foreign_aid' && blockOption === undefined) {
        blockOption = 'duke';
      } else if (action?.actionType === 'assassinate' && blockOption === undefined) {
        blockOption = 'contessa';
      }
      onRespond(response, blockOption);
      setShowSelectBlockOption(false);
      onClose(true);
    }
  };

  const handleExchangeSelect = (card: Card, index: number) => {
    const cardKey = `${card.name}-${index}`;

    if (selectedCards.includes(cardKey)) {
      setSelectedCards(selectedCards.filter(selectedCard => selectedCard !== cardKey));
    } else {
      if (selectedCards.length < maxSelections) {
        setSelectedCards([...selectedCards, cardKey]);
      } else {
        setSelectedCards([cardKey]);
      }
    }
  };

  useEffect(() => {
    const initiator = players.find((player) => player.userId === pendingAction?.initiatorId);
    const playerHand = initiator?.hand || [];
    const unrevealedCards = playerHand.filter(card => !card.isRevealed);
    setMaxSelections(unrevealedCards.length === 3 ? 1 : 2);
  }, [pendingAction, players]);

  useEffect(() => {
    if (pendingAction?.actionType === 'blockAttempt' && pendingAction.targetId === currentUserId) {
      setShowRespondToBlock(true);
    } else if (pendingAction?.actionType === 'exchangeSelect' && pendingAction.initiatorId === currentUserId) {
      setShowRespondToExchangeSelect(true);
    } else {
      setShowRespondToBlock(false);
      setShowRespondToExchangeSelect(false);
    }
  }, [pendingAction, currentUserId]);

  useEffect(() => {
    if (!showRespondToExchangeSelect && open && pendingAction?.actionType === 'exchangeSelect' && pendingAction.initiatorId === currentUserId) {
      setShowRespondToExchangeSelect(true);
    }
  }, [open, showRespondToExchangeSelect]);

  if (!action) return null;

  if (showRespondToExchangeSelect && open) {
    const initiator = players.find((player) => player.userId === pendingAction?.initiatorId);
    const playerHand = initiator?.hand || [];
    const unrevealedCards = playerHand.filter(card => !card.isRevealed);
    const handleConfirmKeep = () => {
      let toReturnCards: Card[];
      if (maxSelections === 1) {
        toReturnCards = unrevealedCards.filter((card, index) => !selectedCards.includes(`${card.name}-${index}`));
      } else {
        toReturnCards = playerHand.filter((card, index) => !selectedCards.includes(`${card.name}-${index}`));
      }
      if (toReturnCards.length === (maxSelections === 1 ? 2 : playerHand.length - maxSelections)) {
        onClose(true);
        respondToExchangeSelect(
          gameId,
          toReturnCards[0].name,
          toReturnCards[1] ? toReturnCards[1].name : ''
        );
        setShowRespondToExchangeSelect(false);
        setSelectedCards([]);
      }
    };
    return (
      <Dialog
        open={showRespondToExchangeSelect && open}
        onClose={() => {
          setShowRespondToExchangeSelect(false);
          setSelectedCards([]);
          onClose(false);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t('game:actions.exchange.selectCardsToKeep', { count: maxSelections })}</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom sx={{ mb: 2 }} textAlign="center">
            {t('game:actions.exchange.selectKeepPrompt', { count: maxSelections })}
          </Typography>
          <Grid container spacing={2} justifyContent="center">
            {unrevealedCards.map((card, index) => {
              const cardKey = `${card.name}-${index}`;
              const isSelected = selectedCards.includes(cardKey);
              const isDisabled =
                (selectedCards.length === maxSelections && !isSelected);

              return (
                <Grid item xs={6} sm={4} md={3} key={cardKey}>
                  <Button
                    variant="outlined"
                    onClick={() => handleExchangeSelect(card, index)}
                    disabled={isDisabled}
                    sx={{
                      position: 'relative',
                      width: '90%',
                      paddingTop: '150%', // 2:3 aspect ratio
                      border: isSelected ? '3px solid #1976d2' : '1px solid rgba(0, 0, 0, 0.23)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: 'white',
                      backgroundImage: `url(${cardImages[card.name.toLowerCase() as keyof CardImages]})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      opacity: isDisabled ? 0.5 : 1,
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      '&:hover': {
                        opacity: isDisabled ? 0.5 : 0.8,
                        border: isSelected ? '3px solid #115293' : '1px solid rgba(0, 0, 0, 0.54)',
                      },
                    }}
                  >
                    {isSelected && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          bgcolor: 'rgba(25, 118, 210, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography variant="h4" color="white" sx={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
                          ✓
                        </Typography>
                      </Box>
                    )}
                  </Button>
                </Grid>
              );
            })}
          </Grid>
          {selectedCards.length === maxSelections && (
            <Button
              variant="contained"
              color="primary"
              onClick={handleConfirmKeep}
              fullWidth
              sx={{ mt: 2 }}
            >
              {t('common:buttons.confirm')}
            </Button>
          )}
        </DialogContent>
        <DialogActions sx={{ flexDirection: isFullScreen ? 'column' : 'row', gap: 1 }}>
          <Button onClick={() => {
            setShowRespondToExchangeSelect(false);
            setSelectedCards([]);
            onClose(false);
          }} color="secondary" fullWidth={isFullScreen}>
            {t('common:buttons.returnToGame')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (showSelectBlockOption && open) {
    return (
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <Dialog
          open={showSelectBlockOption && open}
          onClose={() => onClose(false)}
          maxWidth={isFullScreen ? 'xs' : 'sm'}
          fullWidth
          fullScreen={isFullScreen}
        >
          <DialogTitle>{t('game:actions.block.selectOption')}</DialogTitle>
          <DialogContent>
            <Typography variant="body1" gutterBottom>{t('game:actions.block.selectCard')}</Typography>
            <Grid container spacing={2} justifyContent="center">
              <Grid item xs={6} sm={4}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleResponse('block', 'ambassador')}
                  sx={{
                    width: '100%',
                    paddingTop: '150%', // 2:3 aspect ratio
                    backgroundImage: `url(${cardImages.ambassador})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: 'white',
                    '&:hover': {
                      opacity: 0.8,
                    },
                  }}
                >
                </Button>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleResponse('block', 'captain')}
                  sx={{
                    width: '100%',
                    paddingTop: '150%', // 2:3 aspect ratio
                    backgroundImage: `url(${cardImages.captain})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: 'white',
                    '&:hover': {
                      opacity: 0.8,
                    },
                  }}
                >
                </Button>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ flexDirection: isFullScreen ? 'column' : 'row', gap: 1 }}>
            <Button onClick={() => setShowSelectBlockOption(false)} fullWidth={isFullScreen}>
              {t('common:buttons.cancel')}
            </Button>
            <Button onClick={() => onClose(false)} color="secondary" fullWidth={isFullScreen}>
              {t('common:buttons.returnToGame')}
            </Button>
          </DialogActions>
        </Dialog>
      </motion.div>
    );
  }

  if (showRespondToBlock && isTarget) {
    return (
      <Dialog
        open={showRespondToBlock && open}
        onClose={() => onClose(false)}
        maxWidth={isFullScreen ? 'xs' : 'sm'}
        fullWidth
        fullScreen={isFullScreen}
      >
        <DialogTitle>{t('game:actions.block.respondTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            {players.find(player => player.userId === pendingAction?.initiatorId)?.username} {t('game:actions.block.attemptingBlock')}
          </Typography>
          <Typography variant="body1" gutterBottom>{t('game:actions.block.challengePrompt')}</Typography>
          <Grid container spacing={2} justifyContent="center" sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="contained"
                color="error"
                onClick={() => {
                  onClose(true);
                  respondToBlock(gameId, true);
                }}
                sx={{
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  backgroundColor: '#d32f2f',
                  '&:hover': {
                    backgroundColor: '#9a0007',
                  },
                }}
              >
                {t('game:actions.challenge')}
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="contained"
                color="secondary"
                onClick={() => {
                  onClose(true);
                  respondToBlock(gameId, false);
                }}
                sx={{
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  backgroundColor: '#f50057',
                  '&:hover': {
                    backgroundColor: '#c51162',
                  },
                }}
              >
                {t('game:actions.pass')}
              </Button>
            </Grid>
            <Grid item xs={12}>
              <Button
                fullWidth
                onClick={() => onClose(false)}
                color="primary"
                variant="outlined"
                sx={{
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  borderColor: '#3f51b5',
                  color: '#3f51b5',
                  '&:hover': {
                    backgroundColor: 'rgba(63, 81, 181, 0.04)',
                  },
                }}
              >
                {t('common:buttons.returnToGame')}
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>
    );
  }

  return (
   !showRespondToExchangeSelect && (
      <AnimatePresence>
        {open && (
          <motion.div
            variants={modalVariants}
            animate="visible"
            exit="exit"
          >
            <Dialog
              open={open}
              onClose={() => onClose(false)}
              PaperComponent={motion.div as React.ComponentType<React.PropsWithChildren<{}>>}
              PaperProps={{
                variants: modalVariants,
                sx: { backgroundColor: 'white' },
              }}
              fullWidth
              maxWidth="sm"
            >
              <DialogTitle>
                {t('game:actions.pending')}
              </DialogTitle>
              <DialogContent>
                <Typography variant="body1" gutterBottom>
                  {t('game:actions.pendingDetails', { action: t(`game:actions.${action.actionType}.name`) })}
                </Typography>
              </DialogContent>
              <DialogActions sx={{ flexDirection: 'column', gap: 2 }}>
                {/* Action Buttons */}
                {action.actionType !== 'income' && action.actionType !== 'coup' && (
                  <>
                    {['foreign_aid', 'steal', 'assassinate'].includes(action.actionType) && (
                      <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap" style={{ width: '100%' }}>
                        <Button variant="contained" color="error" onClick={() => handleResponse('block')} fullWidth>
                          {t('game:actions.block.action')}
                        </Button>
                      </motion.div>
                    )}
                    {['steal', 'assassinate', 'exchange', 'tax'].includes(action.actionType) && (
                      <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap" style={{ width: '100%' }}>
                        <Button variant="contained" color="warning" onClick={() => handleResponse('challenge')} fullWidth>
                          {t('game:actions.challenge')}
                        </Button>
                      </motion.div>
                    )}
                  </>
                )}
                <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap" style={{ width: '100%' }}>
                  <Button variant="contained" color="secondary" onClick={() => handleResponse('pass')} fullWidth>
                    {t('game:actions.pass')}
                  </Button>
                </motion.div>
                <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap" style={{ width: '100%' }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => onClose(false)}
                    fullWidth
                    sx={{
                      mt: 2,
                    }}
                  >
                    {t('common:buttons.returnToGame')}
                  </Button>
                </motion.div>
              </DialogActions>
            </Dialog>
          </motion.div>
        )}
      </AnimatePresence>
    )
  );
};

export default PendingActionModal;
