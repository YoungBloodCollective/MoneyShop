using System;
using System.Linq;
using MoneyShop.DomainModel.Entities;
using MoneyShop.ServiceInterface.Interfaces.User;
using MoneyShop.DomainServices.RepositoryInterfaces.User;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Simulator;
using UserFinancialDataEntity = MoneyShop.DomainModel.Entities.UserFinancialData;

namespace MoneyShop.ServiceAdapters.Services.User;

public class UserFinancialDataService : IUserFinancialDataService
{
    private readonly IUserFinancialDataRepository _userFinancialDataRepository;
    private readonly MoneyShopDbContext _context;
    private readonly IScoringService _scoringService;

    public UserFinancialDataService(
        IUserFinancialDataRepository userFinancialDataRepository,
        MoneyShopDbContext context,
        IScoringService scoringService)
    {
        _userFinancialDataRepository = userFinancialDataRepository;
        _context = context;
        _scoringService = scoringService;
    }

    /// <summary>
    /// Saves or updates user financial data from simulator calculation
    /// </summary>
    public UserFinancialDataEntity SaveFinancialData(int userId, ScoringRequest request, ScoringResult result)
    {
        // Calculate total income
        decimal venitTotal = request.SalariuNet;
        if (request.BonuriMasa == true && request.SumaBonuriMasa.HasValue)
        {
            venitTotal += request.SumaBonuriMasa.Value;
        }

        // Calculate total monthly rate (approximate)
        decimal rataTotalaLunara = 0;
        if (request.SoldTotal.HasValue)
        {
            rataTotalaLunara = request.SoldTotal.Value * 0.05m / 12; // ~5% per year / 12 months
        }

        // Get or create financial data
        var existing = _userFinancialDataRepository.Get()
            .FirstOrDefault(f => f.UserId == userId);

        if (existing != null)
        {
            // Update existing
            existing.SalariuNet = request.SalariuNet;
            existing.BonuriMasa = request.BonuriMasa;
            existing.SumaBonuriMasa = request.SumaBonuriMasa;
            existing.VenitTotal = venitTotal;
            existing.SoldTotal = request.SoldTotal;
            existing.RataTotalaLunara = rataTotalaLunara;
            existing.NrCrediteBanci = request.NrCrediteBanci;
            existing.NrIfn = request.NrIfn;
            existing.Poprire = request.Poprire;
            existing.Intarzieri = request.Intarzieri;
            existing.IntarzieriNumar = request.IntarzieriNumar;
            existing.Dti = result.Dti;
            existing.ScoringLevel = result.ScoringLevel;
            existing.RecommendedLevel = result.RecommendedLevel;
            existing.LastUpdated = DateTime.UtcNow;

            _userFinancialDataRepository.Update(existing);
        }
        else
        {
            // Create new
            existing = new UserFinancialDataEntity
            {
                UserId = userId,
                SalariuNet = request.SalariuNet,
                BonuriMasa = request.BonuriMasa,
                SumaBonuriMasa = request.SumaBonuriMasa,
                VenitTotal = venitTotal,
                SoldTotal = request.SoldTotal,
                RataTotalaLunara = rataTotalaLunara,
                NrCrediteBanci = request.NrCrediteBanci,
                NrIfn = request.NrIfn,
                Poprire = request.Poprire,
                Intarzieri = request.Intarzieri,
                IntarzieriNumar = request.IntarzieriNumar,
                Dti = result.Dti,
                ScoringLevel = result.ScoringLevel,
                RecommendedLevel = result.RecommendedLevel,
                CreatedAt = DateTime.UtcNow,
                LastUpdated = DateTime.UtcNow
            };

            _userFinancialDataRepository.Insert(existing);
        }

        _context.SaveChanges();
        return existing;
    }

    /// <summary>
    /// Gets user financial data
    /// </summary>
    public UserFinancialDataEntity? GetFinancialData(int userId)
    {
        return _userFinancialDataRepository.Get()
            .FirstOrDefault(f => f.UserId == userId);
    }
}
