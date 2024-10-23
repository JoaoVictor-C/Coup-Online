import React from 'react';
import { Modal, Button, ListGroup } from 'react-bootstrap';
import { Game } from '@utils/types';
import { useTranslation } from 'react-i18next';

interface TargetSelectionModalProps {
  show: boolean;
  onHide: () => void;
  onSelectTarget: (userId: string) => void;
  game: Game;
  currentUserId: string;
}

const TargetSelectionModal: React.FC<TargetSelectionModalProps> = ({ show, onHide, onSelectTarget, game, currentUserId }) => {
  const { t } = useTranslation(['game', 'common']);
  const alivePlayers = game.players.filter(p => p.isActive && p.userId !== currentUserId);

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{t('game:actions.selectTarget')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {alivePlayers.length > 0 ? (
          <ListGroup>
            {alivePlayers.map(player => (
              <ListGroup.Item key={player.userId} action onClick={() => onSelectTarget(player.userId)}>
                {player.username} - {player.coins} {t('game:actions.coins')}
              </ListGroup.Item>
            ))}
          </ListGroup>
        ) : (
          <p>{t('game:actions.noTargets')}</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          {t('common:buttons.cancel')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TargetSelectionModal;
