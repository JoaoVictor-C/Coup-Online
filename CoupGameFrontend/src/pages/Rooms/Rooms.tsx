import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Box,
  TablePagination,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Paper,
  useTheme,
  Fade,
  Divider
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import roomService from '@services/roomService';
import { Game } from '@utils/types';
import { useTranslation } from 'react-i18next';
import authService from '@services/authService';
import { getToken } from '@utils/auth';
import GridViewIcon from '@mui/icons-material/GridView';
import ListIcon from '@mui/icons-material/List';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import LoginIcon from '@mui/icons-material/Login';
import SearchIcon from '@mui/icons-material/Search';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';

const Rooms: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation(['game', 'common']);
  const [rooms, setRooms] = useState<Game[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastSearchTime, setLastSearchTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>(t('game:room.lastSearch.na'));
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const navigate = useNavigate();
  const token = getToken();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

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

  const fetchRooms = useCallback(async () => {
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
  }, [t]);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 90000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

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

  const handleJoin = useCallback(
    async (room: Game) => {
      setJoiningRoomId(room.id); // Set loading state
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
      } finally {
        setJoiningRoomId(null); // Reset loading state
      }
    },
    [fetchRooms, navigate, t, currentUserId]
  );

  // Debounced search function
  const handleSearch = useCallback(
    (query: string) => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      debounceTimeout.current = setTimeout(async () => {
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
    },
    [fetchRooms, t]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchTerm(value);
      handleSearch(value);
    },
    [handleSearch]
  );

  const handleChangePage = useCallback(
    (event: unknown, newPage: number) => {
      setPage(newPage);
    },
    []
  );

  const handleChangeRowsPerPage = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setRowsPerPage(parseInt(event.target.value, 10));
      setPage(0);
    },
    []
  );

  const paginatedRooms = useMemo(() => {
    return rooms.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [rooms, page, rowsPerPage]);

  const handleViewModeChange = useCallback(
    (
      event: React.MouseEvent<HTMLElement>,
      newViewMode: 'grid' | 'list' | null
    ) => {
      if (newViewMode !== null) {
        setViewMode(newViewMode);
      }
    },
    []
  );

  return (
    <Container maxWidth="xl" sx={{ my: { xs: 3, md: 5 } }}>
      <Fade in timeout={800}>
        <Box>
          <Typography
            variant="h3"
            gutterBottom
            align="center"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              color: theme.palette.primary.main,
              mb: 4
            }}
          >
            {t('game:room.available')}
          </Typography>

              <Paper
                elevation={2}
                sx={{
                  p: { xs: 2, md: 3 },
                  mb: 4,
                  borderRadius: 2,
                  backgroundColor: theme.palette.background.paper
                }}
              >
                <Grid container spacing={3} alignItems="flex-start">
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label={t('game:room.searchPlaceholder')}
                      variant="outlined"
                      value={searchTerm}
                      onChange={handleSearchChange}
                      InputProps={{
                        startAdornment: <SearchIcon sx={{ mr: 1, color: theme.palette.text.secondary }} />,
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={2}
                      justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                      alignItems={{ xs: 'stretch', sm: 'center' }}
                      sx={{
                        flexWrap: 'wrap',
                        pb: 1
                      }}
                    >
                      <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={handleViewModeChange}
                        aria-label="view mode"
                        size="small"
                        sx={{
                          backgroundColor: theme.palette.background.default,
                          '& .Mui-selected': {
                            backgroundColor: `${theme.palette.primary.main} !important`,
                            color: 'white !important'
                          },
                          flexShrink: 0,
                          mb: { xs: 2, sm: 0 }
                        }}
                      >
                        <ToggleButton value="grid" aria-label="grid view">
                          <GridViewIcon />
                        </ToggleButton>
                        <ToggleButton value="list" aria-label="list view">
                          <ListIcon />
                        </ToggleButton>
                      </ToggleButtonGroup>
    
                      <Button
                        component={RouterLink}
                        to="/create-room"
                        variant="contained"
                        color="success"
                        startIcon={<AddIcon />}
                        sx={{
                          width: { xs: '100%', sm: 'auto' },
                          borderRadius: 2,
                          boxShadow: 2,
                          flexShrink: 0
                        }}
                      >
                        {t('game:room.create.title')}
                      </Button>
    
                      <Button
                        component={RouterLink}
                        to="/join-game"
                        variant="contained"
                        color="primary"
                        startIcon={<LoginIcon />}
                        sx={{
                          width: { xs: '100%', sm: 'auto' },
                          borderRadius: 2,
                          boxShadow: 2,
                          flexShrink: 0
                        }}
                      >
                        {t('game:room.join.title')}
                      </Button>
    
                      <Button
                        variant="outlined"
                        onClick={fetchRooms}
                        startIcon={<RefreshIcon />}
                        sx={{
                          width: { xs: '100%', sm: 'auto' },
                          borderRadius: 2,
                          flexShrink: 0
                        }}
                      >
                        {t('common:buttons.refresh')}
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </Paper>

          {/* Status Messages */}
          {elapsedTime && (
            <Alert
              severity="info"
              sx={{
                mb: 3,
                borderRadius: 2
              }}
            >
              {elapsedTime}
            </Alert>
          )}

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 2
              }}
            >
              {error}
            </Alert>
          )}

          {/* Loading State */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress size={50} color="primary" />
            </Box>
          ) : (
            /* Room Display Logic - Grid/List Views */
            <Fade in timeout={500}>
              <Box>
                {viewMode === 'grid' ? (
                  <Grid container spacing={4}>
                    {paginatedRooms.length > 0 ? (
                      paginatedRooms.map((room) => (
                        <Grid item xs={12} sm={6} md={3} key={room.id}>
                          <Card
                            elevation={3}
                            sx={{
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              borderRadius: 3,
                              transition: 'all 0.3s ease',
                              backgroundColor: theme.palette.background.paper,
                              border: `1px solid ${theme.palette.divider}`,
                              '&:hover': {
                                transform: 'translateY(-8px)',
                                boxShadow: theme.shadows[8],
                                borderColor: theme.palette.primary.main,
                              }
                            }}
                          >
                            <CardContent sx={{ flexGrow: 1, p: 3 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                <Typography
                                  variant="h5"
                                  gutterBottom
                                  sx={{
                                    fontWeight: 700,
                                    color: theme.palette.primary.main,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '70%'
                                  }}
                                >
                                  {room.gameName}
                                </Typography>
                                <Chip
                                  label={
                                    room.isStarted
                                      ? room.isGameOver
                                        ? t('game:room.state.finished')
                                        : t('game:room.state.playing')
                                      : t('game:room.state.lobby')
                                  }
                                  color={
                                    room.isStarted
                                      ? room.isGameOver
                                        ? 'default'
                                        : 'primary'
                                      : 'success'
                                  }
                                  size="small"
                                  sx={{
                                    borderRadius: 2,
                                    '& .MuiChip-label': {
                                      fontWeight: 600
                                    }
                                  }}
                                />
                              </Box>

                              <Stack spacing={2.5}>
                                <Box display="flex" alignItems="center" gap={1.5}>
                                  <GroupIcon sx={{
                                    color: theme.palette.primary.light,
                                    fontSize: 24
                                  }} />
                                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {room.players.length}/{room.playerCount} {t('game:room.players')}
                                  </Typography>
                                </Box>

                                <Box display="flex" alignItems="center" gap={1.5}>
                                  <PersonIcon sx={{
                                    color: theme.palette.primary.light,
                                    fontSize: 24
                                  }} />
                                  <Typography variant="body1" sx={{
                                    fontWeight: 500,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {room.players.find(p => p.userId === room.createdBy)?.username}
                                  </Typography>
                                </Box>
                              </Stack>
                            </CardContent>

                            <CardActions sx={{ p: 3, pt: 0 }}>
                              <Button
                                variant="contained"
                                color={room.players.length >= room.playerCount ? 'secondary' : 'primary'}
                                onClick={() => handleJoin(room)}
                                disabled={room.players.length > room.playerCount + 1 || joiningRoomId === room.id}
                                fullWidth
                                sx={{
                                  borderRadius: 2,
                                  py: 1.5,
                                  textTransform: 'none',
                                  fontSize: '1rem',
                                  fontWeight: 600,
                                  boxShadow: 2,
                                  '&:hover': {
                                    boxShadow: 4
                                  }
                                }}
                              >
                                {joiningRoomId === room.id ? (
                                  <CircularProgress size={24} color="inherit" />
                                ) : (
                                  room.players.length >= room.playerCount
                                    ? t('game:spectator.title')
                                    : t('common:buttons.join')
                                )}
                              </Button>
                            </CardActions>
                          </Card>
                        </Grid>
                      ))
                    ) : (
                      <Grid item xs={12}>
                        <Typography
                          variant="h6"
                          align="center"
                          color="textSecondary"
                          sx={{ my: 4 }}
                        >
                          {t('game:room.noRooms')}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                ) : (
                  /* List View Implementation */
                  <Stack spacing={3}>
                    {/* Header */}
                    <Paper
                      elevation={2}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: theme.palette.primary.main,
                        color: 'white'
                      }}
                    >
                      <Grid container alignItems="center" spacing={3}>
                        <Grid item xs={12} md={3}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {t('game:room.name')}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {t('game:room.status')}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {t('game:room.playerCount')}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {t('game:room.host')}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {t('game:room.actions')}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>

                    {paginatedRooms.length > 0 ? (
                      paginatedRooms.map((room) => (
                        <Paper
                          key={room.id}
                          elevation={3}
                          sx={{
                            p: 3,
                            borderRadius: 3,
                            transition: 'transform 0.3s, box-shadow 0.3s',
                            '&:hover': {
                              transform: 'translateX(4px)',
                              boxShadow: 6
                            }
                          }}
                        >
                          <Grid container alignItems="center" spacing={3}>
                            <Grid item xs={12} md={3}>
                              <Typography variant="h6" color="primary">
                                {room.gameName}
                              </Typography>
                            </Grid>

                            <Grid item xs={12} md={3}>
                              <Stack direction="row" spacing={2} alignItems="center">
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  {t('game:room.status')}:
                                </Typography>
                                <Chip
                                  label={
                                    room.isStarted
                                      ? room.isGameOver
                                        ? t('game:room.state.finished')
                                        : t('game:room.state.playing')
                                      : t('game:room.state.lobby')
                                  }
                                  color={
                                    room.isStarted
                                      ? room.isGameOver
                                        ? 'default'
                                        : 'primary'
                                      : 'success'
                                  }
                                  size="medium"
                                />
                              </Stack>
                            </Grid>

                            <Grid item xs={12} md={2}>
                              <Stack direction="row" spacing={2} alignItems="center">
                                <GroupIcon color="action" />
                                <Typography variant="body1">
                                  {room.players.length}/{room.playerCount} {t('game:room.players')}
                                </Typography>
                              </Stack>
                            </Grid>

                            <Grid item xs={12} md={2}>
                              <Stack direction="row" spacing={2} alignItems="center">
                                <PersonIcon color="action" />
                                <Typography variant="body1" sx={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {room.players.find(p => p.userId === room.createdBy)?.username}
                                </Typography>
                              </Stack>
                            </Grid>

                            <Grid item xs={12} md={2}>
                              <Button
                                variant="contained"
                                color={room.players.length >= room.playerCount ? 'secondary' : 'primary'}
                                onClick={() => handleJoin(room)}
                                disabled={room.players.length > room.playerCount + 1 || joiningRoomId === room.id}
                                fullWidth
                                sx={{ borderRadius: 2, py: 1.5 }}
                              >
                                {joiningRoomId === room.id ? (
                                  <CircularProgress size={24} color="inherit" />
                                ) : (
                                  room.players.length >= room.playerCount
                                    ? t('game:spectator.title')
                                    : t('common:buttons.join')
                                )}
                              </Button>
                            </Grid>
                          </Grid>
                        </Paper>
                      ))
                    ) : (
                      <Typography
                        variant="h6"
                        align="center"
                        color="textSecondary"
                        sx={{ my: 4 }}
                      >
                        {t('game:room.noRooms')}
                      </Typography>
                    )}
                  </Stack>
                )}
              </Box>
            </Fade>
          )}

          {/* Pagination */}
          {rooms.length > rowsPerPage && (
            <TablePagination
              component="div"
              count={rooms.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25]}
              sx={{
                mt: 4,
                '.MuiTablePagination-select': {
                  borderRadius: 1
                }
              }}
            />
          )}
        </Box>
      </Fade>
    </Container>
  );
};

export default Rooms;
