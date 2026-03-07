namespace MoneyShop.ServiceAdapters.Services.Eligibility;

/// <summary>
/// Helper pentru formule financiare conform calculator.txt
/// </summary>
public static class FinancialFormulas
{
    /// <summary>
    /// Calculeaza suma maxima (PV) din rata maxima admisa folosind formula anuitatii
    /// PV = Pmt * (1 - (1 + r)^(-n)) / r
    /// </summary>
    /// <param name="monthlyPayment">Rata maxima admisa (Pmt)</param>
    /// <param name="aprPercent">Dobanda anuala (APR) in procente (ex: 10.99 pentru 10.99%)</param>
    /// <param name="nMonths">Numar de luni (n)</param>
    /// <returns>Suma maxima (PV) in RON</returns>
    public static decimal CalculateMaxLoanAmount(decimal monthlyPayment, decimal aprPercent, int nMonths)
    {
        if (monthlyPayment <= 0 || nMonths <= 0)
            return 0;

        if (aprPercent <= 0)
            return monthlyPayment * nMonths; // Fara dobanda

        decimal apr = aprPercent / 100m;
        decimal r = apr / 12m; // Dobanda lunara

        if (r <= 0)
            return monthlyPayment * nMonths;

        // PV = Pmt * (1 - (1 + r)^(-n)) / r
        decimal factor = 1m + r;
        decimal powFactor = 1m;

        // Calculam (1 + r)^(-n) = 1 / (1 + r)^n
        for (int i = 0; i < nMonths; i++)
        {
            powFactor *= factor;
        }

        decimal denominator = 1m / powFactor; // (1 + r)^(-n)
        decimal numerator = 1m - denominator; // 1 - (1 + r)^(-n)

        decimal pv = monthlyPayment * numerator / r;

        return Math.Round(pv, 2);
    }

    /// <summary>
    /// Calculeaza rata lunara din suma principala folosind formula anuitatii
    /// Pmt = PV * r * (1 + r)^n / ((1 + r)^n - 1)
    /// </summary>
    /// <param name="principal">Suma principala (PV)</param>
    /// <param name="aprPercent">Dobanda anuala (APR) in procente</param>
    /// <param name="nMonths">Numar de luni</param>
    /// <returns>Rata lunara (Pmt) in RON</returns>
    public static decimal CalculateMonthlyPayment(decimal principal, decimal aprPercent, int nMonths)
    {
        if (principal <= 0 || nMonths <= 0)
            return 0;

        if (aprPercent <= 0)
            return principal / nMonths; // Fara dobanda

        decimal apr = aprPercent / 100m;
        decimal r = apr / 12m; // Dobanda lunara

        if (r <= 0)
            return principal / nMonths;

        // Pmt = PV * r * (1 + r)^n / ((1 + r)^n - 1)
        decimal factor = 1m + r;
        decimal powFactor = 1m;

        // Calculam (1 + r)^n
        for (int i = 0; i < nMonths; i++)
        {
            powFactor *= factor;
        }

        decimal numerator = principal * r * powFactor;
        decimal denominator = powFactor - 1m;

        decimal pmt = numerator / denominator;

        return Math.Round(pmt, 2);
    }

    /// <summary>
    /// Verifica daca data curenta se afla intr-o fereastra de DTI 50% (trimestriala)
    /// </summary>
    public static bool IsInHighDtiWindow(DateTime today, List<(DateTime start, DateTime end)> windows)
    {
        foreach (var window in windows)
        {
            if (today >= window.start && today <= window.end)
                return true;
        }
        return false;
    }

    /// <summary>
    /// Alege APR-ul pentru calcul bazat pe suma dorita (bucket-uri) sau mijlocul intervalului
    /// </summary>
    public static decimal PickNpAprForCalc(decimal aprMin, decimal aprMax, decimal? desiredAmount = null)
    {
        // TODO: Implementare bucket-uri daca sunt configurate
        // Pentru moment, folosim mijlocul intervalului
        return (aprMin + aprMax) / 2m;
    }
}
