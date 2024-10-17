using CoupGameBackend.Models;
using MongoDB.Driver;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CoupGameBackend.Services
{
    public class GameRepository : IGameRepository
    {
        private readonly IMongoCollection<Game> _games;

        public GameRepository(IConfiguration configuration)
        {
            var client = new MongoClient(configuration.GetConnectionString("MongoDB"));
            var database = client.GetDatabase("CoupGameDB");
            _games = database.GetCollection<Game>("Games");
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

        public async Task<Game> GetGameByIdAsync(string gameId)
        {
            return await _games.Find(g => g.Id == gameId).FirstOrDefaultAsync();
        }

        public async Task<Game> GetGameByRoomCodeAsync(string roomCode)
        {
            return await _games.Find(g => g.RoomCode == roomCode).FirstOrDefaultAsync();
        }

        public async Task<string> GetGameIdForUser(string userId)
        {
            var game = await _games.Find(g => g.Players.Any(p => p.UserId == userId)).FirstOrDefaultAsync();
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
    }
}
