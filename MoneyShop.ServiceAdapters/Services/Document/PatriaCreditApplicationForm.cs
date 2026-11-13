using System.Collections.Generic;
using iText.Kernel.Font;
using MoneyShop.ServiceInterface.Interfaces.Document;

namespace MoneyShop.ServiceAdapters.Services.Document;

/// <summary>
/// Anexa 7 - Cerere de credit, formularul pentru solicitant. Se completeaza doar ce stie
/// acordul despre client: identitatea, adresa de domiciliu, situatia personala si angajatorul.
/// Caseta creditului (tip, suma, moneda, perioada) si datele financiare raman ale brokerului,
/// care le completeaza impreuna cu clientul cand aleg produsul.
/// </summary>
internal static class PatriaCreditApplicationForm
{
    /// <summary>Nivelul de studii din acord → casuta de pe formular.</summary>
    private static readonly Dictionary<string, float> StudiiBoxes = new()
    {
        ["master"] = 39f,
        ["universitare"] = 122f,
        ["postliceale"] = 164f,
        ["liceu"] = 328f,
        ["gimnaziale"] = 372f,
    };

    /// <summary>
    /// Starea locativa din acord → casuta "Tip locuinta". Proprietarul cu ipoteca bifeaza
    /// tot proprietate personala: formularul nu are o casuta separata pentru el.
    /// </summary>
    private static readonly Dictionary<string, float> LocuintaBoxes = new()
    {
        ["proprietar"] = 41f,
        ["proprietar_ipoteca"] = 41f,
        ["chirie"] = 143f,
        ["cu_parintii"] = 195f,
    };

    /// <summary>
    /// Starea civila din acord → casuta. "casatorit" lipseste intentionat: formularul cere
    /// sa alegi intre "ambele persoane obtin venituri" si "o singura persoana", iar acordul
    /// nu stie care, asa ca alege brokerul.
    /// </summary>
    private static readonly Dictionary<string, float> StareCivilaBoxes = new()
    {
        ["necasatorit"] = 327f,
        ["divortat"] = 370f,
        ["vaduv"] = 403f,
    };

    public static byte[] Build(BankConsentPdfInput input, byte[] template, PdfFont font)
    {
        using var form = new BankFormFiller(template, font);
        var address = RomanianAddress.Parse(input.Address);
        var (lastName, firstName) = SplitName(input.FullName);

        // ── Pagina 1: identitatea ──
        form.Text(1, 32f, 306f, 210f, lastName, 8f)
            .Text(1, 248f, 306f, 170f, firstName, 8f)
            .Text(1, 32f, 286f, 275f, input.Cnp, 8f)
            .Text(1, 315f, 286f, 120f, input.PlaceOfBirth, 7f)
            .Text(1, 442f, 286f, 85f, Compact(input.BirthDate), 8f)
            .Text(1, 32f, 267f, 105f, IdDocument(input), 7f)
            .Text(1, 143f, 267f, 140f, input.IssuedBy, 7f)
            .Text(1, 292f, 267f, 105f, input.IssueDate, 7f)
            .Text(1, 32f, 244f, 215f, input.Email, 7f);

        Tick(form, 416f, 270f);
        Tick(form, StareCivilaBoxes, input.StareCivila, 211f);
        Tick(form, StudiiBoxes, input.Studii, 178.7f);

        // ── Pagina 1: adresa de domiciliu ──
        form.Text(1, 32f, 144f, 195f, address.Street, 7f)
            .Text(1, 236f, 144f, 25f, address.Number, 7f)
            .Text(1, 268f, 144f, 38f, address.Block, 7f)
            .Text(1, 32f, 125f, 20f, address.Staircase, 7f)
            .Text(1, 57f, 125f, 14f, address.Floor, 7f)
            .Text(1, 76f, 125f, 28f, address.Apartment, 7f)
            .Text(1, 109f, 125f, 140f, address.Locality, 7f)
            .Text(1, 32f, 105f, 95f, address.County, 7f)
            .Text(1, 153f, 81f, 150f, input.Telefon, 8f);

        if (address.County != null) Tick(form, 142f, 109f);
        Tick(form, LocuintaBoxes, input.StareLocativa, 59.9f);

        // ── Pagina 2: situatia profesionala ──
        form.Text(2, 32f, 677f, 350f, input.FunctieActuala, 7f)
            .Text(2, 399f, 677f, 100f, input.VechimeTotalaLuni?.ToString(), 7f)
            .Text(2, 32f, 632f, 270f, input.NumeFirma, 7f);

        // ── Pagina 4: semnatura solicitantului ──
        form.Text(4, 32f, 73f, 180f, input.FullName, 7f)
            .Signature(4, 220f, 64f, 120f, 24f, input.SignaturePng)
            .Text(4, 415f, 73f, 100f, BankFormFiller.Date(input.SignedOn), 7f);

        // ── Pagina 5: confirmarea primirii unui exemplar ──
        form.Text(5, 78f, 635.8f, 208f, input.FullName, 7f)
            .Signature(5, 75f, 616f, 115f, 22f, input.SignaturePng)
            .Text(5, 218f, 621f, 100f, BankFormFiller.Date(input.SignedOn), 7f);

        return form.Build();
    }

    private static void Tick(BankFormFiller form, IReadOnlyDictionary<string, float> boxes, string? key, float baseline)
    {
        if (key != null && boxes.TryGetValue(key, out var x)) Tick(form, x, baseline);
    }

    private static void Tick(BankFormFiller form, float x, float baseline) =>
        form.Text(1, x, baseline, 10f, "X", 7f);

    /// <summary>Formularul cere seria si numarul in aceeasi casuta.</summary>
    internal static string? IdDocument(BankConsentPdfInput input) =>
        string.IsNullOrWhiteSpace(input.IdSeries) && string.IsNullOrWhiteSpace(input.IdNumber)
            ? null
            : $"{input.IdSeries} {input.IdNumber}".Trim();

    /// <summary>Data nasterii se cere ca ZZLLAAAA, fara puncte.</summary>
    private static string? Compact(string? date) => date?.Replace(".", string.Empty);

    /// <summary>
    /// Acordul tine numele si prenumele impreuna, in ordinea "Prenume Nume"; formularul le
    /// cere separat. Primul cuvant e prenumele, restul numele de familie.
    /// </summary>
    internal static (string? Last, string? First) SplitName(string? fullName)
    {
        var parts = (fullName ?? string.Empty).Split(' ', System.StringSplitOptions.RemoveEmptyEntries);
        return parts.Length < 2
            ? (fullName, null)
            : (string.Join(' ', parts[1..]), parts[0]);
    }
}
