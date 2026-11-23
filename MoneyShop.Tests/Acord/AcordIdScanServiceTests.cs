using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging.Abstractions;
using MoneyShop.ServiceAdapters.Services.Acord;
using MoneyShop.ServiceInterface.Interfaces.Kyc;

namespace MoneyShop.Tests.Acord;

public class AcordIdScanServiceTests
{
    private const string FullCnp = "1800101123457";

    private static readonly byte[] Jpeg = { 0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, (byte)'J', (byte)'F', (byte)'I', (byte)'F', 0, 1, 2, 3 };

    private sealed class FakeKyc : IExternalKycService
    {
        public OcrResult? Result { get; set; }
        public Exception? Throw { get; set; }
        public int Calls { get; private set; }
        public bool BackSent { get; private set; }

        public Task<KycSessionCreated> CreateSessionAsync()
        {
            if (Throw != null) throw Throw;
            return Task.FromResult(new KycSessionCreated { SessionId = "s", Token = "t" });
        }

        public Task<OcrResult> SubmitDocumentOcrAsync(string sessionId, string token, byte[] frontImage, byte[]? backImage = null)
        {
            Calls++;
            BackSent = backImage != null;
            if (Throw != null) throw Throw;
            return Task.FromResult(Result!);
        }

        public Task<LivenessResult> SubmitLivenessAsync(string sessionId, string token, byte[] selfie) => throw new NotImplementedException();
        public Task<ActiveLivenessResult> SubmitActiveLivenessAsync(string sessionId, string token, byte[] selfie, string? challengesJson = null) => throw new NotImplementedException();
        public Task<FaceCompareResult> SubmitFaceCompareAsync(string sessionId, string token, byte[] documentPhoto, byte[] selfie) => throw new NotImplementedException();
        public Task<KycSessionStatus> GetSessionStatusAsync(string sessionId) => throw new NotImplementedException();
        public Task<KycVerificationDecision> GetDecisionAsync(string sessionId) => throw new NotImplementedException();
    }

    private static OcrResult Ocr(bool isNew, string? address, string? expiry = "01.01.2099") => new()
    {
        Decision = "pass",
        OcrData = new OcrData
        {
            LastName = "POPESCU",
            FirstName = "ION",
            Cnp = FullCnp,
            Address = address,
            ExpiryDate = expiry,
            IsNewFormat = isNew,
        },
        LogicValidation = new LogicValidation { IsValid = true, CnpChecksumValid = true, DocumentNotExpired = true }
    };

    private static (AcordIdScanService svc, FakeKyc kyc) Build(OcrResult? result = null)
    {
        var kyc = new FakeKyc { Result = result };
        return (new AcordIdScanService(kyc, NullLogger<AcordIdScanService>.Instance), kyc);
    }

    [Fact]
    public async Task Old_format_is_the_plain_card_and_needs_nothing_else()
    {
        var (svc, _) = Build(Ocr(false, "Jud. B, Sector 1"));

        var r = await svc.ScanAsync(Jpeg, null);

        Assert.True(r.Readable);
        Assert.Equal("carte_identitate", r.TipAct);
        Assert.False(r.NeedsBack);
        Assert.False(r.NeedsProofOfAddress);
    }

    [Fact]
    public async Task New_format_with_address_on_the_back_is_the_simple_card()
    {
        var (svc, kyc) = Build(Ocr(true, "Jud. B, Sector 1"));

        var r = await svc.ScanAsync(Jpeg, Jpeg);

        Assert.True(kyc.BackSent);
        Assert.Equal("carte_identitate_simpla", r.TipAct);
        Assert.True(r.NeedsBack);
        Assert.False(r.NeedsProofOfAddress);
        Assert.True(r.HasAddress);
    }

    [Fact]
    public async Task New_format_without_address_is_the_electronic_card_and_needs_proof()
    {
        var (svc, _) = Build(Ocr(true, "  "));

        var r = await svc.ScanAsync(Jpeg, Jpeg);

        Assert.Equal("carte_identitate_electronica", r.TipAct);
        Assert.True(r.NeedsBack);
        Assert.True(r.NeedsProofOfAddress);
        Assert.False(r.HasAddress);
    }

    [Fact]
    public async Task New_format_front_only_asks_for_the_back_and_does_not_decide_yet()
    {
        var (svc, kyc) = Build(Ocr(true, null));

        var r = await svc.ScanAsync(Jpeg, null);

        Assert.False(kyc.BackSent);
        Assert.True(r.Readable);
        Assert.True(r.IsNewFormat);
        Assert.True(r.NeedsBack);
        Assert.False(r.NeedsProofOfAddress);
        Assert.Null(r.TipAct);
    }

    [Fact]
    public async Task Only_the_masked_cnp_leaves_the_service()
    {
        var (svc, _) = Build(Ocr(false, null));

        var r = await svc.ScanAsync(Jpeg, null);

        Assert.Equal("******3457", r.CnpMasked);
        Assert.DoesNotContain(FullCnp, JsonSerializer.Serialize(r));
        Assert.DoesNotContain(FullCnp[..9], JsonSerializer.Serialize(r));
    }

    [Fact]
    public async Task Expired_card_is_flagged_with_a_problem()
    {
        var (svc, _) = Build(Ocr(false, null, "01.01.2020"));

        var r = await svc.ScanAsync(Jpeg, null);

        Assert.True(r.Readable);
        Assert.True(r.Expired);
        Assert.Contains("Actul a expirat.", r.Problems);
    }

    [Fact]
    public async Task Valid_card_is_not_flagged_expired()
    {
        var (svc, _) = Build(Ocr(false, null));

        var r = await svc.ScanAsync(Jpeg, null);

        Assert.False(r.Expired);
        Assert.Empty(r.Problems);
    }

    [Fact]
    public async Task Result_without_name_or_cnp_is_unreadable()
    {
        var (svc, _) = Build(new OcrResult { Decision = "fail", OcrData = new OcrData { Address = "x" } });

        var r = await svc.ScanAsync(Jpeg, null);

        Assert.False(r.Readable);
        Assert.NotEmpty(r.Problems);
        Assert.Null(r.TipAct);
        Assert.Null(r.CnpMasked);
    }

    [Fact]
    public async Task Missing_ocr_data_is_unreadable()
    {
        var (svc, _) = Build(new OcrResult { Decision = "fail", OcrData = null });

        var r = await svc.ScanAsync(Jpeg, null);

        Assert.False(r.Readable);
    }

    [Fact]
    public async Task Provider_failure_gives_unreadable_not_an_exception()
    {
        var (svc, kyc) = Build();
        kyc.Throw = new InvalidOperationException("kyc down at http://internal/secret");

        var r = await svc.ScanAsync(Jpeg, null);

        Assert.False(r.Readable);
        Assert.DoesNotContain("internal", string.Join(' ', r.Problems));
    }

    [Fact]
    public async Task Non_image_is_rejected_before_the_provider_is_called()
    {
        var (svc, kyc) = Build(Ocr(false, null));
        var pdf = System.Text.Encoding.ASCII.GetBytes("%PDF-1.7 fake document body");

        await Assert.ThrowsAsync<ArgumentException>(() => svc.ScanAsync(pdf, null));
        await Assert.ThrowsAsync<ArgumentException>(() => svc.ScanAsync(Jpeg, pdf));
        Assert.Equal(0, kyc.Calls);
    }

    [Fact]
    public async Task Empty_and_oversize_files_are_rejected()
    {
        var (svc, kyc) = Build(Ocr(false, null));
        var big = new byte[AcordIdScanService.MaxImageBytes + 1];
        Array.Copy(Jpeg, big, Jpeg.Length);

        await Assert.ThrowsAsync<ArgumentException>(() => svc.ScanAsync(Array.Empty<byte>(), null));
        await Assert.ThrowsAsync<ArgumentException>(() => svc.ScanAsync(big, null));
        Assert.Equal(0, kyc.Calls);
    }

    [Theory]
    [InlineData(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0 })]
    [InlineData(new byte[] { (byte)'R', (byte)'I', (byte)'F', (byte)'F', 0, 0, 0, 0, (byte)'W', (byte)'E', (byte)'B', (byte)'P' })]
    [InlineData(new byte[] { 0, 0, 0, 0x18, (byte)'f', (byte)'t', (byte)'y', (byte)'p', (byte)'h', (byte)'e', (byte)'i', (byte)'c' })]
    public async Task Png_webp_and_heic_pass_the_magic_byte_check(byte[] image)
    {
        var (svc, _) = Build(Ocr(false, null));

        var r = await svc.ScanAsync(image, null);

        Assert.True(r.Readable);
    }
}
