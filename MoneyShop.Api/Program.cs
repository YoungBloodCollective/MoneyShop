using MoneyShop.Infrastructure.EntityFramework.Extensions.DependencyInjection;
using MoneyShop.Infrastructure.EntityFramework.Extensions.Configurations;
using MoneyShop.Infrastructure.EntityFramework.Extensions.LoggingConfiguration;
using MoneyShop.Infrastructure.EntityFramework.Extensions.Exceptions.Middleware;
using MoneyShop.ServiceInterface.SharedDtos;
using MoneyShop.ServiceAdapters.Mapping;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.ApplicationInsights.AspNetCore;
using Microsoft.ApplicationInsights.Extensibility;
using AutoMapper;
using System.Security.Claims;
using System.Text;
using MoneyShop.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// ── User Secrets (development only) ──
if (builder.Environment.IsDevelopment())
{
    builder.Configuration.AddUserSecrets<Program>();
}

// ── Kestrel config for development ──
if (builder.Environment.IsDevelopment())
{
    var localIp = builder.Configuration["LocalIP"];

    var urls = new List<string>
    {
        "http://localhost:5260",
        "https://localhost:7094"
    };

    if (!string.IsNullOrEmpty(localIp))
    {
        urls.Add($"http://{localIp}:5260");
        urls.Add($"https://{localIp}:7094");
    }

    builder.WebHost.UseUrls(urls.ToArray());

    builder.WebHost.ConfigureKestrel(options =>
    {
        options.Limits.MaxRequestBodySize = 20_000_000; // 20MB
    });
}

// ── Serilog Logging ──
builder.Host.ConfigureSerilogLogging(builder.Configuration);

// ── Controllers (API only, no views) ──
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

// ── FormOptions for large uploads (base64 images) ──
builder.Services.Configure<FormOptions>(options =>
{
    options.ValueLengthLimit = int.MaxValue;
    options.KeyLengthLimit = int.MaxValue;
    options.MultipartBodyLengthLimit = 20_000_000;
    options.MultipartBoundaryLengthLimit = int.MaxValue;
    options.MultipartHeadersLengthLimit = int.MaxValue;
    options.MultipartHeadersCountLimit = int.MaxValue;
    options.BufferBodyLengthLimit = 20_000_000;
    options.BufferBody = true;
    options.MemoryBufferThreshold = int.MaxValue;
});

// ── CORS for React Native (web, iOS, Android) ──
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactNative", policy =>
    {
        var origins = new List<string>
        {
            "http://localhost:8081",
            "http://localhost:8082",
            "http://localhost:19006",
            "http://localhost:19000",
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:3000",
            "exp://localhost:8081",
            "http://127.0.0.1:8081",
            "http://127.0.0.1:8082",
            "http://127.0.0.1:19006",
            "http://127.0.0.1:19000",
            "https://black-grass-037518603.6.azurestaticapps.net",
            "https://gentle-tree-0f5cdaa03.1.azurestaticapps.net",
            "null"
        };

        var localIp = builder.Configuration["LocalIP"];
        if (!string.IsNullOrEmpty(localIp))
        {
            origins.AddRange(new[]
            {
                $"http://{localIp}:8081",
                $"http://{localIp}:8082",
                $"http://{localIp}:19006",
                $"http://{localIp}:19000",
                $"exp://{localIp}:8081",
                $"http://{localIp}:5260"
            });
        }

        policy.WithOrigins(origins.ToArray())
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

// ── HttpClient factory ──
builder.Services.AddHttpClient();

// ── Typed HTTP clients for Brevo services (email + SMS) ──
builder.Services.AddHttpClient<MoneyShop.ServiceAdapters.Services.Otp.EmailService>();
builder.Services.AddHttpClient<MoneyShop.ServiceAdapters.Services.Otp.SmsService>();

// ── Typed HTTP client for Oblio invoicing ──
builder.Services.AddHttpClient<MoneyShop.ServiceAdapters.Services.Oblio.OblioApiService>();
builder.Services.AddScoped<MoneyShop.ServiceInterface.Interfaces.Oblio.IOblioApiService>(sp =>
    sp.GetRequiredService<MoneyShop.ServiceAdapters.Services.Oblio.OblioApiService>());

// ── Typed HTTP client for external KYC verification ──
builder.Services.AddHttpClient<MoneyShop.ServiceAdapters.Services.Kyc.ExternalKycService>();
builder.Services.AddScoped<MoneyShop.ServiceInterface.Interfaces.Kyc.IExternalKycService>(sp =>
    sp.GetRequiredService<MoneyShop.ServiceAdapters.Services.Kyc.ExternalKycService>());

// ── Chat services (Azure OpenAI assistant) ──
builder.Services.AddScoped<MoneyShop.ServiceInterface.Interfaces.Chat.IChatService, MoneyShop.ServiceAdapters.Services.Chat.OpenAIChatService>();
builder.Services.AddScoped<MoneyShop.ServiceInterface.Interfaces.Chat.IRateLimitService, MoneyShop.ServiceAdapters.Services.Chat.RateLimitService>();
builder.Services.AddScoped<MoneyShop.ServiceInterface.Interfaces.Chat.ICostControlService, MoneyShop.ServiceAdapters.Services.Chat.CostControlService>();
builder.Services.AddScoped<MoneyShop.ServiceInterface.Interfaces.Chat.IFaqCacheService, MoneyShop.ServiceAdapters.Services.Chat.FaqCacheService>();

// ── Swagger / OpenAPI with JWT security ──
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "MoneyShop API",
        Version = "v1",
        Description = "API for MoneyShop Fintech Platform",
        Contact = new OpenApiContact
        {
            Name = "MoneyShop Support",
            Email = "support@moneyshop.ro"
        }
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token.",
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
            Array.Empty<string>()
        }
    });
});

// ── Database Contexts (Infrastructure) ──
builder.Services.ConfigureDatabaseContexts(builder.Configuration);

// ── Dependency Injection (Infrastructure) ──
DependencyInjectionConfig.ConfigureServices(builder.Services);

// ── JWT Bearer Authentication ONLY (API-only, no cookies) ──
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"] ?? "MoneyShop_SecretKey_Minimum_32_Characters_Long_For_Security_2024";
var issuer = jwtSettings["Issuer"] ?? "MoneyShop";
var audience = jwtSettings["Audience"] ?? "MoneyShopUsers";

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
        ValidIssuer = issuer,
        ValidAudience = audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ClockSkew = TimeSpan.Zero
    };

    options.Events = new JwtBearerEvents
    {
        OnChallenge = context =>
        {
            context.HandleResponse();
            context.Response.StatusCode = 401;
            context.Response.ContentType = "application/json";
            var result = System.Text.Json.JsonSerializer.Serialize(new { message = "Unauthorized" });
            return context.Response.WriteAsync(result);
        }
    };
});

// ── JWT Token Generator ──
builder.Services.AddScoped<MoneyShop.Infrastructure.EntityFramework.Extensions.Security.JwtTokenGenerator>();

// ── CurrentUserDto from HTTP context claims ──
builder.Services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
builder.Services.AddScoped(s =>
{
    var accessor = s.GetService<IHttpContextAccessor>();
    var httpContext = accessor?.HttpContext;
    var claims = httpContext?.User?.Claims;

    var userIdClaim = claims?.FirstOrDefault(c => c.Type == "Id")?.Value
                   ?? claims?.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
    var userEmailClaim = claims?.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value;
    var userRoleClaim = claims?.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value;
    var isParsingSuccessful = int.TryParse(userIdClaim, out int id);

    return new CurrentUserDto
    {
        Id = id,
        IsAuthenticated = httpContext?.User?.Identity?.IsAuthenticated ?? false,
        FirstName = httpContext?.User?.Identity?.Name ?? string.Empty,
        Email = userEmailClaim ?? string.Empty,
        Role = userRoleClaim ?? string.Empty
    };
});

// ── AutoMapper ──
builder.Services.AddAutoMapper(cfg =>
{
    cfg.AddProfile<MappingProfile>();
});

// ── Application Insights (conditional) ──
var appInsightsConnectionString = builder.Configuration["ApplicationInsights:ConnectionString"];
if (!string.IsNullOrEmpty(appInsightsConnectionString))
{
    builder.Services.AddApplicationInsightsTelemetry(options =>
    {
        options.ConnectionString = appInsightsConnectionString;
    });

    builder.Services.ConfigureTelemetryModule<Microsoft.ApplicationInsights.Extensibility.Implementation.Tracing.DiagnosticsTelemetryModule>(
        (module, o) => { });

    Console.WriteLine("[MoneyShop.Api] Application Insights configured");
}
else
{
    builder.Services.AddSingleton(new Microsoft.ApplicationInsights.TelemetryClient(new Microsoft.ApplicationInsights.Extensibility.TelemetryConfiguration()));
    Console.WriteLine("[MoneyShop.Api] Application Insights connection string not found - telemetry disabled");
}

// ── SignalR (if needed for real-time features) ──
builder.Services.AddSignalR();

// ── Firebase Token Verifier ──
builder.Services.AddSingleton(sp =>
{
    var httpClient = sp.GetRequiredService<IHttpClientFactory>().CreateClient();
    return new FirebaseTokenVerifier("moneyshop-8b82b", httpClient);
});
Console.WriteLine("[MoneyShop.Api] Firebase token verifier registered (project: moneyshop-8b82b)");

// ── Build ──
var app = builder.Build();

Console.WriteLine($"[MoneyShop.Api] Environment: {app.Environment.EnvironmentName}");

// ── Exception Handler Middleware (Infrastructure) ──
app.UseRuntimeExceptionHandler();

// ── Routing ──
app.UseRouting();

// ── CORS (before auth) ──
app.UseCors("AllowReactNative");

// ── CORS preflight: respond to OPTIONS with 204 ──
app.Use(async (context, next) =>
{
    if (context.Request.Method == "OPTIONS")
    {
        context.Response.StatusCode = 204;
        return;
    }
    await next();
});

// ── Request logging (Development) ──
if (app.Environment.IsDevelopment())
{
    app.Use(async (context, next) =>
    {
        Console.WriteLine($"[API] {context.Request.Method} {context.Request.Path}{context.Request.QueryString}");
        await next();
    });
}

// ── Swagger (Development) ──
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "MoneyShop API v1");
        c.RoutePrefix = "swagger";
    });
}

// ── Authentication & Authorization ──
app.UseAuthentication();
app.UseAuthorization();

// ── Map Controllers (API only, no MVC routes) ──
app.MapControllers();

// ── Log URLs ──
Console.WriteLine($"[MoneyShop.Api] Application URLs:");
Console.WriteLine($"   HTTPS: https://localhost:7094");
Console.WriteLine($"   HTTP:  http://localhost:5260");
var localIp2 = builder.Configuration["LocalIP"];
if (!string.IsNullOrEmpty(localIp2))
{
    Console.WriteLine($"   HTTPS (Network): https://{localIp2}:7094");
    Console.WriteLine($"   HTTP  (Network): http://{localIp2}:5260");
}

app.Run();
