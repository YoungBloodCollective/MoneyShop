using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MoneyShop.DomainModel.Entities;
using MoneyShop.ServiceInterface.Interfaces.Lead;
using MoneyShop.ServiceInterface.Dtos.Lead;
using MoneyShop.Infrastructure.EntityFramework.DBContext;

namespace MoneyShop.ServiceAdapters.Services.Lead;

public class LeadCaptureService : ILeadCaptureService
{
    private readonly MoneyShopDbContext _context;
    private readonly ILogger<LeadCaptureService> _logger;

    public LeadCaptureService(
        MoneyShopDbContext context,
        ILogger<LeadCaptureService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<LeadCapture> CreateLeadAsync(int? userId, LeadCaptureRequest request, string source = "api")
    {
        var lead = new LeadCapture
        {
            UserId = userId,
            NumePrenume = request.NumePrenume,
            Telefon = request.Telefon,
            Email = request.Email,
            Oras = request.Oras,
            CrediteActive = request.CrediteActive,
            SoldTotalAprox = request.SoldTotalAprox,
            TipCreditor = request.TipCreditor,
            Intarzieri = request.Intarzieri,
            IntarzieriNumarAprox = request.IntarzieriNumarAprox,
            IntarzieriZileMax = request.IntarzieriZileMax,
            VenitNetLunar = request.VenitNetLunar,
            BonuriMasaAprox = request.BonuriMasaAprox,
            PoprireSauExecutorUltimii5Ani = request.PoprireSauExecutorUltimii5Ani,
            SituatiePoprireInchisa = request.SituatiePoprireInchisa,
            Source = source,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Add(lead);
        await _context.SaveChangesAsync();

        return lead;
    }

    public async Task<LeadSession?> LoadSessionAsync(string sessionKey)
    {
        return await _context.Set<LeadSession>()
            .FirstOrDefaultAsync(s => s.SessionKey == sessionKey &&
                (s.ExpiresAt == null || s.ExpiresAt > DateTime.UtcNow));
    }

    public async Task<LeadSession> SaveSessionAsync(LeadSession session)
    {
        session.UpdatedAt = DateTime.UtcNow;

        var existing = await _context.Set<LeadSession>()
            .FirstOrDefaultAsync(s => s.SessionKey == session.SessionKey);

        if (existing != null)
        {
            existing.Step = session.Step;
            existing.SessionDataJson = session.SessionDataJson;
            existing.UpdatedAt = session.UpdatedAt;
            existing.ExpiresAt = session.ExpiresAt;
            _context.Update(existing);
        }
        else
        {
            _context.Add(session);
        }

        await _context.SaveChangesAsync();
        return existing ?? session;
    }

    public async Task<LeadSession> InitSessionAsync(int? userId, string? conversationId)
    {
        var sessionKey = $"lead_session:{userId ?? 0}:{conversationId ?? "default"}";
        var session = new LeadSession
        {
            SessionKey = sessionKey,
            UserId = userId,
            ConversationId = conversationId,
            Step = 1,
            SessionDataJson = JsonSerializer.Serialize(new LeadSessionData()),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(7) // TTL 7 zile
        };

        return await SaveSessionAsync(session);
    }

    public async Task ClearSessionAsync(string sessionKey)
    {
        var session = await LoadSessionAsync(sessionKey);
        if (session != null)
        {
            _context.Remove(session);
            await _context.SaveChangesAsync();
        }
    }

    public static string GetPromptForStep(int step)
    {
        return step switch
        {
            1 => "Pentru a intelege situatia ta, te rog raspunde pe rand. Pasul 1/8: Care este numele si prenumele tau? (fara CNP/CI)",
            2 => "Pasul 2/8: Care este numarul tau de telefon? (doar numar, fara alte date sensibile)",
            3 => "Pasul 3/8: Care este adresa ta de email?",
            4 => "Pasul 4/8: Ai credite active in prezent? Raspunde cu DA sau NU.",
            5 => "Pasul 5/8: Ai avut intarzieri la plata in trecut? Raspunde cu DA sau NU. Daca DA, spune aproximativ cate zile au fost cele mai mari (30/60/90+).",
            6 => "Pasul 6/8: Care este venitul tau net lunar (cat intra pe card)? Daca ai bonuri/tichete de masa, scrie si suma aproximativa.",
            7 => "Pasul 7/8: Din ce oras esti?",
            8 => "Pasul 8/8: In ultimii 5 ani ai avut poprire pe salariu din cauza unui credit sau ai platit la executor / firma de recuperari? Raspunde cu DA sau NU. Daca DA, spune doar daca situatia este inchisa sau inca activa.",
            _ => "Multumesc! Am inregistrat informatiile."
        };
    }
}
