import Home from './pages/Home';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GamePage from './pages/GamePage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import CreateGamePage from './pages/CreateGamePage';
import JoinGamePage from './pages/JoinGamePage';
import LobbyPage from './pages/LobbyPage';
const routes = [
  { path: '/', component: Home },
  { path: '/login', component: LoginPage },
  { path: '/register', component: RegisterPage },
  { 
    path: '/profile', 
    component: ProfilePage,
    private: true 
  },
  { 
    path: '/game/create', 
    component: CreateGamePage,
    private: true 
  },
  { 
    path: '/game/join', 
    component: JoinGamePage,
    private: true 
  },
  { 
    path: '/game/:gameId', 
    component: GamePage,
    private: true 
  },
  {
    path: '/lobby/:gameId',
    component: LobbyPage,
    private: true
  },
  { path: '*', component: NotFoundPage }
];

export default routes;