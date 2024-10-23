import React, { useEffect, useState } from 'react';
import { Container, Table, Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import roomService from '@services/roomService';
import { Game } from '@utils/types';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import authService from '@services/authService';
import { getToken } from '@utils/auth';
import { useTranslation } from 'react-i18next';

const Rooms: React.FC = () => {
  const { t } = useTranslation(['game', 'common']);
  const [rooms, setRooms] = useState<Game[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastSearchTime, setLastSearchTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>(t('game:room.lastSearch.na'));
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
        setElapsedTime(t('game:room.lastSearch.time', { minutes, seconds }));
      } else {
        setElapsedTime(t('game:room.lastSearch.na'));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lastSearchTime, t]); 

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const fetchedRooms = await roomService.getPublicRooms();
      setRooms(fetchedRooms);
      setError(null);
      setLastSearchTime(new Date());
    } catch (err: any) {
      setError(t('common:error.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (room: Game) => {
    try {
      const game = await roomService.joinRoom(room.id);
      const isSpectator = game.spectators.some(spectator => spectator.userId === currentUserId) || game.players?.length >= room.playerCount;
      navigate(`/${isSpectator ? 'spectator' : 'game'}/${game.roomCode}`);
    } catch (err: any) {
      if (err.response?.data?.message === "Game not found.") {
        fetchRooms();
      }
      setError(err.response?.data?.message || t('game:rooms.errors.joinFailed'));
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
      setError(t('game:rooms.errors.searchFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="my-5">
      <h2 className="mb-4">{t('game:room.available')}</h2>
      <Form onSubmit={handleSearch} className="mb-4">
        <Row>
          <Col md={6}>
            <Form.Control
              type="text"
              placeholder={t('game:room.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Col>
          <Col md={4} className="text-end">
            <Link to="/create-room">
              <Button variant="success" className="me-2">
                {t('game:room.create.title')}
              </Button>
            </Link>
            <Link to="/join-game">
              <Button variant="primary">
                {t('game:room.join.title')}
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
              <th>{t('game:room.name')}</th>
              <th>{t('game:room.code')}</th>
              <th>{t('game:room.players')}</th>
              <th>{t('game:room.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rooms.length > 0 ? (
              rooms.map((room) => (
                <tr key={room.id}>
                  <td>{room.gameName}</td>
                  <td>{room.roomCode}</td>
                  <td>{t('game:room.lobby.players', { current: room.players.length, max: room.playerCount })}</td>
                  <td>
                    <Button 
                      variant={room.players.length >= room.playerCount ? "secondary" : "primary"} 
                      onClick={() => handleJoin(room)}
                    >
                      {room.players.length >= room.playerCount ? t('game:spectator.title') : t('common:buttons.join')}
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center">
                  {t('game:room.noRooms')}
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
