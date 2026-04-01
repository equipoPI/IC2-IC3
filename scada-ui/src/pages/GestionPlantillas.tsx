import { Navigate } from "react-router-dom";

// Redirect to the combined planning page with the plantillas tab
const GestionPlantillas = () => {
  return <Navigate to="/planificacion" replace />;
};

export default GestionPlantillas;
