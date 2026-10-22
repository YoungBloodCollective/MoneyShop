namespace MoneyShop.ServiceAdapters.Services.Document;

/// <summary>
/// Reading copy of ProCredit Bank's Anexa nr. 1 shown on the acord page before signing.
/// The signed PDF is the bank's own template (Assets/procredit-consimtamant.pdf), so keep
/// this text in sync with that file when the bank sends a new version.
/// </summary>
internal static class ProCreditConsentText
{
    public const string DisplayTitle = "Acord GDPR ProCredit Bank";

    public const string Body =
        @"ANEXA NR. 1
CONSIMȚĂMÂNT PRIVIND TRANSMITEREA DATELOR CU CARACTER PERSONAL
- POTENȚIAL CLIENT - PERSOANĂ FIZICĂ -

Subsemnatul (numele și prenumele din acest formular), număr de telefon (telefonul din acest formular) și adresă de e-mail (e-mailul din acest formular), prin prezenta îmi exprim acordul în mod expres și neechivoc ca datele mele cu caracter personal, astfel cum sunt menționate mai sus, să fie transmise către ProCredit Bank S.A., având sediul social în Calea Plevnei nr. 159, Sector 6, București, Complexul Business Garden, în scopul contactării mele pentru furnizarea de informații suplimentare cu privire la produsele și serviciile de finanțare oferite de către Bancă.

Datele personale vor face obiectul următoarelor operațiuni de prelucrare: colectare, înregistrare, organizare, structurare, stocare, utilizare și ulterior ștergere, cu respectarea duratei legale de retenție aplicabile. Prelucrarea se va realiza exclusiv pe teritoriul Uniunii Europene.

Durata de păstrare a datelor este de maximum 6 luni în cazul în care persoanele vizate nu inițiază o relație de afaceri cu Banca, cu excepția cazurilor în care legislația în vigoare impune o perioadă mai lungă. Pentru persoanele care inițiază o relație de afaceri cu Banca, datele vor fi păstrate pe o perioadă de 5 ani de la data încetării acestei relații, conform prevederilor nomenclatorului arhivistic și a obligațiilor legale în vigoare. În anumite cazuri, este posibil să fim obligați să păstrăm datele cu caracter personal pentru o perioadă mai îndelungată, în conformitate cu obligațiile legale aplicabile, însă vă asigurăm de faptul că documentul prin care v-ați exprimat consimțământul va fi păstrat în conformitate cu cerințele legale. Menționăm că datele dumneavoastră cu caracter personal vor fi șterse/anonimizate în momentul în care nu mai sunt necesare pentru îndeplinirea scopurilor pentru care au fost colectate inițial.

Acordul privind consimțământul acordat poate fi retras în orice moment, fără a afecta legalitatea prelucrării efectuate înainte de retragerea acestuia.

Pentru detalii suplimentare cu privire la prelucrarea datelor cu caracter personal și exercitarea drepturilor prevăzute de Regulamentul UE 2016/679 - respectiv dreptul la informare, acces, rectificare, restricționarea prelucrării, ștergere, opoziție, portabilitatea datelor, dreptul de a nu fi supus unei decizii automate individuale și dreptul de a vă retrage consimțământul - vă puteți adresa instituției noastre prin contactarea responsabilului privind protecția datelor, la următoarele coordonate:
• Adresa: ProCredit Bank Romania S.A., Calea Plevnei nr. 159, Sector 6, București, Complexul Business Garden
• E-mail: ROU.DPO@procredit-group.com
• Telefon: 0212.016.000
• Pagina dedicată pe site-ul ProCredit Bank S.A.: Protecția datelor - ProCredit Bank

De asemenea, dacă considerați că ProCredit Bank S.A. nu a respectat reglementările legale în vigoare referitoare la protecția datelor, aveți dreptul de a depune o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP), fără a afecta exercitarea altor căi de atac administrative sau judiciare.

Detaliile de contact ale Autorității Naționale de Supraveghere a Prelucrării Datelor cu Caracter Personal sunt următoarele:
• Sediul: România, București, sector 1, b-dul. General Gheorghe Magheru nr. 28-30, 010336
• Web page: http://www.dataprotection.ro
• E-mail: anspdcp@dataprotection.ro
• Telefon: 40.318.059.211 / +40.318.059.212

Am luat la cunoștință că îmi pot retrage consimțământul oricând, printr-o solicitare transmisă la adresa de e-mail: ROU.DPO@procredit-group.com.

Semnătura și data se completează automat din semnătura acordului.";
}
