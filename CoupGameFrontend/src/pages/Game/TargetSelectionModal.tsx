import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemText, Typography } from '@mui/material';
import { Game } from '@utils/types';
import { useTranslation } from 'react-i18next';

interface TargetSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelectTarget: (userId: string) => void;
  game: Game;
  currentUserId: string;
}

const TargetSelectionModal: React.FC<TargetSelectionModalProps> = ({ open, onClose, onSelectTarget, game, currentUserId }) => {
  const { t } = useTranslation(['game', 'common']);
  const alivePlayers = game.players.filter(p => p.isActive && p.userId !== currentUserId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('game:actions.selectTarget')}</DialogTitle>
      <DialogContent>
        {alivePlayers.length > 0 ? (
          <List>
            {alivePlayers.map(player => (
              <ListItem 
                key={player.userId} 
                component="button"
                onClick={() => onSelectTarget(player.userId)}
                sx={{ '&:hover': { backgroundColor: 'action.hover' } }}
              >
                <ListItemText 
                  primary={player.username} 
                  secondary={`${player.coins} ${t('game:actions.coins')}`}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body1">{t('game:actions.noTargets')}</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          {t('common:buttons.cancel')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TargetSelectionModal;
