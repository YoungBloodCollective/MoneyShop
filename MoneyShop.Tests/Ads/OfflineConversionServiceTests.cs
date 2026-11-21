using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Ads;

namespace MoneyShop.Tests.Ads;

public class OfflineConversionServiceTests
{
    private static readonly DateTime Now = new(2030, 3, 1, 12, 0, 0, DateTimeKind.Utc);

    private static MoneyShopDbContext Db() =>
        new(new DbContextOptionsBuilder<MoneyShopDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static void Add(MoneyShopDbContext db, string? gclid, string status, DateTime createdAt, string phone = "0722000000")
    {
        db.Appointments.Add(new Appointment
        {
            Nume = "Pop", Prenume = "Ana", Judet = "", TipCredit = "", Telefon = phone, Email = "", Status = status,
            Gclid = gclid, CreatedAt = createdAt, UpdatedAt = createdAt,
        });
        db.SaveChanges();
    }

    [Fact]
    public async Task Only_qualified_leads_with_a_recent_click_are_reported_once()
    {
        var db = Db();
        Add(db, "GCLID_QUALIFIED_1", "In lucru", Now.AddDays(-3));
        Add(db, "GCLID_QUALIFIED_1", "Trimis Lead", Now.AddDays(-2));    // same click twice: reported once, at the first request
        Add(db, "GCLID_NEW_LEAD_2", "Nou", Now.AddDays(-1));              // not qualified yet
        Add(db, "GCLID_TOO_OLD_3", "In lucru", Now.AddDays(-120));        // older than Google accepts
        Add(db, null, "In lucru", Now.AddDays(-1));                        // not from an ad click
        Add(db, "GCLID_SIGNED_4", "Contactat", Now.AddDays(-5), "+40 733 111 222");
        db.AcordClients.Add(new AcordClient { UserId = 1, Token = "t", Nume = "X", Prenume = "Y", Telefon = "0733111222", SignedAt = Now.AddDays(-4), CreatedAt = Now.AddDays(-4) });
        db.SaveChanges();

        var result = await new OfflineConversionService(db).GetQualifiedAsync(Now);

        Assert.Equal(new[] { "GCLID_SIGNED_4", "GCLID_QUALIFIED_1" }, result.Select(r => r.Gclid).ToArray());
        Assert.Equal(Now.AddDays(-3), result[1].AtUtc);
    }

    [Fact]
    public void Csv_follows_the_google_ads_template()
    {
        var csv = OfflineConversionService.ToCsv(new[] { new MoneyShop.ServiceInterface.Interfaces.Ads.OfflineConversion("abc123XYZ_-", new DateTime(2030, 2, 27, 9, 5, 0, DateTimeKind.Utc)) });
        var lines = csv.Split("\r\n", StringSplitOptions.RemoveEmptyEntries);


        Assert.Equal("Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency", lines[0]);
        Assert.Equal("abc123XYZ_-,Lead calificat (CRM),2030-02-27 09:05:00+00:00,1,RON", lines[1]);
    }
}
