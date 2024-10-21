import React, { useEffect, useState } from 'react';
import { Container, Table, Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import roomService from '@services/roomService';
import { Game } from '@utils/types';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import authService from '@services/authService';
import { getToken } from '@utils/auth';

const Rooms: React.FC = () => {
  const [rooms, setRooms] = useState<Game[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastSearchTime, setLastSearchTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('Last search: N/A');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const token = getToken();

  useEffect(() => {
    const getUser = async () => {
      const user = await authService.getUser(token || '');
      setCurrentUserId(user.id);
    };
    getUser();
  }, [token]);

  useEffect(() => {
    fetchRooms();

    const interval = setInterval(() => {
      fetchRooms();
    }, 90000); // 1 minute and 30 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (lastSearchTime) {
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - lastSearchTime.getTime()) / 1000);
        const minutes = Math.floor(diffInSeconds / 60);
        const seconds = diffInSeconds % 60;
        setElapsedTime(`Last search: ${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}.`);
      } else {
        setElapsedTime('Last search: N/A');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lastSearchTime]); 

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const fetchedRooms = await roomService.getPublicRooms();
      setRooms(fetchedRooms);
      setError(null);
      setLastSearchTime(new Date());
    } catch (err: any) {
      setError('Failed to load rooms. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (room: Game) => {
    try {
      const game = await roomService.joinRoom(room.id);
      console.log(game);
      const isSpectator = game.spectators.some(spectator => spectator.userId === currentUserId) || game.players?.length >= room.playerCount;
      navigate(`/${isSpectator ? 'spectator' : 'game'}/${game.roomCode}`);
    } catch (err: any) {
      if (err.response?.data?.message === "Game not found.") {
        fetchRooms();
      }
      console.log(err);
      setError(err.response?.data?.message || 'Failed to join the game. Please try again.');
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const filteredRooms = await roomService.searchRooms(searchTerm);
      setRooms(filteredRooms);
      setError(null);
      setLastSearchTime(new Date());
    } catch (err: any) {
      setError('Failed to search rooms. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="my-5">
      <h2 className="mb-4">Available Rooms</h2>
      <Form onSubmit={handleSearch} className="mb-4">
        <Row>
          <Col md={6}>
            <Form.Control
              type="text"
              placeholder="Search by Room Name or Code"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Col>
          <Col md={4} className="text-end">
            <Link to="/create-room">
              <Button variant="success" className="me-2">
                Create New Room
              </Button>
            </Link>
            <Link to="/join-game">
              <Button variant="primary">
                Join Private Game
              </Button>
            </Link>
          </Col>
        </Row>
      </Form>
      {elapsedTime && (
        <div className="mb-3">
          <Alert variant="info">{elapsedTime}</Alert>
        </div>
      )}
      {error && <Alert variant="danger">{error}</Alert>}
      {loading ? (
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Room Name</th>
              <th>Room Code</th>
              <th>Players</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.length > 0 ? (
              rooms.map((room) => (
                <tr key={room.id}>
                  <td>{room.gameName}</td>
                  <td>{room.roomCode}</td>
                  <td>{room.players.length} / {room.playerCount}</td>
                  <td>
                    <Button 
                      variant={room.players.length >= room.playerCount ? "secondary" : "primary"} 
                      onClick={() => handleJoin(room)}
                    >
                      {room.players.length >= room.playerCount ? "Spectate" : "Join"}
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center">
                  No rooms available.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      )}
    </Container>
  );
};

export default Rooms;
