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
            if (request == null || request.PlayerCount < 2 || request.PlayerCount > 6)
            {
                return BadRequest(new { message = "Invalid game creation request." });
            }

            var userId = User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is missing." });
            }

            try
            {
                var game = await _gameService.CreateGame(userId, request);
                return Ok(game);
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
                return BadRequest(new { message = "GameId is required." });
            }

            var userId = User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is missing." });
            }

            try
            {
                var game = await _gameService.JoinGame(userId, request.GameId);
                if (game == null)
                    return BadRequest(new { message = "Failed to join game." });

                return Ok(game);
            }
            catch (ArgumentException ex)
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
                return StatusCode(500, new { message = "An error occurred while attempting to join the game.", details = ex.Message });
            }
        }

        [HttpGet("{gameId}")]
        public async Task<IActionResult> GetGameState(string gameId)
        {
            if (string.IsNullOrEmpty(gameId))
            {
                return BadRequest(new { message = "GameId is required." });
            }

            var userId = User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is missing." });
            }

            try
            {
                var game = await _gameService.GetGameState(gameId, userId);
                if (game == null)
                    return NotFound(new { message = "Game not found or access denied." });

                return Ok(game);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                // Log exception
                return StatusCode(500, new { message = "An error occurred while retrieving the game state.", details = ex.Message });
            }
        }

        [HttpPost("action")]
        public async Task<IActionResult> PerformAction([FromBody] GameActionRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.GameId) || string.IsNullOrEmpty(request.Action))
            {
                return BadRequest(new { message = "GameId and Action are required." });
            }

            var userId = User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is missing." });
            }

            try
            {
                var result = await _gameService.PerformAction(request.GameId, userId, request.Action, request.Parameters);
                return result;
            }
            catch (Exception ex)
            {
                // Log exception
                return StatusCode(500, new { message = "An error occurred while performing the action.", details = ex.Message });
            }
        }

        [HttpPost("disconnect/{gameId}")]
        public async Task<IActionResult> HandleDisconnection(string gameId)
        {
            if (string.IsNullOrEmpty(gameId))
            {
                return BadRequest(new { message = "GameId is required." });
            }

            var userId = User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is missing." });
            }

            try
            {
                var result = await _gameService.HandleDisconnection(gameId, userId);
                if (!result)
                    return BadRequest(new { message = "Failed to handle disconnection." });

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
        public string GameId { get; set; } = string.Empty;
    }

    public class GameActionRequest
    {
        public string GameId { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public dynamic Parameters { get; set; } = new { };
    }
}
