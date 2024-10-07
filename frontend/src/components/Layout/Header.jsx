import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faSignInAlt, faUserPlus, faUser, faSignOutAlt, faBars, faPlus } from '@fortawesome/free-solid-svg-icons';
import { logout } from '../../store/actions/authActions';
import '../../assets/styles/Header.css'; 
import coupLogo from '../../assets/images/coup-logo.png';

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

  // If on gamepage don't return
  const { pathname } = useLocation();
  
  // If on create or join game page, return header normally
  if (pathname.startsWith('/game/') && !(pathname.endsWith('/create') || pathname.endsWith('/join'))) {
    return null;
  }

  return (
    <header className="navbar navbar-expand-lg navbar-dark bg-header shadow-sm">
      <div className="container d-flex justify-content-between align-items-center">
        <Link to="/" className="navbar-brand d-flex align-items-center">
          <img src={coupLogo} alt="COUP Online Logo" className="img-fluid mr-2" style={{ maxWidth: '75px' }} />
        </Link>
        <button className="navbar-toggler text-dark" type="button" onClick={toggleMenu}>
          <FontAwesomeIcon icon={faBars} />
        </button>
        <div className={`collapse navbar-collapse ${isMenuOpen ? 'show' : ''}`}>
          <ul className="navbar-nav ms-auto text-dark">
            <li className="nav-item">
              <Link to="/" className="nav-link text-dark">
                <FontAwesomeIcon icon={faHome} /> Home
              </Link>
            </li>
            {!isAuthenticated ? (
              <>
                <li className="nav-item">
                  <Link to="/login" className="nav-link text-dark">
                    <FontAwesomeIcon icon={faSignInAlt} /> Login
                  </Link>
                </li>
                <li className="nav-item">
                  <Link to="/register" className="nav-link text-dark">
                    <FontAwesomeIcon icon={faUserPlus} /> Register
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link to="/game/create" className="nav-link text-dark">
                    <FontAwesomeIcon icon={faPlus} /> Create Game
                  </Link>
                </li>
                <li className="nav-item">
                  <Link to="/game/join" className="nav-link text-dark">
                    <FontAwesomeIcon icon={faSignInAlt} /> Join Game
                  </Link>
                </li>
                <li className="nav-item">
                  <button onClick={handleLogout} className="nav-link btn btn-link text-dark">
                    <FontAwesomeIcon icon={faSignOutAlt} /> Logout
                  </button>
                </li>
                <li className="nav-item">
                  <Link to="/profile" className="nav-link text-dark">
                    <FontAwesomeIcon icon={faUser} /> {user?.username || 'Profile'}
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </header>
  );
};

export default Header;