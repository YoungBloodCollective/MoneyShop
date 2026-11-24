using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using MoneyShop.DomainModel.Entities;
using MoneyShop.ServiceAdapters.Services.Crm;

namespace MoneyShop.Tests.Crm;

public class CrmDashboardServiceTests
{
    private static CrmDashboardService BuildService()
    {
        var (_, db) = CrmServiceClientUnionTests.Build();
        var now = DateTime.UtcNow;
        db.BankFiles.AddRange(
            File(CrmServiceClientUnionTests.BrokerId, CrmServiceClientUnionTests.FileOnlyUser, "ANALIZA", 10000, now.AddMonths(-2)),
            File(CrmServiceClientUnionTests.BrokerId, CrmServiceClientUnionTests.BothUser, "APROBAT_FINAL", 20000, now),
            File(CrmServiceClientUnionTests.BrokerId, CrmServiceClientUnionTests.BothUser, "DISBURSAT", 5000, now.AddMonths(-3)),
            File(CrmServiceClientUnionTests.OtherBrokerId, CrmServiceClientUnionTests.OtherBrokerUser, "DISBURSAT", 99000, now));
        db.SaveChanges();
        return new CrmDashboardService(db);
    }

    private static BankFile File(int broker, int userId, string status, decimal amount, DateTime at) => new()
    {
        BrokerProfileId = broker,
        UserId = userId,
        BankName = "Banca Test",
        Amount = amount,
        Status = status,
        StatusChangedAt = at,
        CreatedAt = at,
        UpdatedAt = at,
    };

    [Fact]
    public void ActiveClients_is_the_union_of_acord_and_file_clients()
    {
        var summary = BuildService().GetSummary();

        Assert.Equal(3, summary.ActiveClients);
    }

    [Fact]
    public void Signed_acords_without_file_task_counts_only_acord_only_clients()
    {
        var summary = BuildService().GetSummary();

        var task = summary.Tasks.Single(t => t.Kind == "acord");
        Assert.Equal(1, task.Count);
        Assert.Equal("Acorduri semnate fără dosar", task.Label);
        Assert.Equal(new[] { "documents", "approval", "acord", "birthday" }, summary.Tasks.Select(t => t.Kind).ToArray());
    }

    [Fact]
    public void Status_slices_sum_to_the_number_of_bank_files_in_scope()
    {
        var summary = BuildService().GetSummary();

        Assert.Equal(3, summary.StatusBreakdown.Sum(s => s.Count));
        Assert.Equal(1, summary.StatusBreakdown.Single(s => s.Key == "lucru").Count);
        Assert.Equal(1, summary.StatusBreakdown.Single(s => s.Key == "aprobate").Count);
        Assert.Equal(1, summary.StatusBreakdown.Single(s => s.Key == "disbursate").Count);
        Assert.Equal(0, summary.StatusBreakdown.Single(s => s.Key == "respinse").Count);
    }

    [Fact]
    public void Credit_volume_is_the_disbursed_bank_file_amount_in_scope()
    {
        var summary = BuildService().GetSummary();

        Assert.Equal(5000m, summary.CreditVolume);
        Assert.Equal(1, summary.FilesInProgress);
    }

    [Fact]
    public void ApprovedThisMonth_counts_bank_files_approved_this_month_in_scope()
    {
        var summary = BuildService().GetSummary();

        Assert.Equal(1, summary.ApprovedThisMonth);
    }

    [Fact]
    public void Recent_activities_include_acord_events()
    {
        var summary = BuildService().GetSummary();

        Assert.Contains(summary.RecentActivities, a => a.Kind == "acord" && a.Title == "Acord semnat de Andrei Vasile");
        Assert.Contains(summary.RecentActivities, a => a.Kind == "acord" && a.Title == "Acord început de Ion Popescu");
    }
}
