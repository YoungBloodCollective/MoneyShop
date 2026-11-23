-- Alpha Bank România (absorbită de UniCredit) și OTP Bank România (absorbită de Banca Transilvania)
-- nu mai există. Le dezactivăm, nu le ștergem: dosarele vechi pe ele rămân editabile și apar în istoric.
-- Idempotent.
UPDATE dbo.Banks SET Active = 0 WHERE Name IN (N'Alpha Bank', N'OTP Bank') AND Active = 1;
SELECT Name, Active FROM dbo.Banks WHERE Name IN (N'Alpha Bank', N'OTP Bank');
