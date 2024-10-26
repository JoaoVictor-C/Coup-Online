import React, { useState, useContext } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Tooltip,
  useMediaQuery,
  useTheme,
  Snackbar,
  Alert,
  Box,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
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

// Define animation variants for the modal
const modalVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } },
};

// Define animation variants for action cards
const cardVariants = {
  hover: { scale: 1.05, boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.2)' },
  tap: { scale: 0.95 },
};

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

  // Start of Selection
  const renderActionCard = (actionType: string) => {
    const currentPlayer = game.players.find(player => player.userId === currentUserId);
    if (!currentPlayer) return null;

    const isDisabled =
      (actionType === 'assassinate' && currentPlayer.coins < 3) ||
      (actionType === 'coup' && currentPlayer.coins < 7);

    return (
      <Grid item xs={12} sm={6} md={3} key={actionType}>
        <Tooltip title={getActionDetails(actionType).description} arrow>
          <motion.div
            variants={cardVariants}
            whileHover="hover"
            whileTap="tap"
          >
            <Card
              component={motion.div}
              whileHover={{ scale: isDisabled ? 1 : 1.05 }}
              whileTap={{ scale: isDisabled ? 1 : 0.95 }}
              onClick={() => !isDisabled && handleActionClick({ actionType: actionType as Action['actionType'] })}
              sx={{
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                backgroundColor: isDisabled ? theme.palette.action.disabledBackground : theme.palette.background.paper,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                opacity: isDisabled ? 0.6 : 1,
                boxShadow: isDisabled ? 'none' : theme.shadows[3],
                borderRadius: 2,
                transition: 'transform 0.2s, opacity 0.2s',
                '&:hover': {
                  boxShadow: !isDisabled ? theme.shadows[6] : 'none',
                },
              }}
            >
              {actionsWithImages[actionType] ? (
                <CardMedia
                  component="img"
                  sx={{
                    width: 'auto',
                    height: '210px',
                    mb: 2,
                  }}
                  image={actionsWithImages[actionType]}
                  alt={t(`game:actions.${actionType}.name`)}
                />
              ) : (
                <CardContent sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography
                    variant="subtitle1"
                    align="center"
                    sx={{
                      fontSize: { xs: '0.9rem', sm: '1rem' },
                      color: isDisabled ? theme.palette.text.disabled : theme.palette.text.primary,
                    }}
                  >
                    {t(`game:actions.${actionType}.name`)}
                  </Typography>
                </CardContent>
              )}
            </Card>
          </motion.div>
        </Tooltip>
      </Grid>
    );
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Dialog
              open={open}
              onClose={onClose}
              PaperComponent={motion.div as React.ComponentType<React.PropsWithChildren<{}>>}
              PaperProps={{
                variants: modalVariants,
                fullScreen: fullScreen,
                sx: { backgroundColor: 'white' },
              }}
              fullWidth
              maxWidth="md"
            >
              <DialogTitle sx={{ textAlign: 'center', fontSize: { xs: '1.5rem', sm: '2rem' }, fontWeight: 'bold', color: theme.palette.primary.main }}>
                {t('game:actions.select')}
              </DialogTitle>
              <DialogContent dividers>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ textAlign: 'center', fontSize: { xs: '1.1rem', sm: '1.3rem' }, mb: 2, color: theme.palette.text.primary }}
                >
                  {t('game:actions.roleActions')}
                </Typography>
                <Grid container spacing={2} justifyContent="center">
                  {['steal', 'assassinate', 'tax', 'exchange'].map(renderActionCard)}
                </Grid>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ mt: 4, textAlign: 'center', fontSize: { xs: '1.1rem', sm: '1.3rem' }, mb: 2, color: theme.palette.text.primary }}
                >
                  {t('game:actions.mainActions')}
                </Typography>
                <Grid container spacing={2} justifyContent="center">
                  {['income', 'foreign_aid', 'coup'].map(renderActionCard)}
                </Grid>
              </DialogContent>
              <DialogActions sx={{ padding: { xs: '16px', sm: '24px' }, justifyContent: 'center' }}>
                <Button
                  onClick={onClose}
                  color="primary"
                  variant="contained"
                  disabled={showTargetModal}
                  fullWidth={fullScreen}
                  sx={{
                    maxWidth: '200px',
                    padding: { xs: '8px 16px', sm: '10px 20px' },
                    fontSize: { xs: '0.9rem', sm: '1rem' },
                    borderRadius: 2,
                  }}
                >
                  {t('common:buttons.cancel')}
                </Button>
              </DialogActions>
            </Dialog>
          </motion.div>
        )}
      </AnimatePresence>

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
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ActionSelectionModal;
