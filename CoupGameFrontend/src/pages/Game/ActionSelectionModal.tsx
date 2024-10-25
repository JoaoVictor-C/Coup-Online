import React, { useState, useContext } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Tooltip,
  useMediaQuery,
  useTheme,
  Snackbar,
  Alert
} from '@mui/material';
import { motion } from 'framer-motion';
import { Game, Action, cardImages } from '@utils/types';
import TargetSelectionModal from './TargetSelectionModal';
import { GameContext } from '@context/GameContext';
import { useTranslation } from 'react-i18next';

interface ActionSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelectAction: (action: Action) => void;
  game: Game;
  currentUserId: string;
}

const ActionSelectionModal: React.FC<ActionSelectionModalProps> = ({
  open,
  onClose,
  onSelectAction,
  game,
  currentUserId,
}) => {
  const { t } = useTranslation(['game', 'common']);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const { handlePendingAction } = useContext(GameContext);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'error' | 'warning' | 'info' | 'success' }>({ open: false, message: '', severity: 'info' });

  const actionsRequiringTarget = ['steal', 'assassinate', 'coup'];

  const handleActionClick = (action: Action) => {
    if (game.isGameOver) {
      setSnackbar({ open: true, message: t('game:alerts.gameOver'), severity: 'warning' });
      return;
    }
    const currentPlayer = game.players.find(player => player.userId === currentUserId);
    if (!currentPlayer) {
      setSnackbar({ open: true, message: t('game:alerts.playerNotFound'), severity: 'error' });
      return;
    }

    if (action.actionType === 'assassinate' && currentPlayer.coins < 3) {
      setSnackbar({ open: true, message: t('game:actions.assassinate.notEnoughCoins'), severity: 'error' });
      return;
    }
    if (action.actionType === 'coup' && currentPlayer.coins < 7) {
      setSnackbar({ open: true, message: t('game:actions.coup.notEnoughCoins'), severity: 'error' });
      return;
    }

    console.log('Action clicked:', action);
    if (actionsRequiringTarget.includes(action.actionType)) {
      setSelectedAction(action);
      setShowTargetModal(true);
    } else {
      onSelectAction(action);
      onClose();
    }
  };

  const handleTargetSelect = (targetUserId: string) => {
    if (selectedAction) {
      const actionWithTarget: Action = {
        ...selectedAction,
        targetUserId
      };
      onSelectAction(actionWithTarget);
      handlePendingAction({
        ...actionWithTarget,
        gameId: game.id,
        initiatorId: currentUserId,
        isActionResolved: false,
        responses: {},
        originalActionType: selectedAction.actionType,
        timestamp: new Date(),
      });
      setSelectedAction(null);
      setShowTargetModal(false);
      onClose();
    }
  };

  const handleCloseTargetModal = () => {
    setSelectedAction(null);
    setShowTargetModal(false);
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const getActionDetails = (actionType: string) => {
    return {
      description: t(`game:actions.${actionType}.description`),
      canBlock: ['foreign_aid', 'steal', 'assassinate'].includes(actionType),
      canChallenge: ['steal', 'assassinate', 'exchange', 'tax'].includes(actionType),
    };
  };

  const actionsWithImages: { [key: string]: string | undefined } = {
    steal: cardImages.captain,
    assassinate: cardImages.assassin,
    exchange: cardImages.ambassador,
    tax: cardImages.duke,
    income: undefined,
    foreign_aid: undefined,
    coup: undefined,
  };

  const renderActionCard = (actionType: string) => {
    const currentPlayer = game.players.find(player => player.userId === currentUserId);
    if (!currentPlayer) return null;

    const isDisabled =
      (actionType === 'assassinate' && currentPlayer.coins < 3) ||
      (actionType === 'coup' && currentPlayer.coins < 7);

    return (
      <Box
        key={actionType}
        sx={{
          width: { xs: '100%', sm: '48%', md: '23%' },
          padding: 1,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Tooltip title={getActionDetails(actionType).description} arrow>
          <Card
            component={motion.div}
            whileHover={{ scale: isDisabled ? 1 : 1.05 }}
            whileTap={{ scale: isDisabled ? 1 : 0.95 }}
            onClick={() => !isDisabled && handleActionClick({ actionType: actionType as Action['actionType'] })}
            sx={{
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              height: '100%',
              width: actionsWithImages[actionType] ? { xs: '100%', sm: '120px' } : '100%',
              backgroundColor: isDisabled ? theme.palette.action.disabledBackground : theme.palette.background.paper,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'end',
              opacity: isDisabled ? 0.6 : 1,
              minHeight: { xs: '120px', sm: '150px' },
              transition: 'transform 0.2s, opacity 0.2s',
            }}
          >
            {actionsWithImages[actionType] ? (
              <CardMedia
                component="img"
                sx={{
                  width: actionsWithImages[actionType] ? { xs: '80px', sm: '120px' } : '100%',
                  height: 'auto',
                }}
                image={actionsWithImages[actionType]}
                alt={t(`game:actions.${actionType}.name`)}
              />
            ) : (
              <CardContent>
                <Typography
                  variant="subtitle1"
                  component="div"
                  sx={{
                    textAlign: 'center',
                    width: '100%',
                    fontSize: { xs: '0.9rem', sm: '1rem' },
                    color: isDisabled ? theme.palette.text.disabled : theme.palette.text.primary,
                  }}
                >
                  {t(`game:actions.${actionType}.name`)}
                </Typography>
              </CardContent>
            )}
          </Card>
        </Tooltip>
      </Box>
    );
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
        <DialogTitle sx={{ textAlign: 'center', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
          {t('game:actions.select')}
        </DialogTitle>
        <DialogContent>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ textAlign: 'center', fontSize: { xs: '1.1rem', sm: '1.3rem' } }}
          >
            {t('game:actions.roleActions')}
          </Typography>
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            flexWrap={{ xs: 'nowrap', sm: 'wrap' }}
            sx={{
              overflowX: { xs: 'auto', sm: 'visible' },
              pb: { xs: 1, sm: 0 },
            }}
          >
            {['steal', 'assassinate', 'tax', 'exchange'].map(renderActionCard)}
          </Box>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ mt: 3, textAlign: 'center', fontSize: { xs: '1.1rem', sm: '1.3rem' } }}
          >
            {t('game:actions.mainActions')}
          </Typography>
          <Box display="flex" justifyContent="center" flexWrap="wrap">
            {['income', 'foreign_aid', 'coup'].map(renderActionCard)}
          </Box>
        </DialogContent>
        <DialogActions sx={{ padding: { xs: '16px', sm: '24px' } }}>
          <Button onClick={onClose} color="primary" disabled={showTargetModal} fullWidth={fullScreen}>
            {t('common:buttons.cancel')}
          </Button>
        </DialogActions>
      </Dialog>

      {selectedAction && (
        <TargetSelectionModal
          open={showTargetModal}
          onClose={handleCloseTargetModal}
          onSelectTarget={handleTargetSelect}
          game={game}
          currentUserId={currentUserId}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ActionSelectionModal;
