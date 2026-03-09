"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, AlertCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";

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
      if (!response.ok) throw new Error("Неуспешно зареждане на превозните средства");
      const data = await response.json();
      setVehicles(data);
    } catch (error) {
      setError("Неуспешно зареждане на превозните средства");
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
        throw new Error(errorData.error || "Неуспешно добавяне на превозно средство");
      }

      const newVehicle = await response.json();
      setVehicles((prev) => [newVehicle, ...prev]);
      setSuccess("Превозното средство е добавено успешно.");
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
      setError(error instanceof Error ? error.message : "Неуспешно добавяне на превозно средство");
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm("Сигурни ли сте, че искате да изтриете това превозно средство?")) return;

    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!response.ok) throw new Error("Неуспешно изтриване на превозното средство");

      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
      setSuccess("Превозното средство е изтрито успешно.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError("Неуспешно изтриване на превозното средство");
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
        <h2 className="text-2xl font-bold text-[var(--s-text)]">Моите превозни средства</h2>
        <div className="flex items-center gap-2">
          <Link
            href="/my-incidents/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl transition font-semibold"
            style={{ background: 'linear-gradient(135deg, #fb923c, #f97316)', color: 'white' }}
          >
            <AlertTriangle size={20} />
            Подай сигнал за превозно средство
          </Link>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl transition font-semibold"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white' }}
          >
            <Plus size={20} />
            Добави превозно средство
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
              placeholder="Регистрационен номер (напр. CA 1234 CB)"
              value={formData.registrationPlate}
              onChange={handleInputChange}
              className="site-input"
              required
            />
            <input
              type="text"
              name="brand"
              placeholder="Марка (напр. BMW)"
              value={formData.brand}
              onChange={handleInputChange}
              className="site-input"
              required
            />
            <input
              type="text"
              name="model"
              placeholder="Модел (напр. X5)"
              value={formData.model}
              onChange={handleInputChange}
              className="site-input"
              required
            />
            <input
              type="number"
              name="year"
              placeholder="Година"
              value={formData.year}
              onChange={handleInputChange}
              className="site-input"
              required
            />
            <input
              type="text"
              name="color"
              placeholder="Цвят (по избор)"
              value={formData.color}
              onChange={handleInputChange}
              className="site-input"
            />
            <input
              type="text"
              name="vin"
              placeholder="VIN (по избор)"
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
              Запази превозното средство
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-6 py-2 rounded-xl transition font-semibold border border-[var(--s-border)] text-[var(--s-muted)] hover:text-[var(--s-text)]"
              style={{ background: 'var(--s-surface2)' }}
            >
              Отказ
            </button>
          </div>
        </form>
      )}

      {/* Vehicles List */}
      {vehicles.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-[var(--s-border)]" style={{ background: 'var(--s-surface)' }}>
          <p className="text-[var(--s-muted)]">Все още няма регистрирани превозни средства. Добавете първото, за да започнете да подавате сигнали.</p>
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
                  title="Изтрий превозното средство"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <div className="space-y-2 text-sm text-[var(--s-muted)] mb-4 pb-4 border-b border-[var(--s-border)]">
                <p><span className="text-[var(--s-text)]">Година:</span> {vehicle.year}</p>
                {vehicle.color && <p><span className="text-[var(--s-text)]">Цвят:</span> {vehicle.color}</p>}
                <div className="flex gap-2 items-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${vehicle.verified ? "bg-green-500" : "bg-slate-500"}`}></span>
                  <span className={vehicle.verified ? "text-green-400" : "text-slate-400"}>{vehicle.verified ? "Потвърдено" : "Непотвърдено"}</span>
                </div>
              </div>

              {vehicle.incidents && vehicle.incidents.length > 0 && (
                <div className="text-sm">
                  <p className="font-semibold mb-2 text-[var(--s-text)]">Последен сигнал:</p>
                  <div className="rounded-xl p-2 border" style={{ background: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.2)' }}>
                    <p className="text-[var(--s-text)]">{vehicle.incidents[0].type}</p>
                    <p className="text-xs text-[var(--s-muted)]">Статус: {vehicle.incidents[0].status}</p>
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
