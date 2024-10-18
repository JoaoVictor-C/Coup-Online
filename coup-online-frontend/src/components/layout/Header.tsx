import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import useAuth from '@hooks/useAuth';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';

const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/">Coup Online</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            {user ? (
              <>
                <Nav.Link as={NavLink} to="/rooms">Rooms</Nav.Link>
                <Nav.Link disabled>Hello, {user.username}</Nav.Link>
                <Button variant="outline-light" onClick={logout} className="ms-2">
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Nav.Link as={NavLink} to="/login">Login</Nav.Link>
                <Nav.Link as={NavLink} to="/register">Register</Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
