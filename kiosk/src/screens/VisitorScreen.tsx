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
      setError({
        message: 'Failed to record visitor',
        howToFix: 'Please contact the Duty Watch for assistance.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6 overflow-hidden" role="main">
      {/* Header - Reduced size */}
      <div className="text-center mb-5">
        <h1 className="text-4xl font-bold text-primary-700 mb-1">
          Visitor Check-In
        </h1>
        <p className="text-xl text-gray-600">
          Please provide your information
        </p>
      </div>

      {/* Form - Optimized for landscape */}
      <form onSubmit={handleSubmit} className="flex-1 max-w-4xl mx-auto w-full flex flex-col" aria-label="Visitor check-in form">
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Name */}
          <div>
            <label htmlFor="visitor-name" className="block text-xl font-semibold text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              id="visitor-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="kiosk-input text-xl"
              placeholder="John Doe"
              disabled={isSubmitting}
              required
              aria-required="true"
            />
          </div>

          {/* Organization */}
          <div>
            <label htmlFor="visitor-organization" className="block text-xl font-semibold text-gray-700 mb-2">
              Organization *
            </label>
            <input
              id="visitor-organization"
              type="text"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              className="kiosk-input text-xl"
              placeholder="Company or Unit"
              disabled={isSubmitting}
              required
              aria-required="true"
            />
          </div>

          {/* Visit Type */}
          <div>
            <label htmlFor="visitor-type" className="block text-xl font-semibold text-gray-700 mb-2">
              Visit Type *
            </label>
            <select
              id="visitor-type"
              value={formData.visitType}
              onChange={(e) => setFormData({ ...formData, visitType: e.target.value })}
              className="kiosk-input text-xl bg-white"
              disabled={isSubmitting}
              required
              aria-required="true"
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
            <label htmlFor="visitor-purpose" className="block text-xl font-semibold text-gray-700 mb-2">
              Purpose (Optional)
            </label>
            <textarea
              id="visitor-purpose"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              className="w-full px-6 py-3 text-xl border-2 border-gray-300 rounded-xl focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              rows={2}
              placeholder="Brief description"
              disabled={isSubmitting}
              aria-label="Purpose of visit"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-auto">
          <button
            type="button"
            onClick={reset}
            className="kiosk-button-secondary flex-1"
            disabled={isSubmitting}
            aria-label="Cancel visitor check-in and return to home"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="kiosk-button-primary flex-1"
            disabled={isSubmitting}
            aria-label={isSubmitting ? 'Submitting visitor information' : 'Submit visitor check-in'}
          >
            {isSubmitting ? 'Submitting...' : 'Check In'}
          </button>
        </div>
      </form>
    </div>
  );
}
