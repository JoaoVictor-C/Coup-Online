import React from 'react';
import { Routes, Route } from 'react-router-dom';

import Home from '@pages/Home/Home';
import Login from '@pages/Login/Login';
import Register from '@pages/Register/Register';
import GameRoom from '@pages/Game/GameRoom';
import Rooms from '@pages/Rooms/Rooms';
import CreateRoom from '@pages/CreateRoom/CreateRoom';
import JoinGame from '@pages/JoinGame/JoinGame';
import Header from '@components/layout/Header';
import Footer from '@components/layout/Footer';
import PrivateRoute from '@components/common/PrivateRoute';
import { GameProvider } from '@context/GameContext';

const App: React.FC = () => {
  return (
    <div className="App">
      <Header />
      <GameProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rooms" element={<PrivateRoute><Rooms /></PrivateRoute>} />
          <Route path="/create-room" element={<PrivateRoute><CreateRoom /></PrivateRoute>} />
          <Route path="/join-game" element={<PrivateRoute><JoinGame /></PrivateRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/game/:id"
            element={
              <PrivateRoute>
                <GameRoom />
              </PrivateRoute>
            }
          />
          <Route
            path="/spectator/:id"
            element={
              <PrivateRoute>
                <GameRoom />
              </PrivateRoute>
            }
          />
        </Routes>
      </GameProvider>
      <Footer />
    </div>
  );
};

export default App;