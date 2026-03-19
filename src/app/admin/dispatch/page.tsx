'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { generateMockSignature } from '@/hooks/lib/document-signing';

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

  const signAndSendBatch = async (batch: DispatchBatch) => {
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

      // Generate mock signature
      const adminEmail = localStorage.getItem('userEmail') || 'admin@resqcity.bg';
      const signResult = generateMockSignature(pdfBase64, adminEmail, 'SHA256');

      if (signResult.status !== 'ok') {
        throw new Error(`Signing failed: ${signResult.reasonText}`);
      }

      // Save signed document and mark batch as sent
      await axios.post(
        `/api/admin/dispatch/batches/${batchId}/mock-sign-send`,
        {
          signedPdfBase64: pdfBase64,
          reasonText: signResult.reasonText,
          signatures: signResult.signatures,
          signatureAlgorithm: signResult.signatureAlgorithm,
          signedAt: signResult.signedAt,
          signedBy: signResult.signedBy,
        },
        {
          headers: getTokenHeader(),
        }
      );

      window.alert('✅ Пакетът е подписан и изпратен успешно');
      await refreshData();
    } catch (error) {
      console.error('Failed to sign and send batch:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      window.alert(`❌ Грешка: ${errorMsg}`);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="px-6 py-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.4em] admin-muted">Изпращане</p>
        <h1 className="text-3xl md:text-4xl font-semibold rc-display admin-text mt-3">
          Управление на пакети
        </h1>
      </div>

      <div className="rounded-3xl data-card p-6 mb-6">
        <div className="grid md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={syncTaxonomy}
            disabled={working}
            className="rounded-2xl border border-current bg-transparent admin-muted hover:admin-text transition-colors p-3 font-medium"
          >
            🔄 Синхронизирай таксономия
          </button>
          <button
            type="button"
            onClick={generateBatches}
            disabled={working}
            className="rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:shadow-lg transition-all p-3 font-medium"
          >
            📦 Генерирай пакети
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 admin-muted">Зареждане...</div>
      ) : batches.length > 0 ? (
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
                      🔐 Подпиши и изпрати
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10 admin-muted">Няма генерирани пакети.</div>
      )}
    </div>
  );
}
