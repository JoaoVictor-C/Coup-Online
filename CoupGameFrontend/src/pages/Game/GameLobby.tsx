import React, { useState } from 'react';
import { Game } from '@utils/types';
import { Button, Container, Alert, List, ListItem, Chip, Grid, Typography, Box } from '@mui/material';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface GameLobbyProps {
  game: Game;
  currentUserId: string;
  onSwitchToSpectator: () => void;
  onRejoinAsPlayer: () => void;
  onStartGame: () => void;
  isSpectator?: boolean;
}

const GameLobby: React.FC<GameLobbyProps> = ({ game, currentUserId, onSwitchToSpectator, onRejoinAsPlayer, onStartGame, isSpectator = false }) => {
  const { t } = useTranslation(['game', 'common']);
  const [clipBoard, setClipBoard] = useState(false);

  return (
    <Container maxWidth="md" sx={{ bgcolor: '#ffffff', borderRadius: 2, boxShadow: 3, p: 4 }}>
      <Grid container spacing={4} justifyContent="center">
        <Grid item xs={12}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h4" gutterBottom>
              <i className="bi bi-joystick me-2"></i>
              {t('game:room.lobby.title', { gameName: game.gameName })}
            </Typography>
            <Typography variant="h6" gutterBottom>
              {t('game:room.lobby.waiting')}
            </Typography>
            <Typography variant="subtitle1">
              {t('game:room.lobby.players', { current: game.players.length, max: game.playerCount })}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12}>
          <AnimatePresence>
            <List>
              {game.players.map((player) => (
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
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <i className="bi bi-person-circle me-2"></i>
                      <Typography variant="body1">{player.username}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {!player.isActive && (
                        <Chip label={t('game:room.lobby.inactive')} color="error" />
                      )}
                      {player.userId === game.leaderId && (
                        <Chip label={t('game:room.lobby.leader')} color="success" />
                      )}
                    </Box>
                  </ListItem>
                </motion.div>
              ))}
            </List>
          </AnimatePresence>
        </Grid>
        {!isSpectator && game.leaderId === currentUserId && (
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
              <Button
                component={Link}
                to={`/game/${game.roomCode}`}
                variant="contained"
                color="success"
                size="large"
                disabled={game.players.length < 2}
                onClick={(e) => {
                  if (game.players.length < 2) {
                    alert(t('game:room.lobby.needMorePlayers'));
                    e.preventDefault();
                  } else {
                    onStartGame();
                  }
                }}
                sx={{
                  cursor: game.players.length < 2 ? 'not-allowed' : 'pointer',
                  paddingY: 1.5,
                  flexGrow: 1,
                }}
              >
                <i className="bi bi-play-fill me-2"></i>{t('common:buttons.start')}
              </Button>
            </Box>
          </Grid>
        )}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
            {!isSpectator ? (
              <Button variant="contained" color="warning" size="large" onClick={onSwitchToSpectator} sx={{ paddingY: 1.5 }}>
                <i className="bi bi-eye me-2"></i>{t('game:spectator.switchButton')}
              </Button>
            ) : (
              <Button variant="contained" color="warning" size="large" onClick={onRejoinAsPlayer} sx={{ paddingY: 1.5 }}>
                <i className="bi bi-person-fill-add me-2"></i>{t('game:spectator.rejoinButton')}
              </Button>
            )}
          </Box>
        </Grid>
        {game.isGameOver && game.winnerId && (
          <Grid item xs={12}>
            <Alert severity="success" sx={{ textAlign: 'center' }}>
              <i className="bi bi-trophy-fill me-2"></i>
              {t('game:status.gameOver')} {t('game:status.winner')}:{' '}
              {game.winnerId === currentUserId
                ? t('game:status.you')
                : game.players.find(p => p.userId === game.winnerId)?.username || t('game:player.unknown')}
            </Alert>
          </Grid>
        )}
        <Grid item xs={12}>
          <Box
            sx={{
              textAlign: 'center',
              cursor: 'pointer',
              userSelect: 'none',
            }}
            onClick={() => {
              setClipBoard(true);
              setTimeout(() => {
                setClipBoard(false);
              }, 2000);
              navigator.clipboard.writeText(game.roomCode);
            }}
          >
            <Typography variant="h6">
              {t('game:room.code')}: <Chip label={game.roomCode} color="info" />
            </Typography>
            {clipBoard && <Typography variant="body2" color="success.main">{t('game:room.codeCopied')}</Typography>}
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default GameLobby;
