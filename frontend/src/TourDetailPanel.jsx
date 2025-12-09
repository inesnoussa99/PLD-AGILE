import { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Play, Pause, RotateCcw, Gauge, MapPin, Package, Clock, Navigation } from "lucide-react";

export default function TourDetailPanel({ tour, onClose, tourIndex, onAnimationUpdate }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(10); // x10 par défaut
  const [currentTime, setCurrentTime] = useState(0);
  const [detailedSegments, setDetailedSegments] = useState(null);
  const [loading, setLoading] = useState(true);
  const animationRef = useRef(null);

  // Charger les livraisons pour récupérer les durées
  const [livraisons, setLivraisons] = useState({});

  useEffect(() => {
    const fetchLivraisons = async () => {
      try {
        const response = await fetch('http://localhost:8000/livraisons');
        if (response.ok) {
          const data = await response.json();
          const livraisonsMap = {};
          data.forEach(liv => {
            livraisonsMap[liv.id] = liv;
          });
          setLivraisons(livraisonsMap);
        }
      } catch (error) {
        console.error("Erreur chargement livraisons:", error);
      }
    };
    fetchLivraisons();
  }, []);

  // Charger les données détaillées de tous les segments avec durées pickup/delivery
  useEffect(() => {
    const loadDetailedSegments = async () => {
      if (!tour || !tour.steps) return;
      
      setLoading(true);
      const segments = [];
      
      try {
        // Pour chaque transition entre étapes
        for (let i = 0; i < tour.steps.length - 1; i++) {
          const from = tour.steps[i];
          const to = tour.steps[i + 1];
          
          const params = new URLSearchParams({
            origine_id: from.id,
            destination_id: to.id,
            vitesse_kmh: 15
          });
          
          const response = await fetch(`http://localhost:8000/plus_court_chemin_detaille?${params.toString()}`);
          
          if (response.ok) {
            const data = await response.json();
            
            // Ajouter la durée de pickup/delivery à la fin du segment
            let waitingTime = 0;
            if (to.type === "PICKUP" && to.livraison_id && livraisons[to.livraison_id]) {
              waitingTime = livraisons[to.livraison_id].duree_pickup;
            } else if (to.type === "DELIVERY" && to.livraison_id && livraisons[to.livraison_id]) {
              waitingTime = livraisons[to.livraison_id].duree_delivery;
            }
            
            segments.push({
              fromStep: from,
              toStep: to,
              details: data,
              stepIndex: i,
              waitingTime // Temps d'attente à la fin du segment (pickup ou delivery)
            });
          }
        }
        
        setDetailedSegments(segments);
      } catch (error) {
        console.error("Erreur chargement segments:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (Object.keys(livraisons).length > 0) {
      loadDetailedSegments();
    }
  }, [tour, livraisons]);

  // Animation plus fluide avec durées pickup/delivery incluses
  useEffect(() => {
    if (!isPlaying || !detailedSegments) return;
    
    // Calculer la durée totale INCLUANT les temps d'attente
    const totalDuration = detailedSegments.reduce((acc, seg) => 
      acc + seg.details.duree_totale_s + (seg.waitingTime || 0), 0
    );
    
    animationRef.current = setInterval(() => {
      setCurrentTime(prev => {
        const next = prev + (0.05 * speed); // 50ms * vitesse = plus fluide
        if (next >= totalDuration) {
          setIsPlaying(false);
          return totalDuration;
        }
        return next;
      });
    }, 50); // 50ms au lieu de 100ms pour plus de fluidité
    
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isPlaying, speed, detailedSegments]);

  // Calculer la position actuelle et les infos
  const getCurrentInfo = () => {
    if (!detailedSegments || detailedSegments.length === 0) return null;
    
    let accumulatedTime = 0;
    let currentSegmentIndex = 0;
    let timeInCurrentSegment = 0;
    let isWaiting = false;
    let waitingProgress = 0;
    
    // Trouver dans quel segment on se trouve (incluant les temps d'attente)
    for (let i = 0; i < detailedSegments.length; i++) {
      const segment = detailedSegments[i];
      const travelDuration = segment.details.duree_totale_s;
      const waitDuration = segment.waitingTime || 0;
      const totalSegmentDuration = travelDuration + waitDuration;
      
      if (currentTime < accumulatedTime + totalSegmentDuration) {
        currentSegmentIndex = i;
        timeInCurrentSegment = currentTime - accumulatedTime;
        
        // Vérifier si on est en phase de déplacement ou d'attente
        if (timeInCurrentSegment >= travelDuration) {
          // On est en phase d'attente (pickup/delivery)
          isWaiting = true;
          waitingProgress = (timeInCurrentSegment - travelDuration) / waitDuration;
          timeInCurrentSegment = travelDuration; // Position finale du segment
        }
        break;
      }
      accumulatedTime += totalSegmentDuration;
    }
    
    const currentSegment = detailedSegments[currentSegmentIndex];
    if (!currentSegment) return null;
    
    // Calculer la position exacte dans le segment avec interpolation
    let interpolatedNode;
    
    if (isWaiting) {
      // Si on attend (pickup/delivery), rester au dernier nœud
      const lastNode = currentSegment.details.nodes[currentSegment.details.nodes.length - 1];
      interpolatedNode = { ...lastNode };
    } else {
      // Sinon, calculer la position interpolée pendant le déplacement
      const progress = timeInCurrentSegment / currentSegment.details.duree_totale_s;
      const exactPosition = progress * (currentSegment.details.nodes.length - 1);
      const currentNodeIndex = Math.floor(exactPosition);
      const nextNodeIndex = Math.min(currentNodeIndex + 1, currentSegment.details.nodes.length - 1);
      
      // Interpolation linéaire entre deux nœuds pour fluidité
      const interpolationFactor = exactPosition - currentNodeIndex;
      const currentNode = currentSegment.details.nodes[currentNodeIndex];
      const nextNode = currentSegment.details.nodes[nextNodeIndex];
      
      // Position interpolée
      interpolatedNode = {
        ...currentNode,
        latitude: currentNode.latitude + (nextNode.latitude - currentNode.latitude) * interpolationFactor,
        longitude: currentNode.longitude + (nextNode.longitude - currentNode.longitude) * interpolationFactor
      };
    }
    
    // Distance et temps totaux (incluant les temps d'attente)
    const totalDistance = detailedSegments.reduce((acc, seg) => acc + seg.details.distance_totale_m, 0);
    const totalDuration = detailedSegments.reduce((acc, seg) => 
      acc + seg.details.duree_totale_s + (seg.waitingTime || 0), 0
    );
    
    // Calculer le progrès dans le segment actuel
    const travelProgress = isWaiting ? 1 : (timeInCurrentSegment / currentSegment.details.duree_totale_s);
    
    // Distance et temps parcourus
    let distanceCovered = 0;
    for (let i = 0; i < currentSegmentIndex; i++) {
      distanceCovered += detailedSegments[i].details.distance_totale_m;
    }
    distanceCovered += travelProgress * currentSegment.details.distance_totale_m;
    
    // Prochaine étape et temps restant
    const nextStep = currentSegment.toStep;
    const travelTimeLeft = currentSegment.details.duree_totale_s - timeInCurrentSegment;
    const waitTimeLeft = isWaiting ? (currentSegment.waitingTime * (1 - waitingProgress)) : (currentSegment.waitingTime || 0);
    const timeToNextStep = travelTimeLeft + waitTimeLeft;
    
    const distanceToNextStep = isWaiting ? 0 : (currentSegment.details.distance_totale_m - (travelProgress * currentSegment.details.distance_totale_m));
    
    return {
      position: interpolatedNode, // Position interpolée au lieu de position exacte du nœud
      currentSegmentIndex,
      nextStep,
      timeToNextStep,
      distanceToNextStep,
      totalDistance,
      totalDuration,
      distanceCovered,
      timeCovered: currentTime,
      progress: (currentTime / totalDuration) * 100,
      isWaiting, // Est-ce qu'on est en train de faire pickup/delivery ?
      waitingProgress // Progression de l'attente (0 à 1)
    };
  };

  const info = getCurrentInfo();

  // Envoyer la position actuelle au parent pour l'animation sur la carte
  useEffect(() => {
    if (info && onAnimationUpdate) {
      onAnimationUpdate({
        position: info.position,
        tourIndex,
        isActive: true,
        isWaiting: info.isWaiting // Dire si le livreur est en train d'attendre
      });
    }
  }, [info, tourIndex, onAnimationUpdate]);

  // Nettoyer l'animation au démontage du composant
  useEffect(() => {
    return () => {
      if (onAnimationUpdate) {
        onAnimationUpdate(null); // Retirer le livreur de la carte
      }
    };
  }, [onAnimationUpdate]);

  const handlePlayPause = () => setIsPlaying(!isPlaying);
  
  const handleReset = () => {
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleSpeedChange = () => {
    const speeds = [1, 2, 5, 10];
    const currentIndex = speeds.indexOf(speed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setSpeed(speeds[nextIndex]);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const [showAllSteps, setShowAllSteps] = useState(false);

  if (loading) {
    return (
      <div className="absolute top-4 right-4 z-[1000]">
        <Card className="bg-white/95 backdrop-blur shadow-2xl p-4 w-80">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-xs text-gray-600">Chargement...</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-[1000] animate-in slide-in-from-right duration-300">
      <Card className="bg-white/98 backdrop-blur shadow-2xl p-3 w-80 max-h-[calc(100vh-120px)] overflow-hidden flex flex-col">
        {/* Header compact */}
        <div className="flex items-center justify-between mb-2 pb-2 border-b">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full border-2 border-white shadow-md"
              style={{ backgroundColor: tour.color || "#2563eb" }}
            />
            <h3 className="font-bold text-sm">Livreur {tourIndex + 1}</h3>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>

        {/* Contrôles compacts */}
        <div className="flex items-center gap-1 mb-2">
          <Button 
            size="sm" 
            onClick={handlePlayPause}
            className="flex-1 h-7 text-xs"
          >
            {isPlaying ? <Pause className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleReset}
            className="h-7 w-7 p-0"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleSpeedChange}
            className="h-7 w-14 text-xs"
          >
            <Gauge className="w-3 h-3 mr-0.5" />
            x{speed}
          </Button>
        </div>

        {/* Barre de progression compacte */}
        <div className="mb-2">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="h-1.5 rounded-full transition-all duration-100"
              style={{ 
                width: `${info?.progress || 0}%`,
                backgroundColor: tour.color || "#2563eb"
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
            <span>{formatTime(info?.timeCovered || 0)}</span>
            <span>{formatTime(info?.totalDuration || 0)}</span>
          </div>
        </div>

        {/* Informations en temps réel */}
        {info && (
          <div className="space-y-2 overflow-y-auto flex-1">
            {/* Prochaine étape compacte */}
            <div className={`rounded p-2 border ${
              info.isWaiting 
                ? 'bg-orange-50 border-orange-200' 
                : 'bg-blue-50 border-blue-100'
            }`}>
              <div className="flex items-center gap-2">
                {info.isWaiting ? (
                  <Package className="w-3 h-3 text-orange-600 flex-shrink-0 animate-pulse" />
                ) : (
                  <MapPin className="w-3 h-3 text-blue-600 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  {info.isWaiting ? (
                    <>
                      <div className="font-semibold text-xs text-orange-900 truncate">
                        {info.nextStep.type === "PICKUP" ? "📦 Récupération en cours..." : 
                         info.nextStep.type === "DELIVERY" ? "🏠 Livraison en cours..." :
                         info.nextStep.type === "ENTREPOT" ? "🏢 Départ..." :
                         info.nextStep.type === "ENTREPOT_FIN" ? "🏢 Retour à l'entrepôt..." : "En attente..."}
                      </div>
                      <div className="flex gap-2 text-[10px] text-orange-600 mt-0.5">
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          Encore {formatTime(info.timeToNextStep)}
                        </span>
                        <span className="text-orange-500">
                          {Math.round(info.waitingProgress * 100)}% terminé
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-semibold text-xs text-blue-900 truncate">
                        Vers: {info.nextStep.type === "PICKUP" ? "📦 Récupération" : 
                               info.nextStep.type === "DELIVERY" ? "🏠 Livraison" :
                               info.nextStep.type === "ENTREPOT" ? "🏢 Départ" :
                               info.nextStep.type === "ENTREPOT_FIN" ? "🏢 Retour entrepôt" : "Destination"}
                      </div>
                      <div className="flex gap-2 text-[10px] text-blue-600 mt-0.5">
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {formatTime(info.timeToNextStep)}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Navigation className="w-2.5 h-2.5" />
                          {Math.round(info.distanceToNextStep)}m
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Statistiques compactes */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-gray-50 rounded p-1.5 border">
                <div className="text-[9px] text-gray-500 uppercase">Distance</div>
                <div className="font-bold text-[11px]">
                  {Math.round(info.distanceCovered)}/{Math.round(info.totalDistance)}m
                </div>
              </div>
              <div className="bg-gray-50 rounded p-1.5 border">
                <div className="text-[9px] text-gray-500 uppercase">Temps</div>
                <div className="font-bold text-[11px]">
                  {formatTime(info.timeCovered)}/{formatTime(info.totalDuration)}
                </div>
              </div>
            </div>

            {/* Liste des étapes, pliable */}
            <div className="bg-gray-50 rounded p-2 border">
              <button 
                onClick={() => setShowAllSteps(!showAllSteps)}
                className="flex items-center justify-between w-full text-xs font-bold text-gray-700 hover:text-gray-900"
              >
                <span className="flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  Étapes ({tour.steps.length})
                </span>
                <span className="text-[10px]">{showAllSteps ? '▼' : '▶'}</span>
              </button>
              
              {showAllSteps && (
                <div className="space-y-1 mt-2 max-h-48 overflow-y-auto">
                  {tour.steps.map((step, idx) => {
                    const isDone = info.currentSegmentIndex > idx;
                    const isCurrent = info.currentSegmentIndex === idx;
                    
                    return (
                      <div 
                        key={idx}
                        className={`text-[10px] p-1.5 rounded flex items-center gap-1.5 ${
                          isDone ? 'bg-green-100 text-green-800' : 
                          isCurrent ? 'bg-blue-100 text-blue-800 font-semibold' :
                          'bg-white text-gray-600'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                          {idx + 1}
                        </div>
                        <span className="flex-1 truncate">
                          {step.type === "ENTREPOT" && "🏢 Départ"}
                          {step.type === "PICKUP" && `📦 Récup. #${step.livraison_id}`}
                          {step.type === "DELIVERY" && `🏠 Livr. #${step.livraison_id}`}
                          {step.type === "ENTREPOT_FIN" && "🏢 Retour"}
                        </span>
                        {isDone && <span className="text-green-600 text-xs">✓</span>}
                        {isCurrent && <span className="animate-pulse">⚡</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
