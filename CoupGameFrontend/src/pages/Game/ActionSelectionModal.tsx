import React, { useState, useContext } from 'react';
import { Modal, Button, Row, Col, Card } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { Game, Action, cardImages, ActionResponse } from '@utils/types';
import TargetSelectionModal from './TargetSelectionModal';
import { GameContext } from '@context/GameContext';

interface ActionSelectionModalProps {
  show: boolean;
  onHide: () => void;
  onSelectAction: (action: Action) => void;
  game: Game;
  currentUserId: string;
}

const ActionSelectionModal: React.FC<ActionSelectionModalProps> = ({
  show,
  onHide,
  onSelectAction,
  game,
  currentUserId,
}) => {
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const { handlePendingAction } = useContext(GameContext);

  const actionsRequiringTarget = ['steal', 'assassinate', 'coup'];

  const handleActionClick = (action: Action) => {
    if (game.isGameOver) {
      return;
    }
    console.log('Action clicked:', action);
    if (actionsRequiringTarget.includes(action.actionType)) {
      setSelectedAction(action);
      setShowTargetModal(true);
    } else {
      onSelectAction(action);
      onHide();
    }
  };

  const handleTargetSelect = (targetUserId: string) => {
    if (selectedAction) {
      const actionWithTarget: Action = {
        ...selectedAction,
        targetUserId
      };
      onSelectAction(actionWithTarget);
      handlePendingAction({
        ...actionWithTarget,
        gameId: game.id,
        initiatorId: currentUserId,
        isActionResolved: false,
        responses: {},
        originalActionType: selectedAction.actionType,
        timestamp: new Date(),
      });
      setSelectedAction(null);
      setShowTargetModal(false);
      onHide();
    }
  };

  const handleCloseTargetModal = () => {
    setSelectedAction(null);
    setShowTargetModal(false);
  };

  const actionsWithImages: { [key: string]: string | undefined } = {
    steal: cardImages.captain,
    assassinate: cardImages.assassin,
    exchange: cardImages.ambassador,
    tax: cardImages.duke,
    income: undefined, // No image
    foreign_aid: undefined, // No image
    coup: undefined, // No image
  };

  const renderCardImg = (actionType: string) => {
    const imgSrc = actionsWithImages[actionType];
    if (imgSrc) {
      return <img src={imgSrc} alt={actionType} style={{ width: '50px' }} />;
    }
    return null;
  };

  return (
    <>
      <Modal show={show} onHide={onHide} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Select Action</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h5 className="mb-3">Role Actions</h5>
          <Row>
            {['steal', 'assassinate', 'tax', 'exchange'].map((actionType) => (
              <Col md={3} className="mb-3" key={actionType}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Card
                    onClick={() => handleActionClick({ actionType: actionType as Action['actionType'] })}
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
                        onClick={() => handleActionClick({ actionType: actionType as Action['actionType'] })}
                        disabled={game.isGameOver}
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
      {selectedAction && (
        <TargetSelectionModal
          show={showTargetModal}
          onHide={handleCloseTargetModal}
          onSelectTarget={handleTargetSelect}
          game={game}
          currentUserId={currentUserId}
        />
      )}
    </>
  );
};

export default ActionSelectionModal;
