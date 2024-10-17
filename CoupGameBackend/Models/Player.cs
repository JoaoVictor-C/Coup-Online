using System.Collections.Generic;

namespace CoupGameBackend.Models
{
    public class Player
    {
        public string UserId { get; set; } = string.Empty;
        public int Coins { get; set; } = 0;
        public int Influences { get; set; } = 0;
        public bool IsActive { get; set; } = true;
        public List<Card> Hand { get; set; } = new List<Card>();
    }

    public class Spectator
    {
        public string UserId { get; set; } = string.Empty;
    }
}
