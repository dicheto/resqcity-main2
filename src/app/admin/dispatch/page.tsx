'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { generateMockSignature, signPdfWithPades } from '@/hooks/lib/document-signing';
import { useI18n } from '@/i18n';

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

type SigningMethod = 'mock' | 'biss' | 'manual';

export default function DispatchPage() {
  const { locale } = useI18n();
  const tr = (bg: string, en: string, ar: string) => (locale === 'ar' ? ar : locale === 'en' ? en : bg);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [batches, setBatches] = useState<DispatchBatch[]>([]);
  const [signingMethod, setSigningMethod] = useState<SigningMethod>('mock');
  const [manualSigningBatchId, setManualSigningBatchId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const getTokenHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

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

  // ===== MOCK SIGNING METHOD =====
  const signAndSendWithMock = async (batch: DispatchBatch) => {
    const draft = batch.documents.find((doc) => doc.kind === 'DRAFT');
    if (!draft) {
      window.alert('Липсва проектодокумент (DRAFT)');
      return;
    }

    if (!batch.institution.email) {
      window.alert('Институцията няма имейл адрес');
      return;
    }

    const batchId = batch.id;
    setWorking(true);
    try {
      // Read draft PDF
      const pdfResponse = await fetch(draft.filePath);
      const pdfBuffer = await pdfResponse.arrayBuffer();
      const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

      // Sign PDF with PAdES format (signature embedded in document)
      const adminEmail = localStorage.getItem('userEmail') || 'admin@resqcity.bg';
      const { pdfBase64: signedPdfBase64, signatureResult } = await signPdfWithPades(
        pdfBase64,
        adminEmail,
        'SHA256'
      );

      if (signatureResult.status !== 'ok') {
        throw new Error(`Signing failed: ${signatureResult.reasonText}`);
      }

      // Save signed document and mark batch as sent
      // Now sending PAdES-embedded PDF (signature is inside the document)
      await axios.post(
        `/api/admin/dispatch/batches/${batchId}/mock-sign-send`,
        {
          signedPdfBase64,
          reasonText: signatureResult.reasonText,
          signatures: signatureResult.signatures,
          signatureAlgorithm: signatureResult.signatureAlgorithm,
          signedAt: signatureResult.signedAt,
          signedBy: signatureResult.signedBy,
        },
        {
          headers: getTokenHeader(),
        }
      );

      window.alert('✅ Пакетът е подписан (PAdES) и изпратен успешно');
      await refreshData();
    } catch (error) {
      console.error('Failed to sign and send batch with mock:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      window.alert(`❌ Грешка: ${errorMsg}`);
    } finally {
      setWorking(false);
    }
  };

  // ===== BISS SIGNING METHOD =====
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

    throw new Error(tr('BISS не е открит. Уверете се, че локалната BISS услуга е стартирана.', 'BISS not found. Make sure the local BISS service is running.', 'لم يتم العثور على BISS. تأكد من تشغيل خدمة BISS المحلية.'));
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

    if (parsed?.status === 'ok' || parsed?.status === 'failed') {
      return parsed as BissSignResponse;
    }

    if (!response.ok && parsed && (parsed.reasonCode || parsed.reasonText)) {
      return {
        status: 'failed',
        reasonCode: String(parsed.reasonCode || '500'),
        reasonText: String(parsed.reasonText || `HTTP ${response.status}`),
      } as BissSignResponse;
    }

    if (!response.ok) {
      throw new Error(`BISS /sign върна HTTP ${response.status}: ${rawText.substring(0, 200)}`);
    }

    throw new Error('BISS /sign върна невалиден JSON отговор');
  };

  const buildBissRequestPayload = (
    signRequest: BissPrepareResponse['signRequest'],
    signerCertificateB64: string
  ): Record<string, unknown> => {
    const { _strictMode, _signContentMode, signedContents, signedContentsCert, ...basePayload } = signRequest;
    return {
      ...basePayload,
      signerCertificateB64,
    };
  };

  const signAndSendWithBiss = async (batch: DispatchBatch) => {
    const draft = batch.documents.find((doc) => doc.kind === 'DRAFT');
    if (!draft) {
      window.alert('Липсва проектодокумент (DRAFT)');
      return;
    }

    if (!batch.institution.email) {
      window.alert('Институцията няма имейл адрес');
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

      const bissBaseUrl = await discoverBissBaseUrl(prepare.portCandidates || [53952, 53953, 53954, 53955]);

      const signerResponse = await callBissGetSigner(bissBaseUrl);
      if (signerResponse.status !== 'ok' || !signerResponse.chain?.[0]) {
        throw new Error(`BISS /getsigner неуспех: ${signerResponse.reasonCode} ${signerResponse.reasonText}`);
      }

      const signerCertificateB64 = signerResponse.chain[0];

      let signResponse = await callBissSign(
        bissBaseUrl,
        buildBissRequestPayload(prepare.signRequest, signerCertificateB64)
      );

      if (signResponse.status !== 'ok') {
        const reasonText = String(signResponse.reasonText || '');
        const errorMsg = `BISS /sign неуспех: ${signResponse.reasonCode} ${reasonText}`;
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

      window.alert('✅ Пакетът е подписан и изпратен успешно (BISS)');
      await refreshData();
    } catch (error) {
      console.error('Failed to sign and send with BISS:', error);
      const isCorsOrNetworkFailure =
        error instanceof TypeError ||
        (error instanceof Error && /Failed to fetch|NetworkError|CORS/i.test(error.message));

      if (isCorsOrNetworkFailure) {
        window.alert(
          'Неуспешна връзка с локалния BISS. Уверете се, че BISS услугата е стартирана на порт 53952.'
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

  const uploadManuallySignedPdf = async (batch: DispatchBatch, file: File) => {
    if (!file) return;

    const batchId = batch.id;
    setWorking(true);
    try {
      const formData = new FormData();
      formData.append('signedPdf', file);

      const response = await axios.post(
        `/api/admin/dispatch/batches/${batchId}/manual-sign-send`,
        formData,
        {
          headers: {
            ...getTokenHeader(),
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        window.alert('✅ Подписаният документ е качен успешно и изпратен на институцията');
        setManualSigningBatchId(null);
        setSelectedFile(null);
        await refreshData();
      }
    } catch (error) {
      console.error('Failed to upload manually signed PDF:', error);
      const errorMsg =
        axios.isAxiosError(error)
          ? String(error.response?.data?.error || error.response?.data?.details || error.message)
          : error instanceof Error
            ? error.message
            : 'Неуспешно качване на подписан документ';
      window.alert(`❌ Грешка: ${errorMsg}`);
    } finally {
      setWorking(false);
    }
  };

  const downloadForManualSigning = async (batch: DispatchBatch) => {
    const draft = batch.documents.find((doc) => doc.kind === 'DRAFT');
    if (!draft) {
      window.alert('Липсва проектодокумент (DRAFT)');
      return;
    }

    setWorking(true);
    try {
      // Fetch PDF and download it
      const pdfResponse = await fetch(draft.filePath);
      if (!pdfResponse.ok) {
        throw new Error('Неможе да се вземе PDF файлът');
      }

      const pdfBuffer = await pdfResponse.arrayBuffer();
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `batch-${batch.id}-for-signing.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Set batch as waiting for manual signature upload
      setManualSigningBatchId(batch.id);

      window.alert(
        `✅ PDF е свален. Подпишете го с външни инструмент (напр. Adobe Sign) и качете обратно.`
      );
    } catch (error) {
      console.error('Failed to download PDF for manual signing:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      window.alert(`❌ Грешка при свалянето: ${errorMsg}`);
    } finally {
      setWorking(false);
    }
  };

  const signAndSendBatch = async (batch: DispatchBatch) => {
    if (signingMethod === 'mock') {
      await signAndSendWithMock(batch);
    } else if (signingMethod === 'biss') {
      await signAndSendWithBiss(batch);
    } else if (signingMethod === 'manual') {
      await downloadForManualSigning(batch);
    }
  };

  return (
    <div className="px-6 py-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.4em] admin-muted">{tr('Изпращане', 'Dispatch', 'الإرسال')}</p>
        <h1 className="text-3xl md:text-4xl font-semibold rc-display admin-text mt-3">
          {tr('Управление на пакети', 'Batch management', 'إدارة الدُفعات')}
        </h1>
      </div>

      {/* SIGNING METHOD SELECTOR */}
      <div className="rounded-3xl data-card p-6 mb-6 border border-blue-500/30 bg-blue-500/10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-medium admin-text mb-2">{tr('Метод на подписване:', 'Signing method:', 'طريقة التوقيع:')}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSigningMethod('mock')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  signingMethod === 'mock'
                    ? 'bg-green-500 text-white'
                    : 'border border-current bg-transparent admin-muted hover:admin-text'
                }`}
              >
                {tr('📦 Mock (Административна печат)', '📦 Mock (Administrative stamp)', '📦 وهمي (ختم إداري)')}
              </button>
              <button
                type="button"
                onClick={() => setSigningMethod('biss')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  signingMethod === 'biss'
                    ? 'bg-purple-500 text-white'
                    : 'border border-current bg-transparent admin-muted hover:admin-text'
                }`}
              >
                {tr('🔐 BISS (Локален)', '🔐 BISS (Local)', '🔐 BISS (محلي)')}
              </button>
              <button
                type="button"
                onClick={() => setSigningMethod('manual')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  signingMethod === 'manual'
                    ? 'bg-blue-500 text-white'
                    : 'border border-current bg-transparent admin-muted hover:admin-text'
                }`}
              >
                {tr('💾 Ръчно (Сваляне)', '💾 Manual (Download)', '💾 يدوي (تنزيل)')}
              </button>
            </div>
          </div>
          <div className="text-xs admin-muted">
            {signingMethod === 'mock' ? (
              <span className="text-green-400">{tr('Локално, ingen cyfri, PAdES', 'Local, no external cert, PAdES', 'محلي، بدون شهادة خارجية، PAdES')}</span>
            ) : signingMethod === 'biss' ? (
              <span className="text-purple-400">{tr('Локален BISS сервис (портове 53952-53955)', 'Local BISS service (ports 53952-53955)', 'خدمة BISS محلية (المنافذ 53952-53955)')}</span>
            ) : (
              <span className="text-blue-400">{tr('Сваляне → Външно подписване → Качване', 'Download → External signing → Upload', 'تنزيل ← توقيع خارجي ← رفع')}</span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl data-card p-6 mb-6">
        <div className="grid md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={syncTaxonomy}
            disabled={working}
            className="rounded-2xl border border-current bg-transparent admin-muted hover:admin-text transition-colors p-3 font-medium"
          >
            {tr('🔄 Синхронизирай таксономия', '🔄 Sync taxonomy', '🔄 مزامنة التصنيف')}
          </button>
          <button
            type="button"
            onClick={generateBatches}
            disabled={working}
            className="rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:shadow-lg transition-all p-3 font-medium"
          >
            {tr('📦 Генерирай пакети', '📦 Generate batches', '📦 إنشاء دفعات')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 admin-muted">{tr('Зареждане...', 'Loading...', 'جار التحميل...')}</div>
      ) : batches.length > 0 ? (
        <>
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
                          className="block rounded-lg border border-current bg-transparent admin-muted hover:admin-text transition-colors p-2 text-center text-sm"
                        >
                          📄 Преглед на проект
                        </a>
                      )}
                      {signed && (
                        <a
                          href={signed.filePath}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-lg border border-current bg-transparent admin-muted hover:admin-text transition-colors p-2 text-center text-sm"
                        >
                          ✅ Преглед на подписан
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => signAndSendBatch(batch)}
                        disabled={working || batch.status === 'SENT'}
                        className="block w-full rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-white hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed p-2 font-medium text-sm"
                      >
                        {signingMethod === 'mock' ? '🔐 Подпиши (Mock, PAdES) и изпрати' : signingMethod === 'biss' ? '🔐 Подпиши (BISS) и изпрати' : '📥 Свали за подписване'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* MANUAL SIGNING FILE UPLOAD MODAL */}
          {manualSigningBatchId && signingMethod === 'manual' && (
            <div className="mt-8 rounded-3xl data-card p-6 border border-blue-500/50 bg-blue-500/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold admin-text">📥 Качване на подписан документ</h3>
                <button
                  type="button"
                  onClick={() => {
                    setManualSigningBatchId(null);
                    setSelectedFile(null);
                  }}
                  className="text-sm admin-muted hover:admin-text transition-colors"
                >
                  ✕ Отмени
                </button>
              </div>

              <div className="space-y-4">
                <div className="border-2 border-dashed border-blue-500/50 rounded-lg p-6 text-center">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.currentTarget.files?.[0];
                        if (file) {
                          if (file.type !== 'application/pdf') {
                            window.alert('Моля, изберете PDF файл');
                            return;
                          }
                          setSelectedFile(file);
                        }
                      }}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-2xl">📄</span>
                      <div>
                        <p className="font-medium admin-text">
                          {selectedFile ? selectedFile.name : 'Кликнете тук или оставете файл'}
                        </p>
                        <p className="text-xs admin-muted mt-1">PDF файл с подпис</p>
                      </div>
                    </div>
                  </label>
                </div>

                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => {
                      const batch = batches.find((b) => b.id === manualSigningBatchId);
                      if (batch && selectedFile) {
                        uploadManuallySignedPdf(batch, selectedFile);
                      }
                    }}
                    disabled={working}
                    className="w-full py-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {working ? '⏳ Качване...' : '✅ Качи и изпрати на institucita'}
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-10 admin-muted">{tr('Няма генерирани пакети.', 'No generated batches.', 'لا توجد دفعات مُنشأة.')}</div>
      )}
    </div>
  );
}
