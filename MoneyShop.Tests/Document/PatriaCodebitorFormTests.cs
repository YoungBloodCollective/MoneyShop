using System;
using System.IO;
using iText.IO.Font;
using iText.Kernel.Font;
using iText.Kernel.Pdf;
using MoneyShop.ServiceAdapters.Services.Document;
using MoneyShop.ServiceInterface.Interfaces.Document;
using Xunit;

namespace MoneyShop.Tests.Document;

public class PatriaCodebitorFormTests
{
    private const string SignatureBase64 = "iVBORw0KGgoAAAANSUhEUgAAAMgAAAA8CAYAAAAjW/WRAAAB1UlEQVR4nO3YSW7CQBAFUI7AkXNzsskCWZh46q7B70ksI5f71yc2jwcAAAAAAAAAAAAAADDD8/nzWvtEzwYhvpVCUbi1veVQFG5j79IrCbdwdtEVhbauXOw7l8TjZ0MjQrzTYnhXa2xkaN0X4swPGd3Ppo0ZIXVchCPLrijFzAymyxJcudhKklhEINWXYNQyK0oykSFUXYAZy9u1KKXuJ8OgGWbYKiLcDiUp+56VZcgKBxYdbLXl2vyLXdYbyXTI2UPPspgVSrL717mMN5J5psxzLWeLmjVbUXYVYu2PJ836ryyH+km22ZbzZFrMDM/0l71bRB/mco4Ms6zJMOPW5+cM5xgx1+XnkeVAM8ywxezzqlSINaPnHX4u0Qccff29ooKuUIY1V95PyPlEHXzV0M8GsqcM1cvx7sx9h55NRADVQ98aztGAOxVjqUQpvg3d6VojjQq2czmWUpdibdgZ16ge/IhAUy0Dn40OpmLwo//9p/umZN3IgCoEf6YA5Z6rOebqsLIuwKilVYwbuCq4LEsQsaiK0dzZIKMWIeO3tlI0dSTYmYuYsQzczJaFy/TIogxMN/ulUxkoacTSKgPtHF1eZYA/ygBvlAG+UAYAAAAAAADI7RcJeliATknCRgAAAABJRU5ErkJggg==";

    private static BankConsentPdfInput SampleInput() => new()
    {
        FullName = "IOANA POPESCU TEST",
        Telefon = "0712345678",
        Email = "ioana.test@example.com",
        Cnp = "2900101123456",
        Address = "Mun.Bucuresti Sec.1 Str.Exemplu nr.12 bl.A2 sc.B et.3 ap.15",
        BirthDate = "01.01.1990",
        PlaceOfBirth = "Mun. Cluj-Napoca",
        IdSeries = "CJ",
        IdNumber = "123456",
        IssuedBy = "SPCLEP Cluj-Napoca",
        IssueDate = "15.03.2022",
        StareCivila = "casatorit",
        StareLocativa = "proprietar",
        Studii = "universitare",
        FunctieActuala = "Contabil",
        NumeFirma = "Exemplu Test SRL",
        VechimeTotalaLuni = 96,
        SignedOn = new DateTime(2026, 11, 13),
        SignaturePng = Convert.FromBase64String(SignatureBase64)
    };

    private static byte[] Template() =>
        File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "Assets", "patria-cerere-codebitor.pdf"));

    private static PdfFont Font() =>
        PdfFontFactory.CreateFont(Path.Combine(AppContext.BaseDirectory, "Fonts", "DejaVuSans.ttf"), PdfEncodings.IDENTITY_H);

    [Fact]
    public void Fill_ProducesThreePagePdfWithSignature()
    {
        var pdf = PatriaCodebitorForm.Fill(SampleInput(), Template(), Font(), "sot");

        using var document = new PdfDocument(new PdfReader(new MemoryStream(pdf)));
        Assert.Equal(3, document.GetNumberOfPages());

        var output = Environment.GetEnvironmentVariable("CODEBITOR_SAMPLE_OUT");
        if (!string.IsNullOrWhiteSpace(output)) File.WriteAllBytes(output, pdf);
    }

    [Fact]
    public void Build_WithoutSignature_StaysThreePagesAndOmitsSignatureBlock()
    {
        var input = SampleInput();
        input.SignaturePng = null;

        var signed = PatriaCodebitorForm.Fill(SampleInput(), Template(), Font(), null);
        var unsigned = PatriaCodebitorForm.Build(input, Template(), Font());

        using var document = new PdfDocument(new PdfReader(new MemoryStream(unsigned)));
        Assert.Equal(3, document.GetNumberOfPages());
        Assert.True(signed.Length > unsigned.Length);
    }
}
