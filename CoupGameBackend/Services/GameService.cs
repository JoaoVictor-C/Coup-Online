using CoupGameBackend.Models;
using CoupGameBackend.Hubs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using System.Collections.Concurrent;
using MongoDB.Bson;
using System.Threading.Tasks;
using System.Linq;
using Newtonsoft.Json;

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


        /// <summary>
        /// Initializes the deck with 3 copies of each role.
        /// </summary>
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

            ShuffleDeck(deck);
            return deck;
        }

        /// <summary>
        /// Shuffles the deck using the Fisher-Yates algorithm.
        /// </summary>
        private void ShuffleDeck(List<Card> deck)
        {
            int n = deck.Count;
            for (int i = 0; i < n; i++)
            {
                int j = random.Next(i, n);
                var temp = deck[i];
                deck[i] = deck[j];
                deck[j] = temp;
            }
        }

        // Start of Selection
        // Start of Selection
        public async Task<IActionResult> PerformAction(string gameId, string userId, string action, ActionParameters parameters)
        {
            var game = await GetGameAsync(gameId);
            if (game == null)
                return new NotFoundObjectResult(new { message = "Game not found." });

            var player = game.Players.FirstOrDefault(p => p.UserId == userId);
            if (player == null || !player.IsActive)
                return new UnauthorizedResult();
            Console.WriteLine($"Performing action: {action}");
            // Implement action handling with strong typing
            switch (action.ToLower())
            {
                case "income":
                    player.Coins += 1;

                    // Log the action
                    var actionLogIncome = new ActionLog
                    {
                        Timestamp = DateTime.UtcNow,
                        PlayerId = userId,
                        Action = "Income"
                    };
                    game.ActionsHistory.Add(actionLogIncome);

                    // Update turn and game state
                    UpdateTurn(game);
                    await _gameRepository.UpdateGameAsync(game);
                    await _hubContext.Clients.Group(game.Id).SendAsync("ActionPerformed", new { userId, action, parameters });
                    return new OkResult();

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
                        try
                        {
                            await Task.Delay(TimeSpan.FromSeconds(15), pendingForeignAid.CancellationToken); // Use CancellationToken if available
                            if (!pendingForeignAid.IsActionResolved)
                            {
                                // No block or challenge, execute the action
                                player.Coins += 2;

                                // Log the action
                                var actionLogForeignAid = new ActionLog
                                {
                                    Timestamp = DateTime.UtcNow,
                                    PlayerId = userId,
                                    Action = "Foreign Aid"
                                };
                                game.ActionsHistory.Add(actionLogForeignAid);

                                pendingForeignAid.IsActionResolved = true;
                                PendingActions.TryRemove(gameId, out _);
                                await _hubContext.Clients.Group(gameId).SendAsync("ForeignAidTaken", userId);

                                // Update turn and game state
                                UpdateTurn(game);
                                await _gameRepository.UpdateGameAsync(game);
                                await _hubContext.Clients.Group(game.Id).SendAsync("ActionPerformed", new { userId, action, parameters });
                            }
                        }
                        catch (TaskCanceledException)
                        {
                            // Handle the task cancellation if needed
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

                            // Log the action
                            var actionLogCoup = new ActionLog
                            {
                                Timestamp = DateTime.UtcNow,
                                PlayerId = userId,
                                Action = $"Coup on {coupParams.TargetUserId}"
                            };
                            game.ActionsHistory.Add(actionLogCoup);
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

                    // Update turn and game state after coup
                    UpdateTurn(game);
                    await _gameRepository.UpdateGameAsync(game);
                    await _hubContext.Clients.Group(game.Id).SendAsync("ActionPerformed", new { userId, action, parameters });
                    return new OkResult();

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
                            try
                            {
                                await Task.Delay(TimeSpan.FromSeconds(15), pendingSteal.CancellationToken); // Use CancellationToken if available
                                if (!pendingSteal.IsActionResolved)
                                {
                                    // No block or challenge, execute the action
                                    player.Coins += 2;
                                    targetStealPlayer.Coins -= 2;

                                    // Log the action
                                    var actionLogSteal = new ActionLog
                                    {
                                        Timestamp = DateTime.UtcNow,
                                        PlayerId = userId,
                                        Action = $"Steal from {stealParams.TargetUserId}"
                                    };
                                    game.ActionsHistory.Add(actionLogSteal);

                                    pendingSteal.IsActionResolved = true;
                                    PendingActions.TryRemove(gameId, out _);
                                    await _hubContext.Clients.Group(gameId).SendAsync("StealExecuted", userId, stealParams.TargetUserId);

                                    // Update turn and game state
                                    UpdateTurn(game);
                                    await _gameRepository.UpdateGameAsync(game);
                                    await _hubContext.Clients.Group(game.Id).SendAsync("ActionPerformed", new { userId, action, parameters });
                                }
                            }
                            catch (TaskCanceledException)
                            {
                                // Handle the task cancellation if needed
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
                            try
                            {
                                await Task.Delay(TimeSpan.FromSeconds(15), pendingAssassinate.CancellationToken); // Use CancellationToken if available
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

                                        // Log the action
                                        var actionLogAssassinate = new ActionLog
                                        {
                                            Timestamp = DateTime.UtcNow,
                                            PlayerId = userId,
                                            Action = $"Assassinate on {assassinateParams.TargetUserId}"
                                        };
                                        game.ActionsHistory.Add(actionLogAssassinate);
                                    }
                                    pendingAssassinate.IsActionResolved = true;
                                    PendingActions.TryRemove(gameId, out _);
                                    await _hubContext.Clients.Group(game.Id).SendAsync("AssassinateExecuted", userId, assassinateParams.TargetUserId);

                                    // Update turn and game state
                                    UpdateTurn(game);
                                    await _gameRepository.UpdateGameAsync(game);
                                    await _hubContext.Clients.Group(game.Id).SendAsync("ActionPerformed", new { userId, action, parameters });
                                }
                            }
                            catch (TaskCanceledException)
                            {
                                // Handle the task cancellation if needed
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
        }

        private void UpdateTurn(Game game)
        {
            var activePlayers = game.Players.Where(p => p.IsActive).ToList();
            if (!activePlayers.Any())
                return;

            var currentIndex = activePlayers.FindIndex(p => p.UserId == game.CurrentTurnUserId);
            var nextIndex = (currentIndex + 1) % activePlayers.Count;
            game.CurrentTurnUserId = activePlayers[nextIndex].UserId;
            Console.WriteLine($"Updated turn to: {game.CurrentTurnUserId}");
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
            var game = await GetGameAsync(gameId);
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

            var game = await GetGameAsync(gameId);
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
            var game = await GetGameAsync(gameId);
            if (game == null)
                return (false, "Game not found.");

            var player = game.Players.FirstOrDefault(p => p.UserId == userId);
            if (player == null)
                return (false, "Player not found in the game.");

            if (player.IsActive)
                return (false, "Player is already connected.");

            var timeoutKey = $"{game.Id}_{userId}";
            if (PendingDisconnections.TryRemove(timeoutKey, out var cts))
            {
                // Cancel the pending disconnection timeout
                cts.Cancel();
                cts.Dispose();

                // Restore player status
                player.IsActive = true;

                // Update the connection ID if provided
                if (!string.IsNullOrEmpty(newConnectionId))
                {
                    await AddUserConnection(userId, newConnectionId);
                }

                // Notify others about the reconnection
                await _hubContext.Clients.Group(gameId).SendAsync("PlayerReconnected", userId);

                // Update the game state in the repository
                await _gameRepository.UpdateGameAsync(game);

                return (true, "Reconnected successfully.");
            }

            return (false, "No pending reconnection found or reconnection window has expired.");
        }

        /// <summary>
        /// Creates a new game.
        /// </summary>
        /// <param name="userId">ID of the user creating the game.</param>
        /// <param name="request">Details of the game to be created.</param>
        /// <returns>The created game.</returns>
        /// <summary>
        /// Creates a new game with initialized deck and dealt hands.
        /// </summary>
        public async Task<Game> CreateGame(string userId, CreateGameRequest request)
        {
            var game = new Game
            {
                GameName = request.GameName,
                PlayerCount = request.PlayerCount,
                IsPrivate = request.IsPrivate,
                CreatedBy = userId,
                LeaderId = userId,
                RoomCode = GenerateRoomCode()
            };

            // Add the creator as the first player
            var player = new Player
            {
                Username = await GetUsernameAsync(userId),
                UserId = userId,
                Coins = 2,
                Influences = 2,
                IsActive = true
            };
            game.Players.Add(player);

            // Initialize and shuffle the deck
            game.CentralDeck = InitializeDeck();
            ShuffleDeck(game.CentralDeck);

            await _gameRepository.CreateGameAsync(game);

            // Notify clients if necessary
            await _hubContext.Clients.All.SendAsync("GameCreated", new { gameId = game.Id });

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
            var game = await GetGameAsync(gameId) ?? throw new KeyNotFoundException("Game not found.");

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
                Players = game.Players.Select(p => new Player
                {
                    Username = p.Username,
                    UserId = p.UserId,
                    Coins = p.Coins,
                    Influences = p.Influences,
                    IsActive = p.IsActive,
                    Hand = p.UserId == userId ? p.Hand : p.Hand.Select(_ => new Card { Name = "Hidden", Role = "Hidden", IsRevealed = false }).ToList() // Return hidden cards for other players
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

        // Generates a function that will get each user connected, and emit the game updated relative to each user
        public async Task EmitGameUpdatesToUsers(string gameId)
        {
            var game = await GetGameAsync(gameId);
            if (game == null)
                return;

            foreach (var player in game.Players)
            {
                var state = await GetGameState(game.Id, player.UserId);
                await _hubContext.Clients.User(player.UserId).SendAsync("GameState", state);
            }
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
                        await Task.Delay(TimeSpan.FromMinutes(1), cts.Token);
                        // After delay, check if the game still has no active players
                        var game = await GetGameAsync(gameId);
                        if (game != null && game.Players.All(p => !p.IsActive))
                        {
                            Console.WriteLine($"Game {gameId} has no active players. Deleting game.");
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
            var game = await GetGameAsync(gameId);
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

                var timeoutKey = $"{gameId}_{userId}";
                var cts = new CancellationTokenSource();
                if (PendingDisconnections.TryAdd(timeoutKey, cts))
                {
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            await Task.Delay(TimeSpan.FromSeconds(20), cts.Token);
                            // After timeout, kick the player
                            var updatedGame = await _gameRepository.GetGameByIdAsync(gameId);
                            var disconnectedPlayer = updatedGame.Players.FirstOrDefault(p => p.UserId == userId);
                            if (disconnectedPlayer != null && !disconnectedPlayer.IsActive)
                            {
                                // Remove player from the game
                                updatedGame.Players.Remove(disconnectedPlayer);

                                // Notify other players about the player being kicked
                                await _hubContext.Clients.Group(gameId).SendAsync("PlayerKicked", userId);

                                // If the player was the leader, assign a new leader
                                if (updatedGame.LeaderId == userId)
                                {
                                    if (updatedGame.Players.Count > 0)
                                    {
                                        updatedGame.LeaderId = updatedGame.Players.First().UserId;
                                        await _hubContext.Clients.Group(gameId).SendAsync("LeaderChanged", updatedGame.LeaderId);
                                    }
                                    else
                                    {
                                        // No players left, schedule game deletion
                                        ScheduleGameDeletion(gameId);
                                        return;
                                    }
                                }

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

            // Check if all players are inactive
            if ((game.Players.All(p => !p.IsActive) || game.Players.Count == 0) && game.Spectators.Count == 0)
            {
                ScheduleGameDeletion(gameId);
            }

            return (true, "Player marked as inactive. You have 20 seconds to reconnect.");
        }

        private void CheckGameOver(Game game)
        {
            if (!game.IsStarted && !game.IsGameOver)
            {
                return;
            }
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
            var game = await GetGameAsync(gameIdOrCode);
            if (game == null)
                throw new KeyNotFoundException("Game not found.");

            var existingSpectator = game.Spectators.FirstOrDefault(s => s.UserId == userId);
            if (existingSpectator != null)
            {
                return game;
            }

            // Cancel any pending deletion if a player is joining
            CancelScheduledDeletion(game.Id);

            // Check if the user is already a player
            var existingPlayer = game.Players.FirstOrDefault(p => p.UserId == userId);
            if (existingPlayer != null)
            {
                // User is already a player; handle accordingly
                return game;
            }

            if (game.Players.Count >= game.PlayerCount)
            {
                // Game is full; add as spectator
                game.Spectators.Add(new Spectator { UserId = userId });
                await _gameRepository.UpdateGameAsync(game);
                await _hubContext.Clients.Group(game.Id).SendAsync("SpectatorJoined", userId);
                return game;
            }
            else
            {
                // Add as a new player
                var newPlayer = new Player
                {
                    Username = await GetUsernameAsync(userId),
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
            var game = await GetGameAsync(gameIdOrCode);

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

        /// <summary>
        /// Starts the game if the requester is the leader.
        /// Deals cards to players.
        /// </summary>
        public async Task<(bool IsSuccess, string Message)> StartGameAsync(string gameId, string userId)
        {
            var game = await GetGameAsync(gameId);
            if (game == null)
                return (false, "Game not found.");

            if (game.LeaderId != userId)
                return (false, "Only the game leader can start the game.");

            if (game.IsStarted)
                return (false, "Game has already started.");

            // Initialize game state
            game.IsStarted = true;
            game.IsGameOver = false;
            game.CurrentTurnUserId = game.Players.First().UserId;
            game.CentralDeck = InitializeDeck();
            // Deal cards to players
            foreach (var player in game.Players)
            {
                DealCardsToPlayer(game, player, 2);
            }

            // Save the updated game state
            await _gameRepository.UpdateGameAsync(game);

            // Emit game started event
            await EmitGameUpdatesToUsers(game.Id);

            return (true, "Game started successfully.");
        }

        public async Task<(bool IsSuccess, string Message)> RestartGameAsync(string gameId, string userId)
        {
            var game = await GetGameAsync(gameId);
            if (game == null)
                return (false, "Game not found.");

            if (game.LeaderId != userId)
                return (false, "Only the game leader can restart the game.");

            Console.WriteLine($"[RestartGameAsync] Restarting Game {gameId} by User {userId}.");

            // Reset game state
            game.IsStarted = false;
            game.IsGameOver = false;
            game.CentralDeck.Clear();
            game.Players.Clear();
            game.Spectators.Clear();
            game.ActionsHistory.Clear();
            Console.WriteLine($"[RestartGameAsync] Game {gameId} state reset.");

            await _gameRepository.RestartGameAsync(gameId);
            Console.WriteLine($"[RestartGameAsync] Game {gameId} restarted in repository.");

            // Start the game again
            var (isSuccess, message) = await StartGameAsync(gameId, userId);
            if (!isSuccess)
                return (false, $"Failed to start the game after restart: {message}");

            Console.WriteLine($"[RestartGameAsync] Game {gameId} restarted successfully.");

            return (true, "Game restarted successfully.");
        }

        /// <summary>
        /// Deals a specified number of cards to a player from the central deck.
        /// </summary>
        private void DealCardsToPlayer(Game game, Player player, int numberOfCards)
        {
            if (game.CentralDeck.Count < numberOfCards)
                throw new InvalidOperationException("Not enough cards in the central deck.");

            for (int i = 0; i < numberOfCards; i++)
            {
                var card = game.CentralDeck.First();
                game.CentralDeck.RemoveAt(0);
                player.Hand.Add(card);
            }
        }

        /// <summary>
        /// Retrieves a game by room code or game ID.
        /// </summary>
        /// <param name="idOrCode">The room code or game ID.</param>
        /// <returns>The corresponding game if found; otherwise, null.</returns>
        public async Task<Game?> GetGameAsync(string idOrCode)
        {
            if (IsRoomCode(idOrCode))
            {
                return await _gameRepository.GetGameByRoomCodeAsync(idOrCode);
            }
            else
            {
                return await _gameRepository.GetGameByIdAsync(idOrCode);
            }
        }

        /// <summary>
        /// Allows a user to switch to spectator mode.
        /// </summary>
        public async Task<(bool IsSuccess, string Message)> SwitchToSpectatorAsync(string gameId, string userId)
        {
            var game = await GetGameAsync(gameId);
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
                Username = await GetUsernameAsync(userId)
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

            await EmitGameUpdatesToUsers(gameId);

            return (true, "Successfully switched to spectator mode.");
        }

        /// <summary>
        /// Allows a spectator to rejoin as a player after the game has ended or if the game hasn't started yet.
        /// </summary>
        public async Task<(bool IsSuccess, string Message)> RejoinAsPlayerAsync(string gameId, string userId)
        {
            var game = await GetGameAsync(gameId);
            if (game == null)
                return (false, "Game not found.");

            if (game.IsStarted && !game.IsGameOver)
                return (false, "Cannot rejoin as a player while the game is in progress.");

            var spectator = game.Spectators.FirstOrDefault(s => s.UserId == userId);
            if (spectator == null)
                return (false, "Spectator not found.");

            if (game.Players.Any(p => p.UserId == userId))
                return (false, "User is already a player in the game.");

            // Remove from spectators
            game.Spectators.Remove(spectator);

            // Add back to active players
            var player = new Player
            {
                UserId = userId,
                Username = await GetUsernameAsync(userId),
                Coins = game.IsStarted ? 0 : 2, // Start with 0 coins if game is in progress
                Influences = game.IsStarted ? 0 : 2, // Start with 0 influences if game is in progress
                IsActive = true,
                Hand = new List<Card>()
            };
            game.Players.Add(player);

            // If the game is in progress, deal cards to the player
            if (game.IsStarted)
            {
                DealCardsToPlayer(game, player, 2);
            }

            // Log the action
            game.ActionsHistory.Add(new ActionLog
            {
                Timestamp = DateTime.UtcNow,
                PlayerId = userId,
                Action = "Rejoined as Player"
            });

            // Update the game state
            await _gameRepository.UpdateGameAsync(game);

            // Notify clients
            await EmitGameUpdatesToUsers(gameId);

            return (true, "Successfully rejoined the game as a player.");
        }

        /// <summary>
        /// Helper method to retrieve username by userId.
        /// </summary>
        private async Task<string> GetUsernameAsync(string userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            return user?.Username ?? "Unknown";
        }

        public async Task<(bool IsSuccess, string Message)> LeaveGameAsync(string gameId, string userId)
        {
            var game = await GetGameAsync(gameId);
            if (game == null)
            {
                return (false, "Game not found.");
            }

            var player = game.Players.FirstOrDefault(p => p.UserId == userId);
            if (player == null)
            {
                return (false, "Player not found in the game.");
            }

            // Remove player from the game
            game.Players.Remove(player);

            // Notify other players about the player leaving
            await _hubContext.Clients.Group(gameId).SendAsync("PlayerKicked", userId);

            // If the player was the leader, assign a new leader
            if (game.LeaderId == userId)
            {
                if (game.Players.Count > 0)
                {
                    game.LeaderId = game.Players.First().UserId;
                    await _hubContext.Clients.Group(gameId).SendAsync("LeaderChanged", game.LeaderId);
                }
                else
                {
                    // No players left, schedule game deletion
                    ScheduleGameDeletion(gameId);
                }
            }


            CheckGameOver(game);
            // Update the game state in the repository
            await _gameRepository.UpdateGameAsync(game);

            return (true, "Successfully left the game.");
        }

        public async Task<string> GetGameIdAsync(string gameIdOrCode)
        {
            var game = await GetGameAsync(gameIdOrCode);
            return game?.Id ?? string.Empty;
        }
    }

    // Helper Result class for operation outcomes
    public class Result
    {
        public bool IsSuccess { get; set; }
        public string Message { get; set; } = string.Empty;

        public static Result Success(string message) => new Result { IsSuccess = true, Message = message };
        public static Result Failure(string message) => new Result { IsSuccess = false, Message = message };
    }
}