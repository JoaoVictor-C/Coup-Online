using System.ComponentModel.DataAnnotations;

namespace CoupGameBackend.Models
{
    public class CreateGameRequest
    {
        [Required]
        [Range(2, 6, ErrorMessage = "Player count must be between 2 and 6.")]
        public int PlayerCount { get; set; }

        public string GameName { get; set; } = string.Empty;
    }
}
