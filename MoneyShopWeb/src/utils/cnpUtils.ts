/**
 * Utility functions for CNP (Romanian Personal Numeric Code) handling
 * CNP is never stored in plain text - only masked versions are displayed
 */

export const maskCnp = (cnpLast4?: string | null): string => {
  if (!cnpLast4 || cnpLast4.length !== 4) {
    return '******';
  }
  return `******${cnpLast4}`;
};

export const isValidCnpFormat = (cnp: string): boolean => {
  if (!cnp || cnp.length !== 13) {
    return false;
  }
  return /^\d{13}$/.test(cnp);
};

export const formatCnpForDisplay = (cnp?: string | null): string => {
  if (!cnp) {
    return '******';
  }
  if (cnp.includes('*')) {
    return cnp;
  }
  if (cnp.length >= 4) {
    return maskCnp(cnp.substring(cnp.length - 4));
  }
  return '******';
};
