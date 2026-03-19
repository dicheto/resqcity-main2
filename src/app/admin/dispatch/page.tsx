'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

interface DispatchDocument {
  id: string;
  kind: 'DRAFT' | 'SIGNED';
  fileName: string;
  filePath: string;
  mimeType: string;
}

interface DispatchBatch {
  id: string;
  status: 'DRAFT' | 'PENDING_SIGNATURE' | 'SIGNED' | 'SENT';
  createdAt: string;
  sentAt?: string | null;
  institution: {
    id: string;
    name: string;
    email?: string | null;
  };
  items: Array<{ id: string }>;
  documents: DispatchDocument[];
}

interface BissVersionResponse {
  version: string;
  httpMethods: string[];
  contentTypes: string[];
  signatureTypes: string[];
  selectorAvailable: boolean;
  hashAlgorithms: string[];
}

interface BissGetSignerResponse {
  status: 'ok' | 'failed';
  reasonCode: string;
  reasonText: string;
  chain?: string[];
}

interface BissSignResponse {
  status: 'ok' | 'failed';
  reasonCode: string;
  reasonText: string;
  signatures?: string[];
  signatureType?: string;
}

interface BissPrepareResponse {
  batchId: string;
  mode: 'strict' | 'universal';
  allowTestMode?: boolean;
  signRequest: {
    version: string;
    contents: string[];
    signedContents?: string[];
    signedContentsCert?: string[];
    contentType: 'data';
    hashAlgorithm: 'SHA256' | 'SHA512';
    signatureType: 'signature';
    confirmText?: string[];
    _strictMode?: boolean;
    _signContentMode?: 'decoded' | 'base64';
  };
  portCandidates: number[];
}

export default function DispatchPage() {
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [batches, setBatches] = useState<DispatchBatch[]>([]);

  useEffect(() => {
    refreshData();
  }, []);

  const getTokenHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const allowInsecureBissHttp = false;

  const discoverBissBaseUrl = async (candidates: number[]): Promise<string> => {
    for (const port of candidates) {
      const protocols: Array<'https' | 'http'> = allowInsecureBissHttp ? ['https', 'http'] : ['https'];
      for (const protocol of protocols) {
        const baseUrl = `${protocol}://localhost:${port}`;
        try {
          const response = await fetch(`${baseUrl}/version`, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
            headers: {
              Accept: '*/*',
            },
          });

          if (!response.ok) {
            continue;
          }

          const payload = (await response.json()) as BissVersionResponse;
          if (payload?.version) {
            return baseUrl;
          }
        } catch {
          // Try next protocol/port.
        }
      }
    }

    throw new Error('BISS не е открит. Уверете се, че локалната BISS услуга е стартирана.');
  };

  const callBissGetSigner = async (bissBaseUrl: string): Promise<BissGetSignerResponse> => {
    const response = await fetch(`${bissBaseUrl}/getsigner`, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        Accept: '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // false => BISS shows both valid and invalid certificates.
        showValidCerts: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`BISS /getsigner върна HTTP ${response.status}`);
    }

    return response.json();
  };

  const callBissSign = async (bissBaseUrl: string, payload: unknown): Promise<BissSignResponse> => {
    const response = await fetch(`${bissBaseUrl}/sign`, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        Accept: '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const rawText = await response.text();
    let parsed: Partial<BissSignResponse> | null = null;
    try {
      parsed = rawText ? (JSON.parse(rawText) as Partial<BissSignResponse>) : null;
    } catch {
      parsed = null;
    }

    // If we have a valid status, return it (even on non-2xx HTTP status)
    if (parsed?.status === 'ok' || parsed?.status === 'failed') {
      return parsed as BissSignResponse;
    }

    // If HTTP status is not ok but we have parsed JSON with reasonCode/reasonText,
    // construct a failed response from the error details
    if (!response.ok && parsed && (parsed.reasonCode || parsed.reasonText)) {
      return {
        status: 'failed',
        reasonCode: String(parsed.reasonCode || '500'),
        reasonText: String(parsed.reasonText || `HTTP ${response.status}`),
      } as BissSignResponse;
    }

    // Unable to parse meaningful response
    if (!response.ok) {
      throw new Error(`BISS /sign върна HTTP ${response.status}: ${rawText.substring(0, 200)}`);
    }

    throw new Error('BISS /sign върна невалиден JSON отговор');
  };

  const buildBissRequestPayload = (
    signRequest: BissPrepareResponse['signRequest'],
    signerCertificateB64: string
  ): Record<string, unknown> => {
    // ALWAYS strip internal fields and strict-mode fields BEFORE sending to BISS
    // The client NEVER sends signedContents/signedContentsCert - only the backend knows about those
    const { 
      _strictMode, 
      _signContentMode, 
      signedContents, 
      signedContentsCert, 
      ...basePayload 
    } = signRequest;

    return {
      ...basePayload,
      signerCertificateB64,
    };
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/dispatch/batches', {
        headers: getTokenHeader(),
      });
      setBatches(response.data.batches || []);
    } catch (error) {
      console.error('Failed to fetch dispatch batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncTaxonomy = async () => {
    setWorking(true);
    try {
      await axios.post(
        '/api/admin/taxonomy/sync',
        {},
        {
          headers: getTokenHeader(),
        }
      );
      await refreshData();
    } catch (error) {
      console.error('Failed to sync taxonomy:', error);
    } finally {
      setWorking(false);
    }
  };

  const generateBatches = async () => {
    setWorking(true);
    try {
      await axios.post(
        '/api/admin/dispatch/batches',
        {},
        {
          headers: getTokenHeader(),
        }
      );
      await refreshData();
    } catch (error) {
      console.error('Failed to generate batches:', error);
    } finally {
      setWorking(false);
    }
  };

  const signAndSendWithBiss = async (batch: DispatchBatch) => {
    const draft = batch.documents.find((doc) => doc.kind === 'DRAFT');
    if (!draft) {
      window.alert('Липсва проектодокумент (DRAFT) за този пакет. Генерирай пакетите отново.');
      return;
    }

    if (!batch.institution.email) {
      window.alert('Институцията няма имейл адрес. Добави имейл в Админ > Институции.');
      return;
    }

    const batchId = batch.id;
    setWorking(true);
    try {
      const prepareResponse = await axios.post<BissPrepareResponse>(
        `/api/admin/dispatch/batches/${batchId}/biss/prepare`,
        {
          hashAlgorithm: 'SHA256',
        },
        {
          headers: getTokenHeader(),
        }
      );

      const prepare = prepareResponse.data;
      if (prepare.mode === 'universal') {
        console.warn('BISS universal mode active: signedContents/signedContentsCert are not sent.');
      }

      if (prepare.allowTestMode) {
        const confirmed = window.confirm(
          'BISS тестов режим е активен. Да продължим с MOCK подпис (без реален КЕП)?'
        );

        if (!confirmed) {
          setWorking(false);
          return;
        }

        const mockSignatureB64 = btoa(`MOCK_BISS_SIGNATURE_${batchId}_${Date.now()}`);

        await axios.post(
          `/api/admin/dispatch/batches/${batchId}/biss/sign-send`,
          {
            status: 'ok',
            reasonCode: '0',
            reasonText: 'MOCK_SIGNATURE_FOR_TEST',
            signatures: [mockSignatureB64],
            signatureType: 'signature',
            signerCertificateB64: '',
          },
          {
            headers: getTokenHeader(),
          }
        );

        await refreshData();
        return;
      }

      const bissBaseUrl = await discoverBissBaseUrl(prepare.portCandidates || [53952, 53953, 53954, 53955]);

      const signerResponse = await callBissGetSigner(bissBaseUrl);
      if (signerResponse.status !== 'ok' || !signerResponse.chain?.[0]) {
        throw new Error(`BISS /getsigner неуспех: ${signerResponse.reasonCode} ${signerResponse.reasonText}`);
      }

      const signerCertificateB64 = signerResponse.chain[0];

      console.log('[BISS] Starting sign attempt with mode:', prepare.mode);
      let signResponse = await callBissSign(
        bissBaseUrl,
        buildBissRequestPayload(prepare.signRequest, signerCertificateB64)
      );

      const reasonTextInitial = String(signResponse.reasonText || '');
      console.log('[BISS] Sign response:', { status: signResponse.status, reasonCode: signResponse.reasonCode, reasonText: reasonTextInitial });
      
      const invalidRequestSignature =
        signResponse.status !== 'ok' && /невалиден|invalid/i.test(reasonTextInitial);
      const missingServerCertificate =
        signResponse.status !== 'ok' &&
        (/сертификат/i.test(reasonTextInitial) && /не е намерен|not found/i.test(reasonTextInitial));

      if (missingServerCertificate) {
        // Hard fallback: retry with same payload (client always strips strict fields anyway)
        console.warn('[BISS] Detected missing server certificate. Retrying /sign immediately');
        signResponse = await callBissSign(
          bissBaseUrl,
          buildBissRequestPayload(prepare.signRequest, signerCertificateB64)
        );
      }

      if (invalidRequestSignature || missingServerCertificate) {
        console.warn('[BISS] Retrying with signContentMode=base64');
        const fallbackPrepareResponse = await axios.post<BissPrepareResponse>(
          `/api/admin/dispatch/batches/${batchId}/biss/prepare`,
          {
            hashAlgorithm: 'SHA256',
            signContentMode: 'base64',
          },
          {
            headers: getTokenHeader(),
          }
        );

        signResponse = await callBissSign(
          bissBaseUrl,
          buildBissRequestPayload(fallbackPrepareResponse.data.signRequest, signerCertificateB64)
        );
        console.log('[BISS] Retry response:', { status: signResponse.status, reasonCode: signResponse.reasonCode });
      }

      const reasonTextAfterFallback = String(signResponse.reasonText || '');
      const stillInvalidRequestSignature =
        signResponse.status !== 'ok' && /невалиден|invalid/i.test(reasonTextAfterFallback);
      const stillMissingServerCertificate =
        signResponse.status !== 'ok' &&
        (/сертификат/i.test(reasonTextAfterFallback) && /не е намерен|not found/i.test(reasonTextAfterFallback));

      if (stillInvalidRequestSignature || stillMissingServerCertificate) {
        console.warn('[BISS] Retrying with forceUniversalMode=true on backend');
        const universalPrepareResponse = await axios.post<BissPrepareResponse>(
          `/api/admin/dispatch/batches/${batchId}/biss/prepare`,
          {
            hashAlgorithm: 'SHA256',
            forceUniversalMode: true,
          },
          {
            headers: getTokenHeader(),
          }
        );

        signResponse = await callBissSign(
          bissBaseUrl,
          buildBissRequestPayload(universalPrepareResponse.data.signRequest, signerCertificateB64)
        );
        console.log('[BISS] Final retry response:', { status: signResponse.status, reasonCode: signResponse.reasonCode });
      }

      if (signResponse.status !== 'ok') {
        const reasonText = String(signResponse.reasonText || '');
        const missingServerCert = /сертификат|certificate/i.test(reasonText) && /не е намерен|not found/i.test(reasonText);
        const strictModeHint = missingServerCert
          ? ' Липсва server certificate за BISS strict mode. Добави BISS_REQUEST_SIGNING_PRIVATE_KEY_PEM и BISS_REQUEST_SIGNING_CERT_B64 във Vercel Environment Variables и redeploy. ОЩЕ ЛУЧШЕ: Не добавяй, оставя BISS_ENABLE_STRICT_MODE=false и ползвай режим на договор (универсален режим).'
          : '';
        const errorMsg = `BISS /sign неуспех: ${signResponse.reasonCode} ${signResponse.reasonText}${strictModeHint}`;
        console.error('[BISS] Final error:', errorMsg);
        throw new Error(errorMsg);
      }

      await axios.post(
        `/api/admin/dispatch/batches/${batchId}/biss/sign-send`,
        {
          status: signResponse.status,
          reasonCode: signResponse.reasonCode,
          reasonText: signResponse.reasonText,
          signatures: signResponse.signatures || [],
          signatureType: signResponse.signatureType || 'signature',
          signerCertificateB64,
        },
        {
          headers: getTokenHeader(),
        }
      );

      await refreshData();
    } catch (error) {
      console.error('Failed to sign and send with BISS:', error);
      const isCorsOrNetworkFailure =
        error instanceof TypeError ||
        (error instanceof Error && /Failed to fetch|NetworkError|CORS/i.test(error.message));

      if (isCorsOrNetworkFailure) {
        const currentOrigin = window.location.origin;
        window.alert(
          [
            'Неуспешна връзка с локалния BISS (възможен CORS/SSL проблем).',
            '1) Отвори https://localhost:53952/version в браузъра и приеми сертификата, ако има предупреждение.',
            '2) Увери се, че BISS услугата е стартирана на порт 53952.',
            `3) В BISS CORS настройките разреши Origin: ${currentOrigin}`,
            '4) Увери се, че OPTIONS отговорът връща Access-Control-Allow-Origin/Methods/Headers.',
            '5) Презареди страницата (Ctrl+F5) и опитай пак.',
          ].join('\n')
        );
        return;
      }

      const message =
        axios.isAxiosError(error)
          ? String(error.response?.data?.error || error.response?.data?.details || error.message)
          : error instanceof Error
            ? error.message
            : 'Неуспешно подписване/изпращане през BISS';
      window.alert(message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="px-6 py-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.4em] admin-muted">Изпращане</p>
        <h1 className="text-3xl md:text-4xl font-semibold rc-display admin-text mt-3">
          Документи и изпращане към институции
        </h1>
      </div>

      <div className="rounded-3xl data-card p-6 mb-6">
        <div className="grid md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={syncTaxonomy}
            disabled={working}
            className="rounded-2xl border border-current bg-transparent admin-muted hover:admin-text hover:border-current py-3 text-sm uppercase tracking-[0.25em] transition-colors"
          >
            Синхронизирай таксономия
          </button>
          <button
            type="button"
            onClick={generateBatches}
            disabled={working}
            className="rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white py-3 text-sm uppercase tracking-[0.25em] hover:shadow-lg transition-shadow disabled:opacity-50"
          >
            Генерирай пакети за подпис
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 admin-muted">Зареждане...</div>
      ) : (
        <div className="space-y-4">
          {batches.map((batch) => {
            const draft = batch.documents.find((doc) => doc.kind === 'DRAFT');
            const signed = batch.documents.find((doc) => doc.kind === 'SIGNED');

            return (
              <div key={batch.id} className="rounded-2xl data-card p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold admin-text">{batch.institution.name}</h3>
                    <p className="text-sm admin-muted mt-1">Пакет: {batch.id}</p>
                    <p className="text-sm admin-muted">Сигнали в пакета: {batch.items.length}</p>
                    <p className="text-sm admin-muted">Статус: {batch.status}</p>
                  </div>

                  <div className="space-y-2 min-w-[280px]">
                    {draft && (
                      <a
                        href={draft.filePath}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-xl border border-current bg-transparent admin-muted hover:admin-text px-3 py-2 text-sm transition-colors"
                      >
                        Отвори проектодокумент
                      </a>
                    )}

                    {signed && (
                      <a
                        href={signed.filePath}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        Отвори подписано копие
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => signAndSendWithBiss(batch)}
                      disabled={working || batch.status === 'SENT'}
                      className="w-full rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white px-3 py-2 text-sm hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      Подпиши с BISS и изпрати
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {batches.length === 0 && (
            <div className="text-center py-10 admin-muted">Няма генерирани пакети.</div>
          )}
        </div>
      )}
    </div>
  );
}
