import '../../assets/styles/Footer.css';
import { useLocation } from 'react-router-dom';

const Footer = () => {
  const { pathname } = useLocation();

  if (pathname.startsWith('/game/')) {
    return null;
  }

  return (
    <footer className="footer bg-footer text-center py-4 border-top shadow-sm">
      <div className="container d-flex justify-content-center align-items-center">
        <div className="social-icons">
          <a href="https://github.com/JoaoVictor-C" target="_blank" rel="noopener noreferrer" title="GitHub" className="link-underline link-underline-opacity-0">
            <i className="fab fa-github fa-lg"></i> Made by João Victor
          </a>
        </div>
      </div>
    </footer> 
  );
};

export default Footer;