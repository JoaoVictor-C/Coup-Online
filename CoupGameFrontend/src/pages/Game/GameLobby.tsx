// Start of Selection
import React, { useState } from 'react';
import { Game } from '@utils/types';
import {
  Button,
  Container,
  Alert,
  List,
  ListItem,
  Chip,
  Grid,
  Typography,
  Box,
  Snackbar,
  Avatar,
  Tooltip,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SecurityIcon from '@mui/icons-material/Security';
import LeaderboardIcon from '@mui/icons-material/EmojiEvents';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

interface GameLobbyProps {
  game: Game;
  currentUserId: string;
  onSwitchToSpectator: () => void;
  onRejoinAsPlayer: () => void;
  onStartGame: () => void;
  isSpectator?: boolean;
}

const GameLobby: React.FC<GameLobbyProps> = ({
  game,
  currentUserId,
  onSwitchToSpectator,
  onRejoinAsPlayer,
  onStartGame,
  isSpectator = false,
}) => {
  const { t } = useTranslation(['game', 'common']);
  const [copySuccess, setCopySuccess] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleCopyCode = () => {
    navigator.clipboard.writeText(game.roomCode).then(() => {
      setCopySuccess(true);
      setOpenSnackbar(true);
    });
  };

  const handleCloseSnackbar = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpenSnackbar(false);
  };

  const isLeader = currentUserId === game.leaderId;

  return (
    <Container
      maxWidth="sm"
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 3,
        p: { xs: 2, sm: 4 },
      }}
    >
      <Grid container spacing={4} justifyContent="center">
        <Grid item xs={12}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant={isMobile ? "h5" : "h4"} gutterBottom>
              <SecurityIcon color="primary" sx={{ verticalAlign: 'middle', mr: 1 }} />
              {t('game:room.lobby.title', { gameName: game.gameName })}
            </Typography>
            <Typography variant={isMobile ? "h6" : "h5"} gutterBottom>
              {t('game:room.lobby.waiting')}
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              {t('game:room.lobby.players', {
                current: game.players.length,
                max: game.playerCount,
              })}
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <AnimatePresence>
            <List>
              {game.players.map((player) => {
                const isLeader = player.userId === game.leaderId;
                const isCurrentUser = player.userId === currentUserId;

                return (
                  <motion.div
                    key={`player-${player.userId}`}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ListItem
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1,
                        bgcolor: 'grey.100',
                        borderRadius: 1,
                        boxShadow: 1,
                        flexDirection: isMobile ? 'column' : 'row',
                        textAlign: isMobile ? 'center' : 'left',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: isMobile ? 1 : 0 }}>
                        <Avatar
                          sx={{
                            bgcolor: isLeader ? 'goldenrod' : 'primary.main',
                            mr: 2,
                          }}
                        >
                          {player.username.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="body1">
                          {player.username} {isLeader && `(${t('game:room.lobby.leader')})`}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {isCurrentUser && (
                          <Tooltip title={t('game:labels.you')}>
                            <Chip label={t('game:labels.you')} color="success" sx={{ ml: 1 }} />
                          </Tooltip>
                        )}
                      </Box>
                    </ListItem>
                  </motion.div>
                );
              })}
            </List>
          </AnimatePresence>
        </Grid>

        {game.isGameOver && game.winnerId && (
          <Grid item xs={12}>
            <Alert
              severity="success"
              sx={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <EmojiEventsIcon sx={{ mr: 1 }} />
              {t('game:status.gameOver')} {t('game:status.winner')}:{' '}
              {game.winnerId === currentUserId
                ? t('game:status.you')
                : game.players.find((p) => p.userId === game.winnerId)?.username || t('game:player.unknown')}
            </Alert>
          </Grid>
        )}

        {isLeader && (
          <Grid item xs={12}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'center',
                gap: 2,
                mt: 2,
                flexWrap: 'wrap',
              }}
            >
              <Button
                component={Link}
                to={`/game/${game.roomCode}`}
                variant="contained"
                color="success"
                size="large"
                disabled={game.players.length < 2}
                onClick={(e) => {
                  if (game.players.length < 2) {
                    setOpenSnackbar(true);
                    e.preventDefault();
                  } else {
                    onStartGame();
                  }
                }}
                startIcon={<PlayArrowIcon />}
                sx={{
                  cursor: game.players.length < 2 ? 'not-allowed' : 'pointer',
                  paddingY: 1.5,
                  flexGrow: 1,
                  minWidth: { xs: '100%', sm: 'auto' },
                }}
              >
                {t('common:buttons.start')}
              </Button>
            </Box>
          </Grid>
        )}

        <Grid item xs={12}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'center',
              gap: 2,
              mt: 2,
              flexWrap: 'wrap',
            }}
          >
            {!isSpectator ? (
              <Button
                variant="contained"
                color="warning"
                size="large"
                onClick={onSwitchToSpectator}
                startIcon={<VisibilityIcon />}
                sx={{ paddingY: 1.5, width: { xs: '100%', sm: 'auto' } }}
              >
                {t('game:spectator.switchButton')}
              </Button>
            ) : (
              <Button
                variant="contained"
                color="warning"
                size="large"
                onClick={onRejoinAsPlayer}
                startIcon={<PersonAddIcon />}
                sx={{ paddingY: 1.5, width: { xs: '100%', sm: 'auto' } }}
              >
                {t('game:spectator.rejoinButton')}
              </Button>
            )}
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Box
            sx={{
              textAlign: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onClick={handleCopyCode}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ mr: 1 }}>
                {t('game:room.code')}:
              </Typography>
              <Chip label={game.roomCode} color="info" />
              <ContentCopyIcon
                sx={{ ml: 1, color: 'action.active' }}
                fontSize="small"
                aria-label={t('game:room.copyCode')}
              />
            </Box>
            <Typography variant="body2" color="textSecondary">
              {t('game:room.clickToCopy')}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message={
          game.players.length < 2
            ? t('game:room.lobby.needMorePlayers')
            : copySuccess && t('game:room.codeCopied')
        }
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Container>
  );
};

export default GameLobby;
