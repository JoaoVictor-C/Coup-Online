import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Button, Row, Col, Card, Accordion, Image } from 'react-bootstrap';
import logo from '@assets/images/coup-logo.png';
import { useTranslation } from 'react-i18next';

const Home: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Container className="my-5">
      <Row className="justify-content-center mb-4">
        <Col xs="auto">
          <Image src={logo} alt="Coup Logo" width={150} height={150} />
        </Col>
      </Row>
      <Row className="text-center mb-4">
        <Col>
          <h1 className="display-4">{t('welcome')}</h1>
          <p className="lead">{t('experience_thrill')}</p> {/* Add this key to translation files */}
        </Col>
      </Row>
      <Row className="justify-content-center mb-5">
        <Col xs="auto">
          <Link to="/login">
            <Button variant="primary" size="lg" className="me-3">{t('login')}</Button>
          </Link>
          <Link to="/register">
            <Button variant="secondary" size="lg">{t('register')}</Button>
          </Link>
        </Col>
      </Row>
      <Row>
        <Col>
          <h2 className="text-center mb-4">{t('how_to_play')}</h2>
          <Accordion defaultActiveKey="0">
            <Accordion.Item eventKey="0">
              <Accordion.Header>{t('objective')}</Accordion.Header>
              <Accordion.Body>
                {t('objective_description')}
              </Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="1">
              <Accordion.Header>{t('gameplay')}</Accordion.Header>
              <Accordion.Body>
                {t('gameplay_description')}
              </Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="2">
              <Accordion.Header>{t('characters')}</Accordion.Header>
              <Accordion.Body>
                {t('characters_description')}
                <ul>
                  <li><strong>Duke:</strong> Tax and block foreign aid.</li>
                  <li><strong>Assassin:</strong> Pay coins to assassinate another player's character.</li>
                  <li><strong>Captain:</strong> Steal coins from another player and block stealing.</li>
                  <li><strong>Ambassador:</strong> Exchange cards from the deck and block stealing.</li>
                  <li><strong>Contessa:</strong> Block an assassination attempt.</li>
                </ul>
              </Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="3">
              <Accordion.Header>{t('winning_game')}</Accordion.Header>
              <Accordion.Body>
                {t('winning_game_description')}
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        </Col>
      </Row>
    </Container>
  );
};

export default Home;
