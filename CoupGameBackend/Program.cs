using CoupGameBackend.Hubs;
using CoupGameBackend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using MongoDB.Driver;
using MongoDB.Bson;
using Microsoft.OpenApi.Models;
using CoupGameBackend.Models;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Conventions;

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
    return client.GetDatabase("CoupGameDB");
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
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
        ClockSkew = TimeSpan.Zero // Optional: Eliminate clock skew
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
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Coup Game API", Version = "v1" });

    // Add JWT Authentication
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token in the text input below.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

// Register Repositories and Services
builder.Services.AddSingleton<IUserRepository, UserRepository>();
builder.Services.AddSingleton<IGameRepository, GameRepository>();

builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IGameService, GameService>();

// Register new services
builder.Services.AddScoped<IActionService, ActionService>();
builder.Services.AddScoped<IConnectionService, ConnectionService>();
builder.Services.AddScoped<ITurnService, TurnService>();
builder.Services.AddScoped<IChallengeService, ChallengeService>();
builder.Services.AddScoped<IGameStateService, GameStateService>();
builder.Services.AddSingleton<ISchedulingService, SchedulingService>();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy",
        corsPolicyBuilder => corsPolicyBuilder
            .WithOrigins("https://coup-online-nu.vercel.app", "http://localhost:3000")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
});

// Register MongoDB class maps
RegisterMongoClassMaps();

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

void RegisterMongoClassMaps()
{
    // Apply camel case convention globally
    var conventionPack = new ConventionPack { new CamelCaseElementNameConvention() };
    ConventionRegistry.Register("CamelCase", conventionPack, t => true);

    if (!BsonClassMap.IsClassMapRegistered(typeof(ActionParameters)))
    {
        BsonClassMap.RegisterClassMap<ActionParameters>(cm =>
        {
            cm.AutoMap();
            cm.SetIsRootClass(true);
            cm.SetDiscriminator("ActionParameters");
        });
    }

    RegisterConcreteClassMap<CoupActionParameters>("Coup");
    RegisterConcreteClassMap<StealActionParameters>("Steal");
    RegisterConcreteClassMap<AssassinateActionParameters>("Assassinate");
    RegisterConcreteClassMap<ExchangeActionParameters>("Exchange");
    RegisterConcreteClassMap<ForeignAidActionParameters>("ForeignAid");
    RegisterConcreteClassMap<TaxActionParameters>("Tax");
    RegisterConcreteClassMap<BlockActionParameters>("Block");
    RegisterConcreteClassMap<ConcreteActionParameters>("Concrete");
}

void RegisterConcreteClassMap<T>(string discriminator) where T : ActionParameters
{
    if (!BsonClassMap.IsClassMapRegistered(typeof(T)))
    {
        BsonClassMap.RegisterClassMap<T>(cm =>
        {
            cm.AutoMap();
            cm.SetDiscriminator(discriminator);
        });
    }
}
