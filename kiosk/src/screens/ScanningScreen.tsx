export default function ScanningScreen() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-gray-100">
      <div className="mb-8">
        <div className="h-24 w-24 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
      <h2 className="text-3xl font-semibold text-gray-700">Processing...</h2>
    </div>
  );
}
