using CoupGameBackend.Services;
using CoupGameBackend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Newtonsoft.Json;
namespace CoupGameBackend.Hubs
{
    [Authorize]
    public class GameHub : Hub
    {
        private readonly IGameService _gameService;
        private readonly IGameRepository _gameRepository;

        public GameHub(IGameService gameService, IGameRepository gameRepository)
        {
            _gameService = gameService;
            _gameRepository = gameRepository;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var connectionId = Context.ConnectionId;
            if (!string.IsNullOrEmpty(userId))
            {
                await _gameService.AddUserConnection(userId, connectionId);
                await Clients.Caller.SendAsync("Connected", "Successfully connected to the game server.");

                var gameId = await _gameRepository.GetGameIdForUser(userId);
                if (!string.IsNullOrEmpty(gameId))
                {
                    await Groups.AddToGroupAsync(connectionId, gameId);
                    await _gameService.EmitGameUpdatesToUsers(gameId);
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
                await _gameService.HandleDisconnection(gameId, userId);
            }
            await base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// Allows a user to perform a game action.
        /// </summary>
        public async Task PerformAction(string gameIdOrCode, string action, string? targetId)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                await Clients.Caller.SendAsync("ActionFailed", "User ID is missing.");
                return;
            }

            var game = await _gameService.GetGameAsync(gameIdOrCode);
            if (game == null)
            {
                await Clients.Caller.SendAsync("ActionFailed", "Game not found.");
                return;
            }

            var result = await _gameService.PerformAction(game.Id, userId, action, new ConcreteActionParameters { TargetUserId = targetId ?? string.Empty });

            if (result is OkResult)
            {
                await Clients.Group(game.Id).SendAsync("ActionPerformed", new ActionLog
                {
                    Timestamp = DateTime.UtcNow,
                    PlayerId = userId,
                    Action = action,
                    TargetId = targetId
                });
            }
            else if (result is BadRequestObjectResult badRequest)
            {
                await Clients.Caller.SendAsync("ActionFailed", badRequest.Value);
            }
            else if (result is UnauthorizedResult)
            {
                await Clients.Caller.SendAsync("ActionFailed", "Unauthorized action.");
            }
            // Handle other IActionResult types as needed
        }

        /// <summary>
        /// Allows a user to challenge another player's action.
        /// </summary>
        public async Task ChallengeAction(string gameIdOrCode, string challengerId, string challengedUserId)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId) || userId != challengerId)
            {
                await Clients.Caller.SendAsync("ChallengeFailed", "Invalid challenger ID.");
                return;
            }

            var game = await _gameService.GetGameAsync(gameIdOrCode);
            if (game == null)
            {
                await Clients.Caller.SendAsync("ChallengeFailed", "Game not found.");
                return;
            }

            var result = await _gameService.ChallengeAction(game.Id, userId, challengedUserId);

            if (result.IsSuccess)
            {
                await Clients.Group(game.Id).SendAsync("ActionChallenged", new { ChallengerId = userId, ChallengedUserId = challengedUserId });
            }
            else
            {
                await Clients.Caller.SendAsync("ChallengeFailed", result.Message);
            }
        }

        /// <summary>
        /// Handles player reconnection.
        /// </summary>
        public async Task Reconnect(string gameIdOrCode)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                await Clients.Caller.SendAsync("ReconnectFailed", "User ID is missing.");
                return;
            }

            var game = await _gameService.GetGameAsync(gameIdOrCode);
            if (game == null)
            {
                await Clients.Caller.SendAsync("ReconnectFailed", "Game not found.");
                return;
            }

            var result = await _gameService.ReconnectToGame(game.Id, userId, Context.ConnectionId);
            if (result.IsSuccess)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, game.Id);
                await _gameService.EmitGameUpdatesToUsers(game.Id);
                await Clients.Group(game.Id).SendAsync("PlayerReconnected", userId);
                await Clients.Caller.SendAsync("ReconnectSucceeded", "Reconnected to the game successfully.");
            }
            else
            {
                await Clients.Caller.SendAsync("ReconnectFailed", result.Message);
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
                await Clients.Caller.SendAsync("JoinGameFailed", "User ID is missing.");
                return;
            }

            try
            {
                var joinResult = await _gameService.JoinGameInProgress(userId, gameIdOrCode);
                if (joinResult.IsSuccess)
                {
                    await Groups.AddToGroupAsync(Context.ConnectionId, joinResult.GameId);
                    await Clients.Group(joinResult.GameId).SendAsync("PlayerJoinedInProgress", userId);
                    await Clients.Caller.SendAsync("JoinGameInProgressSucceeded", "Joined the game in progress. Waiting for the game to finish.");
                }
                else
                {
                    await Clients.Caller.SendAsync("JoinGameFailed", joinResult.Message);
                }
            }
            catch (Exception ex)
            {
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
                await Clients.Caller.SendAsync("GetGameStateFailed", "User ID is missing.");
                return;
            }

            try
            {
                var game = await _gameService.GetGameAsync(gameIdOrCode);
                if (game == null)
                {
                    await Clients.Caller.SendAsync("GetGameStateFailed", "Game not found.");
                    return;
                }

                await _gameService.EmitGameUpdatesToUsers(game.Id);
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
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                await Clients.Caller.SendAsync("Error", "User ID is missing.");
                return;
            }

            var game = await _gameService.GetGameAsync(gameIdOrCode);
            if (game == null)
            {
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
                await Clients.Caller.SendAsync("Error", result.Message);
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
                await Clients.Caller.SendAsync("RestartFailed", "User ID is missing.");
                return;
            }

            var game = await _gameService.GetGameAsync(gameIdOrCode);
            if (game == null)
            {
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
                await Clients.Caller.SendAsync("RestartFailed", result.Message);
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
                await Clients.Caller.SendAsync("Error", "User ID is missing.");
                return;
            }

            var game = await _gameService.GetGameAsync(gameIdOrCode);
            if (game == null)
            {
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

        /// <summary>
        /// Allows a spectator to rejoin as a player after the game has ended.
        /// </summary>
        public async Task RejoinAsPlayer(string gameIdOrCode)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                await Clients.Caller.SendAsync("Error", "User ID is missing.");
                return;
            }

            var game = await _gameService.GetGameAsync(gameIdOrCode);
            if (game == null)
            {
                await Clients.Caller.SendAsync("Error", "Game not found.");
                return;
            }

            var result = await _gameService.RejoinAsPlayerAsync(game.Id, userId);
            if (result.IsSuccess)
            {
                await Clients.Caller.SendAsync("RejoinedAsPlayer", result.Message);
            }
            else
            {
                await Clients.Caller.SendAsync("Error", result.Message);
            }
        }
    }
}
