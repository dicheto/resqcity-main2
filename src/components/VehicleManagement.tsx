"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, AlertCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/i18n";

interface Vehicle {
  id: string;
  registrationPlate: string;
  brand: string;
  model: string;
  year: number;
  color?: string;
  verified: boolean;
  active: boolean;
  incidents?: Array<{
    id: string;
    type: string;
    status: string;
  }>;
}

export function VehicleManagement() {
  const { locale } = useI18n();
  const tr = (bg: string, en: string, ar: string) => (locale === "ar" ? ar : locale === "en" ? en : bg);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    registrationPlate: "",
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    color: "",
    vin: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const authHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch vehicles
  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await fetch("/api/vehicles", {
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error(tr("Неуспешно зареждане на превозните средства", "Failed to load vehicles", "فشل تحميل المركبات"));
      const data = await response.json();
      setVehicles(data);
    } catch (error) {
      setError(tr("Неуспешно зареждане на превозните средства", "Failed to load vehicles", "فشل تحميل المركبات"));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "year" ? parseInt(value) : value,
    }));
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || tr("Неуспешно добавяне на превозно средство", "Failed to add vehicle", "فشل إضافة المركبة"));
      }

      const newVehicle = await response.json();
      setVehicles((prev) => [newVehicle, ...prev]);
      setSuccess(tr("Превозното средство е добавено успешно.", "Vehicle added successfully.", "تمت إضافة المركبة بنجاح."));
      setFormData({
        registrationPlate: "",
        brand: "",
        model: "",
        year: new Date().getFullYear(),
        color: "",
        vin: "",
      });
      setShowForm(false);

      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : tr("Неуспешно добавяне на превозно средство", "Failed to add vehicle", "فشل إضافة المركبة"));
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm(tr("Сигурни ли сте, че искате да изтриете това превозно средство?", "Are you sure you want to delete this vehicle?", "هل أنت متأكد أنك تريد حذف هذه المركبة؟"))) return;

    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!response.ok) throw new Error(tr("Неуспешно изтриване на превозното средство", "Failed to delete vehicle", "فشل حذف المركبة"));

      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
      setSuccess(tr("Превозното средство е изтрито успешно.", "Vehicle deleted successfully.", "تم حذف المركبة بنجاح."));
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError(tr("Неуспешно изтриване на превозното средство", "Failed to delete vehicle", "فشل حذف المركبة"));
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-2xl font-bold text-[var(--s-text)]">{tr("Моите превозни средства", "My vehicles", "مركباتي")}</h2>
        <div className="flex items-center gap-2">
          <Link
            href="/my-incidents/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl transition font-semibold"
            style={{ background: 'linear-gradient(135deg, #fb923c, #f97316)', color: 'white' }}
          >
            <AlertTriangle size={20} />
            {tr("Подай сигнал за превозно средство", "Submit vehicle report", "إرسال بلاغ مركبة")}
          </Link>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl transition font-semibold"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white' }}
          >
            <Plus size={20} />
            {tr("Добави превозно средство", "Add vehicle", "إضافة مركبة")}
          </button>
        </div>
      </div>

      {/* Error Messages */}
      {error && (
        <div className="rounded-2xl border p-4 flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }}>
          <AlertCircle className="text-red-400 mt-0.5" size={20} />
          <div className="text-red-300">{error}</div>
        </div>
      )}

      {/* Success Messages */}
      {success && (
        <div className="rounded-2xl border p-4" style={{ background: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' }}>
          <div className="text-green-300">{success}</div>
        </div>
      )}

      {/* Add Vehicle Form */}
      {showForm && (
        <form
          onSubmit={handleAddVehicle}
          className="rounded-2xl border border-[var(--s-border)] p-6 space-y-4"
          style={{ background: 'var(--s-surface)' }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="registrationPlate"
              placeholder={tr("Регистрационен номер (напр. CA 1234 CB)", "Registration plate (e.g. CA 1234 CB)", "رقم اللوحة (مثال: CA 1234 CB)")}
              value={formData.registrationPlate}
              onChange={handleInputChange}
              className="site-input"
              required
            />
            <input
              type="text"
              name="brand"
              placeholder={tr("Марка (напр. BMW)", "Brand (e.g. BMW)", "العلامة التجارية (مثال: BMW)")}
              value={formData.brand}
              onChange={handleInputChange}
              className="site-input"
              required
            />
            <input
              type="text"
              name="model"
              placeholder={tr("Модел (напр. X5)", "Model (e.g. X5)", "الطراز (مثال: X5)")}
              value={formData.model}
              onChange={handleInputChange}
              className="site-input"
              required
            />
            <input
              type="number"
              name="year"
              placeholder={tr("Година", "Year", "السنة")}
              value={formData.year}
              onChange={handleInputChange}
              className="site-input"
              required
            />
            <input
              type="text"
              name="color"
              placeholder={tr("Цвят (по избор)", "Color (optional)", "اللون (اختياري)")}
              value={formData.color}
              onChange={handleInputChange}
              className="site-input"
            />
            <input
              type="text"
              name="vin"
              placeholder={tr("VIN (по избор)", "VIN (optional)", "رقم VIN (اختياري)")}
              value={formData.vin}
              onChange={handleInputChange}
              className="site-input"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="px-6 py-2 rounded-xl transition font-semibold"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white' }}
            >
              {tr("Запази превозното средство", "Save vehicle", "حفظ المركبة")}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-6 py-2 rounded-xl transition font-semibold border border-[var(--s-border)] text-[var(--s-muted)] hover:text-[var(--s-text)]"
              style={{ background: 'var(--s-surface2)' }}
            >
              {tr("Отказ", "Cancel", "إلغاء")}
            </button>
          </div>
        </form>
      )}

      {/* Vehicles List */}
      {vehicles.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-[var(--s-border)]" style={{ background: 'var(--s-surface)' }}>
          <p className="text-[var(--s-muted)]">{tr("Все още няма регистрирани превозни средства. Добавете първото, за да започнете да подавате сигнали.", "No registered vehicles yet. Add your first one to start submitting reports.", "لا توجد مركبات مسجلة بعد. أضف أول مركبة لبدء إرسال البلاغات.")}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="rounded-2xl border border-[var(--s-border)] p-6 transition hover:border-blue-500/50"
              style={{ background: 'var(--s-surface)' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg text-[var(--s-text)]">
                    {vehicle.brand} {vehicle.model}
                  </h3>
                  <p className="text-[var(--s-muted)] font-mono text-sm">
                    {vehicle.registrationPlate}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteVehicle(vehicle.id)}
                  className="text-red-400 hover:bg-red-500/10 p-2 rounded transition"
                  title={tr("Изтрий превозното средство", "Delete vehicle", "حذف المركبة")}
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <div className="space-y-2 text-sm text-[var(--s-muted)] mb-4 pb-4 border-b border-[var(--s-border)]">
                <p><span className="text-[var(--s-text)]">{tr("Година:", "Year:", "السنة:")}</span> {vehicle.year}</p>
                {vehicle.color && <p><span className="text-[var(--s-text)]">{tr("Цвят:", "Color:", "اللون:")}</span> {vehicle.color}</p>}
                <div className="flex gap-2 items-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${vehicle.verified ? "bg-green-500" : "bg-slate-500"}`}></span>
                  <span className={vehicle.verified ? "text-green-400" : "text-slate-400"}>{vehicle.verified ? tr("Потвърдено", "Verified", "تم التحقق") : tr("Непотвърдено", "Unverified", "غير متحقق")}</span>
                </div>
              </div>

              {vehicle.incidents && vehicle.incidents.length > 0 && (
                <div className="text-sm">
                  <p className="font-semibold mb-2 text-[var(--s-text)]">{tr("Последен сигнал:", "Latest report:", "آخر بلاغ:")}</p>
                  <div className="rounded-xl p-2 border" style={{ background: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.2)' }}>
                    <p className="text-[var(--s-text)]">{vehicle.incidents[0].type}</p>
                    <p className="text-xs text-[var(--s-muted)]">{tr("Статус:", "Status:", "الحالة:")} {vehicle.incidents[0].status}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
