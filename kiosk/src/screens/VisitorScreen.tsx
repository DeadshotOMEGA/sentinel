import { useState } from 'react';
import { useKioskStore } from '../state/kiosk-state';
import { recordVisitor } from '../lib/api';
import { getConfig } from '../lib/config';

const VISIT_TYPES = [
  { value: 'contractor', label: 'Contractor/SSC' },
  { value: 'recruitment', label: 'Recruitment' },
  { value: 'event', label: 'Event' },
  { value: 'official', label: 'Official' },
  { value: 'museum', label: 'Museum' },
  { value: 'other', label: 'Other' },
];

export default function VisitorScreen() {
  const { reset, setError, setVisitorSuccess, selectedEventId } = useKioskStore();
  const config = getConfig();

  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    visitType: '',
    purpose: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!formData.name || !formData.organization || !formData.visitType) {
      setError({
        message: 'Please fill in all required fields',
        howToFix: 'Name, Organization, and Visit Type are required.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const visitorData = {
        ...formData,
        ...(selectedEventId && { eventId: selectedEventId }),
      };
      await recordVisitor(visitorData, config.kioskId);
      // Show success screen
      setVisitorSuccess(formData.name);
    } catch (err) {
      if (err instanceof Error) {
        console.error('Failed to record visitor:', err.message);
      }
      setError({
        message: 'Failed to record visitor',
        howToFix: 'Please contact the Duty Watch for assistance.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-primary-700 mb-2">
          Visitor Check-In
        </h1>
        <p className="text-2xl text-gray-600">
          Please provide your information
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 max-w-3xl mx-auto w-full">
        <div className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-2xl font-semibold text-gray-700 mb-3">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-6 py-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-primary focus:outline-none min-h-touch"
              placeholder="John Doe"
              disabled={isSubmitting}
            />
          </div>

          {/* Organization */}
          <div>
            <label className="block text-2xl font-semibold text-gray-700 mb-3">
              Organization *
            </label>
            <input
              type="text"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              className="w-full px-6 py-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-primary focus:outline-none min-h-touch"
              placeholder="Company or Unit"
              disabled={isSubmitting}
            />
          </div>

          {/* Visit Type */}
          <div>
            <label className="block text-2xl font-semibold text-gray-700 mb-3">
              Visit Type *
            </label>
            <select
              value={formData.visitType}
              onChange={(e) => setFormData({ ...formData, visitType: e.target.value })}
              className="w-full px-6 py-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-primary focus:outline-none min-h-touch bg-white"
              disabled={isSubmitting}
            >
              <option value="">Select a type</option>
              {VISIT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Purpose (optional) */}
          <div>
            <label className="block text-2xl font-semibold text-gray-700 mb-3">
              Purpose (Optional)
            </label>
            <textarea
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              className="w-full px-6 py-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-primary focus:outline-none"
              rows={3}
              placeholder="Brief description of visit"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          <button
            type="button"
            onClick={reset}
            className="kiosk-button-secondary flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="kiosk-button-primary flex-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Check In'}
          </button>
        </div>
      </form>
    </div>
  );
}
