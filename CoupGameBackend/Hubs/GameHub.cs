using CoupGameBackend.Services;
using CoupGameBackend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using System.Security.Claims;
using Newtonsoft.Json;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Concurrent;
using System.Linq;

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

        public GameHub(
            IGameService gameService,
            IGameRepository gameRepository,
            IConnectionService connectionService,
            IChallengeService challengeService,
            IActionService actionService,
            ITurnService turnService,
            IGameStateService gameStateService,
            ISchedulingService schedulingService)
        {
            _gameService = gameService;
            _gameRepository = gameRepository;
            _connectionService = connectionService;
            _challengeService = challengeService;
            _actionService = actionService;
            _turnService = turnService;
            _gameStateService = gameStateService;
            _schedulingService = schedulingService;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var connectionId = Context.ConnectionId;
            if (!string.IsNullOrEmpty(userId))
            {
                await _connectionService.AddUserConnection(userId, connectionId);
                await Clients.Caller.SendAsync("Connected", "Successfully connected to the game server.");

                var gameId = await _gameRepository.GetGameIdForUser(userId);
                if (!string.IsNullOrEmpty(gameId))
                {
                    // If the user is already in a game, try to reconnect to it
                    await _connectionService.ReconnectToGame(gameId, userId, connectionId);

                    await Groups.AddToGroupAsync(connectionId, gameId);
                    await _gameStateService.EmitGameUpdatesToUsers(gameId);
                }
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                await Clients.Caller.SendAsync("Disconnected", "User ID is missing.");
                return;
            }
            var gameId = await _gameRepository.GetGameIdForUser(userId);
            if (!string.IsNullOrEmpty(userId) && !string.IsNullOrEmpty(gameId))
            {
                await _connectionService.HandleDisconnection(gameId, userId);
                await _gameStateService.EmitGameUpdatesToUsers(gameId);
            }
            await base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// Allows a user to perform a game action.
        /// </summary>
        public async Task PerformAction(string gameIdOrCode, string action, string? targetId)
        {
            try
            {
                var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    Console.WriteLine("PerformAction: User ID is missing.");
                    await Clients.Caller.SendAsync("ActionFailed", "User ID is missing.");
                    return;
                }

                var game = await _gameRepository.GetGameAsync(gameIdOrCode);
                if (game == null)
                {
                    Console.WriteLine($"PerformAction: Game not found for GameIdOrCode '{gameIdOrCode}'.");
                    await Clients.Caller.SendAsync("ActionFailed", "Game not found.");
                    return;
                }

                var result = await _actionService.PerformAction(game.Id, userId, action, targetId);
                if (result is OkResult)
                {
                    await Clients.Group(game.Id).SendAsync("ActionPerformed", new ActionLog
                    {
                        Timestamp = DateTime.UtcNow,
                        PlayerId = userId,
                        Action = action,
                        TargetId = targetId
                    });

                    if (_gameService.HasPendingAction(game.Id))
                    {
                        var pendingAction = _gameService.GetPendingAction(game.Id);
                        if (pendingAction != null)
                        {
                            await Clients.Group(game.Id).SendAsync("PendingAction", pendingAction);
                        }
                    }
                }
                else if (result is BadRequestObjectResult badRequest)
                {
                    Console.WriteLine($"PerformAction: Bad request - {badRequest.Value}");
                    await Clients.Caller.SendAsync("ActionFailed", badRequest.Value);
                }
                else if (result is UnauthorizedResult)
                {
                    Console.WriteLine("PerformAction: Unauthorized action attempted.");
                    await Clients.Caller.SendAsync("ActionFailed", "Unauthorized action.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in PerformAction: {ex.Message}");
                await Clients.Caller.SendAsync("ActionFailed", "An error occurred while performing the action.");
            }
        }

        /// <summary>
        /// Handles player reconnection.
        /// </summary>
        public async Task Reconnect(string gameIdOrCode)
        {
            try
            {
                var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    Console.WriteLine("Reconnect: User ID is missing.");
                    await Clients.Caller.SendAsync("ReconnectFailed", "User ID is missing.");
                    return;
                }
                var game = await _gameRepository.GetGameAsync(gameIdOrCode);
                if (game == null)
                {
                    Console.WriteLine($"Reconnect: Game not found for GameIdOrCode '{gameIdOrCode}'.");
                    await Clients.Caller.SendAsync("ReconnectFailed", "Game not found.");
                    return;
                }

                var result = await _connectionService.ReconnectToGame(game.Id, userId, Context.ConnectionId);
                if (result.IsSuccess)
                {
                    await Groups.AddToGroupAsync(Context.ConnectionId, game.Id);
                    await _gameStateService.EmitGameUpdatesToUsers(game.Id);
                    await Clients.Group(game.Id).SendAsync("PlayerReconnected", userId);
                    await Clients.Caller.SendAsync("ReconnectSucceeded", "Reconnected to the game successfully.");
                }
                else
                {
                    await Clients.Caller.SendAsync("ReconnectFailed", result.Message);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in Reconnect: {ex.Message}");
                await Clients.Caller.SendAsync("ReconnectFailed", "An error occurred during reconnection.");
            }
        }

        /// <summary>
        /// Allows a user to join a game that is already in progress.
        /// The user will wait until the current game concludes.
        /// </summary>
        public async Task JoinGameInProgress(string gameIdOrCode)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                Console.WriteLine("JoinGameInProgress: User ID is missing.");
                await Clients.Caller.SendAsync("JoinGameFailed", "User ID is missing.");
                return;
            }

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
                    Console.WriteLine($"JoinGameInProgress: Failed to join game - {joinResult.Message}");
                    await Clients.Caller.SendAsync("JoinGameFailed", joinResult.Message);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in JoinGameInProgress: {ex.Message}");
                await Clients.Caller.SendAsync("JoinGameFailed", ex.Message);
            }
        }

        /// <summary>
        /// Retrieves the current state of the game for a user.
        /// </summary>
        /// <param name="gameIdOrCode">ID or code of the game.</param>
        /// <returns>The current game state.</returns>
        public async Task GetGameState(string gameIdOrCode)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                Console.WriteLine("GetGameState: User ID is missing.");
                await Clients.Caller.SendAsync("GetGameStateFailed", "User ID is missing.");
                return;
            }

            try
            {
                var game = await _gameRepository.GetGameAsync(gameIdOrCode);
                if (game == null)
                {
                    Console.WriteLine($"GetGameState: Game not found for GameIdOrCode '{gameIdOrCode}'.");
                    await Clients.Caller.SendAsync("GetGameStateFailed", "Game not found.");
                    return;
                }
                await _gameStateService.EmitGameUpdatesToUsers(game.Id);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error retrieving game state for user {userId}: {ex.Message}");
                await Clients.Caller.SendAsync("GetGameStateFailed", "An error occurred while retrieving the game state.");
            }
        }

        /// <summary>
        /// Allows the game leader to start the game.
        /// </summary>
        public async Task StartGame(string gameIdOrCode)
        {
            try
            {
                var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    Console.WriteLine("StartGame: User ID is missing.");
                    await Clients.Caller.SendAsync("Error", "User ID is missing.");
                    return;
                }

                var game = await _gameRepository.GetGameAsync(gameIdOrCode);
                if (game == null)
                {
                    Console.WriteLine($"StartGame: Game not found for GameIdOrCode '{gameIdOrCode}'.");
                    await Clients.Caller.SendAsync("Error", "Game not found.");
                    return;
                }

                var result = await _gameService.StartGameAsync(game.Id, userId);
                if (result.IsSuccess)
                {
                    await Clients.Group(game.Id).SendAsync("GameStarted", new { gameId = game.Id });
                }
                else
                {
                    Console.WriteLine($"StartGame: Failed to start game - {result.Message}");
                    await Clients.Caller.SendAsync("Error", result.Message);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in StartGame: {ex.Message}");
                await Clients.Caller.SendAsync("Error", "An error occurred while starting the game.");
            }
        }

        /// <summary>
        /// Allows the game leader to restart the game.
        /// </summary>
        public async Task RestartGame(string gameIdOrCode)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                Console.WriteLine("RestartGame: User ID is missing.");
                await Clients.Caller.SendAsync("RestartFailed", "User ID is missing.");
                return;
            }

            try
            {
                var game = await _gameRepository.GetGameAsync(gameIdOrCode);
                if (game == null)
                {
                    Console.WriteLine($"RestartGame: Game not found for GameIdOrCode '{gameIdOrCode}'.");
                    await Clients.Caller.SendAsync("RestartFailed", "Game not found.");
                    return;
                }

                var result = await _gameService.RestartGameAsync(game.Id, userId);
                if (result.IsSuccess)
                {
                    await Clients.Group(game.Id).SendAsync("GameRestarted", new { gameId = game.Id });
                }
                else
                {
                    Console.WriteLine($"RestartGame: Failed to restart game - {result.Message}");
                    await Clients.Caller.SendAsync("RestartFailed", result.Message);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in RestartGame: {ex.Message}");
                await Clients.Caller.SendAsync("RestartFailed", "An error occurred while restarting the game.");
            }
        }

        public async Task ReturnToLobby(string gameIdOrCode)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                Console.WriteLine("ReturnToLobby: User ID is missing.");
                await Clients.Caller.SendAsync("Error", "User ID is missing.");
                return;
            }
            var game = await _gameRepository.GetGameAsync(gameIdOrCode);
            if (game != null && game.LeaderId == userId)
            {
                await _gameService.ResetGameAsync(game.Id, userId);
                await _gameStateService.EmitGameUpdatesToUsers(game.Id);
            }
        }

        /// <summary>
        /// Switches the current user to spectator mode.
        /// </summary>
        public async Task SwitchToSpectator(string gameIdOrCode)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                Console.WriteLine("SwitchToSpectator: User ID is missing.");
                await Clients.Caller.SendAsync("Error", "User ID is missing.");
                return;
            }

            try
            {
                var game = await _gameRepository.GetGameAsync(gameIdOrCode);
                if (game == null)
                {
                    Console.WriteLine($"SwitchToSpectator: Game not found for GameIdOrCode '{gameIdOrCode}'.");
                    await Clients.Caller.SendAsync("Error", "Game not found.");
                    return;
                }

                var result = await _gameService.SwitchToSpectatorAsync(game.Id, userId);
                if (result.IsSuccess)
                {
                    await Clients.Caller.SendAsync("SwitchedToSpectator", result.Message);
                }
                else
                {
                    await Clients.Caller.SendAsync("Error", result.Message);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SwitchToSpectator: {ex.Message}");
                await Clients.Caller.SendAsync("Error", "An error occurred while switching to spectator mode.");
            }
        }

        /// <summary>
        /// Allows a spectator to rejoin as a player after the game has ended.
        /// </summary>
        public async Task RejoinAsPlayer(string gameIdOrCode)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                Console.WriteLine("RejoinAsPlayer: User ID is missing.");
                await Clients.Caller.SendAsync("Error", "User ID is missing.");
                return;
            }

            try
            {
                var game = await _gameRepository.GetGameByIdOrCodeAsync(gameIdOrCode);
                if (game == null)
                {
                    Console.WriteLine($"RejoinAsPlayer: Game not found for GameIdOrCode '{gameIdOrCode}'.");
                    await Clients.Caller.SendAsync("Error", "Game not found.");
                    return;
                }

                var result = await _connectionService.RejoinAsPlayerAsync(game.Id, userId);
                if (result.IsSuccess)
                {
                    await Clients.Caller.SendAsync("RejoinedAsPlayer", result.Message);
                }
                else
                {
                    Console.WriteLine($"RejoinAsPlayer: Failed to rejoin as player - {result.Message}");
                    await Clients.Caller.SendAsync("Error", result.Message);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in RejoinAsPlayer: {ex.Message}");
                await Clients.Caller.SendAsync("Error", "An error occurred while rejoining as a player.");
            }
        }

        /// <summary>
        /// Handles responses to pending actions ('pass', 'block', 'challenge').
        /// </summary>
        public async Task RespondToPendingAction(string gameId, string response, string? blockOption)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userId))
            {
                await Clients.Caller.SendAsync("Error", "User not authenticated.");
                return;
            }

            if (!new List<string> { "pass", "block", "challenge" }.Contains(response.ToLower()))
            {
                await Clients.Caller.SendAsync("Error", "Invalid response.");
                return;
            }


            var result = await _actionService.ProcessPendingActionResponse(gameId, userId, response.ToLower(), blockOption);

            if (result.IsSuccess)
            {
                await Clients.Group(gameId).SendAsync("PendingActionResponded", userId, response.ToLower());
            }
            else
            {
                await Clients.Caller.SendAsync("Error", result.Message);
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

            var result = await _actionService.HandleReturnCardResponseAsync(game, Context.UserIdentifier, cardId);
            if (result is OkResult)
            {
                await Clients.Group(gameId).SendAsync("UpdateGameState", game);
            }
            else if (result is BadRequestObjectResult badRequest)
            {
                await Clients.Caller.SendAsync("Error", badRequest.Value);
            }
            else if (result is NotFoundObjectResult notFound)
            {
                await Clients.Caller.SendAsync("Error", notFound.Value);
            }
        }

        public async Task RespondToBlock(string gameId, bool isChallenge)
        {
            try
            {
                var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    await Clients.Caller.SendAsync("Error", "User not authenticated.");
                    return;
                }

                var game = await _gameRepository.GetGameAsync(gameId);
                if (game == null)
                {
                    await Clients.Caller.SendAsync("Error", "Game not found.");
                    return;
                }

                var result = await _actionService.HandleBlockResponseAsync(game, userId, isChallenge);
                if (result.IsSuccess)
                {
                    await _gameStateService.EmitGameUpdatesToUsers(gameId);
                    await Clients.Group(gameId).SendAsync("BlockResponseProcessed", userId, isChallenge);
                }
                else
                {
                    await Clients.Caller.SendAsync("Error", result.Message);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in RespondToBlock: {ex.Message}");
                await Clients.Caller.SendAsync("Error", "An error occurred while processing the block response.");
            }
        }

        public async Task RespondToExchangeSelect(string gameId, string card1, string card2)
        {
            try
            {
                var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    await Clients.Caller.SendAsync("Error", "User not authenticated.");
                    return;
                }

                var game = await _gameRepository.GetGameAsync(gameId);
                if (game == null)
                {
                    await Clients.Caller.SendAsync("Error", "Game not found.");
                    return;
                }
                var result = await _actionService.HandleExchangeSelectResponseAsync(game, userId, card1, card2);
                if (result.IsSuccess)
                {
                    await Clients.Group(gameId).SendAsync("ExchangeSelectResponded", userId, card1, card2);
                }
                else
                {
                    await Clients.Caller.SendAsync("Error", result.Message);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in RespondToExchangeSelect: {ex.Message}");
                await Clients.Caller.SendAsync("Error", "An error occurred while processing the exchange select response.");
            }
        }
    }
}
