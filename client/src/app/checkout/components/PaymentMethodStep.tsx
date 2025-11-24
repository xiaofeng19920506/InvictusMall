"use client";

interface PaymentMethodStepProps {
  onContinue: () => void;
  onBack: () => void;
}

export default function PaymentMethodStep({
  onContinue,
  onBack,
}: PaymentMethodStepProps) {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        Payment method
      </h2>

      <div className="space-y-4">
        <div className="p-4 border-2 border-orange-500 rounded-lg bg-orange-50">
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="payment-method"
              checked
              readOnly
              className="h-4 w-4 text-orange-500 focus:ring-orange-500"
            />
            <div className="flex-1">
              <p className="font-medium text-gray-900">Pay with Stripe</p>
              <p className="text-sm text-gray-600 mt-1">
                You will be redirected to Stripe's secure payment page to complete your purchase.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <p className="text-sm text-gray-600">
            <strong>Secure Payment:</strong> All payments are processed securely through Stripe. 
            We do not store your payment information.
          </p>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors font-medium"
        >
          Back
        </button>
        <button
          onClick={onContinue}
          className="bg-orange-500 text-white px-6 py-2 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors font-medium"
        >
          Continue to review
        </button>
      </div>
    </div>
  );
}

