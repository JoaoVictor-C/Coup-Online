using CoupGameBackend.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace CoupGameBackend.Services
{
    public class UserService : IUserService
    {
        private readonly IConfiguration _configuration;
        private readonly IUserRepository _userRepository;

        public UserService(IConfiguration configuration, IUserRepository userRepository)
        {
            _configuration = configuration;
            _userRepository = userRepository;
        }

        public async Task<string> Authenticate(string username, string password)
        {
            var user = await _userRepository.GetByUsernameAsync(username);
            if (user == null)
                throw new UnauthorizedAccessException("Invalid username or password.");

            var passwordHash = ComputeSha256Hash(password);
            if (user.PasswordHash != passwordHash)
                throw new UnauthorizedAccessException("Invalid username or password.");

            var jwtSettings = _configuration.GetSection("JwtSettings");
            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id),
                new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
                new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
                // Add additional claims as needed
            };

            var secret = jwtSettings["Secret"];
            if (string.IsNullOrEmpty(secret))
                throw new InvalidOperationException("JWT Secret is not configured.");

            // Ensure the secret is at least 16 bytes (128 bits) long
            if (Encoding.UTF8.GetByteCount(secret) < 16)
            {
                throw new InvalidOperationException("JWT Secret must be at least 16 characters long.");
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: jwtSettings["Issuer"],
                audience: jwtSettings["Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(24),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        // Verify if the token is expired, if it is, return false
        public async Task<bool> VerifyToken(string token, string userId)
        {
            try
            {
                var jwtSettings = _configuration.GetSection("JwtSettings");
                var secret = jwtSettings["Secret"];
                if (string.IsNullOrEmpty(secret))
                    throw new InvalidOperationException("JWT Secret is not configured.");

                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));

                var tokenHandler = new JwtSecurityTokenHandler();
                var validationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwtSettings["Issuer"],
                    ValidateAudience = true,
                    ValidAudience = jwtSettings["Audience"],
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = key,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero,
                    NameClaimType = JwtRegisteredClaimNames.Sub
                };

                var principal = tokenHandler.ValidateToken(token, validationParameters, out SecurityToken validatedToken);
                var tokenUserId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(tokenUserId))
                {
                    Console.WriteLine("Token does not contain a valid 'sub' claim.");
                    return false;
                }
                if (tokenUserId != userId)
                {
                    Console.WriteLine($"Token user ID ({tokenUserId}) does not match the provided user ID ({userId}).");
                    return false;
                }

                return true;
            }
            catch (SecurityTokenExpiredException ex)
            {
                Console.WriteLine($"Token expired: {ex.Message}");
                return false;
            }
            catch (SecurityTokenInvalidIssuerException ex)
            {
                Console.WriteLine($"Invalid issuer: {ex.Message}");
                return false;
            }
            catch (SecurityTokenInvalidAudienceException ex)
            {
                Console.WriteLine($"Invalid audience: {ex.Message}");
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Token validation failed: {ex.Message}");
                return false;
            }
        }

        public async Task<string> Register(string username, string password, string email)
        {
            // Validate input
            if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password) || string.IsNullOrEmpty(email))
                throw new ArgumentException("Username, password, and email are required.");

            // Check if username already exists
            var existingUser = await _userRepository.GetByUsernameAsync(username);
            if (existingUser != null)
                throw new ArgumentException("Username already exists.");

            //Check if email already exists
            existingUser = await _userRepository.GetByEmailAsync(email);
            if (existingUser != null)
                throw new ArgumentException("Email already exists.");

            // Optionally, validate email format or uniqueness

            var passwordHash = ComputeSha256Hash(password);

            var user = new User
            {
                Username = username,
                Email = email,
                PasswordHash = passwordHash,
                CreatedAt = DateTime.UtcNow
            };

            await _userRepository.CreateAsync(user);

            return "Registration successful. You can now log in.";
        }

        private string ComputeSha256Hash(string rawData)
        {
            if (rawData == null)
                throw new ArgumentNullException(nameof(rawData));

            using (SHA256 sha256Hash = SHA256.Create())
            {
                byte[] bytes = sha256Hash.ComputeHash(Encoding.UTF8.GetBytes(rawData));

                StringBuilder builder = new StringBuilder();
                foreach (var b in bytes)
                {
                    builder.Append(b.ToString("x2"));
                }
                return builder.ToString();
            }
        }

        public async Task<User> GetCurrentUser(string token)
        {
            var jwtSettings = _configuration.GetSection("JwtSettings");
            var secret = jwtSettings["Secret"];
            if (string.IsNullOrEmpty(secret))
                throw new InvalidOperationException("JWT Secret is not configured.");

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var tokenHandler = new JwtSecurityTokenHandler();
            var tokenDecoded = tokenHandler.ReadJwtToken(token);
            var userId = tokenDecoded.Claims.First(claim => claim.Type == JwtRegisteredClaimNames.Sub).Value;
            var user = await _userRepository.GetByIdAsync(userId);
            return user;
        }
    }
}
