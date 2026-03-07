using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MoneyShop.DomainModel.Entities;
using MoneyShop.ServiceInterface.Interfaces.Chat;
using MoneyShop.Infrastructure.EntityFramework.DBContext;

namespace MoneyShop.ServiceAdapters.Services.Chat;

public class RateLimitService : IRateLimitService
{
    private readonly MoneyShopDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<RateLimitService> _logger;
    private readonly int _limitPerMinute;
    private readonly int _limitPerDay;

    public RateLimitService(
        MoneyShopDbContext context,
        IConfiguration configuration,
        ILogger<RateLimitService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
        _limitPerMinute = int.Parse(_configuration["Chat:RateLimitPerMinute"] ?? "20");
        _limitPerDay = int.Parse(_configuration["Chat:RateLimitPerDay"] ?? "200");
    }

    public async Task EnforceRateLimitAsync(int userId)
    {
        var now = DateTime.UtcNow;
        var minuteKey = now.ToString("yyyy-MM-ddTHH:mm");
        var dayKey = now.ToString("yyyy-MM-dd");

        // Check per-minute limit
        var minuteCount = await GetOrIncrementCountAsync($"rl:min:{userId}:{minuteKey}", 120);
        if (minuteCount > _limitPerMinute)
        {
            throw new InvalidOperationException("RATE_LIMIT_MINUTE");
        }

        // Check per-day limit
        var dayCount = await GetOrIncrementCountAsync($"rl:day:{userId}:{dayKey}", 2 * 24 * 3600);
        if (dayCount > _limitPerDay)
        {
            throw new InvalidOperationException("RATE_LIMIT_DAY");
        }
    }

    private async Task<int> GetOrIncrementCountAsync(string key, int ttlSeconds)
    {
        var existing = await _context.Set<ChatRateLimit>()
            .FirstOrDefaultAsync(r => r.RateLimitKey == key);

        if (existing != null)
        {
            existing.Count++;
            existing.UpdatedAt = DateTime.UtcNow;
            if (ttlSeconds > 0)
            {
                existing.ExpiresAt = DateTime.UtcNow.AddSeconds(ttlSeconds);
            }
            _context.Update(existing);
            await _context.SaveChangesAsync();
            return existing.Count;
        }
        else
        {
            var newLimit = new ChatRateLimit
            {
                RateLimitKey = key,
                Count = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                ExpiresAt = ttlSeconds > 0 ? DateTime.UtcNow.AddSeconds(ttlSeconds) : null
            };
            _context.Add(newLimit);
            await _context.SaveChangesAsync();
            return 1;
        }
    }
}
