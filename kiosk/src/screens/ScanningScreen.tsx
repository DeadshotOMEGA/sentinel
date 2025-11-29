export default function ScanningScreen() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gray-100 overflow-hidden">
      <div className="mb-6">
        <div className="h-20 w-20 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
      <h2 className="text-3xl font-semibold text-gray-700">Processing...</h2>
    </div>
  );
}
