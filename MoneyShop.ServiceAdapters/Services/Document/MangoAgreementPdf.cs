using System;
using System.IO;
using iText.IO.Image;
using iText.Kernel.Font;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Borders;
using iText.Layout.Element;
using iText.Layout.Properties;
using MoneyShop.ServiceInterface.Interfaces.Document;

namespace MoneyShop.ServiceAdapters.Services.Document;

internal static class MangoAgreementPdf
{
    private const string Blank = "..............................";
    private const float BodySize = 10f;
    private const float TableSize = 9.5f;
    private const float RequestSize = 9.5f;

    private const string Title =
        "Informare precontractuala conform OUG 52/20.09.2016 privind contractele de credit oferite consumatorilor pentru bunuri imobile precum și modificarea OUG nr. 50/2010 privind contractele de credit pentru consumatori";

    public static byte[] Build(MangoAgreementPdfInput input, PdfFont regular, PdfFont bold, byte[]? logo)
    {
        using var memoryStream = new MemoryStream();
        var pdf = new PdfDocument(new PdfWriter(memoryStream));
        var document = new iText.Layout.Document(pdf);
        document.SetMargins(32, 50, 30, 50);
        document.SetFont(regular).SetFontSize(BodySize);

        var name = input.FullName;
        var date = input.SignedOn.ToString("yyyy/MM/dd");
        var birthDate = string.IsNullOrWhiteSpace(input.BirthDate) ? Blank : input.BirthDate;
        var email = string.IsNullOrWhiteSpace(input.Email) ? Blank : input.Email;

        AddLogo(document, logo);
        document.Add(new Paragraph(Title).SetTextAlignment(TextAlignment.CENTER).SetMarginTop(10).SetMarginBottom(6));
        document.Add(new Paragraph("1. Identitatea si datele de contact ale intermediarului de credit si reprezentant").SetMarginBottom(6));

        var intermediary = TwoColumnTable();
        AddRow(intermediary, "Intermediar de credit", "SC MANGO BROKER SRL, inmatriculata la Registrul Comertului nr. J2017001430226, avand CUI 37612556");
        AddRow(intermediary, "Adresa", "Str. Gandu nr. 1A, mansarda, Ap 4, Iasi");
        AddRow(intermediary, "Tel.", "+40723848318");
        AddRow(intermediary, "E-mail", "office@mangobroker.ro");
        AddRow(intermediary, "Adresa internet", "www.mangobroker.ro");
        AddRow(intermediary, "Reprezentant desemnat al intermediarului de credit", "POPIX BROKERAGE CONSULTING SRL, inmatriculata la Registrul Comertului nr. J2024018340008, avand CUI 50477260");
        AddRow(intermediary, "Adresa", "Str. Constantin Brancusi 8, Ramnicu Valcea, VL");
        AddRow(intermediary, "Tel.", "0744686946");
        AddRow(intermediary, "E-mail", "alex.moore@mangobroker.ro");
        AddRow(intermediary, "Adresa internet", "www.mangobroker.ro");
        AddRow(intermediary, "Tip de intermediar conf. OUG 52/20.09.2016", "NELEGAT, care NU presteaza servicii de consiliere\n\nNU SE PERCEPE COMISION CLIENTULUI");
        AddRow(intermediary, "Comision / stimulent incasat de intermediar / reprezentantul desemnat",
            "Suma nu se cunoaste cu exactitate. Cf. Art 10, OUG 52 / 2016 suma reala va fi furnizata la un moment ulterior, in FEIS (Fisa Europeana de Informatii Standard pusa la dispozitie de creditor). Suma nu afecteaza DAE, nefiind cost suportat de client.");
        intermediary.AddCell(new Cell(1, 2).SetPadding(4).SetFontSize(TableSize).Add(new Paragraph(
            "Intermediarul de credite este inscris in Registrul de la Autoritatea Națională pentru Protecția Consumatorilor, https://anpc.ro/intermediari-credite/")));
        document.Add(intermediary);

        document.Add(new Paragraph("2. Identitatea si datele de contact ale clientului").SetMarginTop(12).SetMarginBottom(6));
        var client = TwoColumnTable();
        AddRow(client, "Nume Prenume Client:", name);
        AddRow(client, "Telefon:", input.Telefon);
        AddRow(client, "E-mail:", email);
        document.Add(client);

        document.Add(new AreaBreak(AreaBreakType.NEXT_PAGE));
        AddNumbered(document, "3.", "Va aducem la cunostinta ca potrivit art.10 alin. 1, lit.(f) din OUG 52/20.09.2016 puteti depune reclamatii la nivel intern, in scris cu confirmare de primire la adresa punctului de lucru sau pe e-mail la adresa office@mangobroker.ro si alex.moore@mangobroker.ro");
        AddNumbered(document, "4.", "Va aducem la cunostinta ca potrivit art.10 alin. 1 din OUG 52/20.09.2016 intermediarul de credite sau reprezentantul desemnat are obligatia de a va furniza toate informatiile de mai sus in timp util dar nu mai putin de 5 zile calendaristice inainte de desfasurarea oricareia din activitatile de intermediere.");
        AddNumbered(document, "5.", "Conform art. 10 alin. 3 din OUG 52/20.09.2016, aveti dreptul de a opta pentru reducerea perioadei de 5 zile calendaristice, in mod expres, in scris prin semnarea anexei 1 la prezenta informare.", bold, 14);
        AddNumbered(document, "6.", "Conform art. 70 alin 2 din OUG 52/20.09.2016 consumatorul furnizeaza informatii corecte si complete pentru efectuarea unei evaluari corespunzatoare a bonitatii.");
        AddNumbered(document, "7.", "Conform art. 70 alin. 3 din OUG 52/20.09.2016 va avertizam ca in cazul in care creditorul nu este in masura sa efectueze o evaluare a bonitatii sau sa intreprinda verificarile necesare pentru evaluarea bonitatii, deoarece nu ati furnizat informatiile, creditul nu poate fi acordat.");
        AddNumbered(document, "8.", "Conform art. 99 alin 4 din OUG 52/20.09.2016 va informam ca la cererea dumneavoastra va putem furniza informatii despre variatiile nivelului comisioanelor platibile de diferiti creditori care ofera contracte de credit propuse consumatorilor.");
        document.Add(DateNameSignature(input, date, name).SetMarginTop(36));

        if (input.Oug52Waived)
        {
            document.Add(new AreaBreak(AreaBreakType.NEXT_PAGE));
            document.Add(new Paragraph("ANEXA 1 la\n" + Title).SetTextAlignment(TextAlignment.CENTER).SetMarginTop(120).SetMarginBottom(60));
            document.Add(new Paragraph(
                $"Subsemnatul(a) {name} nascut(a) la data {birthDate}, declar in mod expres ca optez pentru reducerea perioadei de 5 zile calendaristice la 0 (zero) zile. Astfel, autorizez intermediarul de credite sau reprezentantul desemnat sa inceapa activitatile de intermediere de la data semnarii prezentei anexe.")
                .SetTextAlignment(TextAlignment.JUSTIFIED).SetSpacingRatio(1).SetFixedLeading(18));
            document.Add(DateNameSignature(input, date, name).SetMarginTop(80));
        }

        document.Add(new AreaBreak(AreaBreakType.NEXT_PAGE));
        AddLogo(document, logo);
        document.Add(new Paragraph("SOLICITARE SERVICII").SetTextAlignment(TextAlignment.CENTER).SetMarginTop(8).SetMarginBottom(0));
        document.Add(new Paragraph($"Nr. {input.RequestNumber} / {date}").SetTextAlignment(TextAlignment.CENTER).SetMarginBottom(8));
        AddJustified(document, RequestSize, $"Subsemnatul(a) {name} nascut(a) la data {birthDate} solicit ca Mango Broker SRL cu sediul social in Iasi, Str. Gandu nr. 1A, mansarda, Ap.4, inregistrata la O.N.R.C. Iasi sub nr. J2017001430226, avand CUI 37612556, direct sau prin imputernicitii sai, sa intermedieze pentru mine produse si servicii bancare si / sau contracte de credit, de la orice institutie financiara bancara sau nebancara cu care colaboreaza.");
        AddJustified(document, RequestSize, "Prezenta solicitare nu implica nici o obligatie pecuniara a solicitantului fata de Mango Broker SRL si imputernicitii sai.");
        AddJustified(document, RequestSize, "Imi exprim in mod liber consimțământul pentru colectarea, prelucrarea si procesarea urmatoarelor date cu caracter personal, care imi apartin: nume, prenume, gen, varsta, numar de telefon, adresa e-mail, adresa de domiciliu, cetatenia, numarul de cont bancar, cod numeric personal, toate informatiile mentionate pe cartea de identitate, data nasterii, prenumele tatalui, prenumele mamei, informatii referitoare la active si / sau pasive (in functie de serviciul solicitat) de catre Mango Broker SRL si/sau orice imputernicit al acestuia, cu scopul de a intermedia pentru mine produse si servicii bancare si/sau contracte de credit, precum si in scop de administrare si arhivare.");
        AddJustified(document, RequestSize, "Imi exprim acordul de a face obiectul unei decizii bazate exclusiv pe prelucrarea automata, inclusiv crearea de profiluri.");
        AddJustified(document, RequestSize, "Declar ca am fost informat despre faptul ca Mango Broker SRL si imputernicitii acesteia vor prelucra datele mele cu caracter personal mai sus mentionate, pe o perioada de minimum 5 ani sau orice alta perioada de timp prevazuta de dispozitiile legale aplicabile in materia intermedierii de oferte.");
        AddJustified(document, RequestSize, "Declar că am fost informat despre faptul ca datele mele cu caracter personal vor fi transmise catre institutiile financiare bancare si nebancare cu care Mango Broker SRL si imputernicitii sai colaboreaza, precum şi catre colaboratorii externi ai Mango Broker SRL si imputernicitilor sai (notari, societați de asigurare, auditori şi evaluatori, agenții imobiliare, şi alții - daca este cazul), şi sunt de acord ca datele mele cu caracter personal sa fie transmise catre acesti terți, in calitatea lor de operatori asociati. Lista partenerilor actuali este accesibila la link-ul www.mangobroker.ro.");
        AddJustified(document, RequestSize, "Declar că am fost pe deplin informat despre drepturile mele prevazute de Regulamentul UE 679/2016, cu completarile aduse de Legea nr. 190/2018 privind măsurile de punere in aplicare a respectivului Regulament, in ceea ce priveşte prelucrarea datelor cu caracter personal, precum dreptul de acces, dreptul la rectificare, dreptul de retragere a consimtamantului, dreptul la stergere („dreptul de a fi uitat”), dreptul de opozitie, dreptul de portabilitate, dreptul de a depune plangere la Autoritatea pentru Supraveghere.");
        AddJustified(document, RequestSize, "Declar ca am fost informat ca imi pot exercita drepturile legale in ceea ce priveşte prelucrarea datelor cu caracter personal prin transmiterea unei notificari scrise catre Mango Broker SRL la adresa Iasi, Str. Gandu nr. 1A, mansarda, Ap 4 sau via e-mail la adresa office@mangobroker.ro.");
        AddJustified(document, RequestSize, $"Declar ca sunt de acord sa fiu contactat de catre Mango Broker SRL si / sau orice imputernicit al acestuia la numarul de telefon {input.Telefon} si / sau la adresa de e-mail {email}, pentru a-mi comunica orice fel de informatii legate de produsele bancare si de creditele pe care le-as putea contracta sau orice alte produse / servicii conexe despre care as putea fi interesat.");

        var closing = new Table(UnitValue.CreatePercentArray(new float[] { 50, 50 })).UseAllAvailableWidth().SetMarginTop(10).SetKeepTogether(true);
        var signatureCell = new Cell().SetBorder(Border.NO_BORDER).Add(new Paragraph("Semnatura"));
        AddSignature(signatureCell, input);
        closing.AddCell(signatureCell);
        closing.AddCell(new Cell().SetBorder(Border.NO_BORDER).SetPaddingLeft(120)
            .Add(new Paragraph("Data")).Add(new Paragraph(date)));
        document.Add(closing);

        document.Close();
        return memoryStream.ToArray();
    }

    private static void AddLogo(iText.Layout.Document document, byte[]? logo)
    {
        if (logo == null) return;
        document.Add(new Image(ImageDataFactory.Create(logo)).ScaleToFit(150, 42));
    }

    private static Table TwoColumnTable() =>
        new Table(UnitValue.CreatePercentArray(new float[] { 38, 62 })).UseAllAvailableWidth();

    private static void AddRow(Table table, string label, string value)
    {
        table.AddCell(new Cell().SetPadding(3.5f).SetFontSize(TableSize).Add(new Paragraph(label)));
        table.AddCell(new Cell().SetPadding(3.5f).SetFontSize(TableSize).Add(new Paragraph(value).SetTextAlignment(TextAlignment.JUSTIFIED).SetSpacingRatio(1)));
    }

    private static void AddNumbered(iText.Layout.Document document, string number, string text, PdfFont? font = null, float? size = null)
    {
        var paragraph = new Paragraph($"{number}  {text}")
            .SetTextAlignment(TextAlignment.JUSTIFIED)
            .SetSpacingRatio(1)
            .SetMarginLeft(36)
            .SetFirstLineIndent(-18)
            .SetMarginBottom(10);

        if (font != null) paragraph.SetFont(font);
        if (size.HasValue) paragraph.SetFontSize(size.Value);

        document.Add(paragraph);
    }

    private static void AddJustified(iText.Layout.Document document, float size, string text) =>
        document.Add(new Paragraph(text).SetFontSize(size).SetMultipliedLeading(1.12f).SetTextAlignment(TextAlignment.JUSTIFIED).SetSpacingRatio(1).SetMarginBottom(2));

    private static Table DateNameSignature(MangoAgreementPdfInput input, string date, string name)
    {
        var table = new Table(UnitValue.CreatePercentArray(new float[] { 50, 50 })).UseAllAvailableWidth().SetKeepTogether(true);
        table.AddCell(new Cell().SetBorder(Border.NO_BORDER)
            .Add(new Paragraph("Data")).Add(new Paragraph(date)));

        var right = new Cell().SetBorder(Border.NO_BORDER).SetPaddingLeft(50)
            .Add(new Paragraph("Nume si Prenume"))
            .Add(new Paragraph(name))
            .Add(new Paragraph("Semnatura").SetMarginTop(12));
        AddSignature(right, input);
        table.AddCell(right);

        return table;
    }

    private static void AddSignature(Cell cell, MangoAgreementPdfInput input)
    {
        cell.Add(new Image(ImageDataFactory.Create(input.SignaturePng)).ScaleToFit(150, 60));
        cell.Add(new Paragraph($"Semnat pe moneyshop.ro · {input.SignedOn:yyyy/MM/dd HH:mm}").SetFontSize(7));
    }
}
