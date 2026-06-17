import React, { useState, useEffect } from 'react';

export default function FabricasDashboard() {
    // 1. Memoria del componente: arranca como una lista vacía
    const [fabricas, setFabricas] = useState([]);
    const [cargando, setCargando] = useState(true);

    // 2. El motor que busca los datos al abrir la pantalla
    useEffect(() => {
        // Hacemos la llamada HTTP a tu backend (URL sea la correcta)
        fetch('http://localhost:8000/polls/api/fabricas/')
            .then(respuesta => respuesta.json())
            .then(datos => {
                console.log("Datos recibidos:", datos);
                setFabricas(datos); // Guardamos las fábricas
                setCargando(false); // Apagamos el aviso de carga
            })
            .catch(error => {
                console.error("Error al conectar con la API:", error);
                setCargando(false);
            });
    }, []); // Los corchetes vacíos indican que solo se ejecuta una vez

    // 3. La interfaz visual
    return (
        <div className="p-8 bg-slate-900 min-h-screen text-white font-sans">
            <h1 className="text-3xl font-bold mb-6 text-slate-100">Monitor SCADA - Plantas</h1>
            
            {cargando ? (
                <p className="text-slate-400 animate-pulse">Conectando con el servidor Django...</p>
            ) : fabricas.length === 0 ? (
                <p className="text-yellow-400">No hay plantas registradas en la base de datos.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {fabricas.map((fabrica) => (
                        <div key={fabrica.id} className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-blue-400">{fabrica.nombre}</h2>
                                <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wider
                                    ${fabrica.estado === 'CRITICO' ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 
                                      fabrica.estado === 'ADVERTENCIA' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : 
                                      'bg-green-500/20 text-green-400 border border-green-500/50'}`}>
                                    {fabrica.estado}
                                </span>
                            </div>
                            
                            <div className="space-y-3 text-sm text-slate-300">
                                <div className="flex justify-between border-b border-slate-700 pb-2">
                                    <span>Producción:</span> 
                                    <span className="font-mono text-white">{fabrica.porcentaje_produccion}%</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-700 pb-2">
                                    <span>Temperatura:</span> 
                                    <span className="font-mono text-white">{fabrica.temperatura_promedio}°C</span>
                                </div>
                                <div className="flex justify-between pb-2">
                                    <span>Alarmas Activas:</span> 
                                    <span className="font-mono text-white font-bold">{fabrica.alarmas_activas}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}