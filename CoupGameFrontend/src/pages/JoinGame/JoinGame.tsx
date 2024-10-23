import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Form, Button, Alert, Spinner } from 'react-bootstrap';
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
      const user = await authService.getUser(token || '');
      setCurrentUserId(user.id);
    };
    getUser();
  }, [token]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const game = await roomService.joinRoom(roomCode.toUpperCase());
      const isSpectator = game.spectators.some(spectator => spectator.userId === currentUserId) || game.players?.length >= game.playerCount;
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

  return (
    <Container className="my-5">
      <h2>{t('game:room.join.title')}</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form onSubmit={handleJoin}>
        <Form.Group controlId="roomCode" className="mb-3">
          <Form.Label>{t('game:room.join.roomCode')}</Form.Label>
          <Form.Control
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            required
            placeholder={t('game:room.join.enterCode')}
          />
          <Form.Text className="text-muted">
            {t('game:room.join.codeHelp')}
          </Form.Text>
        </Form.Group>
        <Button variant="primary" type="submit" disabled={loading}>
          {loading ? (
            <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
          ) : (
            t('common:buttons.join')
          )}
        </Button>
      </Form>
    </Container>
  );
};

export default JoinGame;
