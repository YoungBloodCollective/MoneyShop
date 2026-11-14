using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using MoneyShop.DomainModel.Entities;
using MoneyShop.DomainServices.Repositories.Application;
using MoneyShop.ServiceAdapters.Services.Crm;

namespace MoneyShop.Tests.Crm;

public class CrmDashboardServiceTests
{
    private static CrmDashboardService BuildService()
    {
        var (_, db) = CrmServiceClientUnionTests.Build();
        var apps = db.Applications.IgnoreQueryFilters().ToList();
        int AppId(int userId) => apps.Single(a => a.UserId == userId).Id;
        var now = DateTime.UtcNow;
        db.ApplicationStatusHistories.AddRange(
            History(AppId(CrmServiceClientUnionTests.BothUser), now),
            History(AppId(CrmServiceClientUnionTests.BothUser), now),
            History(AppId(CrmServiceClientUnionTests.FileOnlyUser), now.AddMonths(-2)),
            History(AppId(CrmServiceClientUnionTests.OtherBrokerUser), now));
        db.SaveChanges();
        return new CrmDashboardService(new ApplicationRepository(db), db);
    }

    private static ApplicationStatusHistory History(int applicationId, DateTime at) => new()
    {
        ApplicationId = applicationId,
        ToStatus = "APROBAT_BANCA",
        ChangedAt = at,
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
    public void Status_slices_sum_to_the_number_of_files_in_scope()
    {
        var summary = BuildService().GetSummary();

        Assert.Equal(2, summary.StatusBreakdown.Sum(s => s.Count));
        Assert.Equal(1, summary.StatusBreakdown.Single(s => s.Key == "analiza").Count);
        Assert.Equal(1, summary.StatusBreakdown.Single(s => s.Key == "banca").Count);
    }

    [Fact]
    public void ApprovedThisMonth_counts_distinct_files_from_status_history_in_scope()
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
