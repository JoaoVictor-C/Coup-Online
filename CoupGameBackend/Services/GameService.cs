using CoupGameBackend.Models;
using CoupGameBackend.Hubs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using System.Collections.Concurrent;
using MongoDB.Bson;
using System.Threading.Tasks;
using System.Linq;

namespace CoupGameBackend.Services
{
    public class GameService : IGameService
    {
        private readonly IGameRepository _gameRepository;
        private readonly IUserRepository _userRepository;
        private readonly IHubContext<GameHub> _hubContext;
        // In-memory thread-safe dictionary to track user connections
        private static readonly ConcurrentDictionary<string, string> UserConnections = new ConcurrentDictionary<string, string>();
        private static readonly Random random = new Random();
        // To track pending actions that require challenges or blocks
        private static readonly ConcurrentDictionary<string, PendingAction> PendingActions = new ConcurrentDictionary<string, PendingAction>();
        private static readonly ConcurrentDictionary<string, CancellationTokenSource> PendingDeletions = new ConcurrentDictionary<string, CancellationTokenSource>();
        private static readonly ConcurrentDictionary<string, CancellationTokenSource> PendingDisconnections = new ConcurrentDictionary<string, CancellationTokenSource>();

        public GameService(IGameRepository gameRepository, IUserRepository userRepository, IHubContext<GameHub> hubContext)
        {
            _gameRepository = gameRepository;
            _userRepository = userRepository;
            _hubContext = hubContext;
        }

        // Existing methods like CreateGame, InitializeDeck, etc.

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
                    // Foreign Aid can be blocked by Duke
                    // Set up a pending action for blocking
                    var pendingForeignAid = new PendingAction
                    {
                        ActionType = "foreign_aid",
                        InitiatorId = userId,
                        Parameters = parameters,
                        IsActionResolved = false
                    };
                    PendingActions[gameId] = pendingForeignAid;

                    // Notify other players to challenge or block
                    await _hubContext.Clients.Group(gameId).SendAsync("ForeignAidAttempted", userId);

                    // Implement a timeout for block/challenge
                    _ = Task.Run(async () =>
                    {
                        await Task.Delay(TimeSpan.FromSeconds(15)); // Wait for 15 seconds
                        if (!pendingForeignAid.IsActionResolved)
                        {
                            // No block or challenge, execute the action
                            player.Coins += 2;
                            pendingForeignAid.IsActionResolved = true;
                            PendingActions.TryRemove(gameId, out _);
                            await _hubContext.Clients.Group(gameId).SendAsync("ForeignAidTaken", userId);
                            await _gameRepository.UpdateGameAsync(game);
                        }
                    });
                    return new OkResult();

                case "coup":
                    if (player.Coins < 7)
                        return new BadRequestObjectResult(new { message = "Not enough coins to perform Coup." });

                    player.Coins -= 7;
                    if (parameters is CoupActionParameters coupParams)
                    {
                        if (string.IsNullOrEmpty(coupParams.TargetUserId))
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
                    }
                    else
                    {
                        return new BadRequestObjectResult(new { message = "Invalid action parameters for Coup." });
                    }
                    break;

                case "steal":
                    if (parameters is StealActionParameters stealParams)
                    {
                        if (string.IsNullOrEmpty(stealParams.TargetUserId))
                            return new BadRequestObjectResult(new { message = "TargetUserId is missing." });

                        var targetStealPlayer = game.Players.FirstOrDefault(p => p.UserId == stealParams.TargetUserId);
                        if (targetStealPlayer == null || targetStealPlayer.Coins < 2)
                            return new BadRequestObjectResult(new { message = "Cannot steal from the specified player." });

                        // Check if player has Captain or Ambassador influence
                        if (!player.Hand.Any(c => c.Role == "Captain" || c.Role == "Ambassador"))
                            return new BadRequestObjectResult(new { message = "Player does not have the required role to perform Steal." });

                        // Initiate steal action which can be blocked
                        var pendingSteal = new PendingAction
                        {
                            ActionType = "steal",
                            InitiatorId = userId,
                            TargetId = stealParams.TargetUserId,
                            Parameters = parameters,
                            IsActionResolved = false
                        };
                        PendingActions[gameId] = pendingSteal;

                        // Notify other players to challenge or block
                        await _hubContext.Clients.Group(gameId).SendAsync("StealAttempted", userId, stealParams.TargetUserId);

                        // Implement a timeout for block/challenge
                        _ = Task.Run(async () =>
                        {
                            await Task.Delay(TimeSpan.FromSeconds(15)); // Wait for 15 seconds
                            if (!pendingSteal.IsActionResolved)
                            {
                                // No block or challenge, execute the action
                                player.Coins += 2;
                                targetStealPlayer.Coins -= 2;
                                pendingSteal.IsActionResolved = true;
                                PendingActions.TryRemove(gameId, out _);
                                await _hubContext.Clients.Group(gameId).SendAsync("StealExecuted", userId, stealParams.TargetUserId);
                                await _gameRepository.UpdateGameAsync(game);
                            }
                        });
                        return new OkResult();
                    }
                    else
                    {
                        return new BadRequestObjectResult(new { message = "Invalid action parameters for Steal." });
                    }

                case "assassinate":
                    if (parameters is AssassinateActionParameters assassinateParams)
                    {
                        if (player.Coins < 3)
                            return new BadRequestObjectResult(new { message = "Not enough coins to perform Assassinate." });

                        if (string.IsNullOrEmpty(assassinateParams.TargetUserId))
                            return new BadRequestObjectResult(new { message = "TargetUserId is missing." });

                        // Check if player has Assassin role
                        if (!player.Hand.Any(c => c.Role == "Assassin"))
                            return new BadRequestObjectResult(new { message = "Player does not have the required role to perform Assassinate." });

                        player.Coins -= 3;

                        var pendingAssassinate = new PendingAction
                        {
                            ActionType = "assassinate",
                            InitiatorId = userId,
                            TargetId = assassinateParams.TargetUserId,
                            Parameters = parameters,
                            IsActionResolved = false
                        };
                        PendingActions[gameId] = pendingAssassinate;

                        // Notify other players to challenge or block
                        await _hubContext.Clients.Group(gameId).SendAsync("AssassinateAttempted", userId, assassinateParams.TargetUserId);

                        // Implement a timeout for block/challenge
                        _ = Task.Run(async () =>
                        {
                            await Task.Delay(TimeSpan.FromSeconds(15)); // Wait for 15 seconds
                            if (!pendingAssassinate.IsActionResolved)
                            {
                                // No block or challenge, execute the action
                                var targetPlayer = game.Players.FirstOrDefault(p => p.UserId == assassinateParams.TargetUserId);
                                if (targetPlayer != null)
                                {
                                    targetPlayer.Influences -= 1;
                                    if (targetPlayer.Influences <= 0)
                                    {
                                        targetPlayer.IsActive = false;
                                        // Notify players about elimination
                                        await _hubContext.Clients.Group(game.Id).SendAsync("PlayerEliminated", assassinateParams.TargetUserId);
                                    }
                                }
                                pendingAssassinate.IsActionResolved = true;
                                PendingActions.TryRemove(gameId, out _);
                                await _hubContext.Clients.Group(game.Id).SendAsync("AssassinateExecuted", userId, assassinateParams.TargetUserId);
                                await _gameRepository.UpdateGameAsync(game);
                            }
                        });
                        return new OkResult();
                    }
                    else
                    {
                        return new BadRequestObjectResult(new { message = "Invalid action parameters for Assassinate." });
                    }

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

        public async Task<(bool IsSuccess, string Message)> ChallengeAction(string gameId, string challengerId, string challengedUserId)
        {
            if (!PendingActions.TryGetValue(gameId, out var pendingAction))
            {
                return (false, "No action available to challenge.");
            }

            if (pendingAction.IsActionResolved)
            {
                return (false, "Action has already been resolved.");
            }

            // Verify that the challenger is not the initiator
            if (challengerId == pendingAction.InitiatorId)
            {
                return (false, "Cannot challenge your own action.");
            }

            // Retrieve game and players
            var game = await _gameRepository.GetGameByIdAsync(gameId);
            if (game == null)
            {
                return (false, "Game not found.");
            }

            var challengedPlayer = game.Players.FirstOrDefault(p => p.UserId == challengedUserId);
            if (challengedPlayer == null)
            {
                return (false, "Challenged player not found.");
            }

            // Check if challenged player has the required role to perform the action
            bool hasRole = pendingAction.ActionType switch
            {
                "steal" => challengedPlayer.Hand.Any(c => c.Role == "Captain" || c.Role == "Ambassador"),
                "assassinate" => challengedPlayer.Hand.Any(c => c.Role == "Assassin"),
                _ => false,
            };

            if (hasRole)
            {
                // Successful challenge
                // Challenged player reveals the required role
                // Remove one influence from challenged player
                var requiredRoles = pendingAction.ActionType switch
                {
                    "steal" => new[] { "Captain", "Ambassador" },
                    "assassinate" => new[] { "Assassin" },
                    _ => Array.Empty<string>()
                };

                var revealedCard = challengedPlayer.Hand.FirstOrDefault(c => requiredRoles.Contains(c.Role));

                if (revealedCard != null)
                {
                    challengedPlayer.Hand.Remove(revealedCard);
                    challengedPlayer.Influences -= 1;
                    if (challengedPlayer.Influences <= 0)
                    {
                        challengedPlayer.IsActive = false;
                        await _hubContext.Clients.Group(gameId).SendAsync("PlayerEliminated", challengedUserId);
                    }

                    // Notify all players about the successful challenge
                    await _hubContext.Clients.Group(gameId).SendAsync("ChallengeSucceeded", challengerId, challengedUserId);

                    // Initiator of the action loses one influence
                    var initiator = game.Players.FirstOrDefault(p => p.UserId == pendingAction.InitiatorId);
                    if (initiator != null)
                    {
                        initiator.Influences -= 1;
                        if (initiator.Influences <= 0)
                        {
                            initiator.IsActive = false;
                            await _hubContext.Clients.Group(gameId).SendAsync("PlayerEliminated", initiator.UserId);
                        }
                    }

                    pendingAction.IsActionResolved = true;
                    PendingActions.TryRemove(gameId, out _);
                    await _gameRepository.UpdateGameAsync(game);
                    return (true, "Challenge successful.");
                }
                else
                {
                    return (false, "Challenged player does not have the required role.");
                }
            }
            else
            {
                // Failed challenge
                // Challenger loses one influence
                var challenger = game.Players.FirstOrDefault(p => p.UserId == challengerId);
                if (challenger != null)
                {
                    challenger.Influences -= 1;
                    if (challenger.Influences <= 0)
                    {
                        challenger.IsActive = false;
                        await _hubContext.Clients.Group(gameId).SendAsync("PlayerEliminated", challenger.UserId);
                    }
                }

                // Action is now considered invalid
                pendingAction.IsActionResolved = true;
                PendingActions.TryRemove(gameId, out _);
                await _gameRepository.UpdateGameAsync(game);

                // Notify all players about the failed challenge
                await _hubContext.Clients.Group(gameId).SendAsync("ChallengeFailed", challengerId, challengedUserId);
                return (false, "Challenge failed.");
            }
        }

        public async Task<(bool IsSuccess, string Message)> BlockAction(string gameId, string blockerId, string blockedUserId, string action)
        {
            if (!PendingActions.TryGetValue(gameId, out var pendingAction))
            {
                return (false, "No action available to block.");
            }

            if (pendingAction.IsActionResolved)
            {
                return (false, "Action has already been resolved.");
            }

            var game = await _gameRepository.GetGameByIdAsync(gameId);
            if (game == null)
            {
                return (false, "Game not found.");
            }

            // Verify that the blocker has the required role to block the action
            bool canBlock = action.ToLower() switch
            {
                "foreign_aid" => game.Players.FirstOrDefault(p => p.UserId == blockerId)?.Hand.Any(c => c.Role == "Duke") ?? false,
                "steal" => game.Players.FirstOrDefault(p => p.UserId == blockerId)?.Hand.Any(c => c.Role == "Captain" || c.Role == "Ambassador") ?? false,
                "assassinate" => game.Players.FirstOrDefault(p => p.UserId == blockerId)?.Hand.Any(c => c.Role == "Contessa") ?? false,
                _ => false,
            };

            if (canBlock)
            {
                // Action is blocked
                pendingAction.IsActionResolved = true;
                PendingActions.TryRemove(gameId, out _);
                // Revert any temporary changes made during the action
                // For simplicity, assuming no temporary changes were made
                await _hubContext.Clients.Group(gameId).SendAsync("ActionBlocked", blockerId, blockedUserId, action);
                return (true, "Action successfully blocked.");
            }
            else
            {
                return (false, "Block unsuccessful. You do not have the required role.");
            }
        }

        private bool IsRoomCode(string input)
        {
            return input.Length == 4 && input.All(char.IsLetter);
        }

        public Task AddUserConnection(string userId, string connectionId)
        {
            UserConnections.AddOrUpdate(userId, connectionId, (key, oldValue) => connectionId);
            return Task.CompletedTask;
        }

        public Task RemoveUserConnection(string userId, string connectionId)
        {
            UserConnections.TryRemove(userId, out _);
            // Optionally, handle disconnection logic
            return Task.CompletedTask;
        }

        public async Task<(bool IsSuccess, string Message)> ReconnectToGame(string gameId, string userId, string? newConnectionId)
        {
            var game = await _gameRepository.GetGameByIdAsync(gameId);
            if (game == null)
                return (false, "Game not found.");

            var player = game.Players.FirstOrDefault(p => p.UserId == userId);
            if (player != null && !player.IsActive)
            {
                var timeoutKey = $"{gameId}_{userId}";
                if (PendingDisconnections.TryRemove(timeoutKey, out var cts))
                {
                    // Cancel the pending disconnection timeout
                    cts.Cancel();
                    cts.Dispose();

                    // Restore player status
                    player.IsActive = true;
                    await _gameRepository.UpdateGameAsync(game);

                    if (!string.IsNullOrEmpty(newConnectionId))
                    {
                        // Update connection ID
                        await AddUserConnection(userId, newConnectionId);
                    }

                    // Notify others
                    await _hubContext.Clients.Group(gameId).SendAsync("PlayerReconnected", userId);

                    return (true, "Reconnected successfully.");
                }
            }

            return (false, "No pending reconnection found or game is already over.");
        }

        /// <summary>
        /// Creates a new game.
        /// </summary>
        /// <param name="userId">ID of the user creating the game.</param>
        /// <param name="request">Details of the game to be created.</param>
        /// <returns>The created game.</returns>
        public async Task<Game> CreateGame(string userId, CreateGameRequest request)
        {
            var game = new Game
            {
                Id = ObjectId.GenerateNewId().ToString(),
                RoomCode = GenerateRoomCode(),
                IsPrivate = request.IsPrivate,
                GameName = request.GameName,
                PlayerCount = request.PlayerCount,
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
                Spectators = new List<Spectator>()
            };

            await _gameRepository.CreateGameAsync(game);
            await _hubContext.Clients.User(userId).SendAsync("GameCreated", game);
            return game;
        }

        /// <summary>
        /// Retrieves the current state of the game for a user.
        /// </summary>
        /// <param name="gameId">ID of the game.</param>
        /// <param name="userId">ID of the user requesting the state.</param>
        /// <returns>The current game state.</returns>
        public async Task<Game> GetGameState(string gameId, string userId)
        {
            var game = await _gameRepository.GetGameByIdAsync(gameId);
            if (game == null)
                throw new KeyNotFoundException("Game not found.");

            // Optionally, filter sensitive information based on user role
            return game;
        }

        // **Helper Method to Generate Room Code**
        private string GenerateRoomCode()
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            return new string(Enumerable.Repeat(chars, 4)
              .Select(s => s[random.Next(s.Length)]).ToArray());
        }

        /// <summary>
        /// Retrieves all public games (rooms).
        /// </summary>
        public async Task<IEnumerable<Game>> GetPublicGamesAsync()
        {
            return await _gameRepository.GetPublicGamesAsync();
        }

        /// <summary>
        /// Searches games based on a query string.
        /// </summary>
        /// <param name="query">The search term.</param>
        public async Task<IEnumerable<Game>> SearchGamesAsync(string query)
        {
            return await _gameRepository.SearchGamesAsync(query);
        }

        // Schedule game deletion after 3 minutes
        public void ScheduleGameDeletion(string gameId)
        {
            // Avoid scheduling multiple deletions for the same game
            if (PendingDeletions.ContainsKey(gameId))
                return;

            var cts = new CancellationTokenSource();
            if (PendingDeletions.TryAdd(gameId, cts))
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        Console.WriteLine($"Deleting game {gameId} after 1 minute");
                        await Task.Delay(TimeSpan.FromMinutes(1), cts.Token);
                        // After delay, check if the game still has no active players
                        var game = await _gameRepository.GetGameByIdAsync(gameId);
                        if (game != null && game.Players.All(p => !p.IsActive))
                        {
                            await _gameRepository.DeleteGameAsync(gameId);
                            // Optionally, notify administrators or log the deletion
                        }
                        // Remove from pending deletions
                        PendingDeletions.TryRemove(gameId, out _);
                    }
                    catch (TaskCanceledException)
                    {
                        // Deletion was canceled
                        PendingDeletions.TryRemove(gameId, out _);
                    }
                });
            }
        }

        // Cancel scheduled game deletion
        public void CancelScheduledDeletion(string gameId)
        {
            if (PendingDeletions.TryRemove(gameId, out var cts))
            {
                cts.Cancel();
                cts.Dispose();
            }
        }

        public async Task<(bool IsSuccess, string Message)> HandleDisconnection(string gameId, string userId)
        {
            var game = await _gameRepository.GetGameByIdAsync(gameId);
            if (game == null)
            {
                return (false, "Game not found.");
            }

            var player = game.Players.FirstOrDefault(p => p.UserId == userId);
            if (player != null)
            {
                // Mark player as inactive
                player.IsActive = false;
                await _gameRepository.UpdateGameAsync(game);

                // Notify other players
                await _hubContext.Clients.Group(gameId).SendAsync("PlayerDisconnected", userId);

                // Start a 20-second timeout for reconnection
                Console.WriteLine($"Starting reconnection timeout for {gameId} with user {userId}");
                var timeoutKey = $"{gameId}_{userId}";
                if (!PendingDisconnections.ContainsKey(timeoutKey))
                {
                    var cts = new CancellationTokenSource();
                    if (PendingDisconnections.TryAdd(timeoutKey, cts))
                    {
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                await Task.Delay(TimeSpan.FromSeconds(20), cts.Token);
                                // After timeout, move player to spectators
                                var updatedGame = await _gameRepository.GetGameByIdAsync(gameId);
                                var disconnectedPlayer = updatedGame.Players.FirstOrDefault(p => p.UserId == userId);
                                if (disconnectedPlayer != null && !disconnectedPlayer.IsActive)
                                {
                                    // Remove from players
                                    updatedGame.Players.Remove(disconnectedPlayer);

                                    // Add to spectators
                                    updatedGame.Spectators.Add(new Spectator { UserId = userId });

                                    // Notify others
                                    await _hubContext.Clients.Group(gameId).SendAsync("PlayerMovedToSpectator", userId);

                                    // Check if the game is over
                                    CheckGameOver(updatedGame);

                                    await _gameRepository.UpdateGameAsync(updatedGame);
                                }

                                // Remove the timeout
                                PendingDisconnections.TryRemove(timeoutKey, out _);
                            }
                            catch (TaskCanceledException)
                            {
                                // Reconnection occurred, do nothing
                                PendingDisconnections.TryRemove(timeoutKey, out _);
                            }
                        });
                    }
                }
            }

            // Check if all players are inactive
            if ((game.Players.All(p => !p.IsActive) || game.Players.Count == 0) && game.Spectators.Count == 0)
            {
                ScheduleGameDeletion(gameId);
            }

            return (true, "Player marked as inactive. You have 20 seconds to reconnect.");
        }

        private void CheckGameOver(Game game)
        {
            var activePlayers = game.Players.Count(p => p.IsActive);
            if (activePlayers <= 1)
            {
                game.IsGameOver = true;
                _gameRepository.UpdateGameAsync(game);

                // Notify all clients about game over
                _hubContext.Clients.Group(game.Id).SendAsync("GameOver", activePlayers == 1 
                    ? game.Players.FirstOrDefault(p => p.IsActive)?.UserId 
                    : "No active players");

                // Optionally, perform additional cleanup or logging here
            }
        }

        public async Task<Game> JoinGame(string userId, string gameIdOrCode)
        {
            var game = await _gameRepository.GetGameByIdOrCodeAsync(gameIdOrCode);
            if (game == null)
                throw new KeyNotFoundException("Game not found.");

            // Cancel any pending deletion if a player is joining
            CancelScheduledDeletion(game.Id);

            // Check if the user is already a player
            var existingPlayer = game.Players.FirstOrDefault(p => p.UserId == userId);
            if (existingPlayer != null)
            {
                // User is already a player; add as spectator
                var existingSpectator = game.Spectators.FirstOrDefault(s => s.UserId == userId);
                if (existingSpectator == null)
                {
                    game.Spectators.Add(new Spectator { UserId = userId });
                    await _gameRepository.UpdateGameAsync(game);
                    await _hubContext.Clients.Group(game.Id).SendAsync("PlayerJoinedAsSpectator", userId);
                }
                return game;
            }

            // Check if the user is already a spectator
            var existingSpectatorInGame = game.Spectators.FirstOrDefault(s => s.UserId == userId);
            if (existingSpectatorInGame != null)
            {
                // Already a spectator; no action needed
                return game;
            }

            if (game.Players.Count >= game.PlayerCount)
            {
                // Game is full; add as spectator
                game.Spectators.Add(new Spectator { UserId = userId });
                await _gameRepository.UpdateGameAsync(game);
                await _hubContext.Clients.Group(game.Id).SendAsync("PlayerJoinedAsSpectator", userId);
                return game;
            }
            else
            {
                // Add as a new player
                var newPlayer = new Player
                {
                    UserId = userId,
                    Coins = 2,
                    Influences = 2,
                    IsActive = true
                };
                game.Players.Add(newPlayer);
                await _gameRepository.UpdateGameAsync(game);
                await _hubContext.Clients.Group(game.Id).SendAsync("PlayerJoined", userId);
                return game;
            }
        }

        public async Task<(bool IsSuccess, string Message, string GameId)> JoinGameInProgress(string userId, string gameIdOrCode)
        {
            Game? game = null;
            if (IsRoomCode(gameIdOrCode))
            {
                game = await _gameRepository.GetGameByRoomCodeAsync(gameIdOrCode);
            }
            else
            {
                game = await _gameRepository.GetGameByIdAsync(gameIdOrCode);
            }

            if (game == null)
            {
                return (false, "Game not found.", string.Empty);
            }

            if (game.IsGameOver)
            {
                return (false, "Game is already over.", string.Empty);
            }

            // Allow joining only as spectator if the game is in progress
            var existingSpectator = game.Spectators.FirstOrDefault(s => s.UserId == userId);
            if (existingSpectator != null)
            {
                return (false, "You are already a spectator in this game.", game.Id);
            }

            game.Spectators.Add(new Spectator { UserId = userId });
            await _gameRepository.UpdateGameAsync(game);
            await _hubContext.Clients.Group(game.Id).SendAsync("SpectatorJoined", userId);

            return (true, "Joined as a spectator. Waiting for the game to finish.", game.Id);
        }
    }
}
