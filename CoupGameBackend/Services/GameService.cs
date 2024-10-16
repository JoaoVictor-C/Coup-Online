using CoupGameBackend.Models;
using CoupGameBackend.Hubs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using System.Collections.Concurrent;

namespace CoupGameBackend.Services
{
    public class GameService : IGameService
    {
        private readonly IGameRepository _gameRepository;
        private readonly IUserRepository _userRepository;
        private readonly IHubContext<GameHub> _hubContext;

        // In-memory thread-safe dictionary to track user connections
        private static readonly ConcurrentDictionary<string, string> UserConnections = new ConcurrentDictionary<string, string>();

        public GameService(IGameRepository gameRepository, IUserRepository userRepository, IHubContext<GameHub> hubContext)
        {
            _gameRepository = gameRepository;
            _userRepository = userRepository;
            _hubContext = hubContext;
        }

        public async Task<Game> CreateGame(string userId, CreateGameRequest request)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                throw new ArgumentException("User not found.");

            var game = new Game
            {
                GameName = string.IsNullOrEmpty(request.GameName) ? $"Game-{Guid.NewGuid().ToString().Substring(0, 5)}" : request.GameName,
                PlayerCount = request.PlayerCount,
                CreatedBy = userId,
                Players = new List<Player>
                {
                    new Player
                    {
                        UserId = userId,
                        Coins = 2,
                        Influences = 2,
                        IsActive = true
                    }
                },
                CreatedAt = DateTime.UtcNow
            };

            // Initialize the central deck based on game rules
            InitializeDeck(game);

            await _gameRepository.CreateGameAsync(game);
            return game;
        }

        private void InitializeDeck(Game game)
        {
            // Initialize the central deck with character cards
            game.CentralDeck = new List<Card>
            {
                new Card { Name = "Duke", Role = "Duke" },
                new Card { Name = "Assassin", Role = "Assassin" },
                new Card { Name = "Captain", Role = "Captain" },
                new Card { Name = "Ambassador", Role = "Ambassador" },
                new Card { Name = "Contessa", Role = "Contessa" }
                // Add multiple instances of each card if needed, as per game rules
            };

            // Shuffle the deck
            game.CentralDeck = game.CentralDeck.OrderBy(a => Guid.NewGuid()).ToList();

            // Deal 2 cards to each player (initial setup)
            foreach (var player in game.Players)
            {
                DealCardToPlayer(game, player);
                DealCardToPlayer(game, player);
            }
        }

        private void DealCardToPlayer(Game game, Player player)
        {
            if (game.CentralDeck.Any())
            {
                var card = game.CentralDeck.Last();
                game.CentralDeck.RemoveAt(game.CentralDeck.Count - 1);
                player.Hand.Add(card);
            }
            else
            {
                // Handle insufficient cards, e.g., reshuffle discard pile if implemented
                // For now, throw exception
                throw new InvalidOperationException("Not enough cards in the central deck to deal.");
            }
        }

        public async Task<Game> JoinGame(string userId, string gameId)
        {
            var game = await _gameRepository.GetGameByIdAsync(gameId);
            if (game == null)
                throw new ArgumentException("Game not found.");

            if (game.Players.Count >= game.PlayerCount)
                throw new InvalidOperationException("Game is already full.");

            if (game.CurrentState != GameState.WaitingForPlayers)
                throw new InvalidOperationException("Game has already started.");

            if (game.Players.Any(p => p.UserId == userId))
                return game; // User already in the game

            var player = new Player
            {
                UserId = userId,
                Coins = 2,
                Influences = 2,
                IsActive = true
            };

            // Deal 2 cards to the new player
            DealCardToPlayer(game, player);
            DealCardToPlayer(game, player);

            game.Players.Add(player);

            if (game.Players.Count == game.PlayerCount)
            {
                game.CurrentState = GameState.InProgress;
                // Notify all players that the game has started
                await _hubContext.Clients.Group(game.Id).SendAsync("GameStarted", game);
            }

            await _gameRepository.UpdateGameAsync(game);
            return game;
        }

        public async Task<Game> GetGameState(string gameId, string userId)
        {
            var game = await _gameRepository.GetGameByIdAsync(gameId);
            if (game == null)
                throw new ArgumentException("Game not found.");

            if (!game.Players.Any(p => p.UserId == userId))
                throw new UnauthorizedAccessException("Access denied.");

            return game;
        }

        public async Task<bool> HandleDisconnection(string gameId, string userId)
        {
            var game = await _gameRepository.GetGameByIdAsync(gameId);
            if (game == null)
                return false;

            var player = game.Players.FirstOrDefault(p => p.UserId == userId);
            if (player == null)
                return false;

            player.IsActive = false;
            await _gameRepository.UpdateGameAsync(game);

            // Notify other players
            await _hubContext.Clients.Group(game.Id).SendAsync("PlayerDisconnected", userId);

            return true;
        }

        public Task AddUserConnection(string userId, string connectionId)
        {
            UserConnections.AddOrUpdate(userId, connectionId, (key, oldValue) => connectionId);
            // Optionally, handle any additional logic
            return Task.CompletedTask;
        }

        public Task RemoveUserConnection(string userId, string connectionId)
        {
            UserConnections.TryRemove(userId, out _);
            // Optionally, handle disconnection logic
            return Task.CompletedTask;
        }

        public async Task<IActionResult> PerformAction(string gameId, string userId, string action, ActionParameters parameters)
        {
            var game = await _gameRepository.GetGameByIdAsync(gameId);
            if (game == null)
                return new NotFoundObjectResult(new { message = "Game not found." });

            var player = game.Players.FirstOrDefault(p => p.UserId == userId);
            if (player == null || !player.IsActive)
                return new UnauthorizedResult();

            // Implement action handling with strong typing
            switch (action.ToLower())
            {
                case "income":
                    player.Coins += 1;
                    break;

                case "foreign_aid":
                    // Note: Implement blocking by Duke
                    player.Coins += 2;
                    break;

                case "coup":
                    if (player.Coins < 7)
                        return new BadRequestObjectResult(new { message = "Not enough coins to perform Coup." });

                    player.Coins -= 7;
                    var coupParams = parameters as CoupActionParameters;
                    if (coupParams == null || string.IsNullOrEmpty(coupParams.TargetUserId))
                        return new BadRequestObjectResult(new { message = "TargetUserId is missing." });

                    var targetPlayer = game.Players.FirstOrDefault(p => p.UserId == coupParams.TargetUserId);
                    if (targetPlayer != null)
                    {
                        targetPlayer.Influences -= 1;
                        if (targetPlayer.Influences <= 0)
                        {
                            targetPlayer.IsActive = false;
                            // Notify players about elimination
                            await _hubContext.Clients.Group(game.Id).SendAsync("PlayerEliminated", coupParams.TargetUserId);
                        }
                    }
                    else
                    {
                        return new NotFoundObjectResult(new { message = "Target player not found." });
                    }
                    break;

                case "steal":
                    var stealParams = parameters as StealActionParameters;
                    if (stealParams == null || string.IsNullOrEmpty(stealParams.TargetUserId))
                        return new BadRequestObjectResult(new { message = "TargetUserId is missing." });

                    var targetStealPlayer = game.Players.FirstOrDefault(p => p.UserId == stealParams.TargetUserId);
                    if (targetStealPlayer == null || targetStealPlayer.Coins < 2)
                        return new BadRequestObjectResult(new { message = "Cannot steal from the specified player." });

                    // Check if player has Captain or Ambassador influence
                    // This requires checking player's hand, which is not implemented here
                    player.Coins += 2;
                    targetStealPlayer.Coins -= 2;
                    break;

                case "assassinate":
                    if (player.Coins < 3)
                        return new BadRequestObjectResult(new { message = "Not enough coins to perform Assassinate." });

                    var assassinateParams = parameters as AssassinateActionParameters;
                    if (assassinateParams == null || string.IsNullOrEmpty(assassinateParams.TargetUserId))
                        return new BadRequestObjectResult(new { message = "TargetUserId is missing." });

                    player.Coins -= 3;
                    var targetAssassinPlayer = game.Players.FirstOrDefault(p => p.UserId == assassinateParams.TargetUserId);
                    if (targetAssassinPlayer != null)
                    {
                        targetAssassinPlayer.Influences -= 1;
                        if (targetAssassinPlayer.Influences <= 0)
                        {
                            targetAssassinPlayer.IsActive = false;
                            // Notify players about elimination
                            await _hubContext.Clients.Group(game.Id).SendAsync("PlayerEliminated", assassinateParams.TargetUserId);
                        }
                    }
                    else
                    {
                        return new NotFoundObjectResult(new { message = "Target player not found." });
                    }
                    break;

                case "exchange":
                    // Implement Exchange logic, require Ambassador
                    // This requires more detailed implementation
                    return new StatusCodeResult(501); // Not Implemented

                default:
                    return new BadRequestObjectResult(new { message = "Invalid action." });
            }

            await _gameRepository.UpdateGameAsync(game);

            // Notify all players about the action
            await _hubContext.Clients.Group(game.Id).SendAsync("ActionPerformed", new { userId, action, parameters });

            return new OkResult();
        }
    }
}
