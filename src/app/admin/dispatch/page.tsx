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

  const discoverBissBaseUrl = async (candidates: number[]): Promise<string> => {
    for (const port of candidates) {
      for (const protocol of ['https', 'http'] as const) {
        const baseUrl = `${protocol}://localhost:${port}`;
        try {
          const response = await fetch(`${baseUrl}/version`, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        showValidCerts: true,
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`BISS /sign върна HTTP ${response.status}`);
    }

    return response.json();
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
      const bissBaseUrl = await discoverBissBaseUrl(prepare.portCandidates || [53952, 53953, 53954, 53955]);

      const signerResponse = await callBissGetSigner(bissBaseUrl);
      if (signerResponse.status !== 'ok' || !signerResponse.chain?.[0]) {
        throw new Error(`BISS /getsigner неуспех: ${signerResponse.reasonCode} ${signerResponse.reasonText}`);
      }

      const signerCertificateB64 = signerResponse.chain[0];

      const signResponse = await callBissSign(bissBaseUrl, {
        ...prepare.signRequest,
        signerCertificateB64,
      });

      if (signResponse.status !== 'ok') {
        throw new Error(`BISS /sign неуспех: ${signResponse.reasonCode} ${signResponse.reasonText}`);
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
