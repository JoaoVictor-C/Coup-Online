import React, { useState, useContext } from 'react';
import { Modal, Button, Row, Col, Card } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { Game, Action, cardImages, ActionResponse } from '@utils/types';
import TargetSelectionModal from './TargetSelectionModal';
import { GameContext } from '@context/GameContext';
import { FaCoins } from 'react-icons/fa';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation(['game', 'common']);
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

  const getActionDetails = (actionType: string) => {
    return {
      description: t(`game:actions.${actionType}.description`),
      canBlock: ['foreign_aid', 'steal', 'assassinate'].includes(actionType),
      canChallenge: ['steal', 'assassinate', 'exchange', 'tax'].includes(actionType),
    };
  };

  const actionsWithImages: { [key: string]: string | undefined } = {
    steal: cardImages.captain,
    assassinate: cardImages.assassin,
    exchange: cardImages.ambassador,
    tax: cardImages.duke,
    income: undefined,
    foreign_aid: undefined,
    coup: undefined,
  };

  const renderCardImg = (actionType: string) => {
    const imgSrc = actionsWithImages[actionType];
    if (imgSrc) {
      return <img src={imgSrc} alt={actionType} style={{ width: '50px' }} />;
    }
    return null;
  };

  const renderTooltip = (actionType: string) => (
    <Tooltip id={`tooltip-${actionType}`}>
      {getActionDetails(actionType).description}
    </Tooltip>
  );

  return (
    <>
      <Modal show={show} onHide={onHide} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>{t('game:actions.select')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h5 className="mb-3">{t('game:actions.roleActions')}</h5>
          <Row>
            {['steal', 'assassinate', 'tax', 'exchange'].map((actionType) => (
              <Col md={3} className="mb-3" key={actionType}>
                <OverlayTrigger placement="top" overlay={renderTooltip(actionType)}>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Card
                      onClick={() => handleActionClick({ actionType: actionType as Action['actionType'] })}
                      className="h-100 text-center shadow-m border-0"
                      style={{ cursor: 'pointer' }}
                    >
                      <div style={{ width: 'auto', height: 'auto', margin: '0 auto' }}>
                        {renderCardImg(actionType)}
                      </div>
                      <Card.Body>
                        <Card.Title>{t(`game:actions.${actionType}.name`)}</Card.Title>
                      </Card.Body>
                    </Card>
                  </motion.div>
                </OverlayTrigger>
              </Col>
            ))}
          </Row>
          <h5 className="mb-3">{t('game:actions.mainActions')}</h5>
          <Row>
            {['income', 'foreign_aid', 'coup'].map((actionType) => (
              <Col md={4} className="mb-4" key={actionType}>
                <OverlayTrigger placement="top" overlay={renderTooltip(actionType)}>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Card
                      onClick={() => handleActionClick({ actionType: actionType as Action['actionType'] })}
                      className={`h-100 text-center shadow-m border-0 ${selectedAction?.actionType === actionType ? 'border-success' : ''}`}
                      style={{ cursor: 'pointer' }}
                    >
                      <Card.Body>
                        <Card.Title className="text-success">
                          {t(`game:actions.${actionType}.name`)}
                        </Card.Title>
                        <Button
                          variant={actionType === 'coup' ? 'outline-danger' : 'outline-success'}
                          disabled={game.isGameOver}
                        >
                          <strong>{t(`game:actions.${actionType}.name`)}</strong>
                        </Button>
                      </Card.Body>
                    </Card>
                  </motion.div>
                </OverlayTrigger>
              </Col>
            ))}
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={showTargetModal}>
            {t('common:buttons.cancel')}
          </Button>
        </Modal.Footer>
      </Modal>

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
