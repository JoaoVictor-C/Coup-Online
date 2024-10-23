import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import useAuth from '@hooks/useAuth';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation(['common']);

  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/">Coup Online</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            {user ? (
              <>
                <Nav.Link as={NavLink} to="/rooms">{t('common:navigation.rooms')}</Nav.Link>
                <Nav.Link disabled>{t('common:greeting', { username: user.username })}</Nav.Link>
                <Button variant="outline-light" onClick={logout} className="ms-2">
                  {t('common:buttons.logout')}
                </Button>
              </>
            ) : (
              <>
                <Nav.Link as={NavLink} to="/login">{t('common:buttons.login')}</Nav.Link>
                <Nav.Link as={NavLink} to="/register">{t('common:buttons.register')}</Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;