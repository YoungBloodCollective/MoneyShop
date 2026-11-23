using System;
using System.Linq;
using MoneyShop.ServiceAdapters.Services.Crm;
using MoneyShop.ServiceInterface.Interfaces.Crm;
using static MoneyShop.Tests.Crm.CrmServiceClientUnionTests;

namespace MoneyShop.Tests.Crm;

public class CrmWorkServiceTests
{
    internal static int SeedBank(MoneyShop.Infrastructure.EntityFramework.DBContext.MoneyShopDbContext db, string name, bool active = true)
    {
        var bank = db.Banks.FirstOrDefault(b => b.Name == name);
        if (bank == null)
        {
            bank = new MoneyShop.DomainModel.Entities.Bank { Name = name, Active = active };
            db.Banks.Add(bank);
            db.SaveChanges();
        }
        return bank.Id;
    }

    [Fact]
    public void Rows_belong_to_the_signed_in_broker_and_other_brokers_cannot_see_or_change_them()
    {
        var (_, db) = Build();
        var work = new CrmWorkService(db);

        var task = work.AddTask(BothUser, "  Sună-l joi  ", new DateTime(2030, 1, 2, 8, 0, 0, DateTimeKind.Utc));
        var file = work.AddBankFile(BothUser, new CrmBankFileInput { BankId = SeedBank(db, "BCR"), CreditType = CreditTypes.Np, Amount = 50000, Status = BankFileStatuses.Trimis });
        work.SetTags(BothUser, new[] { ClientTagKeys.Dti, "INVENTAT", ClientTagKeys.ProblemeBc });

        Assert.Equal("Sună-l joi", task.Title);
        var mine = work.GetClientWork(BothUser);
        Assert.Single(mine.Tasks);
        Assert.Single(mine.BankFiles);
        Assert.Equal(new[] { ClientTagKeys.ProblemeBc, ClientTagKeys.Dti }, mine.Tags.ToArray());
        Assert.All(db.ClientTasks.ToList(), t => Assert.Equal(BrokerId, t.BrokerProfileId));

        db.BrokerScopeId = OtherBrokerId;
        Assert.Empty(work.GetClientWork(BothUser).Tasks);
        Assert.Null(work.SetTaskDone(task.Id, true));
        Assert.Null(work.UpdateBankFile(file.Id, new CrmBankFileInput { BankId = SeedBank(db, "X"), CreditType = CreditTypes.Np, Amount = 1, Status = BankFileStatuses.Disbursat }));
        Assert.False(work.DeleteBankFile(file.Id));
        Assert.Empty(work.GetBoard().BankFiles);
    }

    [Fact]
    public void Super_admin_rows_go_to_the_clients_broker()
    {
        var (_, db) = Build();
        db.BrokerScopeId = null;

        new CrmWorkService(db).AddTask(OtherBrokerUser, "Verifică BC", DateTime.UtcNow.AddDays(1));

        Assert.Equal(OtherBrokerId, db.ClientTasks.Single().BrokerProfileId);
    }

    [Fact]
    public void Changing_the_stage_moves_the_stage_date_and_the_board_names_the_client()
    {
        var (_, db) = Build();
        var work = new CrmWorkService(db);
        var file = work.AddBankFile(BothUser, new CrmBankFileInput { BankId = SeedBank(db, "ING"), CreditType = CreditTypes.Np, Amount = 80000, Status = BankFileStatuses.Trimis });
        var row = db.BankFiles.Single();
        row.StatusChangedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        db.SaveChanges();

        var same = work.UpdateBankFile(file.Id, new CrmBankFileInput { BankId = SeedBank(db, "ING"), CreditType = CreditTypes.Np, Amount = 90000, Status = BankFileStatuses.Trimis })!;
        Assert.Equal(new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc), same.StatusChangedAt);

        var moved = work.UpdateBankFile(file.Id, new CrmBankFileInput { BankId = SeedBank(db, "ING"), CreditType = CreditTypes.Np, Amount = 90000, Status = BankFileStatuses.Analiza })!;
        Assert.True(moved.StatusChangedAt > same.StatusChangedAt);
        Assert.Equal(90000m, moved.Amount);

        var board = work.GetBoard();
        Assert.Equal("Ion Popescu", board.BankFiles.Single().ClientName);
    }

    [Fact]
    public void Due_reminders_are_open_tasks_whose_time_came_and_were_not_sent()
    {
        var (_, db) = Build();
        var work = new CrmWorkService(db);
        var now = new DateTime(2030, 5, 1, 10, 0, 0, DateTimeKind.Utc);
        var due = work.AddTask(BothUser, "De sunat", now.AddMinutes(-1));
        work.AddTask(BothUser, "Mai târziu", now.AddHours(1));
        var done = work.AddTask(BothUser, "Gata", now.AddHours(-1));
        work.SetTaskDone(done.Id, true);

        db.BrokerScopeId = null;
        var reminders = work.GetDueReminders(now);
        Assert.Equal(new[] { due.Id }, reminders.Select(r => r.TaskId).ToArray());
        Assert.Equal("Ion Popescu", reminders[0].ClientName);
        Assert.Equal(BrokerId, reminders[0].BrokerProfileId);

        work.MarkReminderSent(due.Id, now);
        Assert.Empty(work.GetDueReminders(now));
    }

    [Fact]
    public void Client_list_carries_tags_and_the_latest_bank_stage()
    {
        var (crm, db) = Build();
        var work = new CrmWorkService(db);
        work.SetTags(FileOnlyUser, new[] { ClientTagKeys.DeRevenit });
        work.AddBankFile(FileOnlyUser, new CrmBankFileInput { BankId = SeedBank(db, "BT"), CreditType = CreditTypes.Np, Amount = 1000, Status = BankFileStatuses.Completari });

        var client = crm.GetClients().Single(c => c.UserId == FileOnlyUser);
        Assert.Equal(new[] { ClientTagKeys.DeRevenit }, client.Tags.ToArray());
        Assert.Equal(BankFileStatuses.Completari, client.BankFileStatus);
        Assert.Empty(crm.GetClients().Single(c => c.UserId == BothUser).Tags);
    }
}
