export default function StepCard({ number, title, description }) {
  return (
    <div className="relative bg-white shadow-md rounded-lg p-6 w-60 text-center">
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white w-8 h-8 flex items-center justify-center rounded-full">
        {number}
      </div>
      <h3 className="font-semibold text-gray-800 mt-4">{title}</h3>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}
