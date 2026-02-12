import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Layers, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error: loginError } = await login(email.trim(), password);
            if (loginError) throw loginError;
        } catch (err) {
            setError(err.message === 'Invalid login credentials'
                ? 'Credenciales inválidas. Por favor verifique su correo y contraseña.'
                : `Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a] p-6 relative overflow-hidden font-sans">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative z-10">
                    {/* Header */}
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-16 h-16 bg-blue-600 flex items-center justify-center rounded-2xl shadow-lg shadow-blue-500/30 mb-6">
                            <Layers size={32} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">ProjectHub</h1>
                        <p className="text-slate-400 text-sm text-center">Gestión Estratégica de Proyectos MPCH</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-100 text-xs animate-in slide-in-from-top-2">
                                <AlertCircle size={16} className="text-red-400 shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Correo Institucional</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 outline-none text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm"
                                    placeholder="usuario@mpch.gob.pe"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Contraseña</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 outline-none text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-3 group"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    <span>Iniciar Sesión</span>
                                    <Layers size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-10 pt-8 border-t border-white/5 text-center">
                        <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                            © 2026 MUNICIPALIDAD PROVINCIAL DE CHUMBIVILCAS
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
