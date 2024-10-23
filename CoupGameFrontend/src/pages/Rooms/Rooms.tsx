// Start of Selection
import React, { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Box,
  TablePagination,
  Stack,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import roomService from '@services/roomService';
import { Game } from '@utils/types';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import authService from '@services/authService';
import { getToken } from '@utils/auth';

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

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const getUser = async () => {
      try {
        const user = await authService.getUser(token || '');
        setCurrentUserId(user.id);
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
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
      console.log(fetchedRooms);
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
      const isSpectator =
        game.spectators.some((spectator) => spectator.userId === currentUserId) ||
        (game.players && game.players.length >= room.playerCount);
      navigate(`/${isSpectator ? 'spectator' : 'game'}/${game.roomCode}`);
    } catch (err: any) {
      if (err.response?.data?.message === 'Game not found.') {
        fetchRooms();
      }
      setError(err.response?.data?.message || t('game:rooms.errors.joinFailed'));
    }
  };

  // Debounced search function
  const debouncedSearch = useCallback(() => {
    let timeoutId: NodeJS.Timeout;
    return (query: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        if (!query) {
          fetchRooms();
          return;
        }
        setLoading(true);
        try {
          const filteredRooms = await roomService.searchRooms(query);
          setRooms(filteredRooms);
          setError(null);
          setLastSearchTime(new Date());
        } catch (err: any) {
          setError(t('game:rooms.errors.searchFailed'));
        } finally {
          setLoading(false);
        }
      }, 500);
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    debouncedSearch()(e.target.value);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Container sx={{ my: 5 }}>
      <Typography variant="h4" gutterBottom align="center">
        {t('game:room.available')}
      </Typography>
      <form onSubmit={(e) => e.preventDefault()}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label={t('game:room.searchPlaceholder')}
              variant="outlined"
              value={searchTerm}
              onChange={handleSearchChange}
              aria-label={t('game:room.searchPlaceholder')}
            />
          </Grid>
          <Grid item xs={12} md={6} textAlign="right">
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                component={RouterLink}
                to="/create-room"
                variant="contained"
                color="success"
                sx={{ paddingX: 3, paddingY: 1 }}
              >
                {t('game:room.create.title')}
              </Button>
              <Button
                component={RouterLink}
                to="/join-game"
                variant="contained"
                color="primary"
                sx={{ paddingX: 3, paddingY: 1 }}
              >
                {t('game:room.join.title')}
              </Button>
              <Button
                variant="contained"
                color="info"
                onClick={fetchRooms}
                sx={{ paddingX: 3, paddingY: 1 }}
              >
                {t('common:buttons.refresh')}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </form>
      {elapsedTime && (
        <Alert severity="info" sx={{ mt: 3 }}>
          {elapsedTime}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 4 }}>
          <Table aria-label="rooms table">
            <TableHead>
              <TableRow>
                <TableCell>{t('game:room.name')}</TableCell>
                <TableCell>{t('game:room.code')}</TableCell>
                <TableCell>{t('game:room.players')}</TableCell>
                <TableCell>{t('game:room.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rooms.length > 0 ? (
                rooms
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((room) => (
                    <TableRow key={room.id} hover>
                      <TableCell>{room.gameName}</TableCell>
                      <TableCell>{room.roomCode}</TableCell>
                      <TableCell>
                        {t('game:room.lobby.players', {
                          current: room.players.length,
                          max: room.playerCount,
                        })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          color={room.players.length >= room.playerCount ? 'secondary' : 'primary'}
                          onClick={() => handleJoin(room)}
                          disabled={room.players.length > room.playerCount + 1} // Prevent over-spectating
                          aria-label={
                            room.players.length >= room.playerCount
                              ? t('game:spectator.title')
                              : t('common:buttons.join')
                          }
                        >
                          {room.players.length >= room.playerCount
                            ? t('game:spectator.title')
                            : t('common:buttons.join')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    {t('game:room.noRooms')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {/* Pagination */}
          <TablePagination
            component="div"
            count={rooms.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25]}
          />
        </TableContainer>
      )}
    </Container>
  );
};

export default Rooms;
