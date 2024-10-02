import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import routes from './routes';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import PrivateRoute from './components/Auth/PrivateRoute';
import { useDispatch } from 'react-redux';
import { getProfile } from './store/actions/authActions';

function App() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(getProfile());
  }, [dispatch]);

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