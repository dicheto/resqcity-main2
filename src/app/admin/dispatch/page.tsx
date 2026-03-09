'use client';

import { ChangeEvent, useEffect, useState } from 'react';
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

  const uploadSignedCopy = async (batchId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const asBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const value = String(reader.result || '');
        const splitValue = value.split(',');
        resolve(splitValue.length > 1 ? splitValue[1] : splitValue[0]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    setWorking(true);
    try {
      await axios.post(
        `/api/admin/dispatch/batches/${batchId}/upload-signed`,
        {
          fileName: file.name,
          base64Content: asBase64,
          mimeType: file.type || 'application/octet-stream',
        },
        {
          headers: getTokenHeader(),
        }
      );
      await refreshData();
    } catch (error) {
      console.error('Failed to upload signed copy:', error);
    } finally {
      setWorking(false);
    }
  };

  const sendBatchEmail = async (batchId: string) => {
    setWorking(true);
    try {
      await axios.post(
        `/api/admin/dispatch/batches/${batchId}/send`,
        {},
        {
          headers: getTokenHeader(),
        }
      );
      await refreshData();
    } catch (error) {
      console.error('Failed to send batch email:', error);
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

                    <label className="block rounded-xl border border-current bg-transparent admin-muted hover:admin-text px-3 py-2 text-sm cursor-pointer transition-colors">
                      Качи подписан файл
                      <input
                        type="file"
                        className="hidden"
                        onChange={(event) => uploadSignedCopy(batch.id, event)}
                      />
                    </label>

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
                      onClick={() => sendBatchEmail(batch.id)}
                      disabled={!signed || !batch.institution.email || working}
                      className="w-full rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white px-3 py-2 text-sm hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      Изпрати към институцията
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
