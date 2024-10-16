using CoupGameBackend.Hubs;
using CoupGameBackend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using MongoDB.Driver;
using MongoDB.Bson;

var builder = WebApplication.CreateBuilder(args);

// Configure MongoClientSettings with ServerApi
var mongoConnectionString = builder.Configuration.GetConnectionString("MongoDB");
if (string.IsNullOrEmpty(mongoConnectionString))
{
    throw new InvalidOperationException("MongoDB connection string is not configured.");
}

var mongoSettings = MongoClientSettings.FromConnectionString(mongoConnectionString);
mongoSettings.ServerApi = new ServerApi(ServerApiVersion.V1);

// Register MongoClient as a Singleton
builder.Services.AddSingleton<IMongoClient>(s => new MongoClient(mongoSettings));

// Register Database as a Singleton
builder.Services.AddSingleton(s =>
{
    var client = s.GetRequiredService<IMongoClient>();
    return client.GetDatabase("CoupOnline");
});

// Add services to the container.

// Configure JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secret = jwtSettings["Secret"];
if (string.IsNullOrEmpty(secret))
{
    throw new InvalidOperationException("JWT Secret is not configured properly.");
}

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret))
    };

    // Configure SignalR to use access token from query string
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];

            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) &&
                (path.StartsWithSegments("/gameHub")))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

// Add SignalR
builder.Services.AddSignalR();

// Add controllers
builder.Services.AddControllers();

// Add Swagger for API documentation
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register Repositories and Services
builder.Services.AddSingleton<IUserRepository, UserRepository>();
builder.Services.AddSingleton<IGameRepository, GameRepository>();
builder.Services.AddScoped<IUserService, UserService>(); // Changed to Scoped for better management
builder.Services.AddScoped<IGameService, GameService>(); // Changed to Scoped for better management

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy",
        corsPolicyBuilder => corsPolicyBuilder
            .WithOrigins("http://localhost:5132", "http://localhost:5173")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
});

var app = builder.Build();

// Connection verification
try
{
    var mongoClient = app.Services.GetRequiredService<IMongoClient>();
    var mongoDatabase = mongoClient.GetDatabase("CoupOnline");
    var command = new BsonDocument("ping", 1);
    mongoDatabase.RunCommand<BsonDocument>(command);
    Console.WriteLine("✅ Successfully connected to MongoDB!");
}
catch (Exception ex)
{
    Console.WriteLine($"❌ MongoDB connection failed: {ex.Message}");
    // Optionally, terminate the application if the database connection is critical
    Environment.Exit(-1);
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("CorsPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Map SignalR hubs
app.MapHub<GameHub>("/gameHub");

app.Run();
