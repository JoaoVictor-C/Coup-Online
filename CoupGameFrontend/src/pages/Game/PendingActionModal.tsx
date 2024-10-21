import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Action, ActionResponse, Card, PendingAction, Player } from '@utils/types';

interface PendingActionModalProps {
  show: boolean;
  action?: Action;
  onRespond: (response: ActionResponse, blockOption?: string) => void;
  onHide: () => void;
  pendingAction?: PendingAction | undefined;
  currentUserId: string;
  players: Player[];
  respondToBlock: (gameId: string, isChallenge: boolean) => void;
  respondToExchangeSelect: (gameId: string, card1: string, card2: string) => void;
  gameId: string;
}

const PendingActionModal: React.FC<PendingActionModalProps> = ({ show, action, onRespond, onHide, pendingAction, currentUserId, players, respondToBlock, respondToExchangeSelect, gameId }) => {
  const [showSelectBlockOption, setShowSelectBlockOption] = useState(false);
  const [showRespondToBlock, setShowRespondToBlock] = useState(false);
  const [showRespondToExchangeSelect, setShowRespondToExchangeSelect] = useState(false);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);

  const handleResponse = (response: ActionResponse, blockOption?: string) => {
    if (response === 'block' && action?.actionType === 'steal' && blockOption === undefined) {
      setShowSelectBlockOption(true);
    } else {
      if (action?.actionType === 'foreign_aid' && blockOption === undefined) {
        blockOption = 'duke';
      } else if (action?.actionType === 'assassinate' && blockOption === undefined) {
        blockOption = 'contessa';
      }
      onRespond(response, blockOption);
      setShowSelectBlockOption(false);
      onHide();
    }
  };

  const handleExchangeSelect = (card: Card, index: number) => {
    const cardKey = `${card.name}-${index}`;
    const cardIndex = selectedCards.findIndex(selectedCard => selectedCard === cardKey);
    if (cardIndex !== -1) {
      setSelectedCards(selectedCards.filter((_, i) => i !== cardIndex));
    } else {
      if (selectedCards.length < 2) {
        setSelectedCards([...selectedCards, cardKey]);
      } else {
        setSelectedCards([selectedCards[1], cardKey]);
      }
    }
  };

  useEffect(() => {
    if (pendingAction?.actionType === 'blockAttempt' && pendingAction.targetId === currentUserId) {
      setShowRespondToBlock(true);
    } else if (pendingAction?.actionType === 'exchangeSelect' && pendingAction.initiatorId === currentUserId) {
      setShowRespondToExchangeSelect(true);
    } else {
      setShowRespondToBlock(false);
      setShowRespondToExchangeSelect(false);
    }
  }, [pendingAction, currentUserId]);

  const getActionDetails = (actionType: string) => {
    switch (actionType) {
      case 'foreign_aid':
        return {
          description: 'Foreign Aid: Gain 2 coins from the central treasury.',
          canBlock: true,
          canChallenge: false,
        };
      case 'steal':
        return {
          description: 'Steal: Steal 2 coins from another player.',
          canBlock: true,
          canChallenge: true,
        };
      case 'assassinate':
        return {
          description: 'Assassinate: Spend 3 coins to assassinate another player.',
          canBlock: true,
          canChallenge: true,
        };
      case 'exchange':
        return {
          description: 'Exchange: Draw 2 cards from the central deck.',
          canBlock: false,
          canChallenge: true,
        };
      case 'tax':
        return {
          description: 'Tax: Collect 3 coins from the central treasury.',
          canBlock: false,
          canChallenge: true,
        };
      // Add other actions as needed
      default:
        return {
          description: 'Unknown Action',
          canBlock: false,
          canChallenge: false,
        };
    }
  };

  if (!action) return null;

  const { description, canBlock, canChallenge } = getActionDetails(action.actionType);

  if (showRespondToExchangeSelect) {
    return (
      <Modal
        show={showRespondToExchangeSelect}
        onHide={() => setShowRespondToExchangeSelect(false)}
        centered
        backdrop="static"
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Select Cards to Exchange</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <p>Please choose two cards to return to the central deck:</p>
          <div className="d-flex flex-wrap justify-content-center">
            {players
              .find((player) => player.userId === pendingAction?.initiatorId)
              ?.hand.map((card, index) => {
                const cardKey = `${card.name}-${index}`;
                return (
                  <Button
                    variant={selectedCards.includes(cardKey) ? "success" : "primary"}
                    key={cardKey}
                    onClick={() => handleExchangeSelect(card, index)}
                    className="m-2"
                    style={{ minWidth: '100px' }}
                    disabled={
                      (selectedCards.length === 2 &&
                      !selectedCards.includes(cardKey)) ||
                      card.isRevealed
                    }
                  >
                    {card.name}
                  </Button>
                );
              })}
          </div>
          {selectedCards.length === 2 && (
            <div className="mt-4">
              <Button
                variant="success"
                onClick={() => {
                  respondToExchangeSelect(
                    gameId,
                    selectedCards[0].split('-')[0],
                    selectedCards[1].split('-')[0]
                  );
                  setShowRespondToExchangeSelect(false);
                  onHide();
                  setSelectedCards([]);
                }}
                size="lg"
              >
                Confirm Selection
              </Button>
            </div>
          )}
        </Modal.Body>
      </Modal>
    );
  }

  if (showSelectBlockOption) {
    return (
      <Modal show={showSelectBlockOption} onHide={() => setShowSelectBlockOption(false)} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Select Block Option</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Please choose a card to block the action:</p>
          <div className="d-flex justify-content-around">
            <Button variant="primary" onClick={() => handleResponse('block', 'ambassador')}>
              Ambassador
            </Button>
            <Button variant="primary" onClick={() => handleResponse('block', 'captain')}>
              Captain
            </Button>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSelectBlockOption(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  if (showRespondToBlock) {
    return (
      <Modal show={showRespondToBlock} onHide={() => setShowRespondToBlock(false)} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Respond to Block</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            {players.find(player => player.userId === pendingAction?.initiatorId)?.username} is attempting to block your action.
          </p>
          <p>Do you want to challenge this block?</p>
          <div className="d-flex justify-content-around">
            <Button variant="danger" onClick={() => respondToBlock(gameId, true)}>
              Challenge
            </Button>
            <Button variant="secondary" onClick={() => respondToBlock(gameId, false)}>
              Pass
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    );
  }

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Pending Action</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          {pendingAction?.initiatorId === currentUserId
            ? 'You'
            : players.find(player => player.userId === pendingAction?.initiatorId)?.username}{' '}
          is performing <strong>{description}</strong>
        </p>
        <p>Do you want to respond?</p>
      </Modal.Body>
      <Modal.Footer>
        {canBlock && (
          <Button variant="danger" onClick={() => handleResponse('block')}>
            Block
          </Button>
        )}
        {canChallenge && (
          <Button variant="warning" onClick={() => handleResponse('challenge')}>
            Challenge
          </Button>
        )}
        <Button variant="secondary" onClick={() => handleResponse('pass')}>
          Pass
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PendingActionModal;