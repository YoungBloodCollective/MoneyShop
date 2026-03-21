using System;
using System.Linq;
using System.Text.Json;
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

    public UserFinancialDataEntity SaveFinancialData(int userId, ScoringRequest request, ScoringResult result)
    {
        decimal venitTotal = request.SalariuNet;
        if (request.BonuriMasa == true && request.SumaBonuriMasa.HasValue)
            venitTotal += request.SumaBonuriMasa.Value;

        decimal rataTotalaLunara = 0;
        if (request.SoldTotal.HasValue)
            rataTotalaLunara = request.SoldTotal.Value * 0.05m / 12;

        var existing = _userFinancialDataRepository.Get()
            .FirstOrDefault(f => f.UserId == userId);

        if (existing != null)
        {
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

    public UserFinancialDataEntity SaveManualFinancialData(int userId, ManualFinancialDataDto dto)
    {
        var salaries = new[] { dto.Salariu1, dto.Salariu2, dto.Salariu3 }
            .Where(s => s.HasValue && s.Value > 0)
            .Select(s => s!.Value)
            .ToList();

        decimal salariuNet = salaries.Count > 0 ? salaries.Average() : 0;
        decimal soldTotal = dto.Credits.Sum(c => c.RemainingAmount);
        decimal rataTotalaLunara = dto.Credits.Sum(c => c.MonthlyPayment);
        int nrCredite = dto.Credits.Count;

        decimal venitTotal = salariuNet;
        if (dto.BonuriMasa == true && dto.SumaBonuriMasa.HasValue)
            venitTotal += dto.SumaBonuriMasa.Value;

        decimal dti = venitTotal > 0 ? rataTotalaLunara / venitTotal : 0;

        string scoringLevel = dti switch
        {
            <= 0.30m => "foarte_mare",
            <= 0.40m => "mare",
            <= 0.50m => "bun",
            <= 0.55m => "conditii_speciale",
            _ => "foarte_scazut"
        };

        string creditsJson = JsonSerializer.Serialize(dto.Credits, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        var existing = _userFinancialDataRepository.Get()
            .FirstOrDefault(f => f.UserId == userId);

        if (existing != null)
        {
            existing.Salariu1 = dto.Salariu1;
            existing.Salariu2 = dto.Salariu2;
            existing.Salariu3 = dto.Salariu3;
            existing.SalariuNet = salariuNet;
            existing.BonuriMasa = dto.BonuriMasa;
            existing.SumaBonuriMasa = dto.SumaBonuriMasa;
            existing.VenitTotal = venitTotal;
            existing.CreditsJson = creditsJson;
            existing.SoldTotal = soldTotal;
            existing.RataTotalaLunara = rataTotalaLunara;
            existing.NrCrediteBanci = nrCredite;
            existing.Dti = dti;
            existing.ScoringLevel = scoringLevel;
            existing.LastUpdated = DateTime.UtcNow;
            _userFinancialDataRepository.Update(existing);
        }
        else
        {
            existing = new UserFinancialDataEntity
            {
                UserId = userId,
                Salariu1 = dto.Salariu1,
                Salariu2 = dto.Salariu2,
                Salariu3 = dto.Salariu3,
                SalariuNet = salariuNet,
                BonuriMasa = dto.BonuriMasa,
                SumaBonuriMasa = dto.SumaBonuriMasa,
                VenitTotal = venitTotal,
                CreditsJson = creditsJson,
                SoldTotal = soldTotal,
                RataTotalaLunara = rataTotalaLunara,
                NrCrediteBanci = nrCredite,
                Dti = dti,
                ScoringLevel = scoringLevel,
                CreatedAt = DateTime.UtcNow,
                LastUpdated = DateTime.UtcNow
            };
            _userFinancialDataRepository.Insert(existing);
        }

        _context.SaveChanges();
        return existing;
    }

    public UserFinancialDataEntity? GetFinancialData(int userId)
    {
        return _userFinancialDataRepository.Get()
            .FirstOrDefault(f => f.UserId == userId);
    }
}
