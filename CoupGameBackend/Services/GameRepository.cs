using CoupGameBackend.Models;
using MongoDB.Driver;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace CoupGameBackend.Services
{
    public class GameRepository : IGameRepository
    {
        private readonly IMongoCollection<Game> _games;
        private readonly IUserRepository _userRepository;

        public GameRepository(IConfiguration configuration, IUserRepository userRepository)
        {
            var client = new MongoClient(configuration.GetConnectionString("MongoDB"));
            var database = client.GetDatabase("CoupGameDB");
            _games = database.GetCollection<Game>("Games");
            _userRepository = userRepository;
        }

        public async Task<Game> CreateGameAsync(Game game)
        {
            await _games.InsertOneAsync(game);
            return game;
        }

        public async Task DeleteGameAsync(string gameId)
        {
            await _games.DeleteOneAsync(g => g.Id == gameId);
        }

        public async Task<IEnumerable<Game>> GetPublicGamesAsync()
        {
            return await _games.Find(g => !g.IsPrivate).ToListAsync();
        }

        public async Task<Game?> GetGameByIdOrCodeAsync(string idOrCode)
        {
            return await _games.Find(g => g.Id == idOrCode || g.RoomCode == idOrCode).FirstOrDefaultAsync();
        }

        public async Task<Game?> GetGameByRoomCodeAsync(string roomCode)
        {
            return await _games.Find(g => g.RoomCode == roomCode).FirstOrDefaultAsync();
        }

        public async Task<string> GetGameIdForUser(string userId)
        {
            var game = await _games.Find(g => g.Players.Any(p => p.UserId == userId) || g.Spectators.Any(s => s.UserId == userId)).FirstOrDefaultAsync();
            return game?.Id ?? string.Empty;
        }

        public async Task<IEnumerable<Game>> SearchGamesAsync(string query)
        {
            var filter = Builders<Game>.Filter.Or(
                Builders<Game>.Filter.Regex(g => g.GameName, new MongoDB.Bson.BsonRegularExpression(query, "i")),
                Builders<Game>.Filter.Regex(g => g.RoomCode, new MongoDB.Bson.BsonRegularExpression(query, "i"))
            );
            return await _games.Find(filter).ToListAsync();
        }

        public async Task UpdateGameAsync(Game game)
        {
            await _games.ReplaceOneAsync(g => g.Id == game.Id, game);
        }

        /// <summary>
        /// Resets the game state to allow a restart.
        /// </summary>
        public async Task RestartGameAsync(string gameId)
        {
            var game = await GetGameByIdOrCodeAsync(gameId);
            if (game != null)
            {
                game.IsStarted = false;
                game.IsGameOver = false;
                game.CurrentTurnUserId = string.Empty;
                game.WinnerId = null;
                game.PendingAction = null;
                game.ActionInitiatorId = null;
                game.Players.ForEach(player =>
                {
                    player.Coins = 0;
                    player.Influences = 2; // Assuming each player starts with 2 influences
                    player.IsActive = true;
                    player.IsConnected = true; // Reset connection status
                    player.Hand.Clear();
                });
                game.CentralDeck = InitializeDeck(); // Implement deck initialization logic
                await UpdateGameAsync(game);
            }
        }

        /// <summary>
        /// Initializes the central deck with the appropriate cards.
        /// </summary>
        private List<Card> InitializeDeck()
        {
            var deck = new List<Card>();
            string[] roles = { "Duke", "Assassin", "Contessa", "Ambassador", "Captain" };

            foreach (var role in roles)
            {
                for (int i = 0; i < 3; i++)
                {
                    deck.Add(new Card { Name = role, Role = role });
                }
            }

            return deck;
        }

        private bool IsRoomCode(string input)
        {
            return input.Length == 4 && input.All(char.IsLetter);
        }

        public async Task<Game?> GetGameAsync(string idOrCode)
        {
            if (IsRoomCode(idOrCode))
            {
                return await GetGameByRoomCodeAsync(idOrCode);
            }
            else
            {
                return await GetGameByIdOrCodeAsync(idOrCode);
            }
        }

        public async Task<string> GetUsernameAsync(string userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            return user?.Username ?? "Unknown";
        }

        public async Task<string> GetGameIdAsync(string gameIdOrCode)
        {
            var game = await GetGameAsync(gameIdOrCode);
            return game?.Id ?? string.Empty;
        }
    }
}