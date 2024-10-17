import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Form, Button, Alert, Spinner } from 'react-bootstrap';
import roomService from '@services/roomService';

const JoinGame: React.FC = () => {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const game = await roomService.joinRoom(roomCode);
      navigate(`/game/${game.roomCode}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to join the game. Please try again.');
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
