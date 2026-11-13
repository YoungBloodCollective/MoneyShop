using System.Collections.Generic;
using iText.Kernel.Font;
using MoneyShop.ServiceInterface.Interfaces.Document;

namespace MoneyShop.ServiceAdapters.Services.Document;

internal static class PatriaCodebitorForm
{
    private const float PageHeight = 792f;

    private static readonly Dictionary<string, float> RelationBoxes = new()
    {
        ["sot"] = 91f,
        ["parinti"] = 132f,
        ["socri"] = 161.5f,
        ["copii"] = 190.5f,
        ["partener"] = 231.5f,
        ["frate"] = 273.5f,
    };

    private static readonly Dictionary<string, float> StareCivilaBoxes = new()
    {
        ["casatorit"] = 91.5f,
        ["necasatorit"] = 290.5f,
        ["divortat"] = 342.5f,
        ["vaduv"] = 382.5f,
    };

    private static readonly Dictionary<string, float> StudiiBoxes = new()
    {
        ["master"] = 91.5f,
        ["postuniversitare"] = 91.5f,
        ["universitare"] = 161.5f,
        ["postliceale"] = 203.5f,
        ["profesionala"] = 256.5f,
        ["liceu"] = 321.5f,
        ["gimnaziale"] = 357.5f,
        ["generala"] = 357.5f,
        ["primara"] = 427.5f,
    };

    private static readonly Dictionary<string, float> LocuintaBoxes = new()
    {
        ["proprietar"] = 92.5f,
        ["proprietar_ipoteca"] = 92.5f,
        ["chirie"] = 163.5f,
        ["cu_parintii"] = 201.5f,
    };

    public static byte[] Build(BankConsentPdfInput input, byte[] template, PdfFont font) =>
        Fill(input, template, font, input.CodebitorRelation);

    public static byte[] Fill(BankConsentPdfInput input, byte[] template, PdfFont font, string? relation)
    {
        using var form = new BankFormFiller(template, font);
        var address = RomanianAddress.Parse(input.Address);
        var (lastName, firstName) = !string.IsNullOrWhiteSpace(input.LastName)
            ? (input.LastName.ToUpperInvariant(), (input.FirstName ?? string.Empty).ToUpperInvariant())
            : PatriaCreditApplicationForm.SplitName(input.FullName);
        var hasName = !string.IsNullOrWhiteSpace(input.FullName);

        form.Text(1, 163f, Y(95.5f), 60f, BankFormFiller.Date(input.SignedOn), 7f)
            .Text(1, 447.5f, Y(95.6f), 10f, "X", 7f);

        Tick(form, RelationBoxes, relation, 140f);

        form.Text(1, 97f, Y(153f), 156f, lastName, 7f)
            .Text(1, 283f, Y(153f), 132f, firstName, 7f)
            .Text(1, 82f, Y(171.2f), 225f, input.Cnp, 7f)
            .Text(1, 314f, Y(171.2f), 120f, input.PlaceOfBirth, 7f)
            .Text(1, 439f, Y(171.2f), 75f, input.BirthDate, 7f)
            .Text(1, 82f, Y(188.2f), 95f, PatriaCreditApplicationForm.IdDocument(input), 7f)
            .Text(1, 183f, Y(188.2f), 90f, input.IssuedBy, 7f)
            .Text(1, 277f, Y(188.2f), 120f, input.IssueDate, 7f)
            .Text(1, 82f, Y(212.2f), 190f, input.Email, 7f)
            .Text(1, 223f, Y(357.5f), 85f, input.Telefon, 7f);

        if (hasName)
        {
            Tick(form, 409.5f, 190f);
            Tick(form, 283f, 213f);
        }

        Tick(form, StareCivilaBoxes, input.StareCivila, 237.5f);
        Tick(form, StudiiBoxes, input.Studii, 266.5f);

        form.Text(1, 99f, Y(308.3f), 148f, address.Street, 7f)
            .Text(1, 259f, Y(310.5f), 15f, address.Number, 7f)
            .Text(1, 284f, Y(310.5f), 26f, address.Block, 7f)
            .Text(1, 89f, Y(324.3f), 9f, address.Staircase, 7f)
            .Text(1, 108f, Y(324.3f), 9f, address.Floor, 7f)
            .Text(1, 128f, Y(324.3f), 12f, address.Apartment, 7f)
            .Text(1, 166f, Y(324.3f), 96f, address.Locality, 7f)
            .Text(1, 110f, Y(338.5f), 70f, address.County, 7f);

        if (address.County != null) Tick(form, 181.5f, 339.5f);
        Tick(form, LocuintaBoxes, input.StareLocativa, 374.5f);
        if (hasName) Tick(form, 91.5f, 405.5f);

        form.Text(1, 106f, Y(432.3f), 191f, input.FunctieActuala, 7f)
            .Text(1, 378f, Y(432.3f), 100f, input.VechimeTotalaLuni?.ToString(), 7f)
            .Text(1, 119f, Y(475.3f), 188f, input.NumeFirma, 7f)
            .Text(1, 118f, Y(600.5f), 240f, input.FunctieActuala, 7f);

        if (!string.IsNullOrWhiteSpace(input.NumeFirma) || !string.IsNullOrWhiteSpace(input.FunctieActuala))
            Tick(form, 82f, 671f);

        if (input.SignaturePng != null)
        {
            var date = BankFormFiller.Date(input.SignedOn);
            form.Text(3, 150f, Y(350.5f), 112f, input.FullName, 7f)
                .Signature(3, 82f, Y(373f), 110f, 21f, input.SignaturePng)
                .Text(3, 281f, Y(350.5f), 60f, date, 7f)
                .Text(3, 112f, Y(473.5f), 115f, input.FullName, 7f)
                .Signature(3, 108f, Y(493f), 90f, 16f, input.SignaturePng)
                .Text(3, 242f, Y(487.5f), 60f, date, 7f);
        }

        return form.Build();
    }

    private static float Y(float top) => PageHeight - top;

    private static void Tick(BankFormFiller form, IReadOnlyDictionary<string, float> boxes, string? key, float top)
    {
        if (key != null && boxes.TryGetValue(key, out var x)) Tick(form, x, top);
    }

    private static void Tick(BankFormFiller form, float x, float top) =>
        form.Text(1, x, Y(top), 10f, "X", 7f);
}
