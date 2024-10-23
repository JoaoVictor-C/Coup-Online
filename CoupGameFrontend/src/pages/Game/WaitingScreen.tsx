import React from 'react';
import { Container, Spinner } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const WaitingScreen: React.FC = () => {
  const { t } = useTranslation(['game', 'common']);
  return (
    <Container className="d-flex flex-column align-items-center justify-content-center" style={{ height: '100vh' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Spinner animation="border" variant="primary" />
      </motion.div>
      <h3 className="mt-3">{t('game:waitingForPlayers')}</h3>
    </Container>
  );
};

export default WaitingScreen;
