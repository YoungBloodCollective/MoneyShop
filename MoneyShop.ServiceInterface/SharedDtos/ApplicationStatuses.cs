namespace MoneyShop.ServiceInterface.SharedDtos
{
    public static class ApplicationStatuses
    {
        public const string INREGISTRAT = "INREGISTRAT";
        public const string IN_ANALIZA = "IN_ANALIZA";
        public const string NEVOIE_DOCUMENTE = "NEVOIE_DOCUMENTE";
        public const string PREAPROBAT = "PREAPROBAT";
        public const string OFERTA_TRANSMISA = "OFERTA_TRANSMISA";
        public const string ACCEPTAT_CLIENT = "ACCEPTAT_CLIENT";
        public const string TRIMIS_LA_BANCA = "TRIMIS_LA_BANCA";
        public const string APROBAT_BANCA = "APROBAT_BANCA";
        public const string DISBURSAT = "DISBURSAT";
        public const string RESPINS = "RESPINS";

        private static readonly string[] Order =
        {
            INREGISTRAT, IN_ANALIZA, NEVOIE_DOCUMENTE, PREAPROBAT, OFERTA_TRANSMISA,
            ACCEPTAT_CLIENT, TRIMIS_LA_BANCA, APROBAT_BANCA, DISBURSAT
        };

        private static readonly Dictionary<string, HashSet<string>> Allowed = BuildAllowed();

        public static IReadOnlyCollection<string> All { get; } = Order.Append(RESPINS).ToArray();

        public static bool IsValid(string? status) => status != null && Allowed.ContainsKey(status);

        public static bool CanTransition(string from, string to)
            => Allowed.TryGetValue(from, out var targets) && targets.Contains(to);

        private static Dictionary<string, HashSet<string>> BuildAllowed()
        {
            var map = new Dictionary<string, HashSet<string>>();
            for (var i = 0; i < Order.Length - 1; i++)
            {
                var targets = new HashSet<string>(Order.Skip(i + 1)) { RESPINS };
                if (i >= 3) targets.Add(NEVOIE_DOCUMENTE);
                if (i >= 2) targets.Add(IN_ANALIZA);
                targets.Remove(Order[i]);
                map[Order[i]] = targets;
            }
            map[DISBURSAT] = new HashSet<string>();
            map[RESPINS] = new HashSet<string> { IN_ANALIZA };
            return map;
        }
    }
}
