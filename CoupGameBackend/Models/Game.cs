using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;
using System.Collections.Generic;

namespace CoupGameBackend.Models
{
    public class Game
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;
        [BsonElement("GameName")]
        public string GameName { get; set; } = string.Empty;
        [BsonElement("PlayerCount")]
        public int PlayerCount { get; set; }
        [BsonElement("CreatedBy")]
        public string CreatedBy { get; set; } = string.Empty;
        [BsonElement("IsPrivate")]
        public bool IsPrivate { get; set; }
        [BsonElement("RoomCode")]
        public string RoomCode { get; set; } = string.Empty;
        [BsonElement("CreatedAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        [BsonElement("Players")]
        public List<Player> Players { get; set; } = new List<Player>();
        [BsonElement("Spectators")]
        public List<Spectator> Spectators { get; set; } = new List<Spectator>();
        [BsonElement("CentralDeck")]
        public List<Card> CentralDeck { get; set; } = new List<Card>();
        [BsonElement("CurrentTurnUserId")]
        public string CurrentTurnUserId { get; set; } = string.Empty;
        [BsonElement("IsGameOver")]
        public bool IsGameOver { get; set; } = false;
        [BsonElement("IsStarted")]
        public bool IsStarted { get; set; } = false;
        [BsonElement("WinnerId")]
        public string? WinnerId { get; set; }
        [BsonElement("LeaderId")]
        public string LeaderId { get; set; } = string.Empty;
        [BsonElement("PendingAction")]
        public PendingAction? PendingAction { get; set; }
        [BsonElement("ActionInitiatorId")]
        public string? ActionInitiatorId { get; set; }
        [BsonElement("ActionsHistory")]
        public List<ActionLog> ActionsHistory { get; set; } = new List<ActionLog>();
    }

    public class ActionLog
    {
        [BsonElement("Timestamp")]
        public DateTime Timestamp { get; set; }
        [BsonElement("PlayerId")]
        public string PlayerId { get; set; } = string.Empty;
        [BsonElement("Action")]
        public string Action { get; set; } = string.Empty;
        [BsonElement("TargetId")]
        public string? TargetId { get; set; }
    }

    public class Card
    {
        [BsonElement("Name")]
        public string Name { get; set; } = string.Empty;
        [BsonElement("Role")]
        public string Role { get; set; } = string.Empty;
        [BsonElement("IsRevealed")]
        public bool IsRevealed { get; set; } = false;
    }
}
