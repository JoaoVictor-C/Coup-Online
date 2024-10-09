    // Start of Selection
    import { useState } from 'react';
    import { useDispatch, useSelector } from 'react-redux';
    import { selectExchangeCards, performChallengeSuccess } from '../../store/actions/gameActions';
    import Card from './Card';
    import '../../assets/styles/ExchangeHandler.css';
    
    const ExchangeHandler = () => {
      const dispatch = useDispatch();
      const game = useSelector((state) => state.game.currentGame);
      const currentUserId = useSelector((state) => state.auth.userId);
      const user = game.players.find(p => p.playerProfile.user._id === currentUserId);
      const [selectedCards, setSelectedCards] = useState([]);
    
      const combinedCards = game.pendingAction?.exchange?.combinedCards || [];
      const userCardCount = user.characters.length;
      const requiredSelections = userCardCount === 1 ? 1 : 2;
    
      const toggleCardSelection = (cardIndex) => {
        if (selectedCards.includes(cardIndex)) {
          setSelectedCards(selectedCards.filter(index => index !== cardIndex));
        } else if (selectedCards.length < requiredSelections) {
          setSelectedCards([...selectedCards, cardIndex]);
        } else {
          // When cards are full, replace the last card with the new one
          setSelectedCards([...selectedCards.slice(0, -1), cardIndex]);
        }
      };
    
      const handleConfirm = () => {
        const selected = selectedCards.map(index => combinedCards[index]);
        if (game.pendingAction?.type === 'challengeSuccess') {
          dispatch(performChallengeSuccess(game._id, selected))
            .then(() => {
              setSelectedCards([]);
            })
            .catch((error) => {
              console.error('Challenge success selection failed:', error);
            });
        } else {
          dispatch(selectExchangeCards(game._id, selected))
            .then(() => {
              setSelectedCards([]);
            })
            .catch((error) => {
              console.error('Exchange selection failed:', error);
            });
        }
      };
    
      return (
        <div className="exchange-handler">
          <h3>Select {requiredSelections} Card{requiredSelections > 1 ? 's' : ''} to Keep:</h3>
          <div className="exchange-cards">
            {combinedCards.map((card, index) => (
              <Card 
                key={index}
                character={card}
                isRevealed={true}
                isSelectable={true}
                onClick={() => toggleCardSelection(index)}
                className={selectedCards.includes(index) ? 'border-warning border-2' : ''}
                enabled={true}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </div>
          <button 
            className="btn btn-confirm-exchange" 
            onClick={handleConfirm} 
            disabled={selectedCards.length !== requiredSelections}
          >
            Confirm Selection ({selectedCards.length}/{requiredSelections})
          </button>
        </div>
      );
    };
    
    export default ExchangeHandler;