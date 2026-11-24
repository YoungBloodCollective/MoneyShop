using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;

namespace MoneyShop.DomainModel.Entities
{
    public static class RomanianCounties
    {
        public static readonly IReadOnlyList<string> All = new[]
        {
            "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Bistrița-Năsăud", "Botoșani", "Brăila", "Brașov",
            "București", "Buzău", "Caraș-Severin", "Călărași", "Cluj", "Constanța", "Covasna", "Dâmbovița",
            "Dolj", "Galați", "Giurgiu", "Gorj", "Harghita", "Hunedoara", "Ialomița", "Iași", "Ilfov",
            "Maramureș", "Mehedinți", "Mureș", "Neamț", "Olt", "Prahova", "Sălaj", "Satu Mare", "Sibiu",
            "Suceava", "Teleorman", "Timiș", "Tulcea", "Vâlcea", "Vaslui", "Vrancea"
        };

        private static readonly Dictionary<string, string> ByKey = All.ToDictionary(Key, c => c);

        public static string? Canonical(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            return ByKey.TryGetValue(Key(value), out var county) ? county : null;
        }

        private static string Key(string value)
        {
            var decomposed = value.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder();
            foreach (var c in decomposed)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark) continue;
                if (char.IsLetter(c)) builder.Append(c);
            }
            return builder.ToString();
        }
    }
}
