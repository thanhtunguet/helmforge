import { X509Certificate } from '@peculiar/x509';

const certificatePattern = /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/;
const privateKeyPattern = /-----BEGIN (?:RSA |EC |ENCRYPTED )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |ENCRYPTED )?PRIVATE KEY-----/;

export interface TlsValidationResult {
  cert?: string;
  key?: string;
  notBefore?: string;
  expiresAt?: string;
  errors: string[];
}

function extractCertificateBlock(certificate: string): string | null {
  const match = certificate.match(certificatePattern);
  return match ? match[0] : null;
}

export function validateTlsInputs(certInput: string, keyInput: string): TlsValidationResult {
  const trimmedCert = certInput.trim();
  const trimmedKey = keyInput.trim();
  const errors: string[] = [];

  if (!trimmedCert && !trimmedKey) {
    return { errors };
  }

  if (trimmedCert && !trimmedKey) {
    errors.push('Private key is required when a certificate is provided.');
  }

  if (!trimmedCert && trimmedKey) {
    errors.push('Certificate is required when a private key is provided.');
  }

  if (trimmedCert && !certificatePattern.test(trimmedCert)) {
    errors.push('Certificate must be PEM-encoded (-----BEGIN CERTIFICATE-----).');
  }

  if (trimmedKey && !privateKeyPattern.test(trimmedKey)) {
    errors.push('Private key must be PEM-encoded (-----BEGIN PRIVATE KEY-----).');
  }

  if (errors.length > 0) {
    return { errors };
  }

  const certificateBlock = extractCertificateBlock(trimmedCert);
  if (!certificateBlock) {
    return { errors: ['Certificate must be PEM-encoded (-----BEGIN CERTIFICATE-----).'] };
  }

  try {
    const certificate = new X509Certificate(certificateBlock);
    return {
      cert: trimmedCert,
      key: trimmedKey,
      notBefore: certificate.notBefore.toISOString(),
      expiresAt: certificate.notAfter.toISOString(),
      errors,
    };
  } catch {
    return { errors: ['Certificate could not be parsed. Confirm the PEM content is valid.'] };
  }
}
