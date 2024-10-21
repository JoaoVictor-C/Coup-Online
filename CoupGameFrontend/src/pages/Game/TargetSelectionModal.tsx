import React from 'react';
import { Modal, Button, ListGroup } from 'react-bootstrap';
import { Game } from '@utils/types';

interface TargetSelectionModalProps {
  show: boolean;
  onHide: () => void;
  onSelectTarget: (userId: string) => void;
  game: Game;
  currentUserId: string;
}

const TargetSelectionModal: React.FC<TargetSelectionModalProps> = ({ show, onHide, onSelectTarget, game, currentUserId }) => {
  const alivePlayers = game.players.filter(p => p.isActive && p.userId !== currentUserId);

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Select a Target</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {alivePlayers.length > 0 ? (
          <ListGroup>
            {alivePlayers.map(player => (
              <ListGroup.Item key={player.userId} action onClick={() => onSelectTarget(player.userId)}>
                {player.username} - {player.coins} Coins
              </ListGroup.Item>
            ))}
          </ListGroup>
        ) : (
          <p>No available targets.</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TargetSelectionModal;
