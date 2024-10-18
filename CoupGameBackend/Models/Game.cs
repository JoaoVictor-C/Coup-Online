using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Collections.Generic;

namespace CoupGameBackend.Models
{
    public class Game
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;
        public string GameName { get; set; } = string.Empty;
        public int PlayerCount { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public bool IsPrivate { get; set; }
        public string RoomCode { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public List<Player> Players { get; set; } = new List<Player>();
        public List<Spectator> Spectators { get; set; } = new List<Spectator>();
        public List<Card> CentralDeck { get; set; } = new List<Card>();
        public string CurrentTurnUserId { get; set; } = string.Empty;
        public bool IsGameOver { get; set; } = false;
        public bool IsStarted { get; set; } = false;
        public string? WinnerId { get; set; }
        public string LeaderId { get; set; } = string.Empty;
        public string? PendingAction { get; set; }
        public string? ActionInitiatorId { get; set; }
        public List<ActionLog> ActionsHistory { get; set; } = new List<ActionLog>();
    }

    public class ActionLog
    {
        public DateTime Timestamp { get; set; }
        public string PlayerId { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string? TargetId { get; set; }
    }

    public class Card
    {
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public bool IsRevealed { get; set; } = false;
    }

    public class PendingAction
    {
        public string ActionType { get; set; } = string.Empty;
        public string InitiatorId { get; set; } = string.Empty;
        public string? TargetId { get; set; }
        public ActionParameters Parameters { get; set; } = null!;
        public bool IsActionResolved { get; set; } = false;

        // Factory method to create PendingAction with appropriate ActionParameters
        public static PendingAction Create(string actionType, string initiatorId, string? targetId = null)
        {
            PendingAction pendingAction = new PendingAction
            {
                ActionType = actionType,
                InitiatorId = initiatorId,
                TargetId = targetId
            };

            pendingAction.Parameters = actionType.ToLower() switch
            {
                "coup" => new CoupActionParameters(),
                "steal" => new StealActionParameters(),
                "assassinate" => new AssassinateActionParameters(),
                // Add cases for other actions as needed
                _ => throw new ArgumentException("Invalid action type")
            };

            return pendingAction;
        }
    }
}
