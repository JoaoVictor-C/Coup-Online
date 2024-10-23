import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, TextField, Button, Alert, CircularProgress, Typography, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import roomService from '@services/roomService';
import authService from '@services/authService';
import { getToken } from '@utils/auth';

const JoinGame: React.FC = () => {
  const { t } = useTranslation(['game', 'common']);
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const token = getToken();

  useEffect(() => {
    const getUser = async () => {
      try {
        const user = await authService.getUser(token || '');
        setCurrentUserId(user.id);
      } catch (err) {
        console.error('Failed to fetch user:', err);
        setError(t('common:error.generic'));
      }
    };
    getUser();
  }, [token, t]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const game = await roomService.joinRoom(roomCode.toUpperCase());
      const isSpectator = game.spectators.some(spectator => spectator.userId === currentUserId) || (game.players && game.players.length >= game.playerCount);
      navigate(`/${isSpectator ? 'spectator' : 'game'}/${game.roomCode}`);
    } catch (err: any) {
      if (err.response?.data?.message === "Game not found.") {
        setError(t('game:rooms.errors.joinFailed'));
      } else {
        setError(err.response?.data?.message || t('common:error.generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.toUpperCase();
    const lettersOnly = input.replace(/[^A-Z]/g, '').slice(0, 4);
    setRoomCode(lettersOnly);
  };

  return (
    <Container maxWidth="sm" sx={{ my: 5 }}>
      <Typography variant="h4" gutterBottom align="center">
        {t('game:room.join.title')}
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box component="form" onSubmit={handleJoin} noValidate>
        <TextField
          fullWidth
          label={t('game:room.join.roomCode')}
          value={roomCode}
          onChange={handleRoomCodeChange}
          required
          placeholder={t('game:room.join.enterCode')}
          margin="normal"
          inputProps={{ maxLength: 4, pattern: '[A-Z]{4}' }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('game:room.join.codeHelp')}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          type="submit"
          disabled={loading || roomCode.length !== 4}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          fullWidth
          sx={{ paddingY: 1.5 }}
        >
          {loading ? t('common:buttons.joining') : t('common:buttons.join')}
        </Button>
      </Box>
    </Container>
  );
};

export default JoinGame;
