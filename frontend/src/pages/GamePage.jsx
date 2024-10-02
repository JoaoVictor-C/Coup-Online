import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import socket from '../services/socket';
import { useDispatch, useSelector } from 'react-redux';
import { fetchGame, updateGame } from '../store/actions/gameActions';
import GameBoard from '../components/Game/GameBoard';

const GamePage = () => {
  const { gameId } = useParams();
  const dispatch = useDispatch();
  const game = useSelector((state) => state.game.currentGame);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchGame(gameId));
    socket.emit('joinGame', { gameId, userId: user.id });

    socket.on('gameUpdate', (updatedGame) => {
      dispatch(updateGame(updatedGame));
    });

    // Cleanup on unmount
    return () => {
      socket.emit('leaveGame', { gameId, userId: user.id });
      socket.off('gameUpdate');
    };
  }, [dispatch, gameId, user.id]);

  if (!game) return <p>Loading game...</p>;

  return (
    <div>
      <h2>Game ID: {gameId}</h2>
      {/* Render game components */}
      <GameBoard game={game} />
      {/* Add more components as needed */}
    </div>
  );
};

export default GamePage;