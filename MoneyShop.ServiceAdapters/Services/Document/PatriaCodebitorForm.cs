using iText.Kernel.Font;
using MoneyShop.ServiceInterface.Interfaces.Document;

namespace MoneyShop.ServiceAdapters.Services.Document;

/// <summary>
/// Anexa 8 - Cerere de credit, formularul pentru codebitor. Spre deosebire de Anexa 7, care
/// se completeaza din ce stie acordul despre client, formularul asta cere datele codebitorului
/// - alta persoana, care nu a semnat niciun acord la noi si al carei act de identitate nu a
/// trecut prin KYC. Platforma nu stie nimic despre el: simulatorul retine pe cererea de credit
/// doar un nume, un venit si relatia declarate de client (Application.Codebitori), iar cererea
/// de credit nu e legata de acord in niciun fel.
///
/// Asa ca se completeaza doar ce e adevarat indiferent cine ajunge codebitor: canalul (broker,
/// nu agentie) si data la care brokerul a scos pachetul. Tot restul - identitate, adresa,
/// angajator, venituri, angajamente, semnatura - ramane gol, de completat pe hartie de catre
/// codebitor, in fata brokerului. Mai bine un formular gol decat unul care pretinde ca
/// solicitantul e propriul lui codebitor.
///
/// Coordonatele sunt in puncte PDF de la coltul din stanga-jos, ca peste tot in BankFormFiller.
/// </summary>
internal static class PatriaCodebitorForm
{
    public static byte[] Build(BankConsentPdfInput input, byte[] template, PdfFont font)
    {
        using var form = new BankFormFiller(template, font);

        // ── Pagina 1: caseta de antet a bancii ──
        // Casuta "Data" e cea in care banca trece data cererii; aici trece data la care a fost
        // scos pachetul, ca brokerul sa stie de cand e formularul pe care il da la semnat.
        //
        // Casuta "Broker" bifeaza canalul prin care ajunge cererea la banca - adevarat pentru
        // orice formular scos de aici. Numele brokerului nu se scrie: randul liber dintre
        // casuta "Agentia" si casuta "Broker" are vreo 98 de puncte, prea putin pentru o
        // denumire de firma, iar ce nu incape intra peste casuta "Broker".
        //
        // input.SignaturePng se ignora intentionat: linkul de semnare e al clientului, iar
        // semnatura lui pe "Semnatura Codebitor" (pagina 3) ar fi o declaratie falsa.
        return form
            .Text(1, 163f, 696.5f, 60f, BankFormFiller.Date(input.SignedOn), 7f)
            .Text(1, 447.5f, 696.4f, 10f, "X", 7f)
            .Build();
    }
}
