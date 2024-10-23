    // Start of Selection
    import React, { useState } from 'react';
    import { useNavigate } from 'react-router-dom';
    import {
      Container,
      TextField,
      Button,
      Alert,
      Checkbox,
      FormControlLabel,
      FormControl,
      InputLabel,
      Select,
      MenuItem,
      Box,
      SelectChangeEvent,
    } from '@mui/material';
    import { useTranslation } from 'react-i18next';
    import roomService from '@services/roomService';
    
    const CreateRoom: React.FC = () => {
      const { t } = useTranslation(['game', 'common']);
      const navigate = useNavigate();
      const [form, setForm] = useState({
        gameName: '',
        playerCount: 4,
        isPrivate: false,
      });
      const [error, setError] = useState<string | null>(null);
      const [success, setSuccess] = useState<string | null>(null);
      const [loading, setLoading] = useState<boolean>(false);
    
      const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>
      ) => {
        const { name, value, type } = e.target as HTMLInputElement;
        setForm({
          ...form,
          [name as string]:
            type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        });
      };
    
      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);
    
        try {
          const request = {
            gameName: form.gameName,
            playerCount: Number(form.playerCount),
            isPrivate: form.isPrivate,
          };
          const createdGame = await roomService.createRoom(request);
          setSuccess(t('game:room.create.success'));
          navigate(`/game/${createdGame.roomCode}`);
        } catch (err: any) {
          setError(
            err.response?.data?.message ||
              t('game:room.create.error') ||
              'Failed to create room. Please try again.'
          );
        } finally {
          setLoading(false);
        }
      };
    
      return (
        <Container sx={{ my: 5 }}>
          <Box component="h2" mb={2}>
            {t('game:room.create.title')}
          </Box>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label={t('game:room.create.gameName')}
              name="gameName"
              value={form.gameName}
              onChange={handleChange}
              required
              placeholder={t('game:room.create.gameName')}
              margin="normal"
            />
            <FormControl fullWidth required margin="normal">
              <InputLabel id="playerCount-label">
                {t('game:room.create.playerCount')}
              </InputLabel>
              <Select
                labelId="playerCount-label"
                label={t('game:room.create.playerCount')}
                name="playerCount"
                value={form.playerCount}
                onChange={handleChange as (event: SelectChangeEvent<number>) => void}
              >
                {[2, 3, 4, 5, 6].map((count) => (
                  <MenuItem key={count} value={count}>
                    {t('game:room.create.playersCount', { count })}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  name="isPrivate"
                  checked={form.isPrivate}
                  onChange={handleChange}
                  color="primary"
                />
              }
              label={t('game:room.create.privateRoom')}
              sx={{ mt: 2 }}
            />
            <Button
              variant="contained"
              color="primary"
              type="submit"
              disabled={loading}
              fullWidth
              sx={{ mt: 3 }}
            >
              {loading ? t('game:room.create.creating') : t('common:buttons.create')}
            </Button>
          </Box>
        </Container>
      );
    };
    
    export default CreateRoom;
