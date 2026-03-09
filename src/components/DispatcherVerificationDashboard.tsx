"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, AlertCircle, Loader } from "lucide-react";

interface Photo {
  id: string;
  fileName: string;
  filePath: string;
  uploadedAt: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const INCIDENT_BUCKET = 'incident-photos';

/** Ensures we always get a full absolute URL regardless of what is stored in DB */
function resolvePhotoUrl(filePath: string): string {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  return `${SUPABASE_URL}/storage/v1/object/public/${INCIDENT_BUCKET}/${filePath}`;
}

interface Incident {
  id: string;
  type: string;
  description: string;
  status: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  vehicle: {
    registrationPlate: string;
    brand: string;
    model: string;
  };
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  photos: Photo[];
}

export function DispatcherVerificationDashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState("UNDER_REVIEW");
  const [counts, setCounts] = useState({
    UNDER_REVIEW: 0,
    VERIFIED: 0,
    REJECTED: 0,
  });

  const authHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch counts for all statuses
  const fetchAllCounts = async () => {
    try {
      const newCounts = { UNDER_REVIEW: 0, VERIFIED: 0, REJECTED: 0 };
      
      for (const status of ["UNDER_REVIEW", "VERIFIED", "REJECTED"]) {
        const response = await fetch(
          `/api/dispatcher/incidents?status=${status}&limit=1`,
          {
            headers: authHeaders(),
          }
        );

        if (response.ok) {
          const data = await response.json();
          newCounts[status as keyof typeof newCounts] = data.total || 0;
        }
      }

      setCounts(newCounts);
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  };

  // Fetch incidents
  useEffect(() => {
    fetchIncidents();
    fetchAllCounts();
  }, [filter]);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      setError(""); // Clear previous errors
      const url = `/api/dispatcher/incidents?status=${filter}`;
      console.log("[DashboardFetch] Fetching from:", url, "with filter:", filter);
      
      const response = await fetch(url, {
        headers: authHeaders(),
      });

      console.log("[DashboardFetch] Response status:", response.status);

      if (!response.ok) {
        if (response.status === 403) {
          const errorMsg = "Нямате права за достъп до тази страница";
          console.error("[DashboardFetch] Access denied:", response.status);
          setError(errorMsg);
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Неуспешно зареждане на сигналите`);
      }

      const data = await response.json();
      console.log("[DashboardFetch] Data received:", {
        incidentCount: data.incidents?.length,
        total: data.total,
        filter,
      });
      
      setIncidents(data.incidents || []);
        if (!Array.isArray(data.incidents)) {
          console.error("[DashboardFetch] Unexpected response format:", data);
          throw new Error("Invalid API response format");
        }
        if (!Array.isArray(data.incidents)) {
          console.error("[DashboardFetch] Unexpected response format:", data);
          throw new Error("Invalid API response format");
        }
      
        setIncidents(data.incidents);
      } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Неуспешно зареждане на сигналите";
      console.error("[DashboardFetch] Error:", errorMsg, error);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!selectedIncident) return;

    setVerifying(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/dispatcher/incidents/${selectedIncident.id}/verify`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            action: "verify",
            notes: verificationNotes,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Неуспешно потвърждение на сигнала");
      }

      setSuccess("Сигналът е потвърден успешно. Изпратено е известие до собственика.");
      setVerificationNotes("");
      setSelectedIncident(null);

      // Refresh incidents and counts
      setTimeout(() => {
        fetchIncidents();
        fetchAllCounts();
      }, 1000);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Неуспешно потвърждение на сигнала");
    } finally {
      setVerifying(false);
    }
  };

  const handleReject = async () => {
    if (!selectedIncident || !rejectionReason.trim()) {
      setError("Моля, въведете причина за отхвърляне");
      return;
    }

    setVerifying(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/dispatcher/incidents/${selectedIncident.id}/verify`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            action: "reject",
            notes: verificationNotes,
            rejectionReason,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Неуспешно отхвърляне на сигнала");
      }

      setSuccess("Сигналът е отхвърлен. Изпратено е известие до собственика.");
      setVerificationNotes("");
      setRejectionReason("");
      setSelectedIncident(null);

      // Refresh incidents and counts
      setTimeout(() => {
        fetchIncidents();
        fetchAllCounts();
      }, 1000);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Неуспешно отхвърляне на сигнала");
    } finally {
      setVerifying(false);
    }
  };

  const getIncidentTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      BLOCKING: "bg-red-500/10 text-red-400 border border-red-500/20",
      COLLISION: "bg-red-500/10 text-red-400 border border-red-500/20",
      ACCIDENT: "bg-red-500/10 text-red-400 border border-red-500/20",
      PARKING_PROBLEM: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
      TRAFFIC_VIOLATION: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
      DAMAGE: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
      THEFT_ATTEMPT: "bg-red-500/10 text-red-400 border border-red-500/20",
      OTHER: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
    };
    return colors[type] || "bg-slate-500/10 text-slate-400 border border-slate-500/20";
  };

  if (!selectedIncident) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-[var(--s-text)]">
            🚨 Диспечерско табло за верификация
          </h2>
          <p className="text-[var(--s-muted)] mt-2">
            Преглед и потвърждение на сигнали за превозни средства
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b border-[var(--s-border)]">
          <button
            onClick={() => setFilter("UNDER_REVIEW")}
            className={`px-4 py-3 font-semibold border-b-2 transition ${
              filter === "UNDER_REVIEW"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-[var(--s-muted)] hover:text-[var(--s-text)]"
            }`}
          >
            За преглед ({counts.UNDER_REVIEW})
          </button>
          <button
            onClick={() => setFilter("VERIFIED")}
            className={`px-4 py-3 font-semibold border-b-2 transition ${
              filter === "VERIFIED"
                ? "border-green-500 text-green-400"
                : "border-transparent text-[var(--s-muted)] hover:text-[var(--s-text)]"
            }`}
          >
            Потвърдени ({counts.VERIFIED})
          </button>
          <button
            onClick={() => setFilter("REJECTED")}
            className={`px-4 py-3 font-semibold border-b-2 transition ${
              filter === "REJECTED"
                ? "border-red-500 text-red-400"
                : "border-transparent text-[var(--s-muted)] hover:text-[var(--s-text)]"
            }`}
          >
            Отхвърлени ({counts.REJECTED})
          </button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="rounded-2xl border p-4 flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }}>
            <AlertCircle className="text-red-400 mt-0.5" size={20} />
            <div className="text-red-300">{error}</div>
          </div>
        )}

        {success && (
          <div className="rounded-2xl border p-4" style={{ background: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' }}>
            <div className="text-green-300">{success}</div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : incidents.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-[var(--s-border)]" style={{ background: 'var(--s-surface)' }}>
            <CheckCircle size={48} className="mx-auto text-[var(--s-muted)] mb-4" />
            <p className="text-[var(--s-muted)] text-lg font-semibold">
              {filter === "UNDER_REVIEW"
                ? "Няма сигнали за преглед"
                : filter === "VERIFIED"
                ? "Няма потвърдени сигнали"
                : "Няма отхвърлени сигнали"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {incidents.map((incident) => (
              <button
                key={incident.id}
                onClick={() => setSelectedIncident(incident)}
                className="text-left rounded-2xl border border-[var(--s-border)] p-6 transition hover:border-blue-500/50" style={{ background: 'var(--s-surface)' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-[var(--s-text)]">
                        {incident.vehicle.brand} {incident.vehicle.model}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${getIncidentTypeColor(
                          incident.type
                        )}`}
                      >
                        {incident.type}
                      </span>
                    </div>
                    <p className="text-[var(--s-muted)] font-mono">
                      {incident.vehicle.registrationPlate}
                    </p>
                  </div>
                  <p className="text-sm text-[var(--s-muted2)]">
                    {new Date(incident.createdAt).toLocaleDateString("bg-BG", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <p className="text-[var(--s-muted)] mb-3">{incident.description}</p>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-[var(--s-muted)]">
                    <p>
                      <strong className="text-[var(--s-text)]">Подаден от:</strong> {incident.user.firstName}{" "}
                      {incident.user.lastName}
                    </p>
                    <p>
                      <strong className="text-[var(--s-text)]">Снимки:</strong> {incident.photos.length}
                    </p>
                  </div>
                  <div className="text-blue-400 font-semibold">
                    Преглед → <span className="text-lg">›</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Incident Detail View
  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => setSelectedIncident(null)}
        className="text-blue-400 hover:text-blue-300 font-semibold transition"
      >
        ← Назад към списъка
      </button>

      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-2xl border p-4 flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }}>
          <AlertCircle className="text-red-400 mt-0.5" size={20} />
          <div className="text-red-300">{error}</div>
        </div>
      )}

      {success && (
        <div className="rounded-2xl border p-4 flex items-start gap-3" style={{ background: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' }}>
          <CheckCircle className="text-green-400 mt-0.5" size={20} />
          <div className="text-green-300">{success}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Incident Info */}
          <div className="rounded-2xl border border-[var(--s-border)] p-6" style={{ background: 'var(--s-surface)' }}>
            <h2 className="text-2xl font-bold mb-4 text-[var(--s-text)]">Детайли за сигнала</h2>

            <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-[var(--s-border)]">
              <div>
                <p className="text-sm text-[var(--s-muted)]">Превозно средство</p>
                <p className="text-lg font-semibold text-[var(--s-text)]">
                  {selectedIncident.vehicle.brand}{" "}
                  {selectedIncident.vehicle.model}
                </p>
                <p className="text-[var(--s-muted)] font-mono">
                  {selectedIncident.vehicle.registrationPlate}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--s-muted)]">Тип сигнал</p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getIncidentTypeColor(
                    selectedIncident.type
                  )}`}
                >
                  {selectedIncident.type}
                </span>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-[var(--s-muted)] mb-2">Описание</p>
              <p className="text-[var(--s-text)] leading-relaxed">
                {selectedIncident.description}
              </p>
            </div>

            {selectedIncident.address && (
              <div className="mb-4">
                <p className="text-sm text-[var(--s-muted)]">Локация</p>
                <p className="text-[var(--s-text)]">{selectedIncident.address}</p>
                {selectedIncident.latitude &&selectedIncident.longitude && (
                  <p className="text-sm text-[var(--s-muted)]">
                    Координати: {selectedIncident.latitude.toFixed(4)},{" "}
                    {selectedIncident.longitude.toFixed(4)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Reporter Info */}
          <div className="rounded-2xl border border-[var(--s-border)] p-6" style={{ background: 'var(--s-surface)' }}>
            <h3 className="text-lg font-bold mb-4 text-[var(--s-text)]">Информация за подателя</h3>
            <div className="space-y-2">
              <p className="text-[var(--s-muted)]">
                <strong className="text-[var(--s-text)]">Име:</strong> {selectedIncident.user.firstName}{" "}
                {selectedIncident.user.lastName}
              </p>
              <p className="text-[var(--s-muted)]">
                <strong className="text-[var(--s-text)]">Имейл:</strong> {selectedIncident.user.email}
              </p>
              <p className="text-[var(--s-muted)]">
                <strong className="text-[var(--s-text)]">Телефон:</strong> {selectedIncident.user.phone}
              </p>
            </div>
          </div>

          {/* Photos */}
          {selectedIncident.photos.length > 0 && (
            <div className="rounded-2xl border border-[var(--s-border)] p-6" style={{ background: 'var(--s-surface)' }}>
              <h3 className="text-lg font-bold mb-4 text-[var(--s-text)]">
                📸 Качени снимки ({selectedIncident.photos.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {selectedIncident.photos.map((photo) => (
                  <a
                    key={photo.id}
                    href={resolvePhotoUrl(photo.filePath)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <img
                      src={resolvePhotoUrl(photo.filePath)}
                      alt="Снимка от сигнала"
                      className="w-full h-40 object-cover rounded-lg border border-[var(--s-border)] group-hover:opacity-75 transition"
                    />
                    <p className="text-xs text-[var(--s-muted)] mt-1 group-hover:text-blue-400">
                      {photo.fileName}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Verification Panel */}
        <div className="rounded-2xl border border-[var(--s-border)] p-6 h-fit sticky top-6" style={{ background: 'var(--s-surface)' }}>
          <h3 className="text-lg font-bold mb-4 text-[var(--s-text)]">Верификация</h3>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-[var(--s-text)]">
                Бележки за верификация (по избор)
              </label>
              <textarea
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Опишете констатациите си..."
                className="site-input w-full h-24 text-sm"
                disabled={verifying}
              />
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="w-full px-4 py-3 rounded-xl font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white' }}
            >
              {verifying && <Loader size={18} className="animate-spin" />}
              <CheckCircle size={18} />
              Потвърди сигнала
            </button>
          </div>

          <div className="border-t border-[var(--s-border)] pt-4">
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2 text-[var(--s-text)]">
                Причина за отхвърляне (ако отхвърляте)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Защо този сигнал се отхвърля?"
                className="site-input w-full h-20 text-sm"
                disabled={verifying}
              />
            </div>
            <button
              onClick={handleReject}
              disabled={verifying || !rejectionReason.trim()}
              className="w-full px-4 py-3 rounded-xl font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white' }}
            >
              {verifying && <Loader size={18} className="animate-spin" />}
              <XCircle size={18} />
              Отхвърли сигнала
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
