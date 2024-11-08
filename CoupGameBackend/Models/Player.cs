using System.Collections.Generic;
using MongoDB.Bson.Serialization.Attributes;
namespace CoupGameBackend.Models
{
    public class Player
    {
        [BsonElement("UserId")]
        public string UserId { get; set; } = string.Empty;
        [BsonElement("Coins")]
        public int Coins { get; set; } = 0;
        [BsonElement("Username")]
        public string Username { get; set; } = string.Empty;
        [BsonElement("Influences")]
        public int Influences { get; set; } = 0;
        [BsonElement("IsActive")]
        public bool IsActive { get; set; } = true;
        [BsonElement("IsConnected")]
        public bool IsConnected { get; set; } = true;
        [BsonElement("Hand")]
        public List<Card> Hand { get; set; } = new List<Card>();
        [BsonElement("IsBot")]
        public bool IsBot { get; set; } = false;
    }

    public class Spectator
    {
        [BsonElement("UserId")]
        public string UserId { get; set; } = string.Empty;
        [BsonElement("Username")]
        public string Username { get; set; } = string.Empty;
        [BsonElement("IsConnected")]
        public bool IsConnected { get; set; } = true;
    }
}
