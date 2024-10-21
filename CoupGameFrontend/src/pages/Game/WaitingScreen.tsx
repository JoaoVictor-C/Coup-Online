import React from 'react';
import { Container, Spinner } from 'react-bootstrap';
import { motion } from 'framer-motion';

const WaitingScreen: React.FC = () => {
  return (
    <Container className="d-flex flex-column align-items-center justify-content-center" style={{ height: '100vh' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Spinner animation="border" variant="primary" />
      </motion.div>
      <h3 className="mt-3">Waiting for other players to join...</h3>
    </Container>
  );
};

export default WaitingScreen;
