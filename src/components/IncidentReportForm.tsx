"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Upload, AlertCircle, CheckCircle, X, Car, MapPin,
  Camera, User, FileText, ChevronDown,
} from "lucide-react";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });

interface Vehicle {
  id: string;
  registrationPlate: string;
  brand: string;
  model: string;
}

const INCIDENT_TYPES = [
  { value: "BLOCKING",          label: "Блокиране на пътното платно" },
  { value: "COLLISION",         label: "Пътно-транспортно произшествие" },
  { value: "PARKING_PROBLEM",   label: "Нарушено паркиране" },
  { value: "TRAFFIC_VIOLATION", label: "Нарушение на правилата за движение" },
  { value: "ACCIDENT",          label: "Авария / Повреда" },
  { value: "DAMAGE",            label: "Нанесени материални щети" },
  { value: "THEFT_ATTEMPT",     label: "Опит за кражба" },
  { value: "OTHER",             label: "Друго" },
];

const inputCls =
  "site-input";

const labelCls =
  "block text-xs font-bold uppercase tracking-[0.35em] text-[var(--s-muted2)] mb-2";

export function IncidentReportForm() {
  const [vehicles, setVehicles]       = useState<Vehicle[]>([]);
  const [loading, setLoading]         = useState(true);
  const [photos, setPhotos]           = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");
  const [submitting, setSubmitting]   = useState(false);

  const [formData, setFormData] = useState({
    vehicleId: "",
    type: "",
    description: "",
    latitude: 42.6977,
    longitude: 23.3219,
    address: "",
    other_vehicle_plate: "",
    witness_contact: "",
    locationSet: false,
  });

  const authHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await fetch("/api/vehicles", { headers: authHeaders() });
        if (!response.ok) throw new Error("Грешка при зареждане на превозните средства");
        const data = await response.json();
        setVehicles(data);
        if (data.length > 0) setFormData((prev) => ({ ...prev, vehicleId: data[0].id }));
      } catch (err) {
        setError("Неуспешно зареждане на превозните средства");
      } finally {
        setLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter((file) => {
      if (!file.type.startsWith("image/")) {
        setError("Разрешени са само изображения");
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Размерът на файла трябва да е под 5 МБ");
        return false;
      }
      return true;
    });
    setPhotos((prev) => [...prev, ...valid]);
    valid.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        setPhotoPreview((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreview((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (photos.length === 0) {
      setError("Необходима е поне една снимка!");
      return;
    }
    if (!formData.vehicleId || !formData.type || !formData.description) {
      setError("Моля, попълни всички задължителни полета");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("vehicleId",          formData.vehicleId);
      fd.append("type",               formData.type);
      fd.append("description",        formData.description);
      fd.append("latitude",           String(formData.locationSet ? formData.latitude : ""));
      fd.append("longitude",          String(formData.locationSet ? formData.longitude : ""));
      fd.append("address",            formData.address);
      fd.append("other_vehicle_plate",formData.other_vehicle_plate);
      fd.append("witness_contact",    formData.witness_contact);
      photos.forEach((photo) => fd.append("photos", photo));

      console.log("[IncidentSubmit] Submitting incident", {
        vehicleId: formData.vehicleId,
        type: formData.type,
        photoCount: photos.length,
      });

      const response = await fetch("/api/vehicle-incidents", {
        method: "POST",
        headers: authHeaders(),
        body: fd,
      });

      console.log("[IncidentSubmit] Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[IncidentSubmit] Error response:", errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Неуспешно изпращане на сигнала`);
      }

      const result = await response.json();
      console.log("[IncidentSubmit] Success! Created incident:", result.id);
      
      setSuccess("Сигналът е изпратен успешно! Диспечерът ще го прегледа скоро.");
      setFormData({
        vehicleId: vehicles[0]?.id || "",
        type: "",
        description: "",
        latitude: 42.6977,
        longitude: 23.3219,
        address: "",
        other_vehicle_plate: "",
        witness_contact: "",
        locationSet: false,
      });
      setPhotos([]);
      setPhotoPreview([]);
      setTimeout(() => setSuccess(""), 6000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Неуспешно изпращане на сигнала";
      console.error("[IncidentSubmit] Submission error:", errorMsg, err);
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Loading skeleton ──────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 animate-pulse" />
          <p className="text-xs text-[var(--s-muted)] uppercase tracking-[0.4em]">Зареждане...</p>
        </div>
      </div>
    );
  }

  /* ── No vehicles ──────────────────────────────────────────── */
  if (vehicles.length === 0) {
    return (
      <div
        className="site-card p-8 rounded-2xl flex items-start gap-4"
        style={{ borderColor: "rgba(245,158,11,0.25)" }}
      >
        <div className="w-11 h-11 rounded-2xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
          <Car size={20} className="text-amber-400" />
        </div>
        <div>
          <h3 className="font-bold text-[var(--s-text)] mb-1">Няма регистрирани превозни средства</h3>
          <p className="text-sm text-[var(--s-muted)] leading-relaxed">
            Преди да подадеш сигнал за инцидент, добави превозно средство в профила си.
          </p>
          <a
            href="/vehicles"
            className="inline-flex items-center gap-2 mt-4 btn-site-primary text-xs py-2 px-5"
          >
            <Car size={13} /> Добави превозно средство
          </a>
        </div>
      </div>
    );
  }

  /* ── Main form ────────────────────────────────────────────── */
  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Error / Success banners */}
      {error && (
        <div
          className="flex items-start gap-3 p-4 rounded-2xl border animate-fade-up"
          style={{ background: "rgba(255,71,87,0.08)", borderColor: "rgba(255,71,87,0.2)" }}
        >
          <AlertCircle size={18} className="text-[var(--s-red)] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--s-red)]">{error}</p>
          <button
            type="button"
            onClick={() => setError("")}
            className="ml-auto text-[var(--s-red)] opacity-60 hover:opacity-100 transition"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {success && (
        <div
          className="flex items-start gap-3 p-4 rounded-2xl border animate-fade-up"
          style={{ background: "rgba(6,214,160,0.08)", borderColor: "rgba(6,214,160,0.22)" }}
        >
          <CheckCircle size={18} className="text-[var(--s-teal)] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--s-teal)]">{success}</p>
        </div>
      )}

      {/* Section: Основна информация */}
      <div className="site-card rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl bg-orange-500/15 flex items-center justify-center">
            <Car size={15} className="text-[var(--s-orange)]" />
          </div>
          <p className="text-sm font-bold text-[var(--s-text)]">Основна информация</p>
        </div>

        {/* Vehicle */}
        <div>
          <label className={labelCls}>
            Превозно средство <span className="text-[var(--s-orange)]">*</span>
          </label>
          <div className="relative">
            <select
              name="vehicleId"
              value={formData.vehicleId}
              onChange={handleInputChange}
              className={inputCls + " appearance-none pr-10 cursor-pointer"}
              required
            >
              <option value="" style={{ background: "var(--s-surface)", color: "var(--s-text)" }}>— Избери превозно средство —</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id} style={{ background: "var(--s-surface)", color: "var(--s-text)" }}>
                  {v.brand} {v.model} · {v.registrationPlate}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--s-muted)] pointer-events-none"
            />
          </div>
        </div>

        {/* Incident type */}
        <div>
          <label className={labelCls}>
            Вид инцидент <span className="text-[var(--s-orange)]">*</span>
          </label>
          <div className="relative">
            <select
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className={inputCls + " appearance-none pr-10 cursor-pointer"}
              required
            >
              <option value="" style={{ background: "var(--s-surface)", color: "var(--s-text)" }}>— Избери вид инцидент —</option>
              {INCIDENT_TYPES.map((t) => (
                <option key={t.value} value={t.value} style={{ background: "var(--s-surface)", color: "var(--s-text)" }}>
                  {t.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--s-muted)] pointer-events-none"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className={labelCls}>
            Описание <span className="text-[var(--s-orange)]">*</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Опиши инцидента подробно — кога, как и какво се е случило..."
            className={inputCls}
            rows={4}
            required
            style={{ resize: "vertical", minHeight: "100px" }}
          />
        </div>
      </div>

      {/* Section: Локация */}
      <div className="site-card rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl bg-violet-500/15 flex items-center justify-center">
            <MapPin size={15} className="text-[var(--s-violet)]" />
          </div>
          <p className="text-sm font-bold text-[var(--s-text)]">Локация</p>
        </div>

        <div>
          <label className={labelCls}>Адрес / Местоположение</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="напр. бул. Цар Освободител 15, София"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Маркирай на картата</label>
          <LocationPicker
            latitude={formData.latitude}
            longitude={formData.longitude}
            onLocationChange={(lat, lng) =>
              setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng, locationSet: true }))
            }
          />
        </div>

        {formData.locationSet && (
          <div className="flex gap-4 text-xs text-[var(--s-muted)]">
            <span>📍 {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}</span>
          </div>
        )}
      </div>

      {/* Section: Допълнителна информация */}
      <div className="site-card rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl bg-teal-500/15 flex items-center justify-center">
            <FileText size={15} className="text-[var(--s-teal)]" />
          </div>
          <p className="text-sm font-bold text-[var(--s-text)]">Допълнителна информация</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Регистрационен номер — друго МПС</label>
            <input
              type="text"
              name="other_vehicle_plate"
              value={formData.other_vehicle_plate}
              onChange={handleInputChange}
              placeholder="напр. CA 1234 CB"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Контакт на свидетел</label>
            <input
              type="text"
              name="witness_contact"
              value={formData.witness_contact}
              onChange={handleInputChange}
              placeholder="Телефон или имейл"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Section: Снимки */}
      <div
        className="site-card rounded-2xl p-6"
        style={{ borderColor: photos.length === 0 ? "rgba(255,107,43,0.3)" : undefined }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl bg-orange-500/15 flex items-center justify-center">
            <Camera size={15} className="text-[var(--s-orange)]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--s-text)]">
              Снимки{" "}
              <span className="text-[var(--s-orange)] text-xs font-black">* Задължително</span>
            </p>
            <p className="text-[11px] text-[var(--s-muted)]">
              Минимум 1 снимка · Макс. 5 МБ на файл
            </p>
          </div>
        </div>

        {/* Drop zone */}
        <label
          htmlFor="photo-input"
          className="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200"
          style={{
            borderColor: photos.length > 0
              ? "rgba(6,214,160,0.35)"
              : "rgba(255,107,43,0.3)",
            background: photos.length > 0
              ? "rgba(6,214,160,0.04)"
              : "rgba(255,107,43,0.03)",
          }}
        >
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
            id="photo-input"
          />
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{
              background: photos.length > 0
                ? "rgba(6,214,160,0.12)"
                : "rgba(255,107,43,0.12)",
            }}
          >
            <Upload
              size={22}
              style={{ color: photos.length > 0 ? "var(--s-teal)" : "var(--s-orange)" }}
            />
          </div>
          <div className="text-center">
            <p
              className="text-sm font-semibold"
              style={{ color: photos.length > 0 ? "var(--s-teal)" : "var(--s-orange)" }}
            >
              {photos.length > 0
                ? `${photos.length} снимк${photos.length === 1 ? "а избрана" : "и избрани"}`
                : "Кликни или пусни снимки тук"}
            </p>
            <p className="text-xs text-[var(--s-muted)] mt-1">
              {photos.length > 0 ? "Кликни за да добавиш още" : "JPG, PNG, WEBP — до 5 МБ"}
            </p>
          </div>
        </label>

        {/* Photo grid preview */}
        {photoPreview.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mt-5">
            {photoPreview.map((preview, index) => (
              <div key={index} className="relative group">
                <img
                  src={preview}
                  alt={`Снимка ${index + 1}`}
                  className="w-full h-20 object-cover rounded-xl border border-[var(--s-border)]"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--s-red)] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Mandatory warning */}
        {photos.length === 0 && (
          <div className="flex items-center gap-2 mt-4 px-4 py-3 rounded-xl"
            style={{ background: "rgba(255,107,43,0.08)" }}>
            <AlertCircle size={14} className="text-[var(--s-orange)] flex-shrink-0" />
            <p className="text-xs text-[var(--s-orange)]">
              Необходима е поне една снимка за да изпратиш сигнала
            </p>
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || photos.length === 0}
        className={`w-full py-4 rounded-2xl font-bold text-sm transition-all duration-200 ${
          submitting || photos.length === 0
            ? "opacity-40 cursor-not-allowed site-card text-[var(--s-muted)]"
            : "btn-site-primary justify-center"
        }`}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Изпращане...
          </span>
        ) : (
          "Изпрати сигнала →"
        )}
      </button>

    </form>
  );
}

