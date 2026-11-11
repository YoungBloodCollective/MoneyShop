using MoneyShop.ServiceAdapters.Services.BcReport;
using Xunit;

namespace MoneyShop.Tests.BcReport;

public class BcReportParserSubjectTests
{
    private const string Header = """
        ========== PAGE 1 ==========

        Situaţia Înscrierii la Biroul de Credit
        pentru
        1990101123456 Data naşterii:
        CNP/CUI: 01-01-1990
        Popescu Ion Test
        Numele:
        Adresa: STR Exemplu 1 BL.1,SC.A,ET.1,APT.1
        Localitatea: BUCURESTI SECTORUL 1 Judeţul:
        BUCURESTI
        Codul poştal: 010101 Telefon: 0700000000
        Data emiterii: 05-11-2026 10:00:00 Scopul emiterii: Eliberarea Situatiei Inscrierii
        """;

    [Fact]
    public void Cnp_is_taken_from_the_13_digit_token_not_from_the_date_next_to_the_label()
    {
        var result = new BcReportParserService().ParseText(Header);
        Assert.Equal("*********3456", result.Data.SubjectCnp);
    }

    [Fact]
    public void Cnp_is_never_stored_in_full()
    {
        var result = new BcReportParserService().ParseText(Header);
        Assert.DoesNotContain("1990101123456", result.Data.SubjectCnp);
        Assert.StartsWith("*********", result.Data.SubjectCnp);
    }

    [Fact]
    public void Name_is_the_line_before_the_label_not_the_address_after_it()
    {
        var result = new BcReportParserService().ParseText(Header);
        Assert.Equal("Popescu Ion Test", result.Data.SubjectName);
    }

    [Fact]
    public void Report_date_is_parsed()
    {
        var result = new BcReportParserService().ParseText(Header);
        Assert.Equal("05-11-2026", result.Data.ReportDate);
    }

    [Fact]
    public void Cnp_falls_back_to_the_pentru_cnp_line_when_the_header_has_no_birth_date_line()
    {
        var text = "Situaţia Înscrierii la Biroul de Credit pentru CNP/CUI 1990101123456\nNumele: Popescu Ion Test\n";
        var result = new BcReportParserService().ParseText(text);
        Assert.Equal("*********3456", result.Data.SubjectCnp);
        Assert.Equal("Popescu Ion Test", result.Data.SubjectName);
    }

    [Fact]
    public void Missing_subject_data_is_reported_as_warnings_not_as_wrong_values()
    {
        var result = new BcReportParserService().ParseText("Data emiterii: 05-11-2026\n");
        Assert.Null(result.Data.SubjectCnp);
        Assert.Null(result.Data.SubjectName);
        Assert.Contains(result.Warnings, w => w.Contains("CNP"));
    }
}
