import React, { useState } from 'react';
import { X, Save, AlertCircle, Users, CheckCircle2 } from 'lucide-react';

const ProjectForm = ({ isOpen, onClose, onSubmit, personnel, initialData }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        nombre: '',
        inicio: '',
        fin: '',
        estado: 'En curso',
        formulador: '',
        equipo: [],
        presupuesto: {
            personal: 0,
            materiales: 0,
            servicios: 0,
            otros: 0
        },
        hitos: []
    });

    React.useEffect(() => {
        const defaultState = {
            nombre: '',
            inicio: '',
            fin: '',
            estado: 'En curso',
            formulador: '',
            equipo: [],
            presupuesto: { personal: 0, materiales: 0, servicios: 0, otros: 0 },
            hitos: []
        };
        if (initialData) {
            setFormData({
                ...defaultState,
                ...initialData,
                presupuesto: { ...defaultState.presupuesto, ...(initialData.presupuesto || {}) },
                hitos: initialData.hitos || []
            });
        } else {
            setFormData(defaultState);
        }
        setStep(1);
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!formData.nombre) {
            alert("Por favor ingrese el nombre del proyecto");
            return;
        }
        onSubmit(formData);
        // Reset form
        setFormData({
            nombre: '',
            inicio: '',
            fin: '',
            estado: 'En curso',
            formulador: '',
            equipo: [],
            presupuesto: { personal: 0, materiales: 0, servicios: 0, otros: 0 },
            hitos: []
        });
        setStep(1);
    };

    const addHito = () => {
        const nombre = prompt("Nombre del hito:");
        if (nombre) {
            const fecha = prompt("Fecha del hito (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
            setFormData(prev => ({
                ...prev,
                hitos: [...prev.hitos, { nombre, fecha }]
            }));
        }
    };

    const toggleTeamMember = (id) => {
        setFormData(prev => {
            const isSelected = prev.equipo.includes(id);
            if (isSelected) {
                return { ...prev, equipo: prev.equipo.filter(memberId => memberId !== id) };
            } else {
                return { ...prev, equipo: [...prev.equipo, id] };
            }
        });
    };

    const selectedLead = personnel.find(p => p.nombre === formData.formulador);
    const availableStaff = (selectedLead?.subordinados || []).map(id => personnel.find(p => p.id === id)).filter(Boolean);

    return (
        <div className="fixed inset-0 bg-navy-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="px-8 py-6 bg-navy-800 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold">{initialData ? 'Editar Proyecto' : 'Cargar Nuevo Proyecto'}</h2>
                        <p className="text-slate-400 text-xs mt-1">
                            {initialData ? 'Modifique los campos necesarios para actualizar el proyecto' : 'Siga los pasos para registrar el proyecto en el sistema'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors border-none bg-transparent text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Stepper */}
                <div className="px-8 py-4 bg-slate-50 border-b border-gray-100 flex justify-between items-center">
                    {[
                        { s: 1, label: 'Básico' },
                        { s: 2, label: 'Equipo' },
                        { s: 3, label: 'Costos' },
                        { s: 4, label: 'Hitos' }
                    ].map((item, idx) => (
                        <div key={item.s} className="flex items-center flex-1">
                            <div className="flex flex-col items-center gap-1">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step === item.s ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                                    step > item.s ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
                                    }`}>
                                    {step > item.s ? <CheckCircle2 size={16} /> : item.s}
                                </div>
                                <span className={`text-[10px] font-bold uppercase ${step === item.s ? 'text-blue-600' : 'text-slate-400'}`}>{item.label}</span>
                            </div>
                            {idx < 3 && <div className={`flex-1 h-0.5 mx-2 ${step > item.s ? 'bg-green-500' : 'bg-slate-200'}`}></div>}
                        </div>
                    ))}
                </div>

                {/* Form Content */}
                <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Save size={16} /></div>
                                <h3 className="font-bold text-navy-800">1. Datos Principales</h3>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nombre del Proyecto</label>
                                <input
                                    type="text"
                                    className="w-full p-4 bg-slate-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-navy-800"
                                    placeholder="Ej: Saneamiento Sector 5"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Fecha Inicio</label>
                                    <input
                                        type="date"
                                        className="w-full p-4 bg-slate-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-navy-800"
                                        value={formData.inicio}
                                        onChange={(e) => setFormData({ ...formData, inicio: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Fecha Fin</label>
                                    <input
                                        type="date"
                                        className="w-full p-4 bg-slate-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-navy-800"
                                        value={formData.fin}
                                        onChange={(e) => setFormData({ ...formData, fin: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Responsable Proyectista</label>
                                <select
                                    className="w-full p-4 bg-slate-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-navy-800 cursor-pointer"
                                    value={formData.formulador}
                                    onChange={(e) => {
                                        if (e.target.value === 'NEW') {
                                            onSubmit({ ...formData, _action: 'ADD_PERSONNEL' });
                                        } else {
                                            setFormData({ ...formData, formulador: e.target.value, equipo: [] });
                                        }
                                    }}
                                >
                                    <option value="">Seleccione un responsable</option>
                                    {personnel.filter(p => p.rol === 'Formulador' || p.rol.startsWith('Proyectista')).map(p => (
                                        <option key={p.id} value={p.nombre}>{p.nombre}</option>
                                    ))}
                                    <option value="NEW" className="text-blue-600 font-bold">+ Crear nuevo responsable</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users size={16} /></div>
                                <h3 className="font-bold text-navy-800">2. Estructura de Trabajo</h3>
                            </div>

                            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center gap-3">
                                <AlertCircle size={16} className="text-blue-600" />
                                <p className="text-[10px] text-blue-800 font-medium">
                                    Si cambia el responsable seleccionado en el paso anterior, deberá volver a seleccionar los miembros del equipo.
                                </p>
                            </div>

                            {formData.formulador && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Equipo Operativo Sugerido (Personal de {formData.formulador})</label>
                                    {availableStaff.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-2">
                                            {availableStaff.map(member => (
                                                <div
                                                    key={member.id}
                                                    onClick={() => toggleTeamMember(member.id)}
                                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${formData.equipo.includes(member.id)
                                                        ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-50'
                                                        : 'bg-white border-gray-100 hover:border-gray-200'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-white border border-gray-100 rounded-lg flex items-center justify-center text-[10px] font-bold text-navy-800">
                                                            {member.nombre.split(' ').map(n => n[0]).join('')}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-navy-800">{member.nombre}</p>
                                                            <p className="text-[10px] text-slate-500">{member.rol}</p>
                                                        </div>
                                                    </div>
                                                    {formData.equipo.includes(member.id) && <CheckCircle2 size={18} className="text-blue-600" />}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-gray-200 text-center">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Sin personal asignado a este proyectista</p>
                                            <p className="text-xs text-slate-400 mt-1">Primero asigne personal a cargo en la sección "Personal"</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Save size={16} /></div>
                                <h3 className="font-bold text-navy-800">3. Inversión Estimada</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.keys(formData.presupuesto).map(cat => (
                                    <div key={cat}>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{cat}</label>
                                        <div className="relative group">
                                            <span className="absolute left-4 top-4 text-slate-400 text-sm font-bold">S/</span>
                                            <input
                                                type="number"
                                                className="w-full p-4 pl-10 bg-slate-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-navy-800"
                                                value={formData.presupuesto[cat]}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    presupuesto: { ...formData.presupuesto, [cat]: parseFloat(e.target.value) || 0 }
                                                })}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><CheckCircle2 size={16} /></div>
                                    <h3 className="font-bold text-navy-800">4. Planificación</h3>
                                </div>
                                <button
                                    onClick={addHito}
                                    className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-black uppercase text-blue-600 hover:bg-blue-50 transition-colors"
                                >
                                    + Agregar Hito
                                </button>
                            </div>

                            <div className="space-y-2">
                                {formData.hitos.map((h, i) => (
                                    <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-gray-100">
                                        <div>
                                            <p className="text-sm font-bold text-navy-800">{h.nombre}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{h.fecha}</p>
                                        </div>
                                        <CheckCircle2 size={16} className="text-green-500" />
                                    </div>
                                ))}
                                {formData.hitos.length === 0 && (
                                    <div className="p-8 text-center bg-slate-50 border border-dashed border-gray-200 rounded-3xl">
                                        <p className="text-xs text-slate-400 italic">No se han registrado hitos para este cronograma</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-6 bg-slate-50 border-t border-gray-100 flex justify-between gap-4">
                    <button
                        disabled={step === 1}
                        onClick={() => setStep(step - 1)}
                        className="px-6 py-3 border border-gray-200 text-slate-600 rounded-xl font-bold disabled:opacity-30 transition-all bg-white text-sm"
                    >
                        Paso Anterior
                    </button>

                    {step < 4 ? (
                        <button
                            onClick={() => setStep(step + 1)}
                            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all border-none text-sm"
                        >
                            Continuar
                        </button>
                    ) : (
                        <button
                            onClick={handleSave}
                            className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold shadow-xl shadow-green-500/20 hover:bg-green-700 transition-all flex items-center border-none text-sm"
                        >
                            <Save size={18} className="mr-2" /> Finalizar Registro
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectForm;
