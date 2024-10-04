import { Container, Row, Col } from 'react-bootstrap';

const NotFoundPage = () => {
  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} className="text-center">
          <h1 className="display-4 mb-4">404 - Page Not Found</h1>
          <p className="lead">The page you are looking for does not exist.</p>
        </Col>
      </Row>
    </Container>
  );
};

export default NotFoundPage;
