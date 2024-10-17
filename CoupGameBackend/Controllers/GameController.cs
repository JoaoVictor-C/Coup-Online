using CoupGameBackend.Models;
using CoupGameBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;

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

        public GameController(IGameService gameService, IUserService userService, IUserRepository userRepository, IGameRepository gameRepository)
        {
            this.gameService = gameService;
            this.userService = userService;
            this.userRepository = userRepository;
            this.gameRepository = gameRepository;
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

            try
            {
                var user = await userRepository.GetByIdAsync(userId);
                if (user == null)
                {
                    return NotFound(new { message = "User not found." });
                }

                var game = await gameService.CreateGame(userId, request);

                return Ok(new { game.Id, game.RoomCode, game.GameName, game.IsPrivate, game.PlayerCount, game.CreatedAt });
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
            if (request == null || string.IsNullOrEmpty(request.GameId))
            {
                return BadRequest(new { message = "GameId or RoomCode is required to join a game." });
            }

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is missing." });
            }

            try
            {
                var game = await gameService.JoinGame(userId, request.GameId);

                if (game.Players.Any(p => p.UserId == userId))
                {
                    return Ok(new { message = "Joined the game successfully as a player.", game.Id, game.RoomCode, game.GameName, game.IsPrivate, game.PlayerCount, game.CreatedAt });
                }
                else
                {
                    return Ok(new { message = "Joined the game successfully as a spectator.", game.Id, game.RoomCode, game.GameName, game.IsPrivate, game.PlayerCount, game.CreatedAt });
                }
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                // Log exception
                return StatusCode(500, new { message = "An error occurred while joining the game.", details = ex.Message });
            }
        }

        [HttpPost("reconnect")]
        public async Task<IActionResult> ReconnectToGame([FromBody] ReconnectRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.GameId))
            {
                return BadRequest(new { message = "GameId is required to reconnect." });
            }

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is missing." });
            }

            try
            {
                var result = await gameService.ReconnectToGame(request.GameId, userId, null);

                if (result.IsSuccess)
                {
                    return Ok(new { message = "Reconnected successfully." });
                }
                else
                {
                    return BadRequest(new { message = result.Message });
                }
            }
            catch (Exception ex)
            {
                // Log exception
                return StatusCode(500, new { message = "An error occurred while reconnecting.", details = ex.Message });
            }
        }

        [HttpPost("disconnect/{gameId}")]
        public async Task<IActionResult> HandleDisconnection(string gameId)
        {
            if (string.IsNullOrEmpty(gameId))
            {
                return BadRequest(new { message = "GameId is required." });
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
    }

    public class JoinGameRequest
    {
        public string GameId { get; set; } = string.Empty; // Can be either GameId or RoomCode
    }

    public class ReconnectRequest
    {
        public string GameId { get; set; } = string.Empty;
    }

    public class GameActionRequest
    {
        public string GameId { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public ActionParameters? Parameters { get; set; }
    }
}
