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

public class CostControlService : ICostControlService
{
    private readonly MoneyShopDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<CostControlService> _logger;
    private readonly decimal _budgetUsdMonth;

    public CostControlService(
        MoneyShopDbContext context,
        IConfiguration configuration,
        ILogger<CostControlService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
        _budgetUsdMonth = decimal.Parse(_configuration["OpenAI:BudgetUsdMonth"] ?? "150");
    }

    public async Task EnforceMonthlyBudgetAsync()
    {
        var monthKey = DateTime.UtcNow.ToString("yyyy-MM");
        var spent = await GetMonthlySpentAsync(monthKey);

        if (spent >= _budgetUsdMonth)
        {
            throw new InvalidOperationException("BUDGET_EXCEEDED");
        }
    }

    public async Task AddUsageAsync(decimal usdDelta, string? metadata = null)
    {
        var monthKey = DateTime.UtcNow.ToString("yyyy-MM");

        try
        {
            var existing = await _context.Set<ChatUsage>()
                .FirstOrDefaultAsync(u => u.MonthKey == monthKey);

            if (existing != null)
            {
                existing.UsdSpent += usdDelta;
                existing.UpdatedAt = DateTime.UtcNow;
                existing.MetaLast = metadata;
                _context.Update(existing);
            }
            else
            {
                var newUsage = new ChatUsage
                {
                    MonthKey = monthKey,
                    UsdSpent = usdDelta,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    MetaLast = metadata
                };
                _context.Add(newUsage);
            }

            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Nu s-a putut salva usage, continuam");
        }
    }

    private async Task<decimal> GetMonthlySpentAsync(string monthKey)
    {
        try
        {
            var usage = await _context.Set<ChatUsage>()
                .FirstOrDefaultAsync(u => u.MonthKey == monthKey);

            return usage?.UsdSpent ?? 0;
        }
        catch
        {
            return 0;
        }
    }

    public static decimal EstimateUsd(string model, int inputTokens, int outputTokens)
    {
        decimal inRate = 3.0m;
        decimal outRate = 6.0m;

        if (model.Contains("gpt-4o-mini"))
        {
            inRate = 0.25m;
            outRate = 1.0m;
        }

        return (inputTokens / 1_000_000m) * inRate + (outputTokens / 1_000_000m) * outRate;
    }
}
