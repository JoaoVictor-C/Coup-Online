import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Form, Button, Alert, Spinner } from 'react-bootstrap';
import roomService from '@services/roomService';
import authService from '@services/authService';
import { getToken } from '@utils/auth';

const JoinGame: React.FC = () => {
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
      console.log(game);
      const isSpectator = game.spectators.some(spectator => spectator.userId === currentUserId) || game.players?.length >= game.playerCount;
      navigate(`/${isSpectator ? 'spectator' : 'game'}/${game.roomCode}`);
    } catch (err: any) {
      if (err.response?.data?.message === "Game not found.") {
        setError('Game not found. Please check the room code and try again.');
      } else {
        console.log(err);
        setError(err.response?.data?.message || 'Failed to join the game. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="my-5">
      <h2>Join a Private Game</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form onSubmit={handleJoin}>
        <Form.Group controlId="roomCode" className="mb-3">
          <Form.Label>Room Code</Form.Label>
          <Form.Control
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            required
            placeholder="Enter room code"
          />
          <Form.Text className="text-muted">
            Enter the unique room code provided by the game host.
          </Form.Text>
        </Form.Group>
        <Button variant="primary" type="submit" disabled={loading}>
          {loading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Join Game'}
        </Button>
      </Form>
    </Container>
  );
};

export default JoinGame;
