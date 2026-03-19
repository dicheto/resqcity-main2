import axios from 'axios';
import crypto from 'crypto';

interface DocusignConfig {
  baseUrl: string;
  accountId: string;
  accessToken: string;
}

interface DispatchEnvelopeInput {
  batchId: string;
  documentName: string;
  documentBase64: string;
  signerName: string;
  signerEmail: string;
  callbackUrl?: string;
}

function getConfig(): DocusignConfig {
  const baseUrl = process.env.DOCUSIGN_BASE_URL;
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const accessToken = process.env.DOCUSIGN_ACCESS_TOKEN;

  if (!baseUrl || !accountId || !accessToken) {
    throw new Error('Missing DocuSign configuration. Set DOCUSIGN_BASE_URL, DOCUSIGN_ACCOUNT_ID, DOCUSIGN_ACCESS_TOKEN.');
  }

  return { baseUrl, accountId, accessToken };
}

function getHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

export async function createDispatchEnvelope(input: DispatchEnvelopeInput): Promise<{ envelopeId: string; status: string }> {
  const { baseUrl, accountId, accessToken } = getConfig();

  const payload = {
    emailSubject: `ResQCity dispatch batch ${input.batchId} - signature required`,
    status: 'sent',
    documents: [
      {
        documentBase64: input.documentBase64,
        name: input.documentName,
        fileExtension: 'pdf',
        documentId: '1',
      },
    ],
    recipients: {
      signers: [
        {
          email: input.signerEmail,
          name: input.signerName,
          recipientId: '1',
          routingOrder: '1',
          tabs: {
            signHereTabs: [
              {
                anchorString: 'КЕП ЩЕ БЪДЕ ПОСТАВЕН ТУК',
                anchorUnits: 'pixels',
                anchorXOffset: '0',
                anchorYOffset: '0',
              },
            ],
          },
        },
      ],
    },
    customFields: {
      textCustomFields: [
        {
          name: 'resqcity_batch_id',
          required: 'false',
          show: 'true',
          value: input.batchId,
        },
      ],
    },
    eventNotification: input.callbackUrl
      ? {
          url: input.callbackUrl,
          loggingEnabled: 'true',
          requireAcknowledgment: 'true',
          envelopeEvents: [
            { envelopeEventStatusCode: 'sent' },
            { envelopeEventStatusCode: 'delivered' },
            { envelopeEventStatusCode: 'completed' },
            { envelopeEventStatusCode: 'declined' },
            { envelopeEventStatusCode: 'voided' },
          ],
          includeCertificateOfCompletion: 'true',
          includeDocuments: 'false',
          includeEnvelopeVoidReason: 'true',
          includeTimeZone: 'true',
          includeSenderAccountAsCustomField: 'false',
          includeDocumentFields: 'false',
          includeCertificateWithSoap: 'false',
          signMessageWithX509Cert: 'false',
          useSoapInterface: 'false',
          includeHMAC: 'true',
        }
      : undefined,
  };

  const response = await axios.post(
    `${baseUrl}/v2.1/accounts/${accountId}/envelopes`,
    payload,
    { headers: getHeaders(accessToken) }
  );

  return {
    envelopeId: response.data.envelopeId,
    status: response.data.status,
  };
}

export async function createRecipientViewUrl(input: {
  envelopeId: string;
  signerName: string;
  signerEmail: string;
  returnUrl: string;
}): Promise<string> {
  const { baseUrl, accountId, accessToken } = getConfig();

  const payload = {
    userName: input.signerName,
    email: input.signerEmail,
    recipientId: '1',
    authenticationMethod: 'none',
    returnUrl: input.returnUrl,
  };

  const response = await axios.post(
    `${baseUrl}/v2.1/accounts/${accountId}/envelopes/${input.envelopeId}/views/recipient`,
    payload,
    { headers: getHeaders(accessToken) }
  );

  return response.data.url;
}

export async function downloadCombinedDocument(envelopeId: string): Promise<Buffer> {
  const { baseUrl, accountId, accessToken } = getConfig();
  const response = await axios.get(
    `${baseUrl}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/documents/combined`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      responseType: 'arraybuffer',
    }
  );

  return Buffer.from(response.data);
}

export function verifyDocusignWebhookHmac(rawBody: string, signatureHeader: string | null): boolean {
  const hmacSecret = process.env.DOCUSIGN_CONNECT_HMAC_SECRET;
  if (!hmacSecret) {
    return true;
  }

  if (!signatureHeader) {
    return false;
  }

  const computed = crypto.createHmac('sha256', hmacSecret).update(rawBody, 'utf8').digest('base64');
  const expected = Buffer.from(computed);
  const received = Buffer.from(signatureHeader);

  if (expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, received);
}