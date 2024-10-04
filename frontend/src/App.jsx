import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import routes from './routes';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import PrivateRoute from './components/Auth/PrivateRoute';
import { getProfile } from './store/actions/authActions';
import socketService from './services/socket';

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      dispatch(getProfile());
    }
  }, [dispatch]);

  useEffect(() => {
    socketService.initializeSocket();
  }, []);

  return (
    <div className="App">
      <Header />
      <Routes>
        {routes.map(({ path, component: Component, private: isPrivate }) => (
          <Route 
            key={path} 
            path={path} 
            element={
              isPrivate ? (
                <PrivateRoute>
                  <Component />
                </PrivateRoute>
              ) : (
                <Component />
              )
            } 
          />
        ))}
      </Routes>
      <Footer />
    </div>
  );
}

export default App;