using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Bson;

namespace CoupGameBackend.Models
{
    [BsonDiscriminator(Required = true)]
    [BsonKnownTypes(
        typeof(CoupActionParameters),
        typeof(StealActionParameters),
        typeof(AssassinateActionParameters),
        typeof(ExchangeActionParameters),
        typeof(ForeignAidActionParameters),
        typeof(TaxActionParameters),
        typeof(BlockActionParameters),
        typeof(ConcreteActionParameters))]
    public abstract class ActionParameters
    {
        public string TargetUserId { get; set; } = string.Empty;
    }

    [BsonDiscriminator("CoupActionParameters")]
    public class CoupActionParameters : ActionParameters 
    { 
        // Add properties specific to Coup action if needed
    }

    [BsonDiscriminator("StealActionParameters")]
    public class StealActionParameters : ActionParameters 
    { 
        // Add properties specific to Steal action if needed
    }

    [BsonDiscriminator("AssassinateActionParameters")]
    public class AssassinateActionParameters : ActionParameters 
    { 
        // Add properties specific to Assassinate action if needed
    }

    [BsonDiscriminator("ExchangeActionParameters")]
    public class ExchangeActionParameters : ActionParameters
    {
        public List<string> DrawnCards { get; set; } = new List<string>();
    }

    [BsonDiscriminator("ForeignAidActionParameters")]
    public class ForeignAidActionParameters : ActionParameters
    {
        // Add properties specific to Foreign Aid action if needed
    }

    [BsonDiscriminator("TaxActionParameters")]
    public class TaxActionParameters : ActionParameters
    {
        // Add properties specific to Tax action if needed
    }

    [BsonDiscriminator("BlockActionParameters")]
    public class BlockActionParameters : ActionParameters
    {
        public string? BlockOption { get; set; }
    }

    [BsonDiscriminator("ConcreteActionParameters")]
    public class ConcreteActionParameters : ActionParameters
    {
        // This class already inherits TargetUserId from ActionParameters
    }

    // Add a new class to handle responses
    public class PendingAction
    {
        [BsonElement("ActionType")]
        public string ActionType { get; set; } = string.Empty;
        [BsonElement("OriginalActionType")]
        public string OriginalActionType { get; set; } = string.Empty;
        [BsonElement("InitiatorId")]
        public string InitiatorId { get; set; } = string.Empty;
        [BsonElement("TargetId")]
        public string? TargetId { get; set; }
        [BsonElement("Parameters")]
        public ActionParameters? Parameters { get; set; }
        [BsonElement("IsActionResolved")]
        public bool IsActionResolved { get; set; } = false;
        [BsonElement("Timestamp")]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        [BsonElement("Responses")]
        public Dictionary<string, string> Responses { get; set; } = new Dictionary<string, string>();
        [BsonElement("Response")]
        public string? Response { get; set; }
    }
}