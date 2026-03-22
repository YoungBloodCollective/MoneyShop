/**
 * Extract a human-readable error message from an Axios error or generic Error.
 */
export function extractError(err: unknown, fallback = "Operațiunea a eșuat"): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const axErr = err as { response?: { data?: { details?: string; error?: string } } };
    return axErr.response?.data?.details || axErr.response?.data?.error || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

/**
 * Return the list of mandatory OCR fields that are still missing.
 */
export function getMissingMandatoryFields(
  ocrData?: { cnp?: string | null; lastName?: string | null; firstName?: string | null; address?: string | null; isNewFormat?: boolean } | null
): string[] {
  if (!ocrData) return ["CNP", "Nume", "Prenume", "Adresa"];
  const missing: string[] = [];
  if (!ocrData.cnp) missing.push("CNP");
  if (!ocrData.lastName) missing.push("Nume");
  if (!ocrData.firstName) missing.push("Prenume");
  if (!ocrData.address && !ocrData.isNewFormat) missing.push("Adresa");
  return missing;
}
