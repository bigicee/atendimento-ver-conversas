import React, { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'
import Sidebar from '../components/Sidebar'
import { User } from '../types'

interface WebhookLog {
    id: string
    event_type: string
    raw_payload: any
    remote_jid: string | null
    phone: string | null
    is_group: boolean
    push_name: string | null
    from_me: boolean
    conversation_id: string | null
    contact_id: string | null
    processing_status: 'pending' | 'success' | 'error'
    error_message: string | null
    created_at: string
}

interface WebhookLogsProps {
    user: User
    onLogout: () => void
}

export default function WebhookLogs({ user, onLogout }: WebhookLogsProps) {
    const [logs, setLogs] = useState<WebhookLog[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all')
    const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null)
    const [autoRefresh, setAutoRefresh] = useState(true)

    const fetchLogs = async () => {
        try {
            let query = supabase
                .from('webhook_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100)

            if (filter !== 'all') {
                query = query.eq('processing_status', filter)
            }

            const { data, error } = await query

            if (error) {
                console.error('Error fetching webhook logs:', error)
                return
            }

            setLogs(data || [])
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLogs()
    }, [filter])

    useEffect(() => {
        if (!autoRefresh) return

        const interval = setInterval(() => {
            fetchLogs()
        }, 5000) // Refresh every 5 seconds

        return () => clearInterval(interval)
    }, [autoRefresh, filter])

    const getStatusColor = (status: string) => {
        const colors = {
            pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
            success: 'bg-primary/20 text-primary border-primary/30',
            error: 'bg-red-500/20 text-red-400 border-red-500/30'
        }
        return colors[status as keyof typeof colors] || 'bg-surface-dark text-text-muted border-border-dark'
    }

    const getStatusIcon = (status: string) => {
        const icons = {
            pending: 'schedule',
            success: 'check_circle',
            error: 'error'
        }
        return icons[status as keyof typeof icons] || 'help'
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const seconds = Math.floor(diff / 1000)
        const minutes = Math.floor(seconds / 60)
        const hours = Math.floor(minutes / 60)

        if (seconds < 60) return `${seconds}s atrás`
        if (minutes < 60) return `${minutes}m atrás`
        if (hours < 24) return `${hours}h atrás`
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className="bg-background-dark text-white font-display overflow-hidden h-screen flex w-full">
            <Sidebar activeTab="settings" onLogout={onLogout} user={user} />

            <main className="flex-1 flex flex-col relative min-w-0 bg-background-dark overflow-hidden">
                {/* Header */}
                <header className="px-8 py-6 border-b border-border-dark bg-background-dark/95 backdrop-blur-sm z-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Webhook Logs</h1>
                            <p className="text-text-muted text-sm mt-1">Monitore webhooks recebidos da Evolution API</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    checked={autoRefresh}
                                    onChange={(e) => setAutoRefresh(e.target.checked)}
                                    className="rounded bg-surface-dark border-border-dark text-primary focus:ring-primary focus:ring-offset-0"
                                />
                                Auto-refresh (5s)
                            </label>
                            <button
                                onClick={fetchLogs}
                                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-background-dark rounded-full font-bold transition-all shadow-lg hover:shadow-primary/20"
                            >
                                <span className="material-symbols-outlined text-lg">refresh</span>
                                <span>Atualizar</span>
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2 mt-6">
                        <button
                            onClick={() => setFilter('all')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all ${filter === 'all'
                                ? 'bg-primary text-background-dark'
                                : 'bg-surface-dark text-text-muted hover:bg-surface-hover hover:text-white'
                                }`}
                        >
                            <span className="material-symbols-outlined text-lg">list</span>
                            Todos ({logs.length})
                        </button>
                        <button
                            onClick={() => setFilter('success')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all ${filter === 'success'
                                ? 'bg-primary text-background-dark'
                                : 'bg-surface-dark text-text-muted hover:bg-surface-hover hover:text-white'
                                }`}
                        >
                            <span className="material-symbols-outlined text-lg filled">check_circle</span>
                            Sucesso
                        </button>
                        <button
                            onClick={() => setFilter('error')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all ${filter === 'error'
                                ? 'bg-primary text-background-dark'
                                : 'bg-surface-dark text-text-muted hover:bg-surface-hover hover:text-white'
                                }`}
                        >
                            <span className="material-symbols-outlined text-lg filled">error</span>
                            Erros
                        </button>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex gap-6 p-8">
                    {/* Left: List */}
                    <div className="flex-1 overflow-auto space-y-3">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3">
                                <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                <p className="text-sm text-text-muted">Carregando logs...</p>
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="size-20 bg-surface-dark rounded-full flex items-center justify-center text-text-muted mb-4">
                                    <span className="material-symbols-outlined text-4xl">webhook</span>
                                </div>
                                <p className="text-text-muted font-semibold">Nenhum log encontrado</p>
                                <p className="text-text-muted/60 text-sm mt-1">Envie uma mensagem no WhatsApp para ver os logs aqui</p>
                            </div>
                        ) : (
                            logs.map((log) => (
                                <div
                                    key={log.id}
                                    onClick={() => setSelectedLog(log)}
                                    className={`bg-surface-dark border rounded-2xl p-4 cursor-pointer transition-all hover:bg-surface-hover ${selectedLog?.id === log.id
                                        ? 'border-primary shadow-lg shadow-primary/10'
                                        : 'border-border-dark'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`size-10 rounded-xl flex items-center justify-center border ${getStatusColor(log.processing_status)}`}>
                                                <span className="material-symbols-outlined filled">{getStatusIcon(log.processing_status)}</span>
                                            </div>
                                            <div>
                                                <div className="font-semibold text-white">{log.event_type}</div>
                                                <div className="text-xs text-text-muted">{formatDate(log.created_at)}</div>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(log.processing_status)}`}>
                                            {log.processing_status}
                                        </span>
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        {log.phone && (
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-text-muted text-lg">phone</span>
                                                <span className="font-mono text-white">{log.phone}</span>
                                                {log.is_group && (
                                                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs font-bold">
                                                        Grupo
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {log.push_name && (
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-text-muted text-lg">person</span>
                                                <span className="text-text-muted">{log.push_name}</span>
                                            </div>
                                        )}
                                        {log.error_message && (
                                            <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-start gap-2">
                                                <span className="material-symbols-outlined text-sm">warning</span>
                                                <span>{log.error_message}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Right: Details */}
                    <div className="w-1/2 overflow-auto">
                        {selectedLog ? (
                            <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 sticky top-0">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">info</span>
                                    Detalhes do Log
                                </h2>

                                <div className="space-y-6">
                                    {/* Metadata */}
                                    <div>
                                        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-lg">description</span>
                                            Metadata
                                        </h3>
                                        <div className="space-y-2 text-sm bg-background-dark rounded-xl p-4">
                                            <div className="flex justify-between">
                                                <span className="text-text-muted">ID:</span>
                                                <span className="font-mono text-xs text-white">{selectedLog.id.substring(0, 8)}...</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-text-muted">Evento:</span>
                                                <span className="font-medium text-white">{selectedLog.event_type}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-text-muted">Status:</span>
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(selectedLog.processing_status)}`}>
                                                    {selectedLog.processing_status}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-text-muted">De mim:</span>
                                                <span className="text-white">{selectedLog.from_me ? '✅ Sim' : '❌ Não'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-text-muted">Grupo:</span>
                                                <span className="text-white">{selectedLog.is_group ? '✅ Sim' : '❌ Não'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* IDs */}
                                    <div>
                                        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-lg">key</span>
                                            Identificadores
                                        </h3>
                                        <div className="space-y-3 text-sm bg-background-dark rounded-xl p-4">
                                            {selectedLog.conversation_id && (
                                                <div>
                                                    <span className="text-text-muted block mb-1">Conversation ID:</span>
                                                    <div className="font-mono text-xs text-primary bg-primary/10 p-2 rounded border border-primary/20 break-all">
                                                        {selectedLog.conversation_id}
                                                    </div>
                                                </div>
                                            )}
                                            {selectedLog.contact_id && (
                                                <div>
                                                    <span className="text-text-muted block mb-1">Contact ID:</span>
                                                    <div className="font-mono text-xs text-primary bg-primary/10 p-2 rounded border border-primary/20 break-all">
                                                        {selectedLog.contact_id}
                                                    </div>
                                                </div>
                                            )}
                                            {selectedLog.remote_jid && (
                                                <div>
                                                    <span className="text-text-muted block mb-1">Remote JID:</span>
                                                    <div className="font-mono text-xs text-white bg-surface-hover p-2 rounded border border-border-dark break-all">
                                                        {selectedLog.remote_jid}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Raw Payload */}
                                    <div>
                                        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-lg">code</span>
                                            Raw Payload
                                        </h3>
                                        <pre className="bg-[#0d1117] text-primary p-4 rounded-xl text-xs overflow-auto max-h-96 font-mono border border-border-dark">
                                            {JSON.stringify(selectedLog.raw_payload, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-surface-dark border border-border-dark rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center">
                                <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                                    <span className="material-symbols-outlined text-3xl">touch_app</span>
                                </div>
                                <p className="text-text-muted font-semibold">Selecione um log</p>
                                <p className="text-text-muted/60 text-sm mt-1">Clique em um log à esquerda para ver os detalhes</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
