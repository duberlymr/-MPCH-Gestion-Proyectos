import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Layers,
  Users,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertTriangle,
  Trash2,
  FileCheck,
  Check,
  Save,
  X,
  Edit2
} from 'lucide-react';
import GanttChart from './components/GanttChart';
import { ProjectStateChart, BudgetVsActualChart } from './components/DashboardCharts';
import ProjectForm from './components/ProjectForm';
import { supabase } from './lib/supabase';
import { useAuth } from './contexts/AuthContext';
import LoginScreen from './components/LoginScreen';

const DOSSIER_ACTIVITIES = [
  'RESUMEN EJECUTIVO',
  'MEMORIA DESCRIPTIVA',
  'INFORME DE IMPACTO AMBIENTAL',
  'MEMORIA DE CALCULO',
  'METRADOS',
  'COSTOS Y PRESUPUESTOS',
  'PROGRAMACION DE OBRA',
  'ESPECIFICACIONES TECNICAS',
  'ESTUDIOS BASICOS',
  'PLANOS',
  'ANEXOS'
];

const createEmptyDossier = () => {
  const dossier = {};
  DOSSIER_ACTIVITIES.forEach((activity, index) => {
    dossier[index + 1] = { name: activity, subActivities: [] };
  });
  return dossier;
};

const calculateActivityProgress = (subActivities = []) => {
  const safeSubActivities = subActivities || [];
  if (safeSubActivities.length === 0) return 0;
  const total = safeSubActivities.reduce((acc, s) => acc + (s.progress || 0), 0);
  return Math.round(total / safeSubActivities.length);
};

const calculateProjectDossierProgress = (dossier = {}) => {
  const safeDossier = dossier || {};
  const activities = Object.values(safeDossier);
  if (activities.length === 0) return 0;
  const total = activities.reduce((acc, act) => acc + calculateActivityProgress(act?.subActivities), 0);
  return Math.round(total / activities.length);
};

const calculateProjectBudget = (presupuesto = {}) => {
  const safeBudget = presupuesto || {};
  return Object.values(safeBudget).reduce((acc, monto) => acc + (parseFloat(monto) || 0), 0);
};

const calculateProjectDuration = (inicio, fin) => {
  if (!inicio || !fin) return '0 días';
  const start = new Date(inicio);
  const end = new Date(fin);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays} días`;
};

const BUDGET_DATA = [
  { name: 'Personal', presupuestado: 450000, ejecutado: 380000 },
  { name: 'Materiales', presupuestado: 800000, ejecutado: 920000 },
  { name: 'Servicios', presupuestado: 300000, ejecutado: 250000 },
  { name: 'Otros', presupuestado: 150000, ejecutado: 80000 },
];

const Sidebar = ({ collapsed, setCollapsed, currentView, setCurrentView }) => {
  const { logout } = useAuth();
  const menuItems = [
    { id: 'proyectos', icon: Layers, label: 'Proyectos' },
    { id: 'personal', icon: Users, label: 'Personal' },
    { id: 'expedientes', icon: FileCheck, label: 'Avance de Expediente' },
    { id: 'cronograma', icon: Calendar, label: 'Cronograma' },
  ];

  return (
    <aside className={`bg-navy-800 text-white transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'} border-r border-slate-700 flex flex-col h-screen`}>
      <div className="flex items-center justify-between p-6 h-20">
        {!collapsed && <h1 className="text-xl font-bold tracking-tight">ProjectHub</h1>}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 hover:bg-slate-700 rounded transition-colors bg-transparent border-none text-white">
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`flex items-center w-full p-3 rounded-lg transition-all border-none font-sans text-left ${currentView === item.id
              ? 'bg-blue-600 text-white font-bold'
              : 'text-slate-400 hover:bg-slate-700 hover:text-white bg-transparent'
              }`}
          >
            <item.icon size={20} />
            {!collapsed && <span className="ml-4 font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-white/5">
        <button
          onClick={logout}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'px-4'} py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all border-none bg-transparent`}
        >
          <LogOut size={20} className="shrink-0" />
          {!collapsed && <span className="ml-3 font-bold text-sm">Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
};

const KPICard = ({ title, value, change, trend, icon: Icon }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
    <div className="flex justify-between items-start">
      <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
        <Icon size={24} />
      </div>
      <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {change}
      </span>
    </div>
    <div className="mt-4">
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <h4 className="text-2xl font-bold text-navy-800 mt-1">{value}</h4>
    </div>
  </div>
);

const ProjectsView = ({ projects, onViewDetail, onDeleteProject }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
      <h3 className="text-lg font-bold text-navy-800">Lista de Proyectos</h3>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
          <tr>
            <th className="px-6 py-4">Nombre</th>
            <th className="px-6 py-4">Responsable</th>
            <th className="px-6 py-4">Duración Elaboración</th>
            <th className="px-6 py-4">Presupuesto Asignado</th>
            <th className="px-6 py-4">Estado</th>
            <th className="px-6 py-4">Progreso</th>
            <th className="px-6 py-4 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {projects.map(p => {
            const progress = calculateProjectDossierProgress(p.dossier);
            return (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4">
                  <span className="font-bold text-navy-800 text-sm">{p.nombre}</span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">
                      {p.formulador ? p.formulador.split(' ').map(n => n[0]).join('') : '?'}
                    </div>
                    {p.formulador}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500 font-medium whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-blue-400" />
                    {calculateProjectDuration(p.inicio, p.fin)}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-navy-800 font-bold whitespace-nowrap">
                  S/ {calculateProjectBudget(p.presupuesto).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${p.estado === 'Finalizado' ? 'bg-green-100/60 text-green-800' :
                    p.estado === 'Detenido' ? 'bg-red-100/60 text-red-800' : 'bg-blue-100/60 text-blue-800'
                    }`}>
                    {p.estado}
                  </span>
                </td>
                <td className="px-6 py-4 min-w-[140px]">
                  <div className="relative w-full bg-slate-100 rounded-full h-5 max-w-[120px] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${p.estado === 'Finalizado' ? 'bg-green-400/60' : 'bg-blue-400/60'}`}
                      style={{ width: `${progress}%` }}
                    ></div>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-navy-800">
                      {progress}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onViewDetail(p)}
                      className="text-blue-600 text-xs font-bold hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors bg-transparent border-none"
                    >
                      Ver Detalle
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors bg-transparent border-none"
                      title="Eliminar Proyecto"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

const ProjectDetailModal = ({ project, isOpen, onClose, personnel, onSave }) => {
  const [formData, setFormData] = React.useState(project);

  // Synchronize state when project or isOpen changes
  React.useEffect(() => {
    if (project && isOpen) {
      setFormData(project);
    }
  }, [project, isOpen]);

  if (!isOpen || !project || !formData) return null;

  const lead = personnel.find(p => p.nombre === formData.formulador);
  const team = (formData.equipo || []).map(id => personnel.find(p => p.id === id)).filter(Boolean);

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-navy-800 p-8 text-white relative">
          <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors bg-transparent border-none">
            <Plus size={24} className="rotate-45" />
          </button>
          <div className="flex items-center gap-4 mb-2">
            <span className="px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-wider">Detalle del Proyecto</span>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${formData.estado === 'Finalizado' ? 'bg-green-500' : 'bg-blue-600'}`}>
              {formData.estado}
            </span>
          </div>
          <input
            className="text-3xl font-bold bg-transparent border-b border-white/20 outline-none w-full pb-2 text-white placeholder-white/30"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            placeholder="Nombre del Proyecto"
          />
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Responsable Proyectista</h4>
              <select
                className="w-full p-4 bg-slate-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-navy-800"
                value={formData.formulador}
                onChange={(e) => setFormData({ ...formData, formulador: e.target.value })}
              >
                <option value="">Seleccionar Responsable</option>
                {personnel.filter(p => p.rol === 'Formulador' || p.rol.startsWith('Proyectista')).map(p => (
                  <option key={p.id} value={p.nombre}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Periodo de Ejecución</h4>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  className="p-3 bg-slate-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-navy-800"
                  value={formData.inicio}
                  onChange={(e) => setFormData({ ...formData, inicio: e.target.value })}
                />
                <input
                  type="date"
                  className="p-3 bg-slate-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-navy-800"
                  value={formData.fin}
                  onChange={(e) => setFormData({ ...formData, fin: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Equipo Operativo</h4>
            {team.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {team.map(member => (
                  <div key={member.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-blue-200 transition-colors">
                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-[10px] font-bold">
                      {member.nombre.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-navy-800">{member.nombre}</p>
                      <p className="text-[10px] text-slate-500">{member.rol}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-gray-200 mb-6">
                <p className="text-xs text-slate-400">No se ha asignado personal operativo todavía</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all bg-transparent text-sm"
            >
              Cerrar
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all border-none text-sm"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ObservationField = ({ initialValue, onSave }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [text, setText] = React.useState(initialValue || '');

  React.useEffect(() => {
    setText(initialValue || '');
  }, [initialValue]);

  const handleSave = () => {
    onSave(text);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setText(initialValue || '');
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado u Observaciones</label>
          <button
            onClick={() => setIsEditing(true)}
            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-transparent border-none flex items-center gap-1 group/edit"
          >
            <Edit2 size={10} className="group-hover/edit:scale-110 transition-transform" /> Editar Texto
          </button>
        </div>
        <div
          onClick={() => setIsEditing(true)}
          className="w-full p-4 bg-slate-50 border border-gray-100 rounded-2xl min-h-[100px] text-navy-800 text-xs font-medium whitespace-pre-wrap cursor-pointer hover:bg-slate-100 transition-colors"
        >
          {initialValue ? initialValue : <span className="text-slate-300 italic">Sin observaciones registradas. Haga clic para añadir...</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></div>
          <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Modo Edición Activo</label>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 px-3 py-1 bg-red-50 text-red-500 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-all border-none"
          >
            <X size={10} /> Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg text-[10px] font-bold hover:bg-green-700 transition-all shadow-md shadow-green-500/20 border-none"
          >
            <Save size={10} /> Guardar Cambios
          </button>
        </div>
      </div>
      <textarea
        autoFocus
        className="w-full p-4 bg-white border-2 border-blue-500 rounded-2xl outline-none transition-all font-medium text-navy-800 text-xs resize-none shadow-inner"
        rows="4"
        placeholder="Escriba aquí el estado actual..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </div>
  );
};

const DossierProgress = ({ dossier, onUpdate, onSetFullDossier }) => {
  const [activeTab, setActiveTab] = React.useState(Object.keys(dossier)[0] || '1');
  const [isAddingSub, setIsAddingSub] = React.useState(null); // activity index
  const [newSub, setNewSub] = React.useState({ name: '', progress: 0, observations: '' });
  const [isEditingActivity, setIsEditingActivity] = React.useState(null); // { index, name }
  const [isAddingActivity, setIsAddingActivity] = React.useState(false);
  const [newActivityName, setNewActivityName] = React.useState('');
  const [localProgress, setLocalProgress] = React.useState({});

  // Clear local progress when dossier syncs from DB
  React.useEffect(() => {
    setLocalProgress({});
  }, [dossier]);

  const handleAddSub = (activityIndex) => {
    if (!newSub.name) return;
    const activity = dossier[activityIndex];
    const updatedSubActivities = [
      ...(activity.subActivities || []),
      { id: Date.now().toString(), ...newSub }
    ];
    onUpdate(activityIndex, { ...activity, subActivities: updatedSubActivities });
    setNewSub({ name: '', progress: 0, observations: '' });
    setIsAddingSub(null);
  };

  const handleRemoveSub = (activityIndex, subId) => {
    const activity = dossier[activityIndex];
    const updatedSubActivities = activity.subActivities.filter(s => s.id !== subId);
    onUpdate(activityIndex, { ...activity, subActivities: updatedSubActivities });
  };

  const handleUpdateProgress = (activityIndex, subId, newProgress) => {
    const activity = dossier[activityIndex];
    const updatedSubActivities = activity.subActivities.map(s =>
      s.id === subId ? { ...s, progress: parseInt(newProgress) } : s
    );
    onUpdate(activityIndex, { ...activity, subActivities: updatedSubActivities });
  };

  const handleUpdateObservations = (activityIndex, subId, newObs) => {
    const activity = dossier[activityIndex];
    const updatedSubActivities = activity.subActivities.map(s =>
      s.id === subId ? { ...s, observations: newObs } : s
    );
    onUpdate(activityIndex, { ...activity, subActivities: updatedSubActivities });
  };

  const handleAddActivity = () => {
    if (!newActivityName) return;
    const newIndex = (Object.keys(dossier).length + 1).toString();
    const newDossier = {
      ...dossier,
      [newIndex]: { name: newActivityName.toUpperCase(), subActivities: [] }
    };
    onSetFullDossier(newDossier);
    setNewActivityName('');
    setIsAddingActivity(false);
    setActiveTab(newIndex);
  };

  const handleRenameActivity = () => {
    if (!isEditingActivity || !isEditingActivity.name) return;
    const newDossier = {
      ...dossier,
      [isEditingActivity.index]: { ...dossier[isEditingActivity.index], name: isEditingActivity.name.toUpperCase() }
    };
    onSetFullDossier(newDossier);
    setIsEditingActivity(null);
  };

  const handleDeleteActivity = (index) => {
    if (!confirm('¿Está seguro de eliminar esta actividad y todas sus sub-tareas?')) return;
    const newDossier = { ...dossier };
    delete newDossier[index];

    // Re-index remaining activities to keep them sequential 1..N
    const sortedEntries = Object.values(newDossier);
    const reindexedDossier = {};
    sortedEntries.forEach((val, i) => {
      reindexedDossier[i + 1] = val;
    });

    onSetFullDossier(reindexedDossier);
    setActiveTab('1');
  };

  const calculateTotalProgress = (subActivities = []) => calculateActivityProgress(subActivities);

  const overallProgress = calculateProjectDossierProgress(dossier);

  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden mt-8">
      <div className="bg-navy-800 p-6 text-white flex justify-between items-center">
        <div>
          <h4 className="text-lg font-bold">Avance de Expediente</h4>
          <p className="text-blue-300 text-[10px] uppercase tracking-widest font-bold">Gestión de entregables técnicos</p>
        </div>
        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/10">
          <BarChart3 size={14} className="text-blue-400" />
          <span className="text-sm font-bold">Progreso General: {overallProgress}%</span>
        </div>
      </div>

      <div className="flex h-[550px]">
        {/* Activity Sidebar */}
        <div className="w-72 bg-slate-50 border-r border-gray-100 flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {Object.entries(dossier).map(([index, activity]) => {
              const progress = calculateTotalProgress(activity.subActivities);
              return (
                <div key={index} className="relative group">
                  <button
                    onClick={() => setActiveTab(index)}
                    className={`w-full p-4 text-left border-b border-gray-100 transition-all flex flex-col gap-1 pr-12 ${activeTab === index ? 'bg-white border-l-4 border-l-blue-600' : 'hover:bg-white/50'}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className={`text-[10px] font-bold ${activeTab === index ? 'text-blue-600' : 'text-slate-400'}`}>{index}</span>
                      <span className={`text-[10px] font-bold ${progress === 100 ? 'text-green-500' : 'text-blue-500'}`}>{progress}%</span>
                    </div>
                    <p className={`text-[11px] font-bold leading-tight ${activeTab === index ? 'text-navy-800' : 'text-slate-500'}`}>{activity.name}</p>
                    <div className="w-full h-1 bg-slate-200 rounded-full mt-2 overflow-hidden">
                      <div className={`h-full transition-all duration-500 rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                    </div>
                  </button>

                  {/* Activity Actions (Hover) */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsEditingActivity({ index, name: activity.name }); }}
                      className="p-1 px-1.5 bg-white text-slate-400 hover:text-blue-600 rounded-md border border-gray-100 shadow-sm"
                    >
                      <Plus size={10} className="rotate-45" /> {/* Use Plus as Edit icon alternative if Pencil not imported */}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteActivity(index); }}
                      className="p-1 px-1.5 bg-white text-slate-400 hover:text-red-500 rounded-md border border-gray-100 shadow-sm"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-4 bg-white border-t border-gray-100">
            {isAddingActivity ? (
              <div className="space-y-2 animate-in slide-in-from-bottom-2">
                <input
                  autoFocus
                  className="w-full p-2 text-xs border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  placeholder="Nombre de actividad..."
                  value={newActivityName}
                  onChange={(e) => setNewActivityName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddActivity()}
                />
                <div className="flex gap-2">
                  <button onClick={() => setIsAddingActivity(false)} className="flex-1 py-1.5 text-[10px] font-bold text-slate-400 hover:text-slate-600 bg-transparent border-none uppercase">Cancelar</button>
                  <button onClick={handleAddActivity} className="flex-1 py-1.5 text-[10px] font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all border-none uppercase">Añadir</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingActivity(true)}
                className="w-full py-3 bg-slate-50 text-blue-600 border border-dashed border-blue-200 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Nueva Actividad
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-y-auto bg-white">
          {dossier[activeTab] ? (
            <>
              <div className="flex justify-between items-center mb-8">
                {isEditingActivity?.index === activeTab ? (
                  <div className="flex items-center gap-2 flex-1 max-w-md">
                    <input
                      autoFocus
                      className="flex-1 text-xl font-bold text-navy-800 bg-white border-b-2 border-blue-600 outline-none p-2 rounded-t-lg shadow-inner"
                      value={isEditingActivity.name}
                      onChange={(e) => setIsEditingActivity({ ...isEditingActivity, name: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleRenameActivity()}
                      onBlur={handleRenameActivity}
                    />
                  </div>
                ) : (
                  <h5 className="text-xl font-bold text-navy-800 flex items-center gap-3 group">
                    <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                    {dossier[activeTab].name}
                    <button
                      onClick={() => setIsEditingActivity({ index: activeTab, name: dossier[activeTab].name })}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-blue-500 transition-all bg-transparent border-none"
                    >
                      <Plus size={14} className="rotate-45" />
                    </button>
                  </h5>
                )}
                <button
                  onClick={() => setIsAddingSub(activeTab)}
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-100 transition-all flex items-center gap-2 border-none"
                >
                  <Plus size={14} /> Nueva Sub-actividad
                </button>
              </div>

              {/* Add Sub-activity Form */}
              {isAddingSub === activeTab && (
                <div className="bg-slate-50 p-6 rounded-3xl mb-8 border border-gray-100 animate-in slide-in-from-top-4 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Nombre de la tarea</label>
                      <input
                        className="w-full p-3 bg-white border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                        placeholder="Ej. Dimensionamiento de columnas"
                        value={newSub.name}
                        onChange={(e) => setNewSub({ ...newSub, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Avance inicial (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="w-full p-3 bg-white border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                        value={newSub.progress}
                        onChange={(e) => setNewSub({ ...newSub, progress: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Estado u Observación inicial</label>
                      <input
                        className="w-full p-3 bg-white border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                        placeholder="Ej. Pendiente de revisión..."
                        value={newSub.observations}
                        onChange={(e) => setNewSub({ ...newSub, observations: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setIsAddingSub(null)}
                      className="px-4 py-2 text-slate-400 font-bold text-xs hover:text-slate-600 transition-all bg-transparent border-none"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleAddSub(activeTab)}
                      className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all border-none"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-activities List */}
              <div className="space-y-4">
                {dossier[activeTab].subActivities.map((sub) => (
                  <div key={sub.id} className="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm group hover:border-slate-300 transition-all">
                    <div className="flex justify-between items-center mb-4">
                      <h6 className="font-bold text-navy-800">{sub.name}</h6>
                      <button
                        onClick={() => handleRemoveSub(activeTab, sub.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-all bg-transparent border-none"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="flex items-center gap-6">
                          <div className="flex-1">
                            <div className="flex justify-between text-[10px] mb-2 font-bold text-slate-400">
                              <span>Progreso</span>
                              <span>{localProgress[`${activeTab}-${sub.id}`] ?? sub.progress}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={localProgress[`${activeTab}-${sub.id}`] ?? sub.progress}
                              onChange={(e) => setLocalProgress(prev => ({ ...prev, [`${activeTab}-${sub.id}`]: parseInt(e.target.value) }))}
                              onMouseUp={(e) => handleUpdateProgress(activeTab, sub.id, e.target.value)}
                              onTouchEnd={(e) => handleUpdateProgress(activeTab, sub.id, e.target.value)}
                              className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600"
                            />
                          </div>
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xs border ${(localProgress[`${activeTab}-${sub.id}`] ?? sub.progress) === 100 ? 'bg-green-50 border-green-100 text-green-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                            {localProgress[`${activeTab}-${sub.id}`] ?? sub.progress}%
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <ObservationField
                          initialValue={sub.observations}
                          onSave={(newVal) => handleUpdateObservations(activeTab, sub.id, newVal)}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {dossier[activeTab].subActivities.length === 0 && (
                  <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
                    <Layers size={48} className="text-slate-300 mb-4" />
                    <p className="text-sm font-bold text-navy-800">No hay sub-actividades registradas</p>
                    <p className="text-xs text-slate-500">Comienza añadiendo una tarea específica para este entregable</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <Layers size={64} className="text-slate-200 mb-4" />
              <p className="text-lg font-bold text-navy-800">Seleccione o añada una actividad</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PersonnelModal = ({ isOpen, onClose, onSave, leadId, type = 'team' }) => {
  const [formData, setFormData] = React.useState({ nombre: '', rol: '', rolPersonalizado: '', telefono: '' });

  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        nombre: '',
        rol: type === 'lead' ? 'Proyectista I' : '',
        rolPersonalizado: '',
        telefono: ''
      });
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  const isLead = type === 'lead';

  const handleSave = () => {
    const finalRol = isLead ? formData.rol : (formData.rol === 'Otro' ? formData.rolPersonalizado : formData.rol);
    onSave({ nombre: formData.nombre, rol: finalRol, telefono: formData.telefono, proyectos: [], subordinados: [] }, leadId);
    setFormData({ nombre: '', rol: isLead ? 'Proyectista I' : '', rolPersonalizado: '', telefono: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-navy-800 p-8 text-white relative">
          <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors bg-transparent border-none">
            <Plus size={24} className="rotate-45" />
          </button>
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-2">Registro de Equipo</p>
          <h3 className="text-2xl font-bold">{isLead ? 'Nuevo Proyectista' : 'Nuevo Personal'}</h3>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Nombre Completo</label>
            <input
              autoFocus
              className="w-full p-4 bg-slate-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-navy-800 placeholder:text-slate-300"
              placeholder="Ej. Carlos Mendoza"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Rol / Cargo</label>
              <select
                className="w-full p-4 bg-slate-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-navy-800"
                value={formData.rol}
                onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
              >
                {!isLead && <option value="">Seleccionar...</option>}
                <option value="Proyectista I">Proyectista I</option>
                <option value="Proyectista II">Proyectista II</option>
                <option value="Proyectista III">Proyectista III</option>
                {!isLead && (
                  <>
                    <option value="Asistente">Asistente</option>
                    <option value="Especialista">Especialista</option>
                    <option value="Otro">Otro...</option>
                  </>
                )}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Teléfono</label>
              <input
                className="w-full p-4 bg-slate-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-navy-800 placeholder:text-slate-300"
                placeholder="999 000 000"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              />
            </div>
          </div>

          {!isLead && formData.rol === 'Otro' && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Especifique el Rol</label>
              <input
                className="w-full p-4 bg-slate-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-navy-800 placeholder:text-slate-300"
                placeholder="Ej. Topógrafo"
                value={formData.rolPersonalizado}
                onChange={(e) => setFormData({ ...formData, rolPersonalizado: e.target.value })}
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-4 border border-gray-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-50 transition-all bg-transparent text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all border-none text-sm"
            >
              {isLead ? 'Registrar Proyectista' : 'Registrar y Asignar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DossierView = ({ projects, onUpdateDossier, onSetFullDossier }) => {
  const [selectedProjectId, setSelectedProjectId] = React.useState(projects[0]?.id || null);
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
        <div>
          <h3 className="text-2xl font-bold text-navy-800">Avance de Expediente</h3>
          <p className="text-slate-500 text-sm">Control detallado de entregables técnicos</p>
        </div>
        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-gray-100">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Proyecto:</label>
          <select
            className="p-3 bg-white border border-gray-100 rounded-xl font-bold text-navy-800 outline-none focus:ring-2 focus:ring-blue-500 min-w-[300px] shadow-sm cursor-pointer transition-all"
            value={selectedProjectId || ''}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            <option value="" disabled>Seleccione un proyecto...</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedProject ? (
        <DossierProgress
          dossier={selectedProject.dossier}
          onUpdate={(idx, act) => onUpdateDossier(selectedProject.id, idx, act)}
          onSetFullDossier={(newDossier) => onSetFullDossier(selectedProject.id, newDossier)}
        />
      ) : (
        <div className="py-32 flex flex-col items-center justify-center text-center opacity-40 bg-white rounded-3xl border border-dashed border-gray-200">
          <Layers size={64} className="text-slate-300 mb-6" />
          <h4 className="text-xl font-bold text-navy-800">Seleccione un proyecto</h4>
          <p className="text-sm text-slate-500">Para visualizar y gestionar sus actividades técnicas</p>
        </div>
      )}
    </div>
  );
};

const PersonalView = ({
  personnel,
  onAddPersonnel,
  onDeletePersonnel,
  onEditPersonnel,
  onAssignProject,
  projects,
  onAssignSubordinate,
  onAddSubordinate,
  onUpdateDossier,
  isLeadModalOpen,
  setIsLeadModalOpen
}) => {
  const [isSubModalOpen, setIsSubModalOpen] = React.useState(null); // ID of lead for whom we're adding

  const leads = personnel.filter(p => p.rol === 'Formulador' || p.rol.startsWith('Proyectista'));

  // Find personnel who are not leads and not assigned as subordinates to any lead
  const allSubordinateIds = personnel.reduce((acc, p) => [...acc, ...(p.subordinados || [])], []);
  const unassignedPersonnel = personnel.filter(p => p.rol !== 'Formulador' && !allSubordinateIds.includes(p.id));

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h3 className="text-2xl font-bold text-navy-800">Organigrama de Trabajo</h3>
          <p className="text-slate-500 text-sm">Gestión de Jefaturas y Equipos</p>
        </div>
        <button
          onClick={() => setIsLeadModalOpen(true)}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl flex items-center shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all font-bold border-none text-sm"
        >
          <Plus size={18} className="mr-2" /> Agregar Proyectista
        </button>
      </div>

      <div className="space-y-10">
        {leads.map((lead) => (
          <div key={lead.id} className="relative">
            {/* Lead Section Header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-1.5 h-8 bg-blue-600 rounded-full"></div>
              <h4 className="text-lg font-bold text-navy-800 uppercase tracking-widest flex items-center gap-3">
                Jefatura: {lead.nombre}
                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 normal-case tracking-normal">{lead.rol}</span>
              </h4>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Lead Information Card */}
              <div className="lg:col-span-1">
                <div className="bg-navy-800 text-white p-5 rounded-3xl shadow-xl relative overflow-hidden group border border-navy-700">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>

                  <div className="relative z-10 text-left">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center font-bold text-xs border border-white/20 shrink-0">
                        {lead.nombre.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h5 className="font-bold text-md leading-tight">{lead.nombre}</h5>
                        <div className="flex items-center gap-2">
                          <p className="text-blue-300 text-[10px] font-medium">{lead.rol}</p>
                          {lead.telefono && <span className="text-white/30 text-[9px]">• {lead.telefono}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="w-full space-y-4 text-left">
                      <div>
                        <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-2 px-1">Proyectos a Cargo</p>
                        <div className="space-y-3">
                          {/* Project Selector Dropdown */}
                          <select
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-[10px] font-bold text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                            onChange={(e) => {
                              if (e.target.value) {
                                onAssignProject(lead.id, e.target.value);
                                e.target.value = "";
                              }
                            }}
                            value=""
                          >
                            <option value="" className="bg-navy-800 text-white/40">Seleccionar proyecto...</option>
                            {projects
                              .filter(proj => !(lead.proyectos || []).includes(proj.nombre))
                              .map(proj => (
                                <option key={proj.id} value={proj.nombre} className="bg-navy-800 text-white">
                                  {proj.nombre}
                                </option>
                              ))
                            }
                          </select>

                          <div className="flex flex-wrap gap-2">
                            {(lead.proyectos || []).map((projectName, idx) => (
                              <div
                                key={idx}
                                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-between group/chip w-full"
                              >
                                {projectName}
                                <button
                                  onClick={() => onAssignProject(lead.id, projectName)}
                                  className="text-white/60 hover:text-white ml-2 transition-colors border-none bg-transparent"
                                >
                                  <Plus size={12} className="rotate-45" />
                                </button>
                              </div>
                            ))}
                            {(!lead.proyectos || lead.proyectos.length === 0) && (
                              <p className="text-[10px] text-white/20 italic px-1">Ningún proyecto asignado</p>
                            )}
                          </div>
                          {(lead.proyectos || []).length >= 3 && (
                            <p className="text-[9px] text-amber-400 font-bold px-1">Límite alcanzado (máx 3)</p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4 border-t border-white/10">
                        <button
                          onClick={() => onEditPersonnel(lead)}
                          className="flex-1 bg-white/10 hover:bg-white/20 p-2 rounded-lg text-[10px] font-bold transition-colors border-none text-white outline-none"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => onDeletePersonnel(lead.id)}
                          className="flex-1 bg-red-500/20 hover:bg-red-500/40 p-2 rounded-lg text-[10px] font-bold text-red-300 transition-colors border-none outline-none"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3 space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Equipo Operativo ({lead.subordinados?.length || 0})</h6>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsSubModalOpen(lead.id)}
                      className="p-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-colors border-none flex items-center gap-1"
                    >
                      <Plus size={12} /> Nuevo Personal
                    </button>
                    <select
                      className="p-2 bg-slate-100 border-none rounded-lg text-[10px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={(e) => {
                        if (e.target.value) {
                          onAssignSubordinate(lead.id, e.target.value);
                          e.target.value = "";
                        }
                      }}
                    >
                      <option value="">+ Asignar Existente</option>
                      {personnel.filter(p => p.id !== lead.id && !(lead.subordinados || []).includes(p.id)).map(p => (
                        <option key={p.id} value={p.id}>{p.nombre} ({p.rol})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(lead.subordinados || []).map(subId => {
                    const sub = personnel.find(p => p.id === subId);
                    if (!sub) return null;
                    return (
                      <div key={subId} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center font-bold text-xs uppercase group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            {sub.nombre.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-navy-800">{sub.nombre}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] text-slate-400 font-medium">{sub.rol}</p>
                              {sub.telefono && (
                                <span className="text-[9px] text-slate-300">• {sub.telefono}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEditPersonnel(sub)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border-none bg-transparent"
                          >
                            <Plus size={14} className="rotate-45" />
                          </button>
                          <button
                            onClick={() => onAssignSubordinate(lead.id, subId)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border-none bg-transparent"
                            title="Desvincular"
                          >
                            <Plus size={14} className="rotate-45 text-red-500" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {(!lead.subordinados || lead.subordinados.length === 0) && (
                    <div className="col-span-full py-12 bg-slate-50 rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                      <Users className="text-slate-300 mb-2" size={32} />
                      <p className="text-xs text-slate-400 font-medium">Sin equipo asignado bajo esta jefatura</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Unassigned Personnel Section */}
        {unassignedPersonnel.length > 0 && (
          <div className="pt-8 border-t border-gray-100">
            <h4 className="text-lg font-bold text-navy-800 mb-6 flex items-center gap-3">
              <div className="w-1.5 h-8 bg-slate-300 rounded-full"></div>
              Personal Sin Asignar
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {unassignedPersonnel.map((p) => (
                <div key={p.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-slate-300 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center font-bold text-xs">
                      {p.nombre.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-navy-800">{p.nombre}</p>
                      <p className="text-[10px] text-slate-400">{p.rol}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onDeletePersonnel(p.id)}
                    className="p-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all border-none bg-transparent"
                  >
                    <Plus size={14} className="rotate-45" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <PersonnelModal
        isOpen={!!isSubModalOpen}
        leadId={isSubModalOpen}
        onClose={() => setIsSubModalOpen(null)}
        onSave={onAddSubordinate}
        type="team"
      />
    </div>
  );
};

const ReportsView = ({ personnel, projects }) => {
  const [activeTab, setActiveTab] = React.useState('personal');

  // Flatten and process data for the report
  const personalReportData = personnel.flatMap(p => {
    // 1. Projects where they are the Lead (Formulador/Proyectista)
    const leadProjects = p.proyectos || [];

    // 2. Projects where they are Team Members (Subordinates)
    const teamProjects = projects
      .filter(proj => (proj.equipo || []).includes(p.id))
      .map(proj => proj.nombre);

    // Combine and unique
    const allAssignedProjects = [...new Set([...leadProjects, ...teamProjects])];

    if (allAssignedProjects.length === 0) {
      return [{ ...p, assignedProject: 'Sin Asignar' }];
    }

    return allAssignedProjects.map(projName => ({
      ...p,
      assignedProject: projName
    }));
  });

  // Sort by project name
  const sortedData = personalReportData.sort((a, b) =>
    a.assignedProject.localeCompare(b.assignedProject)
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-8 border-b border-gray-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
            < BarChart3 size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-navy-800">Centro de Reportes</h3>
            <p className="text-sm text-slate-500">Generación de informes y balances generales</p>
          </div>
        </div>

        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'personal'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
              } bg-transparent outline-none`}
          >
            Ficha de Personal
          </button>
          <button
            className="px-6 py-3 text-sm font-bold border-b-2 border-transparent text-slate-300 cursor-not-allowed bg-transparent outline-none"
            disabled
          >
            Reporte Financiero (Próximamente)
          </button>
        </div>
      </div>

      <div className="p-8">
        {activeTab === 'personal' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">
                <tr>
                  <th className="px-6 py-4">Nombre Completo</th>
                  <th className="px-6 py-4">Cargo / Rol</th>
                  <th className="px-6 py-4">Celular</th>
                  <th className="px-6 py-4">Proyecto Asignado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-navy-800 text-sm text-left">{row.nombre}</td>
                    <td className="px-6 py-4 text-xs text-left">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md font-medium">
                        {row.rol}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-medium text-left">
                      {row.telefono || '---'}
                    </td>
                    <td className="px-6 py-4 text-left">
                      <span className={`text-xs font-bold ${row.assignedProject === 'Sin Asignar'
                        ? 'text-red-400 italic'
                        : 'text-blue-600'
                        }`}>
                        {row.assignedProject}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  const { user, loading: authLoading } = useAuth();
  const [collapsed, setCollapsed] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedProject, setSelectedProject] = React.useState(null);
  const [currentView, setCurrentView] = React.useState('dashboard');
  const [isLeadModalOpen, setIsLeadModalOpen] = React.useState(false);

  // Data State
  const [projects, setProjects] = React.useState([]);
  const [personnel, setPersonnel] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: projectsData, error: pError } = await supabase.from('proyectos').select('*');
      const { data: personnelData, error: perError } = await supabase.from('personal').select('*');

      if (projectsData) setProjects(projectsData);
      if (personnelData) setPersonnel(personnelData);
    } catch (err) {
      console.error("Error al cargar datos:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleAddProject = async (projectData) => {
    if (projectData._action === 'ADD_PERSONNEL') {
      setIsLeadModalOpen(true);
      return;
    }
    const { _action, ...cleanData } = projectData;
    try {
      if (cleanData.id) {
        const { error } = await supabase.from('proyectos').update(cleanData).eq('id', cleanData.id);
        if (error) throw error;
      } else {
        const newProject = {
          ...cleanData,
          dossier: createEmptyDossier(),
          presupuesto: cleanData.presupuesto || { personal: 0, materiales: 0, servicios: 0, otros: 0 }
        };
        const { error } = await supabase.from('proyectos').insert(newProject);
        if (error) throw error;
      }
      fetchData();
      setIsFormOpen(false);
    } catch (err) {
      console.error("Error al guardar proyecto:", err);
    }
  };

  const handleDeleteProject = async (id) => {
    if (confirm("¿Está seguro de eliminar este proyecto permanentemente?")) {
      try {
        const { error } = await supabase.from('proyectos').delete().eq('id', id);
        if (error) throw error;
        fetchData();
        if (selectedProject?.id === id) setSelectedProject(null);
      } catch (err) {
        console.error("Error al eliminar proyecto:", err);
      }
    }
  };

  const handleCreateSubordinate = async (personData, leadId) => {
    try {
      // 1. Create the subordinate
      const { data: newPerson, error: perError } = await supabase
        .from('personal')
        .insert(personData)
        .select()
        .single();

      if (perError) throw perError;

      // 2. Link to lead
      const lead = personnel.find(p => p.id === leadId);
      const updatedSubs = [...(lead.subordinados || []), newPerson.id];
      const { error: leadError } = await supabase
        .from('personal')
        .update({ subordinados: updatedSubs })
        .eq('id', leadId);

      if (leadError) throw leadError;

      fetchData();
    } catch (err) {
      console.error("Error al crear subordinado:", err);
    }
  };

  const handleAddPersonnel = async (personData) => {
    try {
      const { error } = await supabase.from('personal').insert(personData);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error("Error al añadir personal:", err);
    }
  };

  const handleDeletePersonnel = async (id) => {
    if (confirm("¿Está seguro de eliminar a este trabajador?")) {
      try {
        const { error } = await supabase.from('personal').delete().eq('id', id);
        if (error) throw error;
        fetchData();
      } catch (err) {
        console.error("Error al eliminar personal:", err);
      }
    }
  };

  const handleEditPersonnel = async (person) => {
    const newNombre = prompt("Nuevo nombre:", person.nombre);
    if (newNombre) {
      try {
        const { error } = await supabase.from('personal').update({ nombre: newNombre }).eq('id', person.id);
        if (error) throw error;
        fetchData();
      } catch (err) {
        console.error("Error al editar personal:", err);
      }
    }
  };

  const handleAssignProject = async (personId, projectName) => {
    const person = personnel.find(p => p.id === personId);
    if (!person) return;

    let updatedProjects = [...(person.proyectos || [])];
    if (updatedProjects.includes(projectName)) {
      updatedProjects = updatedProjects.filter(n => n !== projectName);
    } else if (updatedProjects.length < 3) {
      updatedProjects.push(projectName);
    } else {
      alert("Máximo 3 proyectos permitidos");
      return;
    }

    try {
      const { error } = await supabase.from('personal').update({ proyectos: updatedProjects }).eq('id', personId);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error("Error al asignar proyecto:", err);
    }
  };

  const handleAssignSubordinate = async (bossId, subId) => {
    const boss = personnel.find(p => p.id === bossId);
    if (!boss) return;

    let updatedSubs = [...(boss.subordinados || [])];
    if (updatedSubs.includes(subId)) {
      updatedSubs = updatedSubs.filter(id => id !== subId);
    } else {
      updatedSubs.push(subId);
    }

    try {
      const { error } = await supabase.from('personal').update({ subordinados: updatedSubs }).eq('id', bossId);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error("Error al asignar subordinado:", err);
    }
  };
  const handleUpdateDossier = async (projectId, activityIndex, updatedActivity) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const newDossier = {
      ...project.dossier,
      [activityIndex]: updatedActivity
    };

    try {
      const { error } = await supabase.from('proyectos').update({ dossier: newDossier }).eq('id', projectId);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error("Error al actualizar dossier:", err);
    }
  };

  const handleSetFullDossier = async (projectId, newDossier) => {
    try {
      const { error } = await supabase.from('proyectos').update({ dossier: newDossier }).eq('id', projectId);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error("Error al guardar dossier completo:", err);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <KPICard title="Proyectos Totales" value={projects.length} change={projects.length > 0 ? `+${projects.length}` : "0"} trend="up" icon={Layers} />
              <KPICard
                title="Presupuesto Total"
                value={`S/ ${(projects.reduce((acc, p) => acc + calculateProjectBudget(p.presupuesto), 0) / 1000000).toFixed(1)}M`}
                change="+100%"
                trend="up"
                icon={BarChart3}
              />
              <KPICard
                title="Hitos Totales"
                value={projects.reduce((acc, p) => acc + (p.hitos?.length || 0), 0)}
                change="Actualizado"
                trend="up"
                icon={Calendar}
              />
              <KPICard title="Personal Activo" value={personnel.length} change={personnel.length > 0 ? `+${personnel.length}` : "0"} trend="up" icon={Users} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <h3 className="text-lg font-bold text-navy-800">Estado de Proyectos (Gantt)</h3>
                  <div className="flex space-x-3 overflow-x-auto pb-2 md:pb-0">
                    <span className="flex items-center text-[10px] text-slate-500 font-medium whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-blue-600 mr-1"></span> En curso
                    </span>
                    <span className="flex items-center text-[10px] text-slate-500 font-medium whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-red-500 mr-1"></span> Detenido
                    </span>
                    <span className="flex items-center text-[10px] text-slate-500 font-medium whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span> Finalizado
                    </span>
                  </div>
                </div>
                <GanttChart projects={projects} />
              </div>

              <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-navy-800 mb-6">Distribución por Estado</h3>
                <ProjectStateChart data={[
                  { name: 'En curso', value: projects.filter(p => p.estado === 'En curso').length },
                  { name: 'Detenido', value: projects.filter(p => p.estado === 'Detenido').length },
                  { name: 'Finalizado', value: projects.filter(p => p.estado === 'Finalizado').length },
                ]} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-navy-800 mb-6">Presupuesto vs Ejecutado by Cat.</h3>
                <BudgetVsActualChart data={BUDGET_DATA} />
              </div>

              <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-navy-800">Alertas de Gestión</h3>
                  <AlertTriangle className="text-amber-500" size={20} />
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                    <p className="text-sm font-bold text-red-800">Exceso de Presupuesto (115%)</p>
                    <p className="text-xs text-red-600">Proyecto: Parque Infantil Modelo - Categoría: Materiales</p>
                  </div>
                  <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg">
                    <p className="text-sm font-bold text-amber-800">Hito Vencido</p>
                    <p className="text-xs text-amber-600">Proyecto: Saneamiento Sector 4 - Hito: Entrega de Terreno</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      case 'proyectos':
        return (
          <ProjectsView
            projects={projects}
            onViewDetail={(project) => setSelectedProject(project)}
            onDeleteProject={handleDeleteProject}
          />
        );
      case 'personal':
        return (
          <PersonalView
            personnel={personnel}
            projects={projects}
            onAddPersonnel={handleAddPersonnel}
            onDeletePersonnel={handleDeletePersonnel}
            onEditPersonnel={handleEditPersonnel}
            onAssignProject={handleAssignProject}
            onAddSubordinate={handleCreateSubordinate}
            onUpdateDossier={handleUpdateDossier}
            onAssignSubordinate={handleAssignSubordinate}
            isLeadModalOpen={isLeadModalOpen}
            setIsLeadModalOpen={setIsLeadModalOpen}
          />
        );
      case 'expedientes':
        return (
          <DossierView
            projects={projects}
            onUpdateDossier={handleUpdateDossier}
            onSetFullDossier={handleSetFullDossier}
          />
        );
      case 'cronograma':
        return (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-navy-800 mb-8">Cronograma Maestro de la Oficina</h3>
            <GanttChart projects={projects} />
          </div>
        );
      case 'reportes':
        return (
          <ReportsView
            personnel={personnel}
            projects={projects}
          />
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center p-20 bg-white rounded-xl shadow-sm border border-gray-100">
            <BarChart3 size={64} className="text-slate-200 mb-4" />
            <h3 className="text-xl font-bold text-navy-800">Sección en construcción</h3>
            <p className="text-slate-500">Estamos trabajando para habilitar esta vista pronto.</p>
          </div>
        )
    }
  };

  if (authLoading || loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-navy-800 font-bold animate-pulse text-sm">Conectando con Supabase...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-slate-900 overflow-hidden">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} currentView={currentView} setCurrentView={setCurrentView} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <div>
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-widest">{currentView}</h2>
            <h3 className="text-xl font-bold text-navy-800">
              {currentView === 'dashboard' ? 'Resumen Ejecutivo' :
                currentView === 'proyectos' ? 'Gestion de Proyectos' :
                  currentView === 'personal' ? 'Equipo de Trabajo' :
                    currentView === 'expedientes' ? 'Control Técnico' :
                      currentView === 'cronograma' ? 'Vista de Tiempos' : 'ProjectHub'}
            </h3>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsFormOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all font-medium border-none"
            >
              <Plus size={18} className="mr-2" /> Nuevo Proyecto
            </button>
            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-navy-800 font-bold border-2 border-white shadow-sm">
              SG
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <ProjectForm
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSubmit={handleAddProject}
            personnel={personnel}
          />
          <ProjectDetailModal
            project={selectedProject}
            isOpen={!!selectedProject}
            onClose={() => setSelectedProject(null)}
            personnel={personnel}
            onSave={handleAddProject}
          />
          {renderContent()}
          <PersonnelModal
            isOpen={isLeadModalOpen}
            onClose={() => setIsLeadModalOpen(false)}
            onSave={(data) => {
              handleAddPersonnel(data);
              setIsLeadModalOpen(false);
            }}
            type="lead"
          />
        </main>
      </div>
    </div>
  );
}

export default App;
