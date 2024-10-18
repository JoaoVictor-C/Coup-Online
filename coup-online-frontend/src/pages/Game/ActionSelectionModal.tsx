import React, { useState } from 'react';
import { Modal, Button, Row, Col, Card } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { Game, Action, cardImages } from '@utils/types';
import TargetSelectionModal from './TargetSelectionModal';

interface ActionSelectionModalProps {
  show: boolean;
  onHide: () => void;
  onSelectAction: (action: Action) => void;
  game: Game;
  currentUserId: string;
}

const ActionSelectionModal: React.FC<ActionSelectionModalProps> = ({ show, onHide, onSelectAction, game, currentUserId }) => {
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);

  const actionsRequiringTarget = ['steal', 'assassinate', 'coup'];

  const handleActionClick = (action: Action) => {
    if (actionsRequiringTarget.includes(action.type)) {
      setSelectedAction(action);
      setShowTargetModal(true);
    } else {
      onSelectAction(action);
      onHide();
    }
  };

  const handleTargetSelect = (targetUserId: string) => {
    if (selectedAction) {
      onSelectAction({ ...selectedAction, targetUserId });
      setSelectedAction(null);
      setShowTargetModal(false);
    }
  };

  const handleCloseTargetModal = () => {
    setSelectedAction(null);
    setShowTargetModal(false);
  };

  const actionsWithImages: { [key: string]: string | undefined } = {
    steal: cardImages.captain,
    assassinate: cardImages.assassin,
    tax: cardImages.duke,
    exchange: cardImages.ambassador,
    income: undefined, // No image
    foreign_aid: undefined, // No image
    coup: undefined, // No image
  };

  const renderCardImg = (actionType: string) => {
    const imgSrc = actionsWithImages[actionType];
    return imgSrc ? (
      <Card.Img
        variant="top"
        src={imgSrc}
        alt={actionType}
        className="img-fluid"
        style={{ objectFit: 'cover', width: 'auto', height: '265px' }}
      />
    ) : null;
  };

  return (
    <>
      <Modal
        show={show}
        onHide={onHide}
        size="lg"
        centered
        style={{
          opacity: showTargetModal ? 0.5 : 1,
          transition: 'opacity 0.3s',
        }}
        backdrop="static"
        keyboard={!showTargetModal}
      >
        <Modal.Header closeButton className="bg-dark text-white">
          <Modal.Title>Select Your Action</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h5 className="mb-3">Role Actions</h5>
          <Row>
            {['steal', 'assassinate', 'tax', 'exchange'].map((actionType) => (
              <Col md={3} className="mb-3" key={actionType}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Card
                    onClick={() => handleActionClick({ type: actionType as Action['type'] })}
                    className="h-100 text-center shadow-m border-0"
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ width: 'auto', height: 'auto', margin: '0 auto' }}>
                      {renderCardImg(actionType)}
                    </div>
                  </Card>
                </motion.div>
              </Col>
            ))}
          </Row>

          {/* Main Actions Section */}
          <h5 className="mb-3">Main Actions</h5>
          <Row>
            {['income', 'foreign_aid', 'coup'].map((actionType) => (
              <Col md={4} className="mb-4" key={actionType}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Card className="h-100 text-center shadow-sm">
                    {renderCardImg(actionType)}
                    <Card.Body>
                      <Card.Title className="text-success text-capitalize">
                        {actionType.replace('_', ' ')}
                      </Card.Title>
                      <Button
                        variant={
                          actionType === 'coup'
                            ? 'outline-danger'
                            : 'outline-success'
                        }
                        onClick={() => handleActionClick({ type: actionType as Action['type'] })}
                      >
                        <strong>
                          {actionType.charAt(0).toUpperCase() + actionType.slice(1).replace('_', ' ')}
                        </strong>
                      </Button>
                    </Card.Body>
                  </Card>
                </motion.div>
              </Col>
            ))}
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={showTargetModal}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Target Selection Modal */}
      <TargetSelectionModal
        show={showTargetModal}
        onHide={handleCloseTargetModal}
        onSelectTarget={handleTargetSelect}
        game={game}
        currentUserId={currentUserId}
      />
    </>
  );
};

export default ActionSelectionModal;