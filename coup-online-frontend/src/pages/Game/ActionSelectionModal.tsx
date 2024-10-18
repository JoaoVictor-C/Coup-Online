 // Start of Selection
import React, { useState } from 'react';
import { Modal, Button, Row, Col, Image, Card } from 'react-bootstrap';
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

  const handleActionClick = (action: Action) => {
    if (action.targetUserId) {
      setSelectedAction(action);
      setShowTargetModal(true);
    } else {
      onSelectAction(action);
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

  const actionsWithImages: { [key: string]: string } = {
    steal: cardImages.captain,
    assassinate: cardImages.assassin,
    tax: cardImages.duke,
    exchange: cardImages.ambassador,
    income: cardImages.duke, // Assuming 'income' is related to Duke
    foreign_aid: cardImages.contessa, // Assuming 'foreign_aid' is related to Contessa
    coup: cardImages.assassin, // Assuming 'coup' is related to Assassin
  };

  return (
    <>
      <Modal show={show} onHide={onHide} size="lg" centered>
        <Modal.Header closeButton className="bg-dark text-white">
          <Modal.Title>Select Your Action</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col>
              <h5 className="mb-3">Role Actions</h5>
              <Row>
                {['steal', 'assassinate', 'tax', 'exchange'].map((actionType) => (
                  <Col md={6} className="mb-4" key={actionType}>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Card className="h-100 text-center shadow-sm">
                        <Card.Img variant="top" src={actionsWithImages[actionType]} alt={actionType} style={{ height: '150px', objectFit: 'cover' }} />
                        <Card.Body>
                          <Card.Title className="text-primary text-capitalize">
                            {actionType.replace('_', ' ')}
                          </Card.Title>
                          <Button
                            variant="outline-primary"
                            onClick={() => handleActionClick({ type: actionType as Action['type'] })}
                          >
                            <strong>
                              {actionType.charAt(0).toUpperCase() + actionType.slice(1)}
                            </strong>
                          </Button>
                        </Card.Body>
                      </Card>
                    </motion.div>
                  </Col>
                ))}
              </Row>
            </Col>
            <Col>
              <h5 className="mb-3">Main Actions</h5>
              <Row>
                {['income', 'foreign_aid', 'coup'].map((actionType) => (
                  <Col md={4} className="mb-4" key={actionType}>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Card className="h-100 text-center shadow-sm">
                        <Card.Img variant="top" src={actionsWithImages[actionType]} alt={actionType} style={{ height: '150px', objectFit: 'cover' }} />
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
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
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