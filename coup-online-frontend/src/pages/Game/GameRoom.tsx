import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { Game } from '@utils/types';
import { SIGNALR_HUB_URL } from '@utils/constants';
import { Container, Spinner, Alert } from 'react-bootstrap';
import GameBoard from './GameBoard';

const GameRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const newConnection = new HubConnectionBuilder()
      .withUrl(`${SIGNALR_HUB_URL}?access_token=${localStorage.getItem('token')}`)
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);
  }, []);

  useEffect(() => {
    if (connection) {
      connection.start()
        .then(() => {
          console.log('Connected to GameHub');
          connection.invoke('ReconnectToGame', id)
            .catch(err => console.error(err));
        })
        .catch(err => {
          console.error('Connection failed: ', err);
          setError('Failed to connect to the game server.');
          setLoading(false);
        });

      connection.on('GameState', (gameState: Game) => {
        setGame(gameState);
        setLoading(false);
      });

      connection.on('GameCreated', (newGame: Game) => {
        setGame(newGame);
        setLoading(false);
      });

      // Handle more events as needed

      return () => {
        connection.stop();
      };
    }
  }, [connection, id]);

  if (error) {
    return <Container className="my-5"><Alert variant="danger">{error}</Alert></Container>;
  }

  if (loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" variant="primary" />
        <div>Loading game...</div>
      </Container>
    );
  }

  return (
    <Container className="my-5">
      <h2>{game?.gameName}</h2>
      <GameBoard />
      {/* Render game board and other components */}
    </Container>
  );
};

export default GameRoom;