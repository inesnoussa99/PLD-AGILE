export default function StepCard({ number, title, description }) {
  return (
    <div className="flex flex-col items-start p-6 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-200">
      <span className="text-4xl font-light text-slate-200 mb-4 font-mono">{number}</span>
      <h3 className="font-medium text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}