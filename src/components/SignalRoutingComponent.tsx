'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';

interface RecipientGroup {
  recommendation: 'SITUATION' | 'SUBCATEGORY' | 'CATEGORY' | 'OTHER';
  label: string;
  recipients: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    contactPerson?: string;
    isAdHoc: boolean;
  }>;
}

interface SelectedRecipient {
  id: string;
  recipientId: string;
  isAdHoc: boolean;
  recommendation: string;
}

interface RecipientCustomization {
  routingTargetId: string;
  customName?: string;
  customEmail?: string;
  customPhone?: string;
  customNotes?: string;
}

export default function SignalRoutingComponent({ reportId }: { reportId: string }) {
  const [groups, setGroups] = useState<RecipientGroup[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<SelectedRecipient[]>([]);
  const [customizations, setCustomizations] = useState<RecipientCustomization[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['SITUATION', 'SUBCATEGORY', 'CATEGORY'])
  );
  
  // Ad-hoc form state
  const [showAdHocForm, setShowAdHocForm] = useState(false);
  const [adHocData, setAdHocData] = useState({
    name: '',
    email: '',
    phone: '',
    contactPerson: '',
    address: '',
    notes: '',
  });

  // Custom data form state
  const [editingCustomization, setEditingCustomization] = useState<string | null>(null);
  const [customData, setCustomData] = useState({
    customName: '',
    customEmail: '',
    customPhone: '',
    customNotes: '',
  });

  useEffect(() => {
    fetchGroupedRecipients();
  }, [reportId]);

  const fetchGroupedRecipients = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`/api/admin/recipients/grouped?reportId=${reportId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setGroups(response.data.groups);
      setSelectedRecipients(response.data.selected);
      setCustomizations(response.data.customizations);
    } catch (error) {
      console.error('Error fetching grouped recipients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdHoc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        '/api/admin/ad-hoc-institutions',
        { reportId, ...adHocData },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Add to selected recipients
      setSelectedRecipients([
        ...selectedRecipients,
        {
          id: response.data.routingTarget.id,
          recipientId: response.data.institution.id,
          isAdHoc: true,
          recommendation: 'OTHER',
        },
      ]);

      setAdHocData({
        name: '',
        email: '',
        phone: '',
        contactPerson: '',
        address: '',
        notes: '',
      });
      setShowAdHocForm(false);
      await fetchGroupedRecipients();
    } catch (error) {
      console.error('Error adding ad-hoc institution:', error);
      alert('Грешка при добавяне');
    }
  };

  const handleSelectRecipient = async (recipientId: string, isAdHoc: boolean, recommendation: string) => {
    const token = localStorage.getItem('authToken');
    
    // Check if already selected
    const isSelected = selectedRecipients.some(
      (r) => r.recipientId === recipientId && r.isAdHoc === isAdHoc
    );

    if (isSelected) {
      // Deselect
      const toRemove = selectedRecipients.find(
        (r) => r.recipientId === recipientId && r.isAdHoc === isAdHoc
      );
      if (toRemove) {
        // Delete routing target
        // TODO: Implement DELETE for routing targets
        setSelectedRecipients(selectedRecipients.filter((r) => r.id !== toRemove.id));
      }
    } else {
      // Select - create routing target
      try {
        const response = await axios.post(
          '/api/admin/routing-targets',
          {
            reportId,
            institutionId: !isAdHoc ? recipientId : null,
            adHocInstitutionId: isAdHoc ? recipientId : null,
            recommendation,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setSelectedRecipients([
          ...selectedRecipients,
          {
            id: response.data.id,
            recipientId,
            isAdHoc,
            recommendation,
          },
        ]);
      } catch (error) {
        console.error('Error selecting recipient:', error);
      }
    }
  };

  const handleSaveCustomization = async (routingTargetId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(
        '/api/admin/recipient-customizations',
        {
          reportId,
          routingTargetId,
          ...customData,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setEditingCustomization(null);
      setCustomData({
        customName: '',
        customEmail: '',
        customPhone: '',
        customNotes: '',
      });
      await fetchGroupedRecipients();
    } catch (error) {
      console.error('Error saving customization:', error);
    }
  };

  const toggleGroup = (recommendation: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(recommendation)) {
      newExpanded.delete(recommendation);
    } else {
      newExpanded.add(recommendation);
    }
    setExpandedGroups(newExpanded);
  };

  if (loading) {
    return <div className="p-4">Зареждане...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Selected Recipients Summary */}
      {selectedRecipients.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Избрани получатели ({selectedRecipients.length})</h3>
          <div className="flex flex-wrap gap-2">
            {selectedRecipients.map((sel) => {
              const group = groups.find((g) =>
                g.recipients.some((r) => r.id === sel.recipientId && r.isAdHoc === sel.isAdHoc)
              );
              const recipient = group?.recipients.find(
                (r) => r.id === sel.recipientId && r.isAdHoc === sel.isAdHoc
              );

              return (
                <div key={sel.id} className="bg-white rounded-lg px-3 py-2 flex items-center gap-2 shadow-sm">
                  <span className="text-sm font-medium">{recipient?.name}</span>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                    {sel.recommendation}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ad-hoc Institutions Form */}
      {showAdHocForm ? (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-4">Добави допълнителна институция</h3>
          <form onSubmit={handleAddAdHoc} className="space-y-3">
            <input
              type="text"
              placeholder="Име на институцията"
              value={adHocData.name}
              onChange={(e) => setAdHocData({ ...adHocData, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
            <input
              type="email"
              placeholder="Имейл"
              value={adHocData.email}
              onChange={(e) => setAdHocData({ ...adHocData, email: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
            <input
              type="tel"
              placeholder="Телефон"
              value={adHocData.phone}
              onChange={(e) => setAdHocData({ ...adHocData, phone: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
            <input
              type="text"
              placeholder="Контактно лице"
              value={adHocData.contactPerson}
              onChange={(e) => setAdHocData({ ...adHocData, contactPerson: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
            <textarea
              placeholder="Адреса"
              value={adHocData.address}
              onChange={(e) => setAdHocData({ ...adHocData, address: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
            <textarea
              placeholder="Бележки"
              value={adHocData.notes}
              onChange={(e) => setAdHocData({ ...adHocData, notes: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAdHocForm(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-3 py-2 rounded hover:bg-gray-400"
              >
                Отказ
              </button>
              <button
                type="submit"
                className="flex-1 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
              >
                Добави
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setShowAdHocForm(true)}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-3 text-gray-600 hover:border-gray-400 hover:text-gray-700 flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Добави допълнителна институция
        </button>
      )}

      {/* Recipients Grouped */}
      <div className="space-y-3">
        {groups.map((group) => {
          // Determine header styling based on recommendation level
          let headerBg = 'from-slate-50 to-slate-100';
          let headerHoverBg = 'hover:from-slate-100 hover:to-slate-150';
          let borderColor = 'border-slate-200';
          
          if (group.recommendation === 'SITUATION') {
            headerBg = 'from-amber-50 to-orange-100';
            headerHoverBg = 'hover:from-amber-100 hover:to-orange-150';
            borderColor = 'border-amber-300';
          } else if (group.recommendation === 'SUBCATEGORY') {
            headerBg = 'from-emerald-50 to-green-100';
            headerHoverBg = 'hover:from-emerald-100 hover:to-green-150';
            borderColor = 'border-emerald-300';
          } else if (group.recommendation === 'CATEGORY') {
            headerBg = 'from-blue-50 to-indigo-100';
            headerHoverBg = 'hover:from-blue-100 hover:to-indigo-150';
            borderColor = 'border-blue-300';
          } else if (group.recommendation === 'OTHER') {
            headerBg = 'from-gray-50 to-slate-100';
            headerHoverBg = 'hover:from-gray-100 hover:to-slate-150';
            borderColor = 'border-gray-300';
          }

          return (
            <div key={group.recommendation} className={`border ${borderColor} rounded-lg overflow-hidden`}>
              <button
                onClick={() => toggleGroup(group.recommendation)}
                className={`w-full bg-gradient-to-r ${headerBg} p-4 flex items-center justify-between ${headerHoverBg} transition`}
              >
                <h3 className="font-semibold text-slate-900">
                  {group.label} ({group.recipients.length})
                </h3>
                {expandedGroups.has(group.recommendation) ? (
                  <ChevronUp size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
              </button>

              {expandedGroups.has(group.recommendation) && (
                <div className="bg-white divide-y">
                  {group.recipients.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 italic">
                      Няма институции в тази група
                    </div>
                  ) : (
                    group.recipients.map((recipient) => {
                      const isSelected = selectedRecipients.some(
                        (s) => s.recipientId === recipient.id && s.isAdHoc === recipient.isAdHoc
                      );
                      const selectedDatum = selectedRecipients.find(
                        (s) => s.recipientId === recipient.id && s.isAdHoc === recipient.isAdHoc
                      );
                      const customization = customizations.find(
                        (c) => c.routingTargetId === selectedDatum?.id
                      );

                      return (
                        <div key={recipient.id} className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <label className="flex items-start gap-3 flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() =>
                                  handleSelectRecipient(
                                    recipient.id,
                                    recipient.isAdHoc,
                                    group.recommendation
                                  )
                                }
                                className="w-4 h-4 mt-1"
                              />
                              <div className="flex-1">
                                <p className="font-semibold text-slate-900">
                                  {customization?.customName || recipient.name}
                                </p>
                                <div className="text-sm text-slate-600 mt-1 space-y-0.5">
                                  {(customization?.customEmail || recipient.email) && (
                                    <p>📧 {customization?.customEmail || recipient.email}</p>
                                  )}
                                  {(customization?.customPhone || recipient.phone) && (
                                    <p>📱 {customization?.customPhone || recipient.phone}</p>
                                  )}
                                  {(recipient.contactPerson && !customization) && (
                                    <p>👤 {recipient.contactPerson}</p>
                                  )}
                                  {customization?.customNotes && (
                                    <p className="text-amber-600 italic">📝 {customization.customNotes}</p>
                                  )}
                                </div>
                              </div>
                            </label>
                            {isSelected && (
                              <button
                                onClick={() => {
                                  setEditingCustomization(selectedDatum?.id || null);
                                  // Pre-fill with existing customization if available
                                  if (customization) {
                                    setCustomData({
                                      customName: customization.customName || '',
                                      customEmail: customization.customEmail || '',
                                      customPhone: customization.customPhone || '',
                                      customNotes: customization.customNotes || '',
                                    });
                                  } else {
                                    setCustomData({
                                      customName: '',
                                      customEmail: '',
                                      customPhone: '',
                                      customNotes: '',
                                    });
                                  }
                                }}
                                className="bg-blue-100 text-blue-600 p-2 rounded hover:bg-blue-200"
                                title="Промени данни за този сигнал"
                              >
                                <Edit2 size={16} />
                              </button>
                            )}
                          </div>

                          {editingCustomization === selectedDatum?.id && (
                            <div className="mt-3 pt-3 border-t bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 shadow-sm">
                              <div className="flex items-center gap-2 mb-3">
                                <Edit2 size={16} className="text-blue-600" />
                                <p className="text-sm font-semibold text-blue-700">
                                  Индивидуална промяна само за този сигнал
                                </p>
                              </div>
                              <p className="text-xs text-blue-600 mb-3">
                                Променените данни ще се използват само за този сигнал при подписване и изпращане.
                                Оригиналните данни на институцията остават непроменени.
                              </p>
                              <input
                                type="text"
                                placeholder={`Име (оригинал: ${recipient.name})`}
                                value={customData.customName}
                                onChange={(e) =>
                                  setCustomData({ ...customData, customName: e.target.value })
                                }
                                className="w-full border border-blue-200 rounded px-3 py-2 mb-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                              />
                              <input
                                type="email"
                                placeholder={`Email (оригинал: ${recipient.email || 'няма'})`}
                                value={customData.customEmail}
                                onChange={(e) =>
                                  setCustomData({ ...customData, customEmail: e.target.value })
                                }
                                className="w-full border border-blue-200 rounded px-3 py-2 mb-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                              />
                              <input
                                type="tel"
                                placeholder={`Телефон (оригинал: ${recipient.phone || 'няма'})`}
                                value={customData.customPhone}
                                onChange={(e) =>
                                  setCustomData({ ...customData, customPhone: e.target.value })
                                }
                                className="w-full border border-blue-200 rounded px-3 py-2 mb-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                              />
                              <textarea
                                placeholder="Допълнителни бележки"
                                value={customData.customNotes}
                                onChange={(e) =>
                                  setCustomData({ ...customData, customNotes: e.target.value })
                                }
                                className="w-full border border-blue-200 rounded px-3 py-2 mb-3 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                rows={2}
                              />
                              <div className="flex gap-2 text-sm">
                                <button
                                  onClick={() => {
                                    setEditingCustomization(null);
                                    setCustomData({
                                      customName: '',
                                      customEmail: '',
                                      customPhone: '',
                                      customNotes: '',
                                    });
                                  }}
                                  className="flex-1 bg-gray-300 text-gray-700 px-3 py-2 rounded hover:bg-gray-400 font-medium"
                                >
                                  Отказ
                                </button>
                                <button
                                  onClick={() =>
                                    handleSaveCustomization(selectedDatum?.id || '')
                                  }
                                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 font-medium"
                                >
                                  💾 Запази промените
                                </button>
                              </div>
                            </div>
                          )}

                          {customization && editingCustomization !== selectedDatum?.id && (
                            <div className="mt-2 pt-2 border-t bg-amber-50 rounded p-2 text-sm">
                              <p className="text-amber-700 font-medium flex items-center gap-1">
                                ⚠️ Има специфични промени за този сигнал
                              </p>
                              <div className="mt-1 text-xs text-amber-600 space-y-0.5">
                                {customization.customName && (
                                  <p>• Променено име: {customization.customName}</p>
                                )}
                                {customization.customEmail && (
                                  <p>• Променен email: {customization.customEmail}</p>
                                )}
                                {customization.customPhone && (
                                  <p>• Променен телефон: {customization.customPhone}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
