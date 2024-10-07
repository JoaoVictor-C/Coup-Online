import PropTypes from 'prop-types';
import Card from './Card';
import Coin from './Coin';
import '../../assets/styles/Player.css';
import { useEffect, useState } from 'react';
import ActionButtons from './ActionButtons';

const Player = ({ player, isCurrentPlayer, isCurrentTurn, style, handleCardClick, selectedTarget, setSelectedTarget, nameOnBottom, game }) => {
    // Determine if the player has any actionable cards
    const [isSelected, setIsSelected] = useState(false);
    const hasActionCards = player.characters.some(card =>
      ['duke', 'assassin', 'ambassador', 'captain'].includes(card.toLowerCase())
    );

    // Calculate otherActionCards based on player data
    const otherActionCards = player.isAlive
      ? ['duke', 'assassin', 'ambassador', 'captain'].filter(
          card => !player.characters.map(c => c.toLowerCase()).includes(card)
        )
      : [];

    const handleCardSelection = () => {
        if (!isCurrentTurn) {
            if (selectedTarget === player.playerProfile.user._id) {
                setSelectedTarget('');
            } else {
                setSelectedTarget(player.playerProfile.user._id);
            }
        }
    }

    useEffect(() => {
        if (selectedTarget === player.playerProfile.user._id) {
            setIsSelected(true);
        } else {
            setIsSelected(false);
        }
    }, [selectedTarget, player.playerProfile.user._id, isSelected]);

    return (
        <div
          className={`player 
          ${isCurrentPlayer ? 'player--current-player' : 'player--other-player'} 
          ${isCurrentTurn ? 'current-turn' : ''} 
          ${hasActionCards ? 'player--actionable' : ''} 
          ${isSelected ? 'selected' : ''}
          ${!isCurrentPlayer && !isCurrentTurn ? 'cursor-pointer' : ''}
          `}
          style={style}
          onClick={handleCardSelection}
        >
            <div className="player__info">
                {!nameOnBottom && <h4 className="player__name text-black">{player.username}</h4>}
                <Coin count={player.coins} />
            </div>
            <div className="player__cards">
                <div className="player__active-cards">
                    {player.characters.map((character, index) => (
                        <Card 
                            key={index} 
                            character={character} 
                            isRevealed={isCurrentPlayer} 
                            isSelectable={isCurrentPlayer || !isCurrentPlayer} 
                            onClick={() => handleCardClick(character)}
                            className={`action-card 
                                ${character !== 'contessa' ? 'playerHasCard' : ''}
                                ${!isCurrentTurn ? 'opacity-50 disabled' : ''}
                                `}
                            enabled={isCurrentTurn}
                        />
                    ))}
                    {player.deadCharacters.map((character, index) => (
                        <Card 
                            key={index} 
                            character={character} 
                            isRevealed={true} 
                            isSelectable={false} 
                            className="action-card dead-card"
                        />
                    ))}
                    {isCurrentPlayer && (
                        otherActionCards.map((character, index) => (
                            <Card 
                                key={index} 
                                character={character} 
                                isRevealed={isCurrentPlayer} 
                                isSelectable={isCurrentPlayer} 
                                onClick={() => handleCardClick(character)}
                                className={`action-card 
                                            ${!isCurrentTurn ? 'opacity-50 disabled' : ''}`}
                                enabled={isCurrentTurn}
                            />
                        ))
                    )}

                </div>
            </div>
            {isCurrentTurn && isCurrentPlayer && !game.pendingAction && <ActionButtons gameId={game._id} currentUserId={player.playerProfile.user._id} selectedTarget={selectedTarget} setSelectedTarget={setSelectedTarget}/>}
            <div>
                {nameOnBottom && <h4 className="player__name text-black">{player.username}</h4>}
            </div>
            {isCurrentTurn && <div className="player__current-turn-indicator">Current Turn</div>}
        </div>
    );
};

Player.propTypes = {
    player: PropTypes.object.isRequired,
    isCurrentPlayer: PropTypes.bool.isRequired,
    isCurrentTurn: PropTypes.bool.isRequired,
    style: PropTypes.object,
    handleCardClick: PropTypes.func,
    selectedTarget: PropTypes.string,
    setSelectedTarget: PropTypes.func,
    nameOnBottom: PropTypes.bool,
    game: PropTypes.object,
};

export default Player;