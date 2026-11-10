using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Audit;
using MoneyShop.ServiceInterface.SharedDtos;

namespace MoneyShop.ServiceAdapters.Services.Audit;

public class AuditService : IAuditService
{
    private const string Unserializable = "<unserializable>";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        MaxDepth = 8
    };

    private readonly MoneyShopDbContext _context;
    private readonly DbContextOptions<MoneyShopDbContext> _options;
    private readonly CurrentUserDto _currentUser;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<AuditService> _logger;

    public AuditService(
        MoneyShopDbContext context,
        DbContextOptions<MoneyShopDbContext> options,
        CurrentUserDto currentUser,
        IHttpContextAccessor httpContextAccessor,
        ILogger<AuditService> logger)
    {
        _context = context;
        _options = options;
        _currentUser = currentUser;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    public void Log(string entityType, string entityId, string action, object? oldValue = null, object? newValue = null, string? reason = null)
    {
        try
        {
            var actor = _context.AuditActor;
            var authenticated = _currentUser?.IsAuthenticated == true;
            var row = new AuditEvent
            {
                OccurredAt = DateTime.UtcNow,
                ActorUserId = authenticated ? _currentUser!.Id : actor?.UserId,
                ActorRole = Truncate(authenticated ? _currentUser!.Role : actor?.Role, 20),
                ActorIp = Truncate(_httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString() ?? actor?.Ip, 45),
                BrokerProfileId = _context.BrokerScopeId is > 0 ? _context.BrokerScopeId : null,
                EntityType = Truncate(entityType, 40)!,
                EntityId = Truncate(entityId, 64)!,
                Action = Truncate(action, 40)!,
                OldValueJson = Serialize(oldValue),
                NewValueJson = Serialize(newValue),
                Reason = Truncate(reason, 500)
            };

            using var db = new MoneyShopDbContext(_options);
            db.AuditEvents.Add(row);
            db.SaveChanges();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Audit event {Action} on {EntityType} {EntityId} could not be written", action, entityType, entityId);
        }
    }

    private static string? Serialize(object? value)
    {
        if (value == null) return null;
        try
        {
            return JsonSerializer.Serialize(value, JsonOptions);
        }
        catch
        {
            return Unserializable;
        }
    }

    private static string? Truncate(string? value, int max) =>
        value == null || value.Length <= max ? value : value.Substring(0, max);
}
