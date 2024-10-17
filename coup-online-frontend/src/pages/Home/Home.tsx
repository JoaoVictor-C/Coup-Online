import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Button } from 'react-bootstrap';

const Home: React.FC = () => {
  return (
    <Container className="text-center my-5">
      <h1>Welcome to Coup Online</h1>
      <div className="mt-4">
        <Link to="/login">
          <Button variant="primary" className="me-2">Login</Button>
        </Link>
        <Link to="/register">
          <Button variant="secondary">Register</Button>
        </Link>
      </div>
    </Container>
  );
};

export default Home;
