using CoupGameBackend.Services;
using CoupGameBackend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;

namespace CoupGameBackend.Hubs
{
    [Authorize]
    public class GameHub : Hub
    {
        private readonly IGameService _gameService;
        private readonly IGameRepository _gameRepository;
        private readonly IConnectionService _connectionService;
        private readonly IGameStateService _gameStateService;
        private readonly IChallengeService _challengeService;
        private readonly IActionService _actionService;
        private readonly ITurnService _turnService;
        private readonly ISchedulingService _schedulingService;
        private readonly ILogger<GameHub> _logger;

        public GameHub(
            IGameService gameService,
            IGameRepository gameRepository,
            IConnectionService connectionService,
            IChallengeService challengeService,
            IActionService actionService,
            ITurnService turnService,
            IGameStateService gameStateService,
            ISchedulingService schedulingService,
            ILogger<GameHub> logger)
        {
            _gameService = gameService;
            _gameRepository = gameRepository;
            _connectionService = connectionService;
            _challengeService = challengeService;
            _actionService = actionService;
            _turnService = turnService;
            _gameStateService = gameStateService;
            _schedulingService = schedulingService;
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = GetUserId();
            var connectionId = Context.ConnectionId;

            if (!string.IsNullOrEmpty(userId))
            {
                await _connectionService.AddUserConnection(userId, connectionId);
                await Clients.Caller.SendAsync("Connected", "Successfully connected to the game server.");

                var gameId = await _gameRepository.GetGameIdForUser(userId);
                if (!string.IsNullOrEmpty(gameId))
                {
                    await Groups.AddToGroupAsync(connectionId, gameId);
                    await _gameStateService.EmitGameUpdatesToUsers(gameId);
                }
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                await Clients.Caller.SendAsync("Disconnected", "User ID is missing.");
                return;
            }

            try
            {
                var gameId = await _gameRepository.GetGameIdForUser(userId);
                if (!string.IsNullOrEmpty(gameId))
                {
                    await _connectionService.HandleDisconnection(gameId, userId);
                    await _gameStateService.EmitGameUpdatesToUsers(gameId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during disconnection for user {UserId}", userId);
            }

            await base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// Allows a user to perform a game action.
        /// </summary>
        public async Task PerformAction(string gameIdOrCode, string action, string? targetId)
        {
            var userId = GetUserId();
            if (!ValidateUser(userId, "PerformAction")) return;

            var game = await GetGameAsync(gameIdOrCode, "PerformAction");
            if (game == null) return;

            try
            {
                var result = await _actionService.PerformAction(game.Id, userId, action, targetId);
                if (result is OkResult)
                {
                    await _gameStateService.CheckGameOver(game);
                    var actionLog = new ActionLog
                    {
                        Timestamp = DateTime.UtcNow,
                        PlayerId = userId,
                        Action = action,
                        TargetId = targetId
                    };
                    await Clients.Group(game.Id).SendAsync("ActionPerformed", actionLog);

                    if (_gameService.HasPendingAction(game.Id))
                    {
                        var pendingAction = _gameService.GetPendingAction(game.Id);
                        if (pendingAction != null)
                        {
                            await Clients.Group(game.Id).SendAsync("PendingAction", pendingAction);
                        }
                    }
                }
                else
                {
                    await HandleActionResult(result, "PerformAction");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in PerformAction for user {UserId}", userId);
                await Clients.Caller.SendAsync("ActionFailed", "An error occurred while performing the action.");
            }
        }

        /// <summary>
        /// Handles player reconnection.
        /// </summary>
        public async Task Reconnect(string gameIdOrCode)
        {
            var userId = GetUserId();
            if (!ValidateUser(userId, "Reconnect")) return;

            var game = await GetGameAsync(gameIdOrCode, "Reconnect");
            if (game == null) return;

            try
            {
                var result = await _connectionService.ReconnectToGame(game.Id, userId, Context.ConnectionId);
                if (result.IsSuccess)
                {
                    await Groups.AddToGroupAsync(Context.ConnectionId, game.Id);
                    
                    // Only send updates if the state actually changed (user wasn't already connected)
                    if (!result.Message.Contains("already connected"))
                    {
                        await Clients.Group(game.Id).SendAsync("PlayerReconnected", userId);
                        await _gameStateService.EmitGameUpdatesToUsers(game.Id);
                    }
                    
                    await Clients.Caller.SendAsync("ReconnectSucceeded", "Reconnected to the game successfully.");
                }
                else
                {
                    await Clients.Caller.SendAsync("ReconnectFailed", result.Message);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Reconnect for user {UserId}", userId);
                await Clients.Caller.SendAsync("ReconnectFailed", "An error occurred during reconnection.");
            }
        }

        /// <summary>
        /// Allows a user to join a game that is already in progress.
        /// The user will wait until the current game concludes.
        /// </summary>
        public async Task JoinGameInProgress(string gameIdOrCode)
        {
            var userId = GetUserId();
            if (!ValidateUser(userId, "JoinGameInProgress")) return;

            try
            {
                var joinResult = await _connectionService.JoinGameInProgress(userId, gameIdOrCode);
                if (joinResult.IsSuccess)
                {
                    await Groups.AddToGroupAsync(Context.ConnectionId, joinResult.GameId);
                    await Clients.Group(joinResult.GameId).SendAsync("PlayerJoinedInProgress", userId);
                    await Clients.Caller.SendAsync("JoinGameInProgressSucceeded", "Joined the game in progress. Waiting for the game to finish.");
                }
                else
                {
                    _logger.LogWarning("JoinGameInProgress failed for user {UserId}: {Message}", userId, joinResult.Message);
                    await Clients.Caller.SendAsync("JoinGameFailed", joinResult.Message);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in JoinGameInProgress for user {UserId}", userId);
                await Clients.Caller.SendAsync("JoinGameFailed", "An error occurred while joining the game in progress.");
            }
        }

        /// <summary>
        /// Retrieves the current state of the game for a user.
        /// </summary>
        /// <param name="gameIdOrCode">ID or code of the game.</param>
        /// <returns>The current game state.</returns>
        public async Task GetGameState(string gameIdOrCode)
        {
            var userId = GetUserId();
            if (!ValidateUser(userId, "GetGameState")) return;

            var game = await GetGameAsync(gameIdOrCode, "GetGameState");
            if (game == null) return;

            try
            {
                await _gameStateService.EmitGameUpdatesToUsers(game.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving game state for user {UserId}", userId);
                await Clients.Caller.SendAsync("GetGameStateFailed", "An error occurred while retrieving the game state.");
            }
        }

        /// <summary>
        /// Allows the game leader to start the game.
        /// </summary>
        public async Task StartGame(string gameIdOrCode)
        {
            var userId = GetUserId();
            if (!ValidateUser(userId, "StartGame")) return;

            var game = await GetGameAsync(gameIdOrCode, "StartGame");
            if (game == null) return;

            if (game.Players.Count < 2)
            {
                await Clients.Caller.SendAsync("Error", "Not enough players to start the game.");
                return;
            }

            try
            {
                var result = await _gameService.StartGameAsync(game.Id, userId);
                if (result.IsSuccess)
                {
                    await Clients.Group(game.Id).SendAsync("GameStarted", new { gameId = game.Id });
                }
                else
                {
                    _logger.LogWarning("StartGame failed for game {GameId}: {Message}", game.Id, result.Message);
                    await Clients.Caller.SendAsync("Error", result.Message);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in StartGame for game {GameId}", game.Id);
                await Clients.Caller.SendAsync("Error", "An error occurred while starting the game.");
            }
        }

        /// <summary>
        /// Allows the game leader to restart the game.
        /// </summary>
        public async Task RestartGame(string gameIdOrCode)
        {
            var userId = GetUserId();
            if (!ValidateUser(userId, "RestartGame")) return;

            var game = await GetGameAsync(gameIdOrCode, "RestartGame");
            if (game == null) return;

            try
            {
                var result = await _gameService.RestartGameAsync(game.Id, userId);
                if (result.IsSuccess)
                {
                    await Clients.Group(game.Id).SendAsync("GameRestarted", new { gameId = game.Id });
                }
                else
                {
                    _logger.LogWarning("RestartGame failed for game {GameId}: {Message}", game.Id, result.Message);
                    await Clients.Caller.SendAsync("RestartFailed", result.Message);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in RestartGame for game {GameId}", game.Id);
                await Clients.Caller.SendAsync("RestartFailed", "An error occurred while restarting the game.");
            }
        }

        public async Task ReturnToLobby(string gameIdOrCode)
        {
            var userId = GetUserId();
            if (!ValidateUser(userId, "ReturnToLobby")) return;

            var game = await GetGameAsync(gameIdOrCode, "ReturnToLobby");
            if (game == null) return;

            if (game.LeaderId != userId)
            {
                await Clients.Caller.SendAsync("Error", "Only the game leader can return to the lobby.");
                return;
            }

            try
            {
                await _gameService.ResetGameAsync(game.Id, userId);
                await _gameStateService.EmitGameUpdatesToUsers(game.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ReturnToLobby for game {GameId}", game.Id);
                await Clients.Caller.SendAsync("Error", "An error occurred while returning to the lobby.");
            }
        }

        /// <summary>
        /// Switches the current user to spectator mode.
        /// </summary>
        public async Task SwitchToSpectator(string gameIdOrCode)
        {
            var userId = GetUserId();
            if (!ValidateUser(userId, "SwitchToSpectator")) return;

            var game = await GetGameAsync(gameIdOrCode, "SwitchToSpectator");
            if (game == null) return;

            try
            {
                var result = await _gameService.SwitchToSpectatorAsync(game.Id, userId);
                if (result.IsSuccess)
                {
                    await Clients.Caller.SendAsync("SwitchedToSpectator", result.Message);
                }
                else
                {
                    _logger.LogWarning("SwitchToSpectator failed for user {UserId} in game {GameId}: {Message}", userId, game.Id, result.Message);
                    await Clients.Caller.SendAsync("Error", result.Message);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SwitchToSpectator for user {UserId} in game {GameId}", userId, game.Id);
                await Clients.Caller.SendAsync("Error", "An error occurred while switching to spectator mode.");
            }
        }

        /// <summary>
        /// Allows a spectator to rejoin as a player after the game has ended.
        /// </summary>
        public async Task RejoinAsPlayer(string gameIdOrCode)
        {
            var userId = GetUserId();
            if (!ValidateUser(userId, "RejoinAsPlayer")) return;

            var game = await GetGameAsync(gameIdOrCode, "RejoinAsPlayer");
            if (game == null) return;

            try
            {
                var result = await _connectionService.RejoinAsPlayerAsync(game.Id, userId);
                if (result.IsSuccess)
                {
                    await Clients.Caller.SendAsync("RejoinedAsPlayer", result.Message);
                }
                else
                {
                    _logger.LogWarning("RejoinAsPlayer failed for user {UserId} in game {GameId}: {Message}", userId, game.Id, result.Message);
                    await Clients.Caller.SendAsync("Error", result.Message);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in RejoinAsPlayer for user {UserId} in game {GameId}", userId, game.Id);
                await Clients.Caller.SendAsync("Error", "An error occurred while rejoining as a player.");
            }
        }

        /// <summary>
        /// Handles responses to pending actions ('pass', 'block', 'challenge').
        /// </summary>
        public async Task RespondToPendingAction(string gameId, string response, string? blockOption)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                await Clients.Caller.SendAsync("Error", "User not authenticated.");
                return;
            }

            var validResponses = new HashSet<string> { "pass", "block", "challenge" };
            if (!validResponses.Contains(response.ToLower()))
            {
                await Clients.Caller.SendAsync("Error", "Invalid response.");
                return;
            }

            try
            {
                var result = await _actionService.ProcessPendingActionResponse(gameId, userId, response.ToLower(), blockOption);
                if (result.IsSuccess)
                {
                    var game = await _gameRepository.GetGameAsync(gameId);
                    if (game != null)
                    {
                        await _gameStateService.CheckGameOver(game);
                        await Clients.Group(gameId).SendAsync("PendingActionResponded", userId, response.ToLower());
                    }
                    else
                    {
                        _logger.LogWarning("RespondToPendingAction: Game not found for GameId '{GameId}'", gameId);
                        await Clients.Caller.SendAsync("Error", "Game not found.");
                    }
                }
                else
                {
                    _logger.LogWarning("RespondToPendingAction failed for user {UserId} in game {GameId}: {Message}", userId, gameId, result.Message);
                    await Clients.Caller.SendAsync("Error", result.Message);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in RespondToPendingAction for user {UserId} in game {GameId}", userId, gameId);
                await Clients.Caller.SendAsync("Error", "An error occurred while processing the pending action response.");
            }
        }

        public async Task RespondToReturnCard(string gameId, string cardId)
        {
            var game = await _gameRepository.GetGameAsync(gameId);
            if (game == null)
            {
                await Clients.Caller.SendAsync("Error", "Game not found.");
                return;
            }

            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    await Clients.Caller.SendAsync("Error", "User not authenticated.");
                    return;
                }

                var result = await _actionService.HandleReturnCardResponseAsync(game, userId, cardId);
                if (result is OkResult)
                {
                    await _gameStateService.CheckGameOver(game);
                    await Clients.Group(gameId).SendAsync("UpdateGameState", game);
                }
                else
                {
                    await HandleActionResult(result, "RespondToReturnCard");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in RespondToReturnCard for user {UserId} in game {GameId}", GetUserId(), gameId);
                await Clients.Caller.SendAsync("Error", "An error occurred while processing the return card response.");
            }
        }

        public async Task RespondToBlock(string gameId, bool isChallenge)
        {
            var userId = GetUserId();
            if (!ValidateUser(userId, "RespondToBlock")) return;

            var game = await GetGameAsync(gameId, "RespondToBlock");
            if (game == null) return;

            try
            {
                var result = await _actionService.HandleBlockResponseAsync(game, userId, isChallenge);
                if (result.IsSuccess)
                {
                    await _gameStateService.CheckGameOver(game);
                    await _gameStateService.EmitGameUpdatesToUsers(gameId);
                    await Clients.Group(gameId).SendAsync("BlockResponseProcessed", userId, isChallenge);
                }
                else
                {
                    _logger.LogWarning("RespondToBlock failed for user {UserId} in game {GameId}: {Message}", userId, gameId, result.Message);
                    await Clients.Caller.SendAsync("Error", result.Message);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in RespondToBlock for user {UserId} in game {GameId}", userId, gameId);
                await Clients.Caller.SendAsync("Error", "An error occurred while processing the block response.");
            }
        }

        public async Task RespondToExchangeSelect(string gameId, string card1, string card2)
        {
            var userId = GetUserId();
            if (!ValidateUser(userId, "RespondToExchangeSelect")) return;

            var game = await GetGameAsync(gameId, "RespondToExchangeSelect");
            if (game == null) return;

            try
            {
                var result = await _actionService.HandleExchangeSelectResponseAsync(game, userId, card1, card2);
                if (result.IsSuccess)
                {
                    await _gameStateService.CheckGameOver(game);
                    await Clients.Group(gameId).SendAsync("ExchangeSelectResponded", userId, card1, card2);
                }
                else
                {
                    _logger.LogWarning("RespondToExchangeSelect failed for user {UserId} in game {GameId}: {Message}", userId, gameId, result.Message);
                    await Clients.Caller.SendAsync("Error", result.Message);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in RespondToExchangeSelect for user {UserId} in game {GameId}", userId, gameId);
                await Clients.Caller.SendAsync("Error", "An error occurred while processing the exchange select response.");
            }
        }

        #region Private Helper Methods

        private string? GetUserId()
        {
            return Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        }

        private bool ValidateUser(string? userId, string methodName)
        {
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("{MethodName}: User ID is missing.", methodName);
                Clients.Caller.SendAsync("Error", "User ID is missing.");
                return false;
            }
            return true;
        }

        private async Task<Game?> GetGameAsync(string gameIdOrCode, string methodName)
        {
            try
            {
                var game = await _gameRepository.GetGameAsync(gameIdOrCode);
                if (game == null)
                {
                    _logger.LogWarning("{MethodName}: Game not found for ID or Code '{GameIdOrCode}'.", methodName, gameIdOrCode);
                    await Clients.Caller.SendAsync("Error", "Game not found.");
                }
                return game;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "{MethodName}: Error retrieving game for ID or Code '{GameIdOrCode}'.", methodName, gameIdOrCode);
                await Clients.Caller.SendAsync("Error", "An error occurred while retrieving the game.");
                return null;
            }
        }

        private async Task HandleActionResult(IActionResult result, string methodName)
        {
            switch (result)
            {
                case BadRequestObjectResult badRequest:
                    _logger.LogWarning("{MethodName}: Bad request - {Value}", methodName, badRequest.Value);
                    await Clients.Caller.SendAsync("ActionFailed", badRequest.Value);
                    break;
                case UnauthorizedResult:
                    _logger.LogWarning("{MethodName}: Unauthorized action attempted.", methodName);
                    await Clients.Caller.SendAsync("ActionFailed", "Unauthorized action.");
                    break;
                default:
                    _logger.LogWarning("{MethodName}: Unhandled action result.", methodName);
                    await Clients.Caller.SendAsync("ActionFailed", "An unknown error occurred.");
                    break;
            }
        }

        #endregion
    }
}
