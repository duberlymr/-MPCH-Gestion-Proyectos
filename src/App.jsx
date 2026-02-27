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
  Edit2,
  Package,
  Wrench
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
    { id: 'materiales', icon: Package, label: 'Materiales' },
    { id: 'servicios', icon: Wrench, label: 'Servicios' },
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
  const [formData, setFormData] = React.useState({ nombre: '', rol: '', rolPersonalizado: '', telefono: '', remuneracion: '' });

  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        nombre: '',
        rol: type === 'lead' ? 'Proyectista I' : '',
        rolPersonalizado: '',
        telefono: '',
        remuneracion: ''
      });
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  const isLead = type === 'lead';

  const handleSave = () => {
    const finalRol = isLead ? formData.rol : (formData.rol === 'Otro' ? formData.rolPersonalizado : formData.rol);
    onSave({ nombre: formData.nombre, rol: finalRol, telefono: formData.telefono, remuneracion: parseFloat(formData.remuneracion) || 0, proyectos: [], subordinados: [] }, leadId);
    setFormData({ nombre: '', rol: isLead ? 'Proyectista I' : '', rolPersonalizado: '', telefono: '', remuneracion: '' });
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

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Remuneración Mensual (S/)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">S/</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-navy-800 placeholder:text-slate-300"
                placeholder="0.00"
                value={formData.remuneracion}
                onChange={(e) => setFormData({ ...formData, remuneracion: e.target.value })}
              />
            </div>
          </div>

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

// ── Helpers de Meses ─────────────────────────────────────────────────────
const MESES_LABELS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const getMesesProyecto = (inicio, fin) => {
  if (!inicio || !fin) return [];
  const [sy, sm] = inicio.split('-').map(Number);
  const [ey, em] = fin.split('-').map(Number);
  const meses = [];
  let y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    meses.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return meses;
};

const formatMesLabel = (mesStr) => {
  const [y, m] = mesStr.split('-');
  return `${MESES_LABELS[parseInt(m, 10) - 1].slice(0,3)} ${y}`;
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
  onUpdatePersonMeses,
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

                          <div className="space-y-2">
                            {(lead.proyectos || []).map((projectName, idx) => {
                              const proj = projects.find(p => p.nombre === projectName);
                              let projMonths = proj ? getMesesProyecto(proj.inicio, proj.fin) : [];
                              if (projMonths.length === 0) {
                                const y = new Date().getFullYear();
                                projMonths = Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`);
                              }
                              const activeMeses = lead.meses_proyecto?.[projectName] || [];
                              const toggleLeadMes = (mes) => {
                                const next = activeMeses.includes(mes)
                                  ? activeMeses.filter(m => m !== mes)
                                  : [...activeMeses, mes];
                                if (onUpdatePersonMeses) onUpdatePersonMeses(lead.id, { ...(lead.meses_proyecto || {}), [projectName]: next });
                              };
                              return (
                                <div key={idx} className="bg-blue-700/40 rounded-xl p-2.5 border border-blue-500/30">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[9px] font-bold text-white/90 leading-tight flex-1 mr-2 line-clamp-2">{projectName}</span>
                                    <button
                                      onClick={() => onAssignProject(lead.id, projectName)}
                                      className="text-white/40 hover:text-white transition-colors border-none bg-transparent shrink-0"
                                    >
                                      <Plus size={11} className="rotate-45" />
                                    </button>
                                  </div>
                                  <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mb-1.5">Meses activos</p>
                                  <div className="flex flex-wrap gap-1">
                                    {projMonths.map(mes => (
                                      <button
                                        key={mes}
                                        onClick={() => toggleLeadMes(mes)}
                                        className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold transition-colors border-none cursor-pointer ${
                                          activeMeses.includes(mes)
                                            ? 'bg-white text-blue-700'
                                            : 'bg-white/10 text-white/40 hover:bg-white/20 hover:text-white/70'
                                        }`}
                                      >
                                        {formatMesLabel(mes)}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
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

                {(() => {
                  const leadProjects = lead.proyectos || [];
                  const subIds = lead.subordinados || [];

                  if (subIds.length === 0) {
                    return (
                      <div className="py-12 bg-slate-50 rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                        <Users className="text-slate-300 mb-2" size={32} />
                        <p className="text-xs text-slate-400 font-medium">Sin equipo asignado bajo esta jefatura</p>
                      </div>
                    );
                  }

                  const renderSubCard = (subId, projectName = null) => {
                    const sub = personnel.find(p => p.id === subId);
                    if (!sub) return null;

                    const project = projectName ? projects.find(p => p.nombre === projectName) : null;
                    let projectMonths = project ? getMesesProyecto(project.inicio, project.fin) : [];
                    // Fallback: si el proyecto no tiene fechas, generar 12 meses desde el año actual
                    if (projectName && projectMonths.length === 0) {
                      const y = new Date().getFullYear();
                      projectMonths = Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`);
                    }
                    const activeMeses = projectName && sub.meses_proyecto ? (sub.meses_proyecto[projectName] || []) : [];

                    const toggleMes = (mes) => {
                      const next = activeMeses.includes(mes)
                        ? activeMeses.filter(m => m !== mes)
                        : [...activeMeses, mes];
                      const updatedMeses = { ...(sub.meses_proyecto || {}), [projectName]: next };
                      if (onUpdatePersonMeses) onUpdatePersonMeses(sub.id, updatedMeses);
                    };

                    return (
                      <div key={subId} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm group hover:border-blue-200 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center font-bold text-xs uppercase group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
                              {sub.nombre.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-navy-800">{sub.nombre}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-[10px] text-slate-400 font-medium">{sub.rol}</p>
                                {sub.telefono && (
                                  <span className="text-[9px] text-slate-300">• {sub.telefono}</span>
                                )}
                                {sub.remuneracion > 0 && (
                                  <span className="text-[9px] text-green-600 font-bold">• S/ {sub.remuneracion.toLocaleString('es-PE')}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onEditPersonnel(sub)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border-none bg-transparent"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => onAssignSubordinate(lead.id, subId)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border-none bg-transparent"
                              title="Desvincular"
                            >
                              <Plus size={14} className="rotate-45 text-red-400" />
                            </button>
                          </div>
                        </div>
                        {projectName && projectMonths.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Meses activos en este proyecto</p>
                            <div className="flex flex-wrap gap-1">
                              {projectMonths.map(mes => (
                                <button
                                  key={mes}
                                  onClick={() => toggleMes(mes)}
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-colors border-none cursor-pointer ${
                                    activeMeses.includes(mes)
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                  }`}
                                >
                                  {formatMesLabel(mes)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  };

                  // Si el jefe tiene 2+ proyectos, agrupa el equipo por proyecto
                  if (leadProjects.length >= 2) {
                    const grouped = leadProjects.map(projectName => ({
                      projectName,
                      subs: subIds.filter(subId => {
                        const sub = personnel.find(p => p.id === subId);
                        return sub && (sub.proyectos || []).includes(projectName);
                      })
                    }));
                    const sinProyecto = subIds.filter(subId => {
                      const sub = personnel.find(p => p.id === subId);
                      return sub && !leadProjects.some(pn => (sub.proyectos || []).includes(pn));
                    });

                    return (
                      <div className="space-y-5">
                        {grouped.map(({ projectName, subs: groupSubs }) => (
                          <div key={projectName}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider truncate" title={projectName}>{projectName}</p>
                              <span className="text-[9px] text-slate-400 shrink-0">({groupSubs.length})</span>
                            </div>
                            {groupSubs.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4 border-l-2 border-blue-100">
                                {groupSubs.map(subId => renderSubCard(subId, projectName))}
                              </div>
                            ) : (
                              <div className="pl-4 border-l-2 border-slate-100 py-2">
                                <p className="text-[10px] text-slate-400 italic">Sin personal asignado a este proyecto</p>
                              </div>
                            )}
                          </div>
                        ))}
                        {sinProyecto.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 rounded-full bg-orange-300 shrink-0"></div>
                              <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Sin proyecto asignado</p>
                              <span className="text-[9px] text-slate-400 shrink-0">({sinProyecto.length})</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4 border-l-2 border-orange-100">
                              {sinProyecto.map(subId => {
                                const sub = personnel.find(p => p.id === subId);
                                if (!sub) return null;
                                return (
                                  <div key={subId} className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm group hover:border-orange-200 transition-all">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center font-bold text-xs uppercase">
                                          {sub.nombre.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                          <p className="text-sm font-bold text-navy-800">{sub.nombre}</p>
                                          <div className="flex items-center gap-2">
                                            <p className="text-[10px] text-slate-400 font-medium">{sub.rol}</p>
                                            {sub.telefono && <span className="text-[9px] text-slate-300">• {sub.telefono}</span>}
                                          </div>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => onAssignSubordinate(lead.id, subId)}
                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border-none bg-transparent opacity-0 group-hover:opacity-100"
                                        title="Desvincular del equipo"
                                      >
                                        <Plus size={12} className="rotate-45" />
                                      </button>
                                    </div>
                                    <select
                                      className="w-full text-[10px] bg-orange-50 border border-orange-200 rounded-lg px-2 py-1.5 text-orange-700 font-bold outline-none focus:ring-2 focus:ring-orange-300 cursor-pointer"
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          onAssignProject(sub.id, e.target.value);
                                          e.target.value = '';
                                        }
                                      }}
                                    >
                                      <option value="">Asignar a proyecto...</option>
                                      {leadProjects.map(pn => (
                                        <option key={pn} value={pn}>{pn}</option>
                                      ))}
                                    </select>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Vista plana para 0 o 1 proyecto
                  const singleProject = leadProjects.length === 1 ? leadProjects[0] : null;
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {subIds.map(subId => renderSubCard(subId, singleProject))}
                    </div>
                  );
                })()}
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

// ── MaterialesView ────────────────────────────────────────────────────────
const MaterialesView = ({ projects, onSave, fieldName = 'materiales_cronograma', title = 'Materiales', subtitle = 'Gestión de materiales por proyecto y mes', ViewIcon = Package }) => {
  const [addingProject, setAddingProject] = React.useState(null);
  const [newItem, setNewItem] = React.useState({ nombre: '', unidad: 'Und.', cantidad: '1', costoUnitario: '' });
  const [editingState, setEditingState] = React.useState(null); // { projectId, itemId }
  const [editVal, setEditVal] = React.useState({});
  const [localMats, setLocalMats] = React.useState({});

  React.useEffect(() => { setLocalMats({}); }, [projects]);

  const getItems = (projectId) =>
    localMats[projectId] !== undefined
      ? localMats[projectId]
      : (projects.find(p => p.id === projectId)?.[fieldName] || []);

  const handleAdd = (projectId) => {
    if (!newItem.nombre) return;
    const qty = parseFloat(newItem.cantidad) || 1;
    const cu = parseFloat(newItem.costoUnitario) || 0;
    const updated = [...getItems(projectId), {
      id: Date.now(),
      nombre: newItem.nombre,
      unidad: newItem.unidad || 'Und.',
      cantidad: qty,
      costoUnitario: cu,
      costo: qty * cu,
      meses: []
    }];
    setLocalMats(prev => ({ ...prev, [projectId]: updated }));
    setNewItem({ nombre: '', unidad: 'Und.', cantidad: '1', costoUnitario: '' });
    setAddingProject(null);
    onSave(projectId, updated);
  };

  const handleDelete = (projectId, itemId) => {
    const updated = getItems(projectId).filter(m => m.id !== itemId);
    setLocalMats(prev => ({ ...prev, [projectId]: updated }));
    onSave(projectId, updated);
  };

  const handleSaveEdit = (projectId) => {
    const qty = parseFloat(editVal.cantidad) || 1;
    const cu = parseFloat(editVal.costoUnitario) || 0;
    const updated = getItems(projectId).map(m =>
      m.id === editingState.itemId ? { ...m, ...editVal, cantidad: qty, costoUnitario: cu, costo: qty * cu } : m
    );
    setLocalMats(prev => ({ ...prev, [projectId]: updated }));
    setEditingState(null);
    onSave(projectId, updated);
  };

  const handleToggleMes = (projectId, itemId, mes) => {
    const updated = getItems(projectId).map(item => {
      if (item.id !== itemId) return item;
      const current = item.meses || (item.mes ? [item.mes] : []);
      const next = current.includes(mes) ? current.filter(m => m !== mes) : [...current, mes];
      return { ...item, meses: next };
    });
    setLocalMats(prev => ({ ...prev, [projectId]: updated }));
    onSave(projectId, updated);
  };

  const itemLabel = title === 'Servicios' ? 'servicio' : 'material';

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h3 className="text-2xl font-bold text-navy-800">{title}</h3>
          <p className="text-slate-500 text-sm">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-10">
        {projects.map((project) => {
          let meses = getMesesProyecto(project.inicio, project.fin);
          if (meses.length === 0) {
            const y = new Date().getFullYear();
            meses = Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`);
          }
          const items = getItems(project.id);
          const totalAsignado = items.reduce((s, m) => s + (m.costo || 0), 0);
          const presupuestoMat = project.presupuesto?.materiales || 0;
          const pct = presupuestoMat > 0 ? Math.min((totalAsignado / presupuestoMat) * 100, 100).toFixed(0) : 0;
          const isAdding = addingProject === project.id;

          return (
            <div key={project.id} className="relative">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-1.5 h-8 bg-blue-600 rounded-full"></div>
                <h4 className="text-lg font-bold text-navy-800 uppercase tracking-widest flex items-center gap-3">
                  {project.nombre}
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 normal-case tracking-normal">{project.estado}</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Tarjeta izquierda */}
                <div className="lg:col-span-1">
                  <div className="bg-navy-800 text-white p-5 rounded-3xl shadow-xl relative overflow-hidden group border border-navy-700">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10 text-left">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 shrink-0">
                          <ViewIcon size={18} className="text-white/80" />
                        </div>
                        <div>
                          <p className="font-bold text-xs leading-tight">{project.nombre}</p>
                          <p className="text-blue-300 text-[9px] mt-0.5">{project.estado}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1">Periodo</p>
                          <p className="text-[10px] text-white/70">{project.inicio || '—'} → {project.fin || '—'}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                          <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1">Total Asignado</p>
                          <p className="text-sm font-bold text-blue-300">S/ {totalAsignado.toLocaleString('es-PE')}</p>
                          <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
                            <div className={`h-1.5 rounded-full transition-all ${parseFloat(pct) > 90 ? 'bg-red-400' : 'bg-blue-400'}`} style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[9px] text-white/30 mt-1">{pct}% del presupuesto</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Derecha: tarjetas de ítems con chips de meses */}
                <div className="lg:col-span-3 space-y-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title} ({items.length})</span>
                    <button
                      onClick={() => { setAddingProject(project.id); setNewItem({ nombre: '', unidad: 'Und.', cantidad: '1', costoUnitario: '' }); }}
                      className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-bold hover:bg-blue-700 transition-colors border-none"
                    >
                      <Plus size={12} /> Agregar {itemLabel}
                    </button>
                  </div>

                  {/* Formulario inline de agregar */}
                  {isAdding && (
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 mb-2">
                      <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-2">Nuevo {itemLabel}</p>
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4">
                          <input autoFocus className="w-full border border-blue-300 rounded-lg p-1.5 text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500 bg-white" placeholder={`Nombre del ${itemLabel}`} value={newItem.nombre} onChange={(e) => setNewItem({ ...newItem, nombre: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleAdd(project.id)} />
                        </div>
                        <div className="col-span-2">
                          <input className="w-full border border-blue-300 rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 bg-white" placeholder="Unidad" value={newItem.unidad} onChange={(e) => setNewItem({ ...newItem, unidad: e.target.value })} />
                        </div>
                        <div className="col-span-2">
                          <input type="number" min="0" className="w-full text-right border border-blue-300 rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 bg-white" placeholder="Cant." value={newItem.cantidad} onChange={(e) => setNewItem({ ...newItem, cantidad: e.target.value })} />
                        </div>
                        <div className="col-span-2">
                          <input type="number" min="0" className="w-full text-right border border-blue-300 rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 bg-white" placeholder="C.Unit." value={newItem.costoUnitario} onChange={(e) => setNewItem({ ...newItem, costoUnitario: e.target.value })} />
                        </div>
                        <div className="col-span-2 flex justify-end gap-1">
                          <button onClick={() => handleAdd(project.id)} className="p-1.5 bg-blue-600 text-white rounded-lg border-none hover:bg-blue-700"><Check size={12} /></button>
                          <button onClick={() => setAddingProject(null)} className="p-1.5 bg-slate-100 text-slate-500 rounded-lg border-none hover:bg-slate-200"><X size={12} /></button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Estado vacío */}
                  {items.length === 0 && !isAdding && (
                    <div className="py-12 bg-slate-50 rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                      <ViewIcon className="text-slate-300 mb-2" size={32} />
                      <p className="text-xs text-slate-400 font-medium">Sin {title.toLowerCase()} — haz clic en Agregar</p>
                    </div>
                  )}

                  {/* Tarjetas de ítems */}
                  {items.map((item) => {
                    const isEditing = editingState?.projectId === project.id && editingState?.itemId === item.id;
                    const activeMeses = item.meses || (item.mes ? [item.mes] : []);
                    return (
                      <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm group hover:border-blue-200 transition-all">
                        {isEditing ? (
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-4"><input className="w-full border border-blue-200 rounded-lg p-1.5 text-xs font-bold outline-none focus:ring-1 focus:ring-blue-400" value={editVal.nombre} onChange={(e) => setEditVal({ ...editVal, nombre: e.target.value })} /></div>
                            <div className="col-span-2"><input className="w-full border border-blue-200 rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-400" value={editVal.unidad} onChange={(e) => setEditVal({ ...editVal, unidad: e.target.value })} /></div>
                            <div className="col-span-2"><input type="number" min="0" className="w-full text-right border border-blue-200 rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-400" value={editVal.cantidad} onChange={(e) => setEditVal({ ...editVal, cantidad: e.target.value })} /></div>
                            <div className="col-span-2"><input type="number" min="0" className="w-full text-right border border-blue-200 rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-400" value={editVal.costoUnitario} onChange={(e) => setEditVal({ ...editVal, costoUnitario: e.target.value })} /></div>
                            <div className="col-span-2 flex justify-end gap-1">
                              <button onClick={() => handleSaveEdit(project.id)} className="p-1.5 bg-blue-600 text-white rounded-lg border-none hover:bg-blue-700"><Check size={12} /></button>
                              <button onClick={() => setEditingState(null)} className="p-1.5 bg-slate-100 text-slate-500 rounded-lg border-none hover:bg-slate-200"><X size={12} /></button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-navy-800">{item.nombre}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{item.unidad} · {item.cantidad} und · S/ {(item.costoUnitario || 0).toLocaleString('es-PE')}/u</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-4">
                              <span className="text-sm font-bold text-blue-600">S/ {(item.costo || 0).toLocaleString('es-PE')}</span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingState({ projectId: project.id, itemId: item.id }); setEditVal({ nombre: item.nombre, unidad: item.unidad, cantidad: item.cantidad, costoUnitario: item.costoUnitario }); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg border-none bg-transparent transition-colors"><Edit2 size={12} /></button>
                                <button onClick={() => handleDelete(project.id, item.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg border-none bg-transparent transition-colors"><Trash2 size={12} /></button>
                              </div>
                            </div>
                          </div>
                        )}
                        {/* Chips de meses — igual que Personal */}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Meses activos</p>
                          <div className="flex flex-wrap gap-1">
                            {meses.map(mes => (
                              <button
                                key={mes}
                                onClick={() => handleToggleMes(project.id, item.id, mes)}
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-colors border-none cursor-pointer ${
                                  activeMeses.includes(mes)
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                }`}
                              >
                                {formatMesLabel(mes)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {projects.length === 0 && (
          <div className="py-20 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center">
            <ViewIcon className="text-slate-200 mb-3" size={48} />
            <p className="text-slate-400 font-medium">No hay proyectos registrados</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── CronogramaView ────────────────────────────────────────────────────────
const CronogramaView = ({ projects, personnel, onSaveEjecutado }) => {
  const [selectedProjectId, setSelectedProjectId] = React.useState(projects[0]?.id || null);
  const [localEjec, setLocalEjec] = React.useState({}); // { [mes]: { personal, bienes, servicios } }

  React.useEffect(() => {
    if (!selectedProjectId && projects.length > 0) setSelectedProjectId(projects[0].id);
  }, [projects]);

  // Reset local ejecutado when project changes
  React.useEffect(() => { setLocalEjec({}); }, [selectedProjectId]);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  let meses = selectedProject ? getMesesProyecto(selectedProject.inicio, selectedProject.fin) : [];
  if (meses.length === 0 && selectedProject) {
    const y = new Date().getFullYear();
    meses = Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`);
  }

  // ── Programado ──────────────────────────────────────────────────────────
  const costosPorMes = meses.map(mes => {
    let personalCost = 0;
    personnel.forEach(person => {
      const worksOnProject = (person.proyectos || []).includes(selectedProject?.nombre);
      if (!worksOnProject) return;
      const personMeses = person.meses_proyecto?.[selectedProject.nombre] || [];
      const isActive = personMeses.length > 0 ? personMeses.includes(mes) : true;
      if (isActive) personalCost += person.remuneracion || 0;
    });
    let bienesCost = 0;
    (selectedProject?.materiales_cronograma || []).forEach(mat => {
      const matMeses = mat.meses || (mat.mes ? [mat.mes] : []);
      if (matMeses.includes(mes)) bienesCost += mat.costo || 0;
    });
    let serviciosCost = 0;
    (selectedProject?.servicios_cronograma || []).forEach(srv => {
      const srvMeses = srv.meses || (srv.mes ? [srv.mes] : []);
      if (srvMeses.includes(mes)) serviciosCost += srv.costo || 0;
    });
    return { mes, personal: personalCost, bienes: bienesCost, servicios: serviciosCost, total: personalCost + bienesCost + serviciosCost };
  });

  const totProg = {
    personal:  costosPorMes.reduce((s, m) => s + m.personal, 0),
    bienes:    costosPorMes.reduce((s, m) => s + m.bienes, 0),
    servicios: costosPorMes.reduce((s, m) => s + m.servicios, 0),
    total:     costosPorMes.reduce((s, m) => s + m.total, 0),
  };

  // ── Ejecutado ───────────────────────────────────────────────────────────
  const getEjec = (mes, cat) => {
    if (localEjec[mes]?.[cat] !== undefined) return localEjec[mes][cat];
    return selectedProject?.costos_ejecutados?.[mes]?.[cat] ?? '';
  };

  const handleEjecChange = (mes, cat, value) => {
    setLocalEjec(prev => ({
      ...prev,
      [mes]: { ...(prev[mes] || {}), [cat]: value }
    }));
  };

  const handleEjecBlur = (mes, cat) => {
    if (!selectedProject) return;
    const existing = selectedProject.costos_ejecutados || {};
    const mesData = {
      personal:  parseFloat(getEjec(mes, 'personal'))  || 0,
      bienes:    parseFloat(getEjec(mes, 'bienes'))    || 0,
      servicios: parseFloat(getEjec(mes, 'servicios')) || 0,
    };
    // update with the latest change
    mesData[cat] = parseFloat(localEjec[mes]?.[cat]) || 0;
    const merged = { ...existing, [mes]: mesData };
    if (onSaveEjecutado) onSaveEjecutado(selectedProjectId, merged);
  };

  const ejec = (mes, cat) => parseFloat(getEjec(mes, cat)) || 0;
  const totEjec = {
    personal:  meses.reduce((s, mes) => s + ejec(mes, 'personal'), 0),
    bienes:    meses.reduce((s, mes) => s + ejec(mes, 'bienes'), 0),
    servicios: meses.reduce((s, mes) => s + ejec(mes, 'servicios'), 0),
    get total() { return this.personal + this.bienes + this.servicios; },
  };

  const fmt  = (v) => v > 0  ? `S/ ${v.toLocaleString('es-PE')}` : '—';
  const fmtE = (v) => v > 0  ? `S/ ${v.toLocaleString('es-PE')}` : '—';


  return (
    <div className="space-y-6">
      {/* Selector */}
      <div className="flex items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-navy-800">Cronograma</h3>
          <p className="text-slate-500 text-sm">Costos programados vs ejecutados por proyecto</p>
        </div>
        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-gray-100">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Proyecto:</label>
          <select
            className="p-3 bg-white border border-gray-100 rounded-xl font-bold text-navy-800 outline-none focus:ring-2 focus:ring-blue-500 min-w-[300px] shadow-sm cursor-pointer"
            value={selectedProjectId || ''}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            <option value="" disabled>Seleccione un proyecto...</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
      </div>

      {selectedProject ? (
        <>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <GanttChart projects={[selectedProject]} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Tabla header */}
            <div className="px-6 py-4 bg-navy-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Costos por Mes</h4>
                <p className="text-[10px] text-white/50 mt-0.5">Personal · Bienes · Servicios</p>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-bold">
                <span className="flex items-center gap-1.5 text-blue-300"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>Programado</span>
                <span className="flex items-center gap-1.5 text-emerald-300"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>Ejecutado</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-max">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50 min-w-[150px]">Categoría</th>
                    {meses.map(mes => (
                      <th key={mes} className="text-right px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{formatMesLabel(mes)}</th>
                    ))}
                    <th className="text-right px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest sticky right-0 bg-slate-50">Total</th>
                  </tr>
                </thead>
                <tbody>

                  {/* ── PROGRAMADO section ── */}
                  <tr className="bg-blue-50 border-y border-blue-100">
                    <td colSpan={meses.length + 2} className="px-5 py-1.5">
                      <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Programado</span>
                    </td>
                  </tr>

                  {[
                    { label: 'Personal',  key: 'personal',  color: 'blue'   },
                    { label: 'Bienes',    key: 'bienes',    color: 'sky'    },
                    { label: 'Servicios', key: 'servicios', color: 'indigo' },
                  ].map(({ label, key, color }) => (
                    <tr key={`prog-${key}`} className="border-b border-gray-50 hover:bg-slate-50/50">
                      <td className="px-5 py-2.5 sticky left-0 bg-white">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full bg-${color}-400 shrink-0`}></div>
                          <span className="text-xs font-medium text-slate-600">{label}</span>
                        </div>
                      </td>
                      {costosPorMes.map(({ mes, ...vals }) => (
                        <td key={mes} className={`px-4 py-2.5 text-right text-xs font-medium ${vals[key] > 0 ? `text-${color}-600` : 'text-slate-300'}`}>
                          {fmt(vals[key])}
                        </td>
                      ))}
                      <td className={`px-5 py-2.5 text-right text-xs font-bold text-${color}-600 sticky right-0 bg-white`}>{fmt(totProg[key])}</td>
                    </tr>
                  ))}

                  <tr className="bg-blue-600 border-b border-blue-700">
                    <td className="px-5 py-2.5 sticky left-0 bg-blue-600">
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">Total Prog.</span>
                    </td>
                    {costosPorMes.map(({ mes, total }) => (
                      <td key={mes} className={`px-4 py-2.5 text-right text-xs font-bold ${total > 0 ? 'text-white' : 'text-white/30'}`}>{fmt(total)}</td>
                    ))}
                    <td className="px-5 py-2.5 text-right text-xs font-bold text-white sticky right-0 bg-blue-600">{fmt(totProg.total)}</td>
                  </tr>

                  {/* ── EJECUTADO section ── */}
                  <tr className="bg-emerald-50 border-y border-emerald-100">
                    <td colSpan={meses.length + 2} className="px-5 py-1.5">
                      <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Ejecutado Real — edita cada celda</span>
                    </td>
                  </tr>

                  {[
                    { label: 'Personal',  cat: 'personal'  },
                    { label: 'Bienes',    cat: 'bienes'    },
                    { label: 'Servicios', cat: 'servicios' },
                  ].map(({ label, cat }) => (
                    <tr key={`ejec-${cat}`} className="border-b border-gray-50 bg-emerald-50/30">
                      <td className="px-5 py-2 sticky left-0 bg-emerald-50/40">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></div>
                          <span className="text-xs font-medium text-slate-600">{label}</span>
                        </div>
                      </td>
                      {meses.map(mes => (
                        <td key={mes} className="px-4 py-2 text-right">
                          <input
                            type="number"
                            min="0"
                            value={getEjec(mes, cat)}
                            onChange={(e) => handleEjecChange(mes, cat, e.target.value)}
                            onBlur={() => handleEjecBlur(mes, cat)}
                            placeholder="0"
                            className="w-full text-right bg-transparent border-b border-dashed border-emerald-300 focus:border-emerald-500 outline-none text-xs font-bold text-emerald-700 placeholder-slate-300 py-0.5"
                          />
                        </td>
                      ))}
                      <td className="px-5 py-2 text-right text-xs font-bold text-emerald-600 sticky right-0 bg-emerald-50/40">
                        {fmtE(totEjec[cat])}
                      </td>
                    </tr>
                  ))}

                  <tr className="bg-emerald-600">
                    <td className="px-5 py-2.5 sticky left-0 bg-emerald-600">
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">Total Ejec.</span>
                    </td>
                    {meses.map(mes => {
                      const t = ejec(mes,'personal') + ejec(mes,'bienes') + ejec(mes,'servicios');
                      return <td key={mes} className={`px-4 py-2.5 text-right text-xs font-bold ${t > 0 ? 'text-white' : 'text-white/30'}`}>{fmtE(t)}</td>;
                    })}
                    <td className="px-5 py-2.5 text-right text-xs font-bold text-white sticky right-0 bg-emerald-600">{fmtE(totEjec.total)}</td>
                  </tr>

                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="py-32 flex flex-col items-center justify-center text-center opacity-40 bg-white rounded-3xl border border-dashed border-gray-200">
          <Calendar size={64} className="text-slate-300 mb-6" />
          <h4 className="text-xl font-bold text-navy-800">Seleccione un proyecto</h4>
          <p className="text-sm text-slate-500">Para visualizar el cronograma y costos</p>
        </div>
      )}
    </div>
  );
};

function App() {
  const { user, loading: authLoading } = useAuth();
  const [collapsed, setCollapsed] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedProject, setSelectedProject] = React.useState(null);
  const [currentView, setCurrentView] = React.useState('proyectos');
  const [isLeadModalOpen, setIsLeadModalOpen] = React.useState(false);

  // Data State
  const [projects, setProjects] = React.useState([]);
  const [personnel, setPersonnel] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data: projectsData, error: pError } = await supabase.from('proyectos').select('*');
      const { data: personnelData, error: perError } = await supabase.from('personal').select('*');

      if (projectsData) setProjects(projectsData);
      if (personnelData) setPersonnel(personnelData);
    } catch (err) {
      console.error("Error al cargar datos:", err);
    } finally {
      if (!silent) setLoading(false);
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
      fetchData(true);
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
        fetchData(true);
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

      fetchData(true);
    } catch (err) {
      console.error("Error al crear subordinado:", err);
    }
  };

  const handleAddPersonnel = async (personData) => {
    try {
      const { error } = await supabase.from('personal').insert(personData);
      if (error) throw error;
      fetchData(true);
    } catch (err) {
      console.error("Error al añadir personal:", err);
    }
  };

  const handleDeletePersonnel = async (id) => {
    if (confirm("¿Está seguro de eliminar a este trabajador?")) {
      try {
        const { error } = await supabase.from('personal').delete().eq('id', id);
        if (error) throw error;
        fetchData(true);
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
        fetchData(true);
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
      fetchData(true);
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
      fetchData(true);
    } catch (err) {
      console.error("Error al asignar subordinado:", err);
    }
  };
  const handleUpdatePersonMeses = async (personId, mesesProyecto) => {
    try {
      const { error } = await supabase.from('personal').update({ meses_proyecto: mesesProyecto }).eq('id', personId);
      if (error) throw error;
      fetchData(true);
    } catch (err) {
      console.error("Error al actualizar meses:", err);
      alert(`Error al guardar meses: ${err.message}`);
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
      fetchData(true);
    } catch (err) {
      console.error("Error al actualizar dossier:", err);
    }
  };

  const handleSetFullDossier = async (projectId, newDossier) => {
    try {
      const { error } = await supabase.from('proyectos').update({ dossier: newDossier }).eq('id', projectId);
      if (error) throw error;
      fetchData(true);
    } catch (err) {
      console.error("Error al guardar dossier completo:", err);
    }
  };

  const handleSaveEjecutado = async (projectId, costos_ejecutados) => {
    try {
      const { error } = await supabase.from('proyectos').update({ costos_ejecutados }).eq('id', projectId);
      if (error) throw error;
      fetchData(true);
    } catch (err) {
      console.error("Error al guardar ejecutado:", err);
      alert(`Error al guardar ejecutado: ${err.message}`);
    }
  };

  const handleSaveFicha = async (projectId, data, columnName) => {
    try {
      const { error } = await supabase.from('proyectos').update({ [columnName]: data }).eq('id', projectId);
      if (error) throw error;
      fetchData(true);
    } catch (err) {
      console.error(`Error al guardar ${columnName}:`, err);
      alert(`Error al guardar: ${err.message}`);
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
            onUpdatePersonMeses={handleUpdatePersonMeses}
            isLeadModalOpen={isLeadModalOpen}
            setIsLeadModalOpen={setIsLeadModalOpen}
          />
        );
      case 'materiales':
        return (
          <MaterialesView
            projects={projects}
            fieldName="materiales_cronograma"
            title="Materiales"
            subtitle="Gestión de materiales por proyecto y mes"
            ViewIcon={Package}
            onSave={(id, data) => handleSaveFicha(id, data, 'materiales_cronograma')}
          />
        );
      case 'servicios':
        return (
          <MaterialesView
            projects={projects}
            fieldName="servicios_cronograma"
            title="Servicios"
            subtitle="Gestión de servicios por proyecto y mes"
            ViewIcon={Wrench}
            onSave={(id, data) => handleSaveFicha(id, data, 'servicios_cronograma')}
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
        return <CronogramaView projects={projects} personnel={personnel} onSaveEjecutado={handleSaveEjecutado} />;
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
