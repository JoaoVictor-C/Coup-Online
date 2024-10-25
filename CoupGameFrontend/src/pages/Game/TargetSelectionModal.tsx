import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Typography,
  Divider
} from '@mui/material';
import { Game } from '@utils/types';
import { useTranslation } from 'react-i18next';
import { green } from '@mui/material/colors';

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
      <DialogTitle sx={{ backgroundColor: green[500], color: '#fff' }}>
        {t('game:actions.selectTarget')}
      </DialogTitle>
      <DialogContent dividers>
        {alivePlayers.length > 0 ? (
          <List>
            {alivePlayers.map(player => (
              <React.Fragment key={player.userId}>
                <ListItemButton onClick={() => onSelectTarget(player.userId)}>
                  <ListItemAvatar>
                    <Avatar alt={player.username}>
                      {player.username.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1" fontWeight="bold">
                        {player.username}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="textSecondary">
                        {t('game:actions.coins')}: {player.coins}
                      </Typography>
                    }
                  />
                </ListItemButton>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Typography variant="body1" align="center" color="textSecondary">
            {t('game:actions.noTargets')}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" color="primary">
          {t('common:buttons.cancel')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TargetSelectionModal;
