export default function MapPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full rounded-xl bg-gray-100 border border-gray-300 p-6">
      <p className="text-gray-400 text-lg">Carte de la ville</p>
      <p className="text-gray-400 text-sm">
        Aucune carte chargée. Utilisez « Charger une carte (XML) » dans le panneau de gauche.
      </p>
    </div>
  );
}
