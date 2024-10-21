import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Button, Row, Col, Card, Accordion, Image } from 'react-bootstrap';
import logo from '@assets/images/coup-logo.png';

const Home: React.FC = () => {
  return (
    <Container className="my-5">
      <Row className="justify-content-center mb-4">
        <Col xs="auto">
          <Image src={logo} alt="Coup Logo" width={150} height={150} />
        </Col>
      </Row>
      <Row className="text-center mb-4">
        <Col>
          <h1 className="display-4">Welcome to Coup Online</h1>
          <p className="lead">Experience the thrill of deception and strategy in the world of Coup.</p>
        </Col>
      </Row>
      <Row className="justify-content-center mb-5">
        <Col xs="auto">
          <Link to="/login">
            <Button variant="primary" size="lg" className="me-3">Login</Button>
          </Link>
          <Link to="/register">
            <Button variant="secondary" size="lg">Register</Button>
          </Link>
        </Col>
      </Row>
      <Row>
        <Col>
          <h2 className="text-center mb-4">How to Play</h2>
          <Accordion defaultActiveKey="0">
            <Accordion.Item eventKey="0">
              <Accordion.Header>Objective</Accordion.Header>
              <Accordion.Body>
                The objective of Coup is to be the last player with influence in the game. Influence is represented by face-down character cards.
              </Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="1">
              <Accordion.Header>Gameplay</Accordion.Header>
              <Accordion.Body>
                Players take turns performing actions to collect coins, perform coups, or use special abilities based on their characters. Bluffing is a key element, as players can lie about their characters to gain advantages.
              </Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="2">
              <Accordion.Header>Characters</Accordion.Header>
              <Accordion.Body>
                Each character has unique abilities:
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
              <Accordion.Header>Winning the Game</Accordion.Header>
              <Accordion.Body>
                The game continues until only one player remains with influence. Strategic use of actions, bluffing, and countering opponents' moves are crucial to securing victory.
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        </Col>
      </Row>
    </Container>
  );
};

export default Home;
