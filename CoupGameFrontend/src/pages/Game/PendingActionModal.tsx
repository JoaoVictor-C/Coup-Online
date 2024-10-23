import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Action, ActionResponse, Card, PendingAction, Player } from '@utils/types';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation(['game', 'common']);
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

  if (!action) return null;

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
          <Modal.Title>{t('game:actions.exchange.selectCards')}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <p>{t('game:actions.exchange.selectPrompt')}</p>
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
                {t('common:buttons.confirm')}
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
          <Modal.Title>{t('game:actions.block.selectOption')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{t('game:actions.block.selectCard')}</p>
          <div className="d-flex justify-content-around">
            <Button variant="primary" onClick={() => handleResponse('block', 'ambassador')}>
              {t('game:cards.ambassador')}
            </Button>
            <Button variant="primary" onClick={() => handleResponse('block', 'captain')}>
              {t('game:cards.captain')}
            </Button>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSelectBlockOption(false)}>
            {t('common:buttons.cancel')}
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  if (showRespondToBlock) {
    return (
      <Modal show={showRespondToBlock} onHide={() => setShowRespondToBlock(false)} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>{t('game:actions.block.respondTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            {players.find(player => player.userId === pendingAction?.initiatorId)?.username} {t('game:actions.block.attemptingBlock')}
          </p>
          <p>{t('game:actions.block.challengePrompt')}</p>
          <div className="d-flex justify-content-around">
            <Button variant="danger" onClick={() => respondToBlock(gameId, true)}>
              {t('game:actions.challenge')}
            </Button>
            <Button variant="secondary" onClick={() => respondToBlock(gameId, false)}>
              {t('game:actions.pass')}
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    );
  }

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>{t('game:actions.pending')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          {pendingAction?.initiatorId === currentUserId
            ? t('game:actions.you')
            : players.find(player => player.userId === pendingAction?.initiatorId)?.username}{' '}
          {t('game:actions.performing')} <strong>{t(`game:actions.${action.actionType}.description`)}</strong>
        </p>
        <p>{t('game:actions.respondPrompt')}</p>
      </Modal.Body>
      <Modal.Footer>
        {action.actionType !== 'income' && action.actionType !== 'coup' && (
          <>
            {['foreign_aid', 'steal', 'assassinate'].includes(action.actionType) && (
              <Button variant="danger" onClick={() => handleResponse('block')}>
                {t('game:actions.block.action')}
              </Button>
            )}
            {['steal', 'assassinate', 'exchange', 'tax'].includes(action.actionType) && (
              <Button variant="warning" onClick={() => handleResponse('challenge')}>
                {t('game:actions.challenge')}
              </Button>
            )}
          </>
        )}
        <Button variant="secondary" onClick={() => handleResponse('pass')}>
          {t('game:actions.pass')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PendingActionModal;