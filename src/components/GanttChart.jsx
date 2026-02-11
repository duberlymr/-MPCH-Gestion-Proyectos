import { format, addDays, startOfMonth, endOfMonth, eachMonthOfInterval, eachWeekOfInterval, differenceInDays, parseISO, isValid, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

const GanttChart = ({ projects }) => {
    // 1. Calculate dynamic range
    const projectDates = projects.flatMap(p => {
        const start = p.inicio ? parseISO(p.inicio) : null;
        const end = p.fin ? parseISO(p.fin) : null;
        return [start, end].filter(d => isValid(d));
    });

    const now = new Date();
    let viewStart = startOfMonth(now);
    let viewEnd = addDays(viewStart, 60); // Default 2 months

    if (projectDates.length > 0) {
        viewStart = startOfMonth(new Date(Math.min(...projectDates)));
        viewEnd = endOfMonth(new Date(Math.max(...projectDates)));
    }

    const totalDays = differenceInDays(viewEnd, viewStart) + 1;
    const months = eachMonthOfInterval({ start: viewStart, end: viewEnd });
    const weeks = eachWeekOfInterval({ start: viewStart, end: viewEnd }, { weekStartsOn: 1 });

    return (
        <div className="overflow-x-auto custom-scrollbar pb-4">
            <div className="min-w-[1000px]">
                {/* Header Level 1 - Months */}
                <div className="flex border-b border-gray-100 mb-1">
                    <div className="w-48 flex-shrink-0"></div>
                    <div className="flex-1 flex">
                        {months.map((month, i) => {
                            const monthStart = i === 0 ? viewStart : startOfMonth(month);
                            const monthEnd = i === months.length - 1 ? viewEnd : endOfMonth(month);
                            const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
                            const width = (daysInMonth / totalDays) * 100;

                            return (
                                <div
                                    key={i}
                                    className="border-l border-gray-100 text-center py-2 text-[10px] font-bold text-navy-800 uppercase tracking-tighter"
                                    style={{ width: `${width}%` }}
                                >
                                    {format(month, 'MMMM yyyy', { locale: es })}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Header Level 2 - Weeks */}
                <div className="flex border-b border-gray-100 pb-2 mb-6">
                    <div className="w-48 flex-shrink-0 font-bold text-[10px] text-slate-400 uppercase tracking-widest flex items-end">Proyectos</div>
                    <div className="flex-1 flex">
                        {weeks.map((week, i) => {
                            const weekStart = i === 0 ? viewStart : startOfWeek(week, { weekStartsOn: 1 });
                            const weekEnd = i === weeks.length - 1 ? viewEnd : endOfWeek(week, { weekStartsOn: 1 });
                            const daysInWeek = differenceInDays(weekEnd, weekStart) + 1;
                            const width = (daysInWeek / totalDays) * 100;

                            return (
                                <div
                                    key={i}
                                    className="border-l border-gray-50 text-center text-[9px] text-slate-400"
                                    style={{ width: `${width}%` }}
                                >
                                    S{format(week, 'w')}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Project Rows */}
                <div className="space-y-5">
                    {projects.map((project) => {
                        const projectStart = project.inicio ? parseISO(project.inicio) : null;
                        const projectEnd = project.fin ? parseISO(project.fin) : null;

                        let left = 0;
                        let width = 0;

                        if (isValid(projectStart) && isValid(projectEnd)) {
                            const startDiff = differenceInDays(projectStart, viewStart);
                            left = Math.max(0, (startDiff / totalDays) * 100);

                            const duration = differenceInDays(projectEnd, projectStart) + 1;
                            width = Math.min(100 - left, (duration / totalDays) * 100);
                        }

                        return (
                            <div key={project.id} className="flex items-center group">
                                <div className="w-48 flex-shrink-0 pr-6">
                                    <p className="text-xs font-bold text-navy-800 truncate mb-0.5 group-hover:text-blue-600 transition-colors uppercase">
                                        {project.nombre}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className={`w-1.5 h-1.5 rounded-full ${project.estado === 'Finalizado' ? 'bg-green-400' :
                                            project.estado === 'Detenido' ? 'bg-red-400' : 'bg-blue-400'
                                            }`}></span>
                                        <p className="text-[9px] font-medium text-slate-400">{project.estado}</p>
                                    </div>
                                </div>
                                <div className="flex-1 h-9 bg-slate-50/50 rounded-xl relative border border-gray-50 overflow-hidden">
                                    {width > 0 && (
                                        <div
                                            className={`absolute h-full flex items-center px-4 transition-all duration-700 ease-out group-hover:brightness-110 shadow-sm
                        ${project.estado === 'Finalizado' ? 'bg-gradient-to-r from-green-400 to-green-500' :
                                                    project.estado === 'Detenido' ? 'bg-gradient-to-r from-red-400 to-red-500' :
                                                        'bg-gradient-to-r from-blue-500 to-indigo-600'}`}
                                            style={{
                                                left: `${left}%`,
                                                width: `${width}%`
                                            }}
                                        >
                                            <span className="text-[9px] font-bold text-white whitespace-nowrap overflow-hidden">
                                                {differenceInDays(projectEnd, projectStart) + 1} días
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default GanttChart;
