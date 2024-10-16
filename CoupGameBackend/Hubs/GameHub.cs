using CoupGameBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace CoupGameBackend.Hubs
{
    [Authorize]
    public class GameHub : Hub
    {
        private readonly IGameService _gameService;

        public GameHub(IGameService gameService)
        {
            _gameService = gameService;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirst("sub")?.Value;
            var connectionId = Context.ConnectionId;

            if (!string.IsNullOrEmpty(userId))
            {
                await _gameService.AddUserConnection(userId, connectionId);
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.User?.FindFirst("sub")?.Value;
            var connectionId = Context.ConnectionId;

            if (!string.IsNullOrEmpty(userId))
            {
                await _gameService.RemoveUserConnection(userId, connectionId);
            }

            await base.OnDisconnectedAsync(exception);
        }

        public async Task JoinGame(string gameId)
        {
            var userId = Context.User?.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                await Clients.Caller.SendAsync("JoinGameFailed", "User ID is missing.");
                return;
            }

            var game = await _gameService.JoinGame(userId, gameId);

            if (game != null)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, game.Id);
                await Clients.Group(game.Id).SendAsync("PlayerJoined", userId, game.Players.Count);
            }
            else
            {
                await Clients.Caller.SendAsync("JoinGameFailed", "Failed to join the game.");
            }
        }

        // Implement methods for game actions like Coup, Steal, Exchange, etc.
    }
}