using CoupGameBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

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
                // Notify the user about successful connection
                await Clients.Caller.SendAsync("Connected", "Successfully connected to the game server.");
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
        public async Task PerformAction(string gameId, string action, CoupGameBackend.Models.ActionParameters parameters)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                await Clients.Caller.SendAsync("ActionFailed", "User ID is missing.");
                return;
            }

            var result = await _gameService.PerformAction(gameId, userId, action, parameters);
            if (result is OkResult)
            {
                await Clients.Group(gameId).SendAsync("ActionSucceeded", userId, action, parameters);
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
        public async Task ChallengeAction(string gameId, string challengerId, string challengedUserId)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId) || userId != challengerId)
            {
                await Clients.Caller.SendAsync("ChallengeFailed", "Invalid challenger ID.");
                return;
            }

            var result = await _gameService.ChallengeAction(gameId, challengerId, challengedUserId);
            if (result.IsSuccess)
            {
                await Clients.Group(gameId).SendAsync("ActionChallenged", challengerId, challengedUserId, result.Message);
            }
            else
            {
                await Clients.Caller.SendAsync("ChallengeFailed", result.Message);
            }
        }

        /// <summary>
        /// Allows a user to block another player's action.
        /// </summary>
        public async Task BlockAction(string gameId, string blockerId, string blockedUserId, string action)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId) || userId != blockerId)
            {
                await Clients.Caller.SendAsync("BlockFailed", "Invalid blocker ID.");
                return;
            }

            var result = await _gameService.BlockAction(gameId, blockerId, blockedUserId, action);
            if (result.IsSuccess)
            {
                await Clients.Group(gameId).SendAsync("ActionBlocked", blockerId, blockedUserId, action);
            }
            else
            {
                await Clients.Caller.SendAsync("BlockFailed", result.Message);
            }
        }

        /// <summary>
        /// Handles user reconnection to a game.
        /// </summary>
        public async Task ReconnectToGame(string gameId)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                await Clients.Caller.SendAsync("ReconnectFailed", "User ID is missing.");
                return;
            }

            // If the gameId is the roomCode, get the gameId from the roomCode
            var game = await _gameRepository.GetGameByRoomCodeAsync(gameId);
            if (game != null)
            {
                gameId = game.Id;
            }

            var result = await _gameService.ReconnectToGame(gameId, userId, Context.ConnectionId);
            if (result.IsSuccess)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, gameId);
                await Clients.Group(gameId).SendAsync("PlayerReconnected", userId);
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
    }
}
