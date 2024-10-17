using CoupGameBackend.Models;
using CoupGameBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace CoupGameBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class RoomsController : ControllerBase
    {
        private readonly IGameService _gameService;

        public RoomsController(IGameService gameService)
        {
            _gameService = gameService;
        }

        /// <summary>
        /// Retrieves all public game rooms.
        /// GET: api/rooms/public
        /// </summary>
        [HttpGet("public")]
        public async Task<ActionResult<IEnumerable<Game>>> GetPublicRooms()
        {
            var publicGames = await _gameService.GetPublicGamesAsync();
            return Ok(publicGames);
        }

        /// <summary>
        /// Searches game rooms based on a query string.
        /// GET: api/rooms/search?query=yourQuery
        /// </summary>
        [HttpGet("search")]
        public async Task<ActionResult<IEnumerable<Game>>> SearchRooms([FromQuery] string query)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return BadRequest(new { message = "Query parameter cannot be empty." });
            }

            var searchedGames = await _gameService.SearchGamesAsync(query);
            return Ok(searchedGames);
        }

        /// <summary>
        /// Creates a new game room.
        /// POST: api/rooms
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<Game>> CreateRoom([FromBody] CreateGameRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is missing." });
            }

            try
            {
                var game = await _gameService.CreateGame(userId, request);
                return CreatedAtAction(nameof(GetPublicRooms), new { id = game.Id }, game);
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
    }
}
