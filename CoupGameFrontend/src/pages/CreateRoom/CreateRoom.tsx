import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Form, Button, Alert } from 'react-bootstrap';
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
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
      setSuccess('Room created successfully!');
      navigate(`/game/${createdGame.roomCode}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="my-5">
      <h2>{t('game:room.create.title')}</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{t('game:room.create.success')}</Alert>}
      <Form onSubmit={handleSubmit}>
        <Form.Group controlId="gameName" className="mb-3">
          <Form.Label>{t('game:room.create.gameName')}</Form.Label>
          <Form.Control
            type="text"
            name="gameName"
            value={form.gameName}
            onChange={handleChange}
            required
            placeholder={t('game:room.create.gameName')}
          />
        </Form.Group>

        <Form.Group controlId="playerCount" className="mb-3">
          <Form.Label>{t('game:room.create.playerCount')}</Form.Label>
          <Form.Control
            as="select"
            name="playerCount"
            value={form.playerCount}
            onChange={handleChange}
            required
          >
            {[2, 3, 4, 5, 6].map((count) => (
              <option key={count} value={count}>
                {t('game:room.create.playersCount', { count })}
              </option>
            ))}
          </Form.Control>
        </Form.Group>

        <Form.Group controlId="isPrivate" className="mb-3">
          <Form.Check
            type="checkbox"
            name="isPrivate"
            label={t('game:room.create.privateRoom')}
            checked={form.isPrivate}
            onChange={handleChange}
          />
        </Form.Group>

        <Button variant="primary" type="submit" disabled={loading}>
          {loading ? t('game:room.create.creating') : t('common:buttons.create')}
        </Button>
      </Form>
    </Container>
  );
};

export default CreateRoom;
