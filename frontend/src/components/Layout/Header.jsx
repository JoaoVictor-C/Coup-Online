import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faSignInAlt, faUserPlus, faUser, faSignOutAlt, faBars } from '@fortawesome/free-solid-svg-icons';
import { logout } from '../../store/actions/authActions';

const Header = () => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const user = useSelector((state) => state.auth.user);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  useEffect(() => {
    if (isAuthenticated) {
      setIsMenuOpen(false);
    }
  }, [isAuthenticated]);

  return (
    <header className="navbar navbar-expand navbar-dark bg-coup-teal shadow-sm">
      <div className="container">
        <Link to="/" className="navbar-brand d-flex align-items-center">
          <span className="font-weight-bold">COUP Online</span>
        </Link>
        <nav className="position-relative d-flex justify-content-between">
          <Link to="/" className="btn btn-outline-light mx-1" title="Home">
            <FontAwesomeIcon icon={faHome} /> Home
          </Link>
          
          {!isAuthenticated ? ( 
            <button className="btn btn-outline-light mx-1" onClick={toggleMenu} title="Account">
              <FontAwesomeIcon icon={faBars} /> Account
            </button>
          ) : (
            <>
              <Link to="/profile" className="btn btn-outline-light mx-1" title="Profile">
                <FontAwesomeIcon icon={faUser} /> {user?.username || 'Profile'}
              </Link>
              <button onClick={handleLogout} className="btn btn-outline-light mx-1" title="Logout">
                <FontAwesomeIcon icon={faSignOutAlt} /> Logout
              </button>
            </>
          )}
          {isMenuOpen && (
            <div className="position-absolute start-0 top-100 mt-2 bg-coup-teal p-2 rounded shadow">
                <>
                  <Link to="/login" className="d-block btn btn-outline-light my-1" title="Login">
                    <FontAwesomeIcon icon={faSignInAlt} /> Login
                  </Link>
                  <Link to="/register" className="d-block btn btn-outline-light my-1" title="Register">
                    <FontAwesomeIcon icon={faUserPlus} /> Register
                  </Link>
                </>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;