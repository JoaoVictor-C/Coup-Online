import React, { useState, useContext } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Card, CardContent, CardMedia, Typography, Tooltip } from '@mui/material';
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

  const actionsRequiringTarget = ['steal', 'assassinate', 'coup'];

  const handleActionClick = (action: Action) => {
    if (game.isGameOver) {
      return;
    }
    const currentPlayer = game.players.find(player => player.userId === currentUserId);
    if (!currentPlayer) return;

    if (action.actionType === 'assassinate' && currentPlayer.coins < 3) {
      alert(t('game:actions.assassinate.notEnoughCoins'));
      return;
    }
    if (action.actionType === 'coup' && currentPlayer.coins < 7) {
      alert(t('game:actions.coup.notEnoughCoins'));
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
    if (!currentPlayer) return;

    const isDisabled = (actionType === 'assassinate' && currentPlayer.coins < 3) || 
                       (actionType === 'coup' && currentPlayer.coins < 7);

    return (
      <Box key={actionType} sx={{ width: { xs: '100%', sm: '50%', md: '25%' }, padding: 1 }}>
        <Tooltip title={getActionDetails(actionType).description} arrow>
          <Card 
            component={motion.div}
            whileHover={{ scale: isDisabled ? 1 : 1.05 }}
            whileTap={{ scale: isDisabled ? 1 : 0.95 }}
            onClick={() => !isDisabled && handleActionClick({ actionType: actionType as Action['actionType'] })}
            sx={{ 
              cursor: isDisabled ? 'not-allowed' : 'pointer', 
              height: '100%', 
              backgroundColor: isDisabled ? 'action.disabledBackground' : 'background.paper', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              opacity: isDisabled ? 0.5 : 1,
            }}
          >
            {actionsWithImages[actionType] && (
              <CardMedia
                component="img"
                height="auto"
                image={actionsWithImages[actionType]}
                alt={actionType}
              />
            )}
            {!actionsWithImages[actionType] && (
              <CardContent>
                <Typography variant="h6" component="div" sx={{ textAlign: 'center' }}>
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
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>{t('game:actions.select')}</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>{t('game:actions.roleActions')}</Typography>
          <Box display="flex" justifyContent="center" flexWrap="wrap">
            {['steal', 'assassinate', 'tax', 'exchange'].map(renderActionCard)}
          </Box>
          <Typography variant="h6" gutterBottom sx={{ mt: 3, textAlign: 'center' }}>{t('game:actions.mainActions')}</Typography>
          <Box display="flex" justifyContent="center" flexWrap="wrap">
            {['income', 'foreign_aid', 'coup'].map(renderActionCard)}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="primary" disabled={showTargetModal}>
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
    </>
  );
};

export default ActionSelectionModal;
