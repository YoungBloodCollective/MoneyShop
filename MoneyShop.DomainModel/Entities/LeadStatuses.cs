using System;
using System.Collections.Generic;

namespace MoneyShop.DomainModel.Entities
{
    public static class LeadStatuses
    {
        public const string New = "Nou";
        public const string Contacted = "Contactat";
        public const string Converted = "Convertit";
        public const string Unqualified = "Necalificat";
        public static readonly HashSet<string> All = new(StringComparer.Ordinal) { New, Contacted, Unqualified, Converted };
    }
}
