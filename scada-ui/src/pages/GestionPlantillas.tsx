import PlanificacionProduccion from "@/pages/PlanificacionProduccion";

// Render the planning page but force the Plantillas tab when visiting /plantillas
const GestionPlantillas = () => {
  return <PlanificacionProduccion initialTab="plantillas" />;
};

export default GestionPlantillas;
