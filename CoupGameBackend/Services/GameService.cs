using CoupGameBackend.Models;
using CoupGameBackend.Hubs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace CoupGameBackend.Services
{
    public class GameService : IGameService
    {
        private readonly IGameRepository _gameRepository;
        private readonly IUserRepository _userRepository;
        private readonly IHubContext<GameHub> _hubContext;

        // In-memory dictionary to track user connections
        private static readonly Dictionary<string, string> UserConnections = new Dictionary<string, string>();

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
                }
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
            };

            // Shuffle the deck
            game.CentralDeck = game.CentralDeck.OrderBy(a => Guid.NewGuid()).ToList();

            // Deal 2 cards to each player (initial setup)
            foreach (var player in game.Players)
            {
                if (game.CentralDeck.Count >= 1)
                {
                    player.Hand.Add(game.CentralDeck.Last());
                    game.CentralDeck.RemoveAt(game.CentralDeck.Count - 1);
                }

                if (game.CentralDeck.Count >= 1)
                {
                    player.Hand.Add(game.CentralDeck.Last());
                    game.CentralDeck.RemoveAt(game.CentralDeck.Count - 1);
                }
            }
        }

        public async Task<Game> JoinGame(string userId, string gameId)
        {
            var game = await _gameRepository.GetGameByIdAsync(gameId);
            if (game == null || game.Players.Count >= game.PlayerCount || game.CurrentState != GameState.WaitingForPlayers)
                throw new ArgumentException("Cannot join the game.");

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
            if (game.CentralDeck.Count >= 2)
            {
                player.Hand.Add(game.CentralDeck.Last());
                game.CentralDeck.RemoveAt(game.CentralDeck.Count - 1);

                player.Hand.Add(game.CentralDeck.Last());
                game.CentralDeck.RemoveAt(game.CentralDeck.Count - 1);
            }
            else
            {
                // Handle insufficient cards
                // For simplicity, we'll skip this
            }

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
            if (UserConnections.ContainsKey(userId))
                UserConnections[userId] = connectionId;
            else
                UserConnections.Add(userId, connectionId);
            
            // Optionally, handle any additional logic
            return Task.CompletedTask;
        }

        public Task RemoveUserConnection(string userId, string connectionId)
        {
            if (UserConnections.ContainsKey(userId) && UserConnections[userId] == connectionId)
                UserConnections.Remove(userId);
            
            // Optionally, handle disconnection logic
            return Task.CompletedTask;
        }

        public async Task<IActionResult> PerformAction(string gameId, string userId, string action, object parameters)
        {
            var game = await _gameRepository.GetGameByIdAsync(gameId);
            if (game == null)
                return new NotFoundObjectResult(new { message = "Game not found." });

            var player = game.Players.FirstOrDefault(p => p.UserId == userId);
            if (player == null || !player.IsActive)
                return new UnauthorizedResult();

            // Implement action handling
            switch (action.ToLower())
            {
                case "income":
                    player.Coins += 1;
                    break;

                case "foreign aid":
                    player.Coins += 2;
                    // Note: Implement blocking by Duke
                    break;

                case "coup":
                    if (player.Coins < 7)
                        return new BadRequestObjectResult(new { message = "Not enough coins to perform Coup." });

                    player.Coins -= 7;
                    // Assume targetUserId is provided in parameters
                    var targetUserId = parameters.GetType().GetProperty("TargetUserId")?.GetValue(parameters)?.ToString();
                    if (string.IsNullOrEmpty(targetUserId))
                        return new BadRequestObjectResult(new { message = "TargetUserId is missing." });

                    var targetPlayer = game.Players.FirstOrDefault(p => p.UserId == targetUserId);
                    if (targetPlayer != null)
                    {
                        targetPlayer.Influences -= 1;
                        if (targetPlayer.Influences <= 0)
                        {
                            targetPlayer.IsActive = false;
                            // Notify players about elimination
                            await _hubContext.Clients.Group(game.Id).SendAsync("PlayerEliminated", targetUserId);
                        }
                    }
                    break;

                case "steal":
                    // Implement Steal logic, require Captain
                    break;

                case "exchange":
                    // Implement Exchange logic, require Ambassador
                    break;

                case "assassin":
                    // Implement Assassin logic, require Assassin
                    break;

                case "duke":
                    // Implement Duke-specific logic
                    break;

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