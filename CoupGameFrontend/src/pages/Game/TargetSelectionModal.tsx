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
import { motion } from 'framer-motion';
import { green } from '@mui/material/colors';

interface TargetSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelectTarget: (userId: string) => void;
  game: Game;
  currentUserId: string;
  showDisabledPlayers: boolean;
}

// Define animation variants for list items
const listItemVariants = {
  hidden: { opacity: 0, x: -50 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.1,
      type: 'spring',
      stiffness: 100,
    },
  }),
};

const TargetSelectionModal: React.FC<TargetSelectionModalProps> = ({ open, onClose, onSelectTarget, game, currentUserId, showDisabledPlayers }) => {
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
            {alivePlayers.map((player, index) => (
              <React.Fragment key={player.userId}>
                <motion.div
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  variants={listItemVariants}
                >
                  <ListItemButton 
                    onClick={() => onSelectTarget(player.userId)}
                    disabled={player.coins === 0 && !showDisabledPlayers}
                    sx={{
                      opacity: player.coins === 0 && !showDisabledPlayers ? 0.5 : 1,
                      cursor: player.coins === 0 && !showDisabledPlayers ? 'not-allowed' : 'pointer'
                    }}
                  >
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
                </motion.div>
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
        <motion.div whileHover={{ scale: 1.05 }}>
          <Button onClick={onClose} variant="contained" color="primary">
            {t('common:buttons.cancel')}
          </Button>
        </motion.div>
      </DialogActions>
    </Dialog>
  );
};

export default TargetSelectionModal;
