using System.Threading.Tasks;
using CoupGameBackend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using CoupGameBackend.Hubs;
using System.Linq;
using System;
using System.Collections.Generic;

namespace CoupGameBackend.Services
{
    public class GameService : IGameService
    {
        private readonly IGameStateService _gameStateService;
        private readonly ISchedulingService _schedulingService;
        private readonly IGameRepository _gameRepository;
        private readonly IActionService _actionService;
        private readonly IChallengeService _challengeService;
        public Dictionary<string, PendingAction> PendingActions { get; private set; } = new Dictionary<string, PendingAction>();

        public GameService(
            IGameStateService gameStateService,
            ISchedulingService schedulingService,
            IGameRepository gameRepository,
            IActionService actionService,
            IChallengeService challengeService)
        {
            _gameStateService = gameStateService;
            _schedulingService = schedulingService;
            _gameRepository = gameRepository;
            _actionService = actionService;
            _challengeService = challengeService;
        }

        public async Task<Game> CreateGame(string userId, CreateGameRequest request)
        {
            var game = new Game
            {
                GameName = request.GameName,
                PlayerCount = request.PlayerCount,
                IsPrivate = request.IsPrivate,
                CreatedBy = userId,
                LeaderId = userId,
                RoomCode = GenerateRoomCode(),
                CreatedAt = DateTime.UtcNow
            };

            var player = new Player
            {
                Username = await _gameRepository.GetUsernameAsync(userId),
                UserId = userId,
                Coins = 2,
                Influences = 2,
                IsActive = true
            };
            game.Players.Add(player);

            game.CentralDeck = InitializeDeck();
            ShuffleDeck(game);

            await _gameRepository.CreateGameAsync(game);
            return game;
        }



        public async Task<IEnumerable<Game>> GetPublicGamesAsync()
        {
            return await _gameRepository.GetPublicGamesAsync();
        }

        public async Task<IEnumerable<Game>> SearchGamesAsync(string query)
        {
            return await _gameRepository.SearchGamesAsync(query);
        }

        public void ScheduleGameDeletion(string gameId)
        {
            _schedulingService.ScheduleGameDeletion(gameId);
        }

        public void CancelScheduledDeletion(string gameId)
        {
            _schedulingService.CancelScheduledDeletion(gameId);
        }

        // Implement other methods similarly...

        // Helper methods
        private string GenerateRoomCode()
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            var random = new Random();
            return new string(Enumerable.Repeat(chars, 4)
              .Select(s => s[random.Next(s.Length)]).ToArray());
        }

        private List<Card> InitializeDeck()
        {
            var deck = new List<Card>();
            string[] roles = { "Duke", "Assassin", "Contessa", "Ambassador", "Captain" };

            foreach (var role in roles)
            {
                for (int i = 0; i < 3; i++)
                {
                    deck.Add(new Card { Name = role, Role = role });
                }
            }

            return deck;
        }

        private void ShuffleDeck(Game game)
        {
            Random rng = new Random();
            int n = game.CentralDeck.Count;
            while (n > 1)
            {
                n--;
                int k = rng.Next(n + 1);
                Card value = game.CentralDeck[k];
                game.CentralDeck[k] = game.CentralDeck[n];
                game.CentralDeck[n] = value;
            }
        }

        public async Task<(bool IsSuccess, string Message)> StartGameAsync(string gameId, string userId)
        {
            var game = await _gameRepository.GetGameAsync(gameId);
            if (game == null)
                return (false, "Game not found.");

            if (game.LeaderId != userId)
                return (false, "Only the game leader can start the game.");

            if (game.IsStarted)
                return (false, "Game has already started.");

            // Reset the state of the previous game
            game.IsStarted = true;
            game.IsGameOver = false;
            game.WinnerId = null;
            game.PendingAction = null;
            game.ActionInitiatorId = null;
            game.ActionsHistory.Clear();
            game.CentralDeck = InitializeDeck();
            ShuffleDeck(game);

            foreach (var player in game.Players)
            {
                player.Coins = 2;
                player.Influences = 2;
                player.IsActive = true;
                player.Hand.Clear();
            }

            // Initialize new game state
            game.CurrentTurnUserId = game.Players[new Random().Next(game.Players.Count)].UserId;

            // Deal cards to players
            foreach (var player in game.Players)
            {
                _gameStateService.DealCardsToPlayer(game, player, 2);
            }


            // Save the updated game state
            await _gameRepository.UpdateGameAsync(game);

            // Emit game started event
            await _gameStateService.EmitGameUpdatesToUsers(game.Id);

            return (true, "Game started successfully.");
        }

        public async Task<(bool IsSuccess, string Message)> ResetGameAsync(string gameId, string userId)
        {
            var game = await _gameRepository.GetGameAsync(gameId);
            if (game == null)
                return (false, "Game not found.");

            game.IsStarted = false;
            game.IsGameOver = false;
            game.CurrentTurnUserId = string.Empty;
            game.WinnerId = null;
            game.PendingAction = null;
            game.ActionInitiatorId = null;
            game.Players.ForEach(player =>
            {
                player.Coins = 2;
                player.Influences = 2;
                player.IsActive = true;
                player.Hand.Clear();
            });
            
            game.CentralDeck = InitializeDeck();
            ShuffleDeck(game);

            await _gameRepository.UpdateGameAsync(game);
            return (true, "Game reset successfully.");
        }

        public async Task<(bool IsSuccess, string Message)> RestartGameAsync(string gameId, string userId)
        {
            var game = await _gameRepository.GetGameAsync(gameId);
            if (game == null)
                return (false, "Game not found.");

            if (game.LeaderId != userId)
                return (false, "Only the game leader can restart the game.");


            // Reset game state
            game.IsStarted = false;
            game.IsGameOver = false;
            game.CurrentTurnUserId = string.Empty;
            game.WinnerId = null;
            game.PendingAction = null;
            game.ActionInitiatorId = null;
            game.ActionsHistory.Clear();
            game.Players.ForEach(player =>
            {
                player.Coins = 2;
                player.Influences = 2;
                player.IsActive = true;
                player.Hand.Clear();
            });
            game.CentralDeck = InitializeDeck();
            ShuffleDeck(game);

            await _gameRepository.UpdateGameAsync(game);

            // Start the game again
            var (isSuccess, message) = await StartGameAsync(gameId, userId);
            if (!isSuccess)
                return (false, $"Failed to start the game after restart: {message}");


            return (true, "Game restarted successfully.");
        }

        public async Task<(bool IsSuccess, string Message)> SwitchToSpectatorAsync(string gameIdOrCode, string userId)
        {
            var game = await _gameRepository.GetGameAsync(gameIdOrCode);
            if (game == null)
                return (false, "Game not found.");

            // Check if user is already spectating
            if (game.Spectators.Any(s => s.UserId == userId))
                return (false, "User is already spectating the game.");

            var player = game.Players.FirstOrDefault(p => p.UserId == userId);
            if (player == null)
                return (false, "Player not found in the game.");

            // Remove from players list
            game.Players.Remove(player);

            // Add to spectators list
            var spectator = new Spectator
            {
                UserId = userId,
                Username = await _gameRepository.GetUsernameAsync(userId)
            };
            game.Spectators.Add(spectator); 


            // Log the action
            game.ActionsHistory.Add(new ActionLog
            {
                Timestamp = DateTime.UtcNow,
                PlayerId = userId,
                Action = "Switched to Spectator"
            });

            // Update the game state in the repository
            await _gameRepository.UpdateGameAsync(game);

            await _gameStateService.EmitGameUpdatesToUsers(game.Id);

            return (true, "Successfully switched to spectator mode.");
        }

        public bool HasPendingAction(string gameId)
        {
            return PendingActions.ContainsKey(gameId);
        }

        // Method to retrieve a pending action
        public PendingAction? GetPendingAction(string gameId)
        {
            if (PendingActions.TryGetValue(gameId, out var pendingAction))
                return pendingAction;
            return null;
        }
    }
}
