using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Crm;

namespace MoneyShop.Tests.Crm;

public class ClientTimelineServiceTests
{
    private static readonly DateTime T0 = new(2030, 1, 7, 8, 0, 0, DateTimeKind.Utc);

    [Theory]
    [InlineData("+40 722 000 000", "722000000")]
    [InlineData("0040722000000", "722000000")]
    [InlineData("0722-000-000", "722000000")]
    [InlineData("722000000", "722000000")]
    [InlineData(null, "")]
    public void Phones_are_compared_without_prefix(string? input, string expected)
    {
        Assert.Equal(expected, ClientTimelineService.NormalizePhone(input));
    }

    [Fact]
    public void Note_times_are_read_back_in_utc()
    {
        // 7 January: Romania is UTC+2.
        Assert.Equal(new DateTime(2030, 1, 7, 8, 30, 0, DateTimeKind.Utc), ClientTimelineService.ParseNoteTime("[07.01.2030 10:30, Alex] A răspuns"));
        Assert.Null(ClientTimelineService.ParseNoteTime("notă veche fără dată"));
    }

    [Fact]
    public async Task Timeline_joins_appointments_notes_reports_and_files_newest_first()
    {
        var db = new MoneyShopDbContext(new DbContextOptionsBuilder<MoneyShopDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        db.Utilizatoris.Add(new Utilizatori { IdUtilizator = 5, Nume = "Ana", Prenume = "Pop", NumarTelefon = "+40722000000" });
        db.Appointments.Add(new Appointment
        {
            Nume = "Pop", Prenume = "Ana", Judet = "", TipCredit = "", Telefon = "0722 000 000", Email = "", Status = "Contactat",
            Source = "site", ScheduledAt = T0.AddDays(1), CreatedAt = T0, UpdatedAt = T0,
            Notes = "[09.01.2030 12:00, Alex] Revin la altă oră\n[08.01.2030 12:00, Alex] Nu a răspuns",
        });
        db.Appointments.Add(new Appointment
        {
            Nume = "Alt", Prenume = "Client", Judet = "", TipCredit = "", Telefon = "0733111222", Email = "", Status = "Nou",
            CreatedAt = T0, UpdatedAt = T0,
        });
        db.BcReports.Add(new BcReport { UserId = 5, ReportId = "r1", FicoScore = 640, CreatedAt = T0.AddDays(3) });
        db.Applications.Add(new Application { Id = 9, UserId = 5, CreatedAt = T0.AddDays(4), UpdatedAt = T0.AddDays(4) });
        db.ApplicationStatusHistories.Add(new ApplicationStatusHistory { ApplicationId = 9, FromStatus = "INREGISTRAT", ToStatus = "IN_ANALIZA", ChangedAt = T0.AddDays(5) });
        db.SaveChanges();

        var items = await new ClientTimelineService(db).GetAsync(5);

        Assert.Equal(new[] { "status", "application", "bc", "note", "note", "appointment" }, items.Select(i => i.Kind).ToArray());
        Assert.Equal("Dosar #9: Înregistrat → În analiză", items[0].Title);
        Assert.Equal("Scor FICO 640", items[2].Detail);
        Assert.Contains("Contactat", items[5].Detail);
        Assert.DoesNotContain(items, i => i.Detail?.Contains("0733") == true);
    }

    [Fact]
    public async Task Unknown_user_has_an_empty_timeline()
    {
        var db = new MoneyShopDbContext(new DbContextOptionsBuilder<MoneyShopDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        Assert.Empty(await new ClientTimelineService(db).GetAsync(42));
    }
}
