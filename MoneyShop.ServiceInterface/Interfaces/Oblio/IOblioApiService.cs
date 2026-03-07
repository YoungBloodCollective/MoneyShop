namespace MoneyShop.ServiceInterface.Interfaces.Oblio
{
    public interface IOblioApiService
    {
        Task<string> GetAccessTokenAsync();
        Task<List<OblioCompany>> GetCompaniesAsync();
        Task<List<OblioVatRate>> GetVatRatesAsync(string cif);
        Task<List<OblioClient>> GetClientsAsync(string cif, string? name = null, string? clientCif = null, int offset = 0);
        Task<List<OblioProduct>> GetProductsAsync(string cif, string? name = null, string? code = null, string? management = null, string? workStation = null, int offset = 0);
        Task<OblioDocumentResponse> CreateInvoiceAsync(string cif, OblioInvoiceRequest invoiceRequest);
        Task<OblioDocumentResponse> CreateProformaAsync(string cif, OblioProformaRequest proformaRequest);
        Task<byte[]> GetDocumentAsync(string cif, string seriesName, int number, string type = "pdf");
        Task<bool> CancelDocumentAsync(string cif, string seriesName, int number, string type = "invoice");
        Task<bool> RestoreDocumentAsync(string cif, string seriesName, int number, string type = "invoice");
        Task<bool> DeleteDocumentAsync(string cif, string seriesName, int number, string type = "invoice");
    }

    // DTOs for Oblio API
    public class OblioTokenResponse
    {
        public string AccessToken { get; set; } = null!;
        public string ExpiresIn { get; set; } = null!;
        public string TokenType { get; set; } = null!;
        public string Scope { get; set; } = null!;
        public string RequestTime { get; set; } = null!;
    }

    public class OblioResponse<T>
    {
        public int Status { get; set; }
        public string StatusMessage { get; set; } = null!;
        public T? Data { get; set; }
    }

    public class OblioCompany
    {
        public string Cif { get; set; } = null!;
        public string Company { get; set; } = null!;
        public string UserTypeAccess { get; set; } = null!;
    }

    public class OblioVatRate
    {
        public string Name { get; set; } = null!;
        public decimal Percent { get; set; }
        public bool Default { get; set; }
    }

    public class OblioClient
    {
        public string Cif { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string? Rc { get; set; }
        public string? Code { get; set; }
        public string? Address { get; set; }
        public string? State { get; set; }
        public string? City { get; set; }
        public string? Country { get; set; }
        public string? Iban { get; set; }
        public string? Bank { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Contact { get; set; }
        public bool VatPayer { get; set; }
    }

    public class OblioProduct
    {
        public string Name { get; set; } = null!;
        public string? Code { get; set; }
        public string? Management { get; set; }
        public string? WorkStation { get; set; }
        public decimal? Stock { get; set; }
        public string? Unit { get; set; }
        public decimal Price { get; set; }
        public decimal VatPercentage { get; set; }
    }

    public class OblioInvoiceRequest
    {
        public OblioClientRequest? CachedName { get; set; }
        public OblioClientRequest Client { get; set; } = null!;
        public string IssueDate { get; set; } = null!;
        public string? DueDate { get; set; }
        public string? DeliveryDate { get; set; }
        public string? CollectDate { get; set; }
        public string SeriesName { get; set; } = null!;
        public string Language { get; set; } = "RO";
        public int Precision { get; set; } = 2;
        public string Currency { get; set; } = "RON";
        public List<OblioProductRequest> Products { get; set; } = new();
        public string? IssuerName { get; set; }
        public string? IssuerId { get; set; }
        public string? NoticeNumber { get; set; }
        public string? InternalNote { get; set; }
        public string? Mention { get; set; }
        public string? Observations { get; set; }
        /// <summary>
        /// Set to 1 to email the invoice to the client via Oblio (uses Oblio email, not Brevo)
        /// </summary>
        public int? SendEmail { get; set; }
    }

    public class OblioProformaRequest
    {
        public OblioClientRequest CachedName { get; set; } = null!;
        public OblioClientRequest Client { get; set; } = null!;
        public string IssueDate { get; set; } = null!;
        public string DueDate { get; set; } = null!;
        public string DeliveryDate { get; set; } = null!;
        public string SeriesName { get; set; } = null!;
        public string Language { get; set; } = "RO";
        public int Precision { get; set; } = 2;
        public string Currency { get; set; } = "RON";
        public List<OblioProductRequest> Products { get; set; } = new();
        public string? InternalNote { get; set; }
        public string? Mention { get; set; }
        public string? Observations { get; set; }
    }

    public class OblioClientRequest
    {
        public string? Cif { get; set; }
        public string? Name { get; set; }
        public string? Rc { get; set; }
        public string? Code { get; set; }
        public string? Address { get; set; }
        public string? State { get; set; }
        public string? City { get; set; }
        public string? Country { get; set; }
        public string? Iban { get; set; }
        public string? Bank { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Contact { get; set; }
        public bool? VatPayer { get; set; }
    }

    public class OblioProductRequest
    {
        public string Name { get; set; } = null!;
        public string? Code { get; set; }
        public string? Description { get; set; }
        public decimal Price { get; set; }
        public string MeasuringUnit { get; set; } = "buc";
        public string Currency { get; set; } = "RON";
        public string? VatName { get; set; }
        public decimal VatPercentage { get; set; }
        /// <summary>
        /// 0 = price excludes VAT, 1 = price includes VAT
        /// </summary>
        public int VatIncluded { get; set; } = 0;
        public decimal Quantity { get; set; } = 1;
        public string? ProductType { get; set; }
        public decimal? Discount { get; set; }
        public string? DiscountType { get; set; }
    }

    public class OblioDocumentResponse
    {
        public int Status { get; set; }
        public string StatusMessage { get; set; } = null!;
        public OblioDocumentData? Data { get; set; }
    }

    public class OblioDocumentData
    {
        public string SeriesName { get; set; } = null!;
        public int Number { get; set; }
        public string Link { get; set; } = null!;
        public string LinkPdf { get; set; } = null!;
        public string? LinkXml { get; set; }
        public string? LinkView { get; set; }
    }
}
