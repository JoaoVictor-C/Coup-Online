using CoupGameBackend.Models;
using CoupGameBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using CoupGameBackend.Hubs;

namespace CoupGameBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class GameController : ControllerBase
    {
        private readonly IGameService gameService;
        private readonly IUserService userService;
        private readonly IUserRepository userRepository;
        private readonly IGameRepository gameRepository;
        private readonly IHubContext<GameHub> hubContext;

        public GameController(IGameService gameService, IUserService userService, IUserRepository userRepository, IGameRepository gameRepository, IHubContext<GameHub> hubContext)
        {
            this.gameService = gameService;
            this.userService = userService;
            this.userRepository = userRepository;
            this.gameRepository = gameRepository;
            this.hubContext = hubContext;
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreateGame([FromBody] CreateGameRequest request)
        {
            if (request == null || request.PlayerCount < 2 || request.PlayerCount > 6)
            {
                return BadRequest(new { message = "Invalid game creation request." });
            }

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is missing." });
            }

            var existingGameId = await gameRepository.GetGameIdForUser(userId);
            if (!string.IsNullOrEmpty(existingGameId))
            {
                // Kick the user from the existing game
                var leaveResult = await gameService.LeaveGameAsync(existingGameId, userId);
                if (!leaveResult.IsSuccess)
                {
                    return StatusCode(500, new { message = "Failed to leave the previous game.", details = leaveResult.Message });
                }
            }

            try
            {
                var user = await userRepository.GetByIdAsync(userId);
                if (user == null)
                {
                    return NotFound(new { message = "User not found." });
                }

                var game = await gameService.CreateGame(userId, request);

                return Ok(new { game.Id, game.RoomCode, game.GameName, game.IsPrivate, game.PlayerCount, game.CreatedAt, game.LeaderId, game.IsStarted });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                // Log exception
                return StatusCode(500, new { message = "An error occurred while creating the game.", details = ex.Message });
            }
        }

        [HttpPost("join")]
        public async Task<IActionResult> JoinGame([FromBody] JoinGameRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.GameIdOrCode))
            {
                return BadRequest(new { message = "GameId or RoomCode is required to join a game." });
            }

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is missing." });
            }

            var existingGameId = await gameRepository.GetGameIdForUser(userId);
            if (!string.IsNullOrEmpty(existingGameId))
            {
                // Kick the user from the existing game
                var leaveResult = await gameService.LeaveGameAsync(existingGameId, userId);
                if (!leaveResult.IsSuccess)
                {
                    return StatusCode(500, new { message = "Failed to leave the previous game.", details = leaveResult.Message });
                }
            }

            try
            {
                var gameId = await gameService.GetGameIdAsync(request.GameIdOrCode);
                if (string.IsNullOrEmpty(gameId))
                {
                    return BadRequest(new { message = "Invalid game ID or room code." });
                }

                var game = await gameService.JoinGame(userId, gameId);

                if (game.Players.Any(p => p.UserId == userId))
                {
                    await hubContext.Clients.Group(game.Id).SendAsync("PlayerJoined", userId);
                    return Ok(new { message = "Joined the game successfully as a player.", game.Id, game.RoomCode, game.GameName, game.IsPrivate, game.PlayerCount, game.CreatedAt, game.LeaderId, game.IsStarted, game.Spectators, game.Players });
                }
                else
                {
                    await hubContext.Clients.Group(game.Id).SendAsync("SpectatorJoined", userId);
                    return Ok(new { message = "Joined the game successfully as a spectator.", game.Id, game.RoomCode, game.GameName, game.IsPrivate, game.PlayerCount, game.CreatedAt, game.LeaderId, game.IsStarted, game.Spectators, game.Players });
                }
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                // Log exception
                return StatusCode(500, new { message = "An error occurred while joining the game.", details = ex.Message });
            }
        }

        [HttpPost("disconnect")]
        public async Task<IActionResult> Disconnect([FromBody] DisconnectRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.GameIdOrCode))
            {
                return BadRequest(new { message = "GameId or RoomCode is required." });
            }

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is missing." });
            }

            try
            {
                var user = await userRepository.GetByIdAsync(userId);
                if (user == null)
                {
                    return NotFound(new { message = "User not found." });
                }

                var gameId = await gameService.GetGameIdAsync(request.GameIdOrCode);
                if (string.IsNullOrEmpty(gameId))
                {
                    return BadRequest(new { message = "Invalid game ID or room code." });
                }

                var result = await gameService.HandleDisconnection(gameId, userId);
                if (!result.IsSuccess)
                    return BadRequest(new { message = result.Message });

                return Ok(new { message = "Player disconnected successfully." });
            }
            catch (Exception ex)
            {
                // Log exception
                return StatusCode(500, new { message = "An error occurred while handling disconnection.", details = ex.Message });
            }
        }

        /// <summary>
        /// Starts the game. Only the game leader can perform this action.
        /// POST: api/game/start
        /// </summary>
        [HttpPost("start")]
        public async Task<IActionResult> StartGame([FromBody] StartGameRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.GameIdOrCode))
            {
                return BadRequest(new { message = "GameId or RoomCode is required to start the game." });
            }

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is missing." });
            }

            try
            {
                var gameId = await gameService.GetGameIdAsync(request.GameIdOrCode);
                if (string.IsNullOrEmpty(gameId))
                {
                    return BadRequest(new { message = "Invalid game ID or room code." });
                }

                var result = await gameService.StartGameAsync(gameId, userId);
                if (result.IsSuccess)
                {
                    var game = await gameRepository.GetGameByIdAsync(gameId);
                    return Ok(new { message = result.Message, gameId = gameId, game.IsStarted, game.LeaderId });
                }
                else
                {
                    return BadRequest(new { message = result.Message });
                }
            }
            catch (Exception ex)
            {
                // Log exception
                return StatusCode(500, new { message = "An error occurred while starting the game.", details = ex.Message });
            }
        }

        /// <summary>
        /// Restarts the game. Only the game leader can perform this action.
        /// POST: api/game/restart
        /// </summary>
        [HttpPost("restart")]
        public async Task<IActionResult> RestartGame([FromBody] RestartGameRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.GameIdOrCode))
            {
                return BadRequest(new { message = "GameId or RoomCode is required to restart the game." });
            }

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is missing." });
            }

            try
            {
                var gameId = await gameService.GetGameIdAsync(request.GameIdOrCode);
                if (string.IsNullOrEmpty(gameId))
                {
                    return BadRequest(new { message = "Invalid game ID or room code." });
                }

                var result = await gameService.RestartGameAsync(gameId, userId);
                if (result.IsSuccess)
                {
                    var game = await gameRepository.GetGameByIdAsync(gameId);
                    return Ok(new { message = result.Message, gameId = gameId, game.IsStarted, game.LeaderId });
                }
                else
                {
                    return BadRequest(new { message = result.Message });
                }
            }
            catch (Exception ex)
            {
                // Log exception
                return StatusCode(500, new { message = "An error occurred while restarting the game.", details = ex.Message });
            }
        }

        /// <summary>
        /// Allows a user to switch to spectator mode.
        /// </summary>
        [HttpPost("spectate")]
        public async Task<IActionResult> SwitchToSpectate([FromBody] SwitchToSpectateRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.GameIdOrCode))
            {
                return BadRequest(new { message = "Invalid spectate request." });
            }

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is missing." });
            }

            try
            {
                var gameId = await gameService.GetGameIdAsync(request.GameIdOrCode);
                if (string.IsNullOrEmpty(gameId))
                {
                    return BadRequest(new { message = "Invalid game ID or room code." });
                }

                var result = await gameService.SwitchToSpectatorAsync(gameId, userId);
                if (result.IsSuccess)
                {
                    return Ok(new { message = result.Message });
                }
                else
                {
                    return BadRequest(new { message = result.Message });
                }
            }
            catch (Exception ex)
            {
                // Log exception as needed
                return StatusCode(500, new { message = "An error occurred while switching to spectator mode.", details = ex.Message });
            }
        }
    }

    public class StartGameRequest
    {
        public string GameIdOrCode { get; set; } = string.Empty;
    }

    public class RestartGameRequest
    {
        public string GameIdOrCode { get; set; } = string.Empty;
    }

    public class JoinGameRequest
    {
        public string GameIdOrCode { get; set; } = string.Empty; // Can be either GameId or RoomCode
    }

    public class DisconnectRequest
    {
        public string GameIdOrCode { get; set; } = string.Empty;
    }

    // New Request Model for Spectating
    public class SwitchToSpectateRequest
    {
        public string GameIdOrCode { get; set; } = string.Empty;
    }
}