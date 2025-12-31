
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import Sidebar from '../components/Sidebar';

interface SettingsPageProps {
    user: User;
    onLogout: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user, onLogout }) => {
    const navigate = useNavigate();

    const settingsOptions = [
        {
            id: 'webhook-logs',
            title: 'Webhook Logs',
            description: 'Visualize e monitore todos os webhooks recebidos da Evolution API',
            icon: 'webhook',
            path: '/webhook-logs',
            badge: 'Admin',
            badgeColor: 'bg-primary/20 text-primary'
        },
        {
            id: 'notifications',
            title: 'Notificações',
            description: 'Configure alertas e notificações do sistema',
            icon: 'notifications',
            path: '/settings/notifications',
            badge: null,
            badgeColor: ''
        },
        {
            id: 'appearance',
            title: 'Aparência',
            description: 'Personalize o tema e layout da interface',
            icon: 'palette',
            path: '/settings/appearance',
            badge: null,
            badgeColor: ''
        },
        {
            id: 'integrations',
            title: 'Integrações',
            description: 'Gerencie conexões com serviços externos',
            icon: 'extension',
            path: '/settings/integrations',
            badge: null,
            badgeColor: ''
        }
    ];

    return (
        <div className="bg-background-dark text-white font-display overflow-hidden h-screen flex w-full">
            <Sidebar activeTab="settings" onLogout={onLogout} user={user} />

            <main className="flex-1 flex flex-col relative min-w-0 bg-background-dark overflow-hidden">
                {/* Header */}
                <header className="px-8 py-6 border-b border-border-dark bg-background-dark/95 backdrop-blur-sm z-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
                            <p className="text-text-muted text-sm mt-1">Gerencie as configurações do sistema</p>
                        </div>
                    </div>
                </header>

                {/* Settings Grid */}
                <div className="flex-1 overflow-auto px-8 py-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl">
                        {settingsOptions.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => navigate(option.path)}
                                className="group bg-surface-dark border border-border-dark rounded-2xl p-6 hover:border-primary/50 hover:bg-surface-hover transition-all text-left"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors flex-shrink-0">
                                        <span className="material-symbols-outlined text-2xl">{option.icon}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-lg font-bold text-white">{option.title}</h3>
                                            {option.badge && (
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${option.badgeColor}`}>
                                                    {option.badge}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-text-muted text-sm">{option.description}</p>
                                    </div>
                                    <span className="material-symbols-outlined text-text-muted group-hover:text-primary transition-colors">
                                        arrow_forward
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Info Card */}
                    <div className="mt-8 max-w-5xl">
                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
                            <div className="flex items-start gap-4">
                                <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                                    <span className="material-symbols-outlined text-xl">info</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-white mb-1">Acesso Administrativo</h4>
                                    <p className="text-text-muted text-sm">
                                        Algumas configurações estão disponíveis apenas para usuários com permissões de administrador.
                                        Entre em contato com o administrador do sistema se precisar de acesso adicional.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SettingsPage;
