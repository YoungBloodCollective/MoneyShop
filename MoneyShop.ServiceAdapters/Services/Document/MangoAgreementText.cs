using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MoneyShop.ServiceAdapters.Services.Document;

internal static class MangoAgreementText
{
    public const string DisplayTitle = "Acord prestare servicii prin Mango Broker SRL";

    public const string Title =
        "Informare precontractuala conform OUG 52/20.09.2016 privind contractele de credit oferite consumatorilor pentru bunuri imobile precum și modificarea OUG nr. 50/2010 privind contractele de credit pentru consumatori";

    public const string IntermediarySection = "1. Identitatea si datele de contact ale intermediarului de credit si reprezentant";
    public const string ClientSection = "2. Identitatea si datele de contact ale clientului";
    public const string RequestTitle = "SOLICITARE SERVICII";
    public const string EmphasizedPoint = "5.";

    public static readonly (string Label, string Value)[] IntermediaryRows =
    {
        ("Intermediar de credit", "SC MANGO BROKER SRL, inmatriculata la Registrul Comertului nr. J2017001430226, avand CUI 37612556"),
        ("Adresa", "Str. Gandu nr. 1A, mansarda, Ap 4, Iasi"),
        ("Tel.", "+40723848318"),
        ("E-mail", "office@mangobroker.ro"),
        ("Adresa internet", "www.mangobroker.ro"),
        ("Reprezentant desemnat al intermediarului de credit", "POPIX BROKERAGE CONSULTING SRL, inmatriculata la Registrul Comertului nr. J2024018340008, avand CUI 50477260"),
        ("Adresa", "Str. Constantin Brancusi 8, Ramnicu Valcea, VL"),
        ("Tel.", "0744686946"),
        ("E-mail", "alex.moore@mangobroker.ro"),
        ("Adresa internet", "www.mangobroker.ro"),
        ("Tip de intermediar conf. OUG 52/20.09.2016", "NELEGAT, care NU presteaza servicii de consiliere\n\nNU SE PERCEPE COMISION CLIENTULUI"),
        ("Comision / stimulent incasat de intermediar / reprezentantul desemnat", "Suma nu se cunoaste cu exactitate. Cf. Art 10, OUG 52 / 2016 suma reala va fi furnizata la un moment ulterior, in FEIS (Fisa Europeana de Informatii Standard pusa la dispozitie de creditor). Suma nu afecteaza DAE, nefiind cost suportat de client."),
    };

    public const string AnpcNote =
        "Intermediarul de credite este inscris in Registrul de la Autoritatea Națională pentru Protecția Consumatorilor, https://anpc.ro/intermediari-credite/";

    public static readonly (string Number, string Text)[] Points =
    {
        ("3.", "Va aducem la cunostinta ca potrivit art.10 alin. 1, lit.(f) din OUG 52/20.09.2016 puteti depune reclamatii la nivel intern, in scris cu confirmare de primire la adresa punctului de lucru sau pe e-mail la adresa office@mangobroker.ro si alex.moore@mangobroker.ro"),
        ("4.", "Va aducem la cunostinta ca potrivit art.10 alin. 1 din OUG 52/20.09.2016 intermediarul de credite sau reprezentantul desemnat are obligatia de a va furniza toate informatiile de mai sus in timp util dar nu mai putin de 5 zile calendaristice inainte de desfasurarea oricareia din activitatile de intermediere."),
        ("5.", "Conform art. 10 alin. 3 din OUG 52/20.09.2016, aveti dreptul de a opta pentru reducerea perioadei de 5 zile calendaristice, in mod expres, in scris prin semnarea anexei 1 la prezenta informare."),
        ("6.", "Conform art. 70 alin 2 din OUG 52/20.09.2016 consumatorul furnizeaza informatii corecte si complete pentru efectuarea unei evaluari corespunzatoare a bonitatii."),
        ("7.", "Conform art. 70 alin. 3 din OUG 52/20.09.2016 va avertizam ca in cazul in care creditorul nu este in masura sa efectueze o evaluare a bonitatii sau sa intreprinda verificarile necesare pentru evaluarea bonitatii, deoarece nu ati furnizat informatiile, creditul nu poate fi acordat."),
        ("8.", "Conform art. 99 alin 4 din OUG 52/20.09.2016 va informam ca la cererea dumneavoastra va putem furniza informatii despre variatiile nivelului comisioanelor platibile de diferiti creditori care ofera contracte de credit propuse consumatorilor."),
    };

    public static string AnnexDeclaration(string name, string birthDate) =>
        $"Subsemnatul(a) {name} nascut(a) la data {birthDate}, declar in mod expres ca optez pentru reducerea perioadei de 5 zile calendaristice la 0 (zero) zile. Astfel, autorizez intermediarul de credite sau reprezentantul desemnat sa inceapa activitatile de intermediere de la data semnarii prezentei anexe.";

    public static IReadOnlyList<string> RequestParagraphs(string name, string birthDate, string phone, string email) => new[]
    {
        $"Subsemnatul(a) {name} nascut(a) la data {birthDate} solicit ca Mango Broker SRL cu sediul social in Iasi, Str. Gandu nr. 1A, mansarda, Ap.4, inregistrata la O.N.R.C. Iasi sub nr. J2017001430226, avand CUI 37612556, direct sau prin imputernicitii sai, sa intermedieze pentru mine produse si servicii bancare si / sau contracte de credit, de la orice institutie financiara bancara sau nebancara cu care colaboreaza.",
        "Prezenta solicitare nu implica nici o obligatie pecuniara a solicitantului fata de Mango Broker SRL si imputernicitii sai.",
        "Imi exprim in mod liber consimțământul pentru colectarea, prelucrarea si procesarea urmatoarelor date cu caracter personal, care imi apartin: nume, prenume, gen, varsta, numar de telefon, adresa e-mail, adresa de domiciliu, cetatenia, numarul de cont bancar, cod numeric personal, toate informatiile mentionate pe cartea de identitate, data nasterii, prenumele tatalui, prenumele mamei, informatii referitoare la active si / sau pasive (in functie de serviciul solicitat) de catre Mango Broker SRL si/sau orice imputernicit al acestuia, cu scopul de a intermedia pentru mine produse si servicii bancare si/sau contracte de credit, precum si in scop de administrare si arhivare.",
        "Imi exprim acordul de a face obiectul unei decizii bazate exclusiv pe prelucrarea automata, inclusiv crearea de profiluri.",
        "Declar ca am fost informat despre faptul ca Mango Broker SRL si imputernicitii acesteia vor prelucra datele mele cu caracter personal mai sus mentionate, pe o perioada de minimum 5 ani sau orice alta perioada de timp prevazuta de dispozitiile legale aplicabile in materia intermedierii de oferte.",
        "Declar că am fost informat despre faptul ca datele mele cu caracter personal vor fi transmise catre institutiile financiare bancare si nebancare cu care Mango Broker SRL si imputernicitii sai colaboreaza, precum şi catre colaboratorii externi ai Mango Broker SRL si imputernicitilor sai (notari, societați de asigurare, auditori şi evaluatori, agenții imobiliare, şi alții - daca este cazul), şi sunt de acord ca datele mele cu caracter personal sa fie transmise catre acesti terți, in calitatea lor de operatori asociati. Lista partenerilor actuali este accesibila la link-ul www.mangobroker.ro.",
        "Declar că am fost pe deplin informat despre drepturile mele prevazute de Regulamentul UE 679/2016, cu completarile aduse de Legea nr. 190/2018 privind măsurile de punere in aplicare a respectivului Regulament, in ceea ce priveşte prelucrarea datelor cu caracter personal, precum dreptul de acces, dreptul la rectificare, dreptul de retragere a consimtamantului, dreptul la stergere („dreptul de a fi uitat”), dreptul de opozitie, dreptul de portabilitate, dreptul de a depune plangere la Autoritatea pentru Supraveghere.",
        "Declar ca am fost informat ca imi pot exercita drepturile legale in ceea ce priveşte prelucrarea datelor cu caracter personal prin transmiterea unei notificari scrise catre Mango Broker SRL la adresa Iasi, Str. Gandu nr. 1A, mansarda, Ap 4 sau via e-mail la adresa office@mangobroker.ro.",
        $"Declar ca sunt de acord sa fiu contactat de catre Mango Broker SRL si / sau orice imputernicit al acestuia la numarul de telefon {phone} si / sau la adresa de e-mail {email}, pentru a-mi comunica orice fel de informatii legate de produsele bancare si de creditele pe care le-as putea contracta sau orice alte produse / servicii conexe despre care as putea fi interesat.",
    };

    public static string BuildReadingText()
    {
        const string name = "[numele și prenumele dumneavoastră]";
        const string birthDate = "[data nașterii, din actul de identitate]";

        var text = new StringBuilder();
        text.AppendLine(Title).AppendLine();
        text.AppendLine(IntermediarySection).AppendLine();
        foreach (var (label, value) in IntermediaryRows)
            text.AppendLine($"{label}: {value.Replace("\n\n", " – ")}");
        text.AppendLine().AppendLine(AnpcNote).AppendLine();

        text.AppendLine(ClientSection);
        text.AppendLine("Numele, telefonul și adresa de e-mail completate în acest formular.").AppendLine();

        foreach (var (number, point) in Points)
            text.AppendLine($"{number} {point}").AppendLine();

        text.AppendLine("ANEXA 1 la informarea precontractuală");
        text.AppendLine("(se semnează doar dacă bifați solicitarea de începere imediată a serviciilor)");
        text.AppendLine(AnnexDeclaration(name, birthDate)).AppendLine();

        text.AppendLine(RequestTitle);
        text.Append(string.Join("\n\n", RequestParagraphs(name, birthDate, "[telefonul dumneavoastră]", "[adresa dumneavoastră de e-mail]")));

        return text.ToString();
    }
}
