using CoupGameBackend.Models;
using CoupGameBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CoupGameBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class GameController : ControllerBase
    {
        private readonly IGameService _gameService;

        public GameController(IGameService gameService)
        {
            _gameService = gameService;
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreateGame([FromBody] CreateGameRequest request)
        {
            var userId = User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is missing." });
            }

            var game = await _gameService.CreateGame(userId, request);

            if (game == null)
                return BadRequest(new { message = "Failed to create game." });

            return Ok(game);
        }

        [HttpPost("join")]
        public async Task<IActionResult> JoinGame([FromBody] JoinGameRequest request)
        {
            var userId = User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is missing." });
            }

            var game = await _gameService.JoinGame(userId, request.GameId);

            if (game == null)
                return BadRequest(new { message = "Failed to join game." });

            return Ok(game);
        }

        [HttpGet("{gameId}")]
        public async Task<IActionResult> GetGameState(string gameId)
        {
            var userId = User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is missing." });
            }

            var game = await _gameService.GetGameState(gameId, userId);

            if (game == null)
                return NotFound(new { message = "Game not found or access denied." });

            return Ok(game);
        }

        [HttpPost("action")]
        public async Task<IActionResult> PerformAction([FromBody] GameActionRequest request)
        {
            var userId = User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is missing." });
            }

            var result = await _gameService.PerformAction(request.GameId, userId, request.Action, request.Parameters);

            return result;
        }

        [HttpPost("disconnect/{gameId}")]
        public async Task<IActionResult> HandleDisconnection(string gameId)
        {
            var userId = User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is missing." });
            }

            var result = await _gameService.HandleDisconnection(gameId, userId);

            if (!result)
                return BadRequest(new { message = "Failed to handle disconnection." });

            return Ok(new { message = "Player disconnected successfully." });
        }
    }

    public class JoinGameRequest
    {
        public string GameId { get; set; } = string.Empty;
    }

    public class GameActionRequest
    {
        public string GameId { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public dynamic Parameters { get; set; } = new { };
    }
}