import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Grid, Box, useMediaQuery, useTheme } from '@mui/material';
import { Action, ActionResponse, Card, CardImages, cardImages, PendingAction, Player } from '@utils/types';
import { useTranslation } from 'react-i18next';

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

  if (!action) return null;

  if (showRespondToExchangeSelect) {
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
        open={showRespondToExchangeSelect}
        onClose={() => setShowRespondToExchangeSelect(false)}
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
                <Grid item key={cardKey}>
                  <Button
                    variant="outlined"
                    onClick={() => handleExchangeSelect(card, index)}
                    disabled={isDisabled}
                    sx={{
                      position: 'relative',
                      minWidth: '120px',
                      height: '220px',
                      padding: 0,
                      border: isSelected ? '3px solid #1976d2' : '1px solid rgba(0, 0, 0, 0.23)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: 'transparent',
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
        <DialogActions>
          <Button onClick={() => onClose(false)} color="secondary">
            {t('common:buttons.returnToGame')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (showSelectBlockOption) {
    return (
      <Dialog open={showSelectBlockOption && open} onClose={() => onClose(false)}>
        <DialogTitle>{t('game:actions.block.selectOption')}</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>{t('game:actions.block.selectCard')}</Typography>
          <Grid container spacing={2} justifyContent="center">
            <Grid item>
              <Button
                variant="contained"
                color="primary"
                onClick={() => handleResponse('block', 'ambassador')}
                sx={{
                  backgroundImage: `url(${cardImages.ambassador})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  width: '120px',
                  height: '220px',
                  '&:hover': {
                    opacity: 0.8,
                  },
                }}
              >
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                color="primary"
                onClick={() => handleResponse('block', 'captain')}
                sx={{
                  backgroundImage: `url(${cardImages.captain})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  width: '120px',
                  height: '220px',
                  '&:hover': {
                    opacity: 0.8,
                  },
                }}
              >
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSelectBlockOption(false)}>{t('common:buttons.cancel')}</Button>
          <Button onClick={() => onClose(false)} color="secondary">
            {t('common:buttons.returnToGame')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (showRespondToBlock) {
    return (
      <Dialog open={showRespondToBlock && open} onClose={() => onClose(false)}>
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
                  fontSize: '1.1rem',
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
                  fontSize: '1.1rem',
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
            <Grid item xs={12} sm={12}>
              <Button
                fullWidth
                onClick={() => onClose(false)}
                color="primary"
                variant="outlined"
                sx={{
                  width: '100%',
                  fontSize: '1.1rem',
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
    <Dialog
      open={open}
      onClose={() => onClose(false)}
      fullWidth
      maxWidth="sm"
      fullScreen={isFullScreen} // Make full-screen on small devices
    >
      <DialogTitle>{t('game:actions.pending')}</DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          {pendingAction?.initiatorId === currentUserId
            ? t('game:actions.you')
            : players.find(player => player.userId === pendingAction?.initiatorId)?.username}{' '}
          {t('game:actions.performing')} <strong>{t(`game:actions.${action.actionType}.description`)}</strong>
        </Typography>
        <Typography variant="body1" gutterBottom>{t('game:actions.respondPrompt')}</Typography>
      </DialogContent>
      <DialogActions>
        {action.actionType !== 'income' && action.actionType !== 'coup' && (
          <>
            {['foreign_aid', 'steal', 'assassinate'].includes(action.actionType) && (
              <Button variant="contained" color="error" onClick={() => handleResponse('block')}>
                {t('game:actions.block.action')}
              </Button>
            )}
            {['steal', 'assassinate', 'exchange', 'tax'].includes(action.actionType) && (
              <Button variant="contained" color="warning" onClick={() => handleResponse('challenge')}>
                {t('game:actions.challenge')}
              </Button>
            )}
          </>
        )}
        <Button variant="contained" color="secondary" onClick={() => handleResponse('pass')}>
          {t('game:actions.pass')}
        </Button>
        <Button variant="outlined" color="primary" onClick={() => onClose(false)}>
          {t('common:buttons.returnToGame')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PendingActionModal;
