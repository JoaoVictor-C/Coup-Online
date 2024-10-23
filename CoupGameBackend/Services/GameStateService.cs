using System.Threading.Tasks;
using CoupGameBackend.Models;
using Microsoft.AspNetCore.SignalR;
using CoupGameBackend.Hubs;
using System.Linq;
using System.Text.Json;

namespace CoupGameBackend.Services
{
    public class GameStateService : IGameStateService
    {
        private readonly IGameRepository _gameRepository;
        private readonly IHubContext<GameHub> _hubContext;

        public GameStateService(IGameRepository gameRepository, IHubContext<GameHub> hubContext)
        {
            _gameRepository = gameRepository;
            _hubContext = hubContext;
        }

        public async Task UpdateGameStateAndNotifyPlayers(Game game, string action, string userId, string? targetId = null)
        {
            await _gameRepository.UpdateGameAsync(game);
            await _hubContext.Clients.Group(game.Id).SendAsync("ActionPerformed", new { userId, action, targetId });
            await EmitGameUpdatesToUsers(game.Id);
        }

        public async Task EmitGameUpdatesToUsers(string gameId)
        {
            var game = await _gameRepository.GetGameAsync(gameId);
            if (game == null)
                return;

            foreach (var player in game.Players)
            {
                var state = await GetGameState(game.Id, player.UserId);
                await _hubContext.Clients.User(player.UserId).SendAsync("GameState", state);
            }
            // Emit a complete game state to spectators
            foreach (var spectator in game.Spectators)
            {
                var gameState = await _gameRepository.GetGameAsync(gameId) ?? throw new KeyNotFoundException("Game not found.");
                await _hubContext.Clients.User(spectator.UserId).SendAsync("GameState", gameState);
            }
        }

        public async Task<Game> GetGameState(string gameId, string userId)
        {
            var game = await _gameRepository.GetGameAsync(gameId) ?? throw new KeyNotFoundException("Game not found.");

            // Clone the game state without revealing other players' hands
            var visibleGameState = new Game
            {
                Id = game.Id,
                GameName = game.GameName,
                PlayerCount = game.PlayerCount,
                CreatedBy = game.CreatedBy,
                IsPrivate = game.IsPrivate,
                IsStarted = game.IsStarted,
                RoomCode = game.RoomCode,
                CreatedAt = game.CreatedAt,
                LeaderId = game.LeaderId,
                WinnerId = game.WinnerId,
                Players = game.Players.Select(p => new Player
                {
                    Username = p.Username,
                    UserId = p.UserId,
                    Coins = p.Coins,
                    Influences = p.Influences,
                    IsActive = p.IsActive,
                    Hand = p.UserId == userId
                        ? p.Hand
                        : p.Hand.Select(c => c.IsRevealed ? c : new Card { Name = "Hidden", Role = "Hidden", IsRevealed = false }).ToList()
                }).ToList(),
                Spectators = game.Spectators,
                CentralDeck = new List<Card>(),
                CurrentTurnUserId = game.CurrentTurnUserId,
                IsGameOver = game.IsGameOver,
                PendingAction = game.PendingAction,
                ActionInitiatorId = game.ActionInitiatorId,
                ActionsHistory = game.ActionsHistory
            };

            return visibleGameState;
        }

        public void UpdateTurn(Game game)
        {
            var activePlayers = game.Players.FindAll(p => p.IsActive);
            if (activePlayers.Count == 0)
                return;

            int currentIndex = activePlayers.FindIndex(p => p.UserId == game.CurrentTurnUserId);
            int nextIndex = (currentIndex + 1) % activePlayers.Count;
            game.CurrentTurnUserId = activePlayers[nextIndex].UserId;
            Console.WriteLine($"Updated turn to {game.CurrentTurnUserId}");
        }

        public string GetRoleForAction(string actionType)
        {
            return actionType switch
            {
                "Coup" => "Duke",
                "Steal" => "Captain",
                "Assassinate" => "Assassin",
                "Exchange" => "Ambassador",
                "Tax" => "Duke",
                _ => string.Empty
            };
        }

        public async Task CheckGameOver(Game game)
        {
            if (!game.IsStarted && !game.IsGameOver)
            {
                return;
            }
            var activePlayers = game.Players.Count(p => p.IsActive && p.Influences > 0);
            if (activePlayers <= 1)
            {
                game.IsGameOver = true;
                string? winnerId = game.Players.FirstOrDefault(p => p.IsActive && p.Influences > 0)?.UserId;
                game.WinnerId = winnerId;
                game.PendingAction = null;

                await _gameRepository.UpdateGameAsync(game);

                // Notify all clients about game over and the winner
                await _hubContext.Clients.Group(game.Id).SendAsync("GameOver", new
                {
                    WinnerId = winnerId,
                    Message = winnerId != null ? $"Player {winnerId} has won the game!" : "No players remaining. Game ended in a draw."
                });
                await EmitGameUpdatesToUsers(game.Id);
            }
        }

        public void DealCardsToPlayer(Game game, Player player, int numberOfCards)
        {
            if (game.CentralDeck.Count < numberOfCards)
                throw new InvalidOperationException("Not enough cards in the central deck.");

            var availableCards = new List<Card>(game.CentralDeck);
            var dealtCards = new List<Card>();

            for (int i = 0; i < numberOfCards; i++)
            {
                if (i == 0 || (availableCards.Count > 1 && dealtCards[0].Name == availableCards[0].Name))
                {
                    // Shuffle the remaining cards to increase randomness
                    availableCards = availableCards.OrderBy(c => Guid.NewGuid()).ToList();
                }

                var card = availableCards.First();
                availableCards.RemoveAt(0);
                dealtCards.Add(card);
                game.CentralDeck.Remove(card);
            }

            player.Hand.AddRange(dealtCards);
        }
    }
}