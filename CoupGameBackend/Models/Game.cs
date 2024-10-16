using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace CoupGameBackend.Models
{
    public class Game
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        public string GameName { get; set; } = string.Empty;

        public int PlayerCount { get; set; }

        public List<Player> Players { get; set; } = new List<Player>();

        public string CreatedBy { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public GameState CurrentState { get; set; } = GameState.WaitingForPlayers;

        public List<Card> CentralDeck { get; set; } = new List<Card>();

        // Add additional fields as necessary
    }

    public enum GameState
    {
        WaitingForPlayers,
        InProgress,
        Completed
    }

    public class Player
    {
        public string UserId { get; set; } = string.Empty;

        public string ConnectionId { get; set; } = string.Empty;

        public List<Card> Hand { get; set; } = new List<Card>();

        public int Coins { get; set; } = 2;

        public int Influences { get; set; } = 2;

        public bool IsActive { get; set; } = true;

        // Add additional fields as necessary
    }

    public class Card
    {
        public string Name { get; set; } = string.Empty;

        public string Role { get; set; } = string.Empty;

        // Additional properties can be added
    }
}