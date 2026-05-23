import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckSquare, Calendar, Clock, Users, ArrowLeft,
  Plus, ChevronRight, TrendingUp, Zap, AlertCircle,
  Loader2, MapPin, Flag, Circle, LayoutDashboard,
  RefreshCw, Flame, Target,
} from 'lucide-react'
import clsx from 'clsx'
import api from '@api/axios'
import { useAuth } from '@hooks/useAuth'
import useTenantStore from '@store/tenantStore'
import useSettingsStore from '@store/settingsStore'

// Mock data para cuando el backend no tiene el endpoint aún
const MOCK_DATA = {
  task_stats:      { todo: 3, in_progress: 2, done: 8, total: 13 },
  week_hours:      24.5,
  hours_by_day:    [
    { date: new Date(Date.now() - 86400000*4).toISOString().split('T')[0], hours: 6 },
    { date: new Date(Date.now() - 86400000*3).toISOString().split('T')[0], hours: 7 },
    { date: new Date(Date.now() - 86400000*2).toISOString().split('T')[0], hours: 5 },
    { date: new Date(Date.now() - 86400000*1).toISOString().split('T')[0], hours: 4 },
    { date: new Date().toISOString().split('T')[0], hours: 2.5 },
  ],
  week_start: new Date(Date.now() - 86400000*6).toISOString().split('T')[0],
  week_end:   new Date(Date.now() + 86400000).toISOString().split('T')[0],
  team_count:      5,
  today_events:    [],
  upcoming_events: [],
  my_tasks:        [
    { id: 1, title: 'Revisar inventario inicial',   status: 'todo',        priority: 'high',   due_date: new Date(Date.now() + 86400000*2).toISOString().split('T')[0] },
    { id: 2, title: 'Configurar módulos activos',   status: 'in_progress', priority: 'urgent', due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0] },
    { id: 3, title: 'Agregar usuarios al sistema',  status: 'todo',        priority: 'medium', due_date: null },
  ],
}


// ─── Helpers ─────────────────────────────────────────────────────────────────
const PRIORITY_COLOR = {
  low: '#27AE60', medium: '#F39C12', high: '#E67E22', urgent: '#C0392B',
}
const DAYS_ES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

function greeting(name) {
  const h = new Date().getHours()
  const g = h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches'
  return `${g}, ${name || 'bienvenido'} 👋`
}

function fmtTime(dt) {
  return new Date(dt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}
function fmtDate(dt) {
  return new Date(dt).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, onClick, delay = 0 }) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'glass rounded-2xl border border-synapsix-border p-5 flex flex-col gap-3 animate-slide-in-up',
        onClick && 'cursor-pointer hover:border-synapsix-border-2 hover:scale-[1.01] transition-all duration-200'
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}18`, border: `1.5px solid ${color}30` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {onClick && <ChevronRight className="w-4 h-4 text-synapsix-border-2" />}
      </div>
      <div>
        <p className="text-2xl font-black text-synapsix-text">{value}</p>
        <p className="text-xs font-semibold text-synapsix-muted uppercase tracking-wider">{label}</p>
        {sub && <p className="text-[10px] text-synapsix-muted-2 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Barra horizontal de progreso de tareas ──────────────────────────────────
function TaskProgressBar({ stats }) {
  const total = stats.total || 1
  return (
    <div className="space-y-2">
      <div className="h-2.5 rounded-full overflow-hidden bg-synapsix-surface-3 flex">
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${(stats.done / total) * 100}%`, backgroundColor: '#27AE60' }}
        />
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${(stats.in_progress / total) * 100}%`, backgroundColor: '#F39C12' }}
        />
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${(stats.todo / total) * 100}%`, backgroundColor: '#7F8C8D' }}
        />
      </div>
      <div className="flex items-center gap-4 text-[10px] text-synapsix-muted">
        {[
          { label: 'Completado', count: stats.done,        color: '#27AE60' },
          { label: 'En progreso', count: stats.in_progress, color: '#F39C12' },
          { label: 'Por hacer',  count: stats.todo,         color: '#7F8C8D' },
        ].map(({ label, count, color }) => (
          <span key={label} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            {label}: <strong className="text-synapsix-text-2">{count}</strong>
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Mini gráfico de horas (barras CSS) ──────────────────────────────────────
function WeekHoursChart({ hoursByDay, weekStart }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const entry = hoursByDay.find(h => h.date === dateStr)
    const isToday = dateStr === new Date().toISOString().split('T')[0]
    return { day: DAYS_ES[d.getDay()], hours: entry?.hours || 0, isToday, dateStr }
  })
  const maxHours = Math.max(...days.map(d => d.hours), 8)

  return (
    <div className="flex items-end gap-1.5 h-24">
      {days.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t-lg transition-all duration-700 min-h-[2px]"
            style={{
              height: `${Math.max((d.hours / maxHours) * 80, d.hours > 0 ? 4 : 2)}px`,
              backgroundColor: d.isToday ? '#C0392B' : d.hours > 0 ? '#2980B9' : '#2a2a3a',
              opacity: d.hours > 0 ? 1 : 0.4,
            }}
            title={`${d.day}: ${d.hours}h`}
          />
          <span className={clsx('text-[9px] font-medium', d.isToday ? 'text-synapsix-red' : 'text-synapsix-muted-2')}>
            {d.day}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Tarjeta de Tarea ─────────────────────────────────────────────────────────
function TaskCard({ task, onStatusChange }) {
  const p = PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.medium
  const isDone = task.status === 'done'

  return (
    <div className={clsx(
      'flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 group',
      isDone ? 'opacity-60 border-synapsix-border' : 'border-synapsix-border hover:border-synapsix-border-2 hover:bg-synapsix-surface-2'
    )}>
      <button
        onClick={() => onStatusChange(task.id, isDone ? 'todo' : 'done')}
        className={clsx(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all',
          isDone ? 'bg-emerald-500 border-emerald-500' : 'border-synapsix-border-2 hover:border-emerald-500'
        )}
      >
        {isDone && <span className="text-white text-[10px]">✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm font-medium leading-tight', isDone ? 'line-through text-synapsix-muted' : 'text-synapsix-text')}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full border font-semibold"
            style={{ color: p, borderColor: `${p}40`, backgroundColor: `${p}15` }}>
            <Flag className="w-2.5 h-2.5 inline mr-0.5" />
            {task.priority}
          </span>
          {task.due_date && (
            <span className="text-[10px] text-synapsix-muted flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {new Date(task.due_date + 'T12:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Evento del día ───────────────────────────────────────────────────────────
function EventItem({ event }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-synapsix-border last:border-0">
      <div
        className="w-1 self-stretch rounded-full flex-shrink-0"
        style={{ backgroundColor: event.color, minHeight: 36 }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-synapsix-text leading-tight">{event.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-synapsix-muted flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            {event.all_day ? 'Todo el día' : fmtTime(event.start_datetime)}
            {!event.all_day && ` – ${fmtTime(event.end_datetime)}`}
          </span>
          {event.location && (
            <span className="text-[10px] text-synapsix-muted flex items-center gap-0.5 truncate">
              <MapPin className="w-2.5 h-2.5 flex-shrink-0" />{event.location}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { primaryColor } = useTenantStore()
  const { getBackgroundStyle } = useSettingsStore()

  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [usingMock, setUsingMock] = useState(false)
  const [tasks, setTasks]     = useState([])

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/core/dashboard/')
      setData(res.data)
      setTasks(res.data.my_tasks || [])
      setUsingMock(false)
    } catch {
      // Si el endpoint no existe aún, usamos datos demo
      setData(MOCK_DATA)
      setTasks(MOCK_DATA.my_tasks)
      setUsingMock(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  const handleStatusChange = async (taskId, newStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    try {
      await api.patch(`/core/tasks/${taskId}/`, { status: newStatus })
    } catch {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: t.status === 'done' ? 'todo' : 'done' } : t))
    }
  }

  const today = new Date()
  const dateStr = today.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const completionRate = data?.task_stats?.total > 0
    ? Math.round((data.task_stats.done / data.task_stats.total) * 100)
    : 0

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: getBackgroundStyle() }}>
      <div className="text-center space-y-3">
        <Loader2 className="w-10 h-10 text-synapsix-muted animate-spin mx-auto" />
        <p className="text-synapsix-muted text-sm">Cargando dashboard...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: getBackgroundStyle() }}>
      {/* Mock banner */}
      {usingMock && (
        <div className="bg-yellow-500/15 border-b border-yellow-500/30 px-4 py-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <p className="text-xs text-yellow-300">Mostrando datos de ejemplo — el endpoint <code>/core/dashboard/</code> aún no está disponible.</p>
        </div>
      )}
      {/* Header */}
      <header className="border-b border-synapsix-border glass sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <button onClick={() => navigate('/launchpad')} className="text-synapsix-muted hover:text-synapsix-text-2 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <LayoutDashboard className="w-5 h-5" style={{ color: primaryColor }} />
          <h1 className="text-base font-bold text-synapsix-text flex-1">Dashboard</h1>
          <button onClick={fetchDashboard} title="Actualizar" className="text-synapsix-muted hover:text-synapsix-text-2 transition-colors p-2 rounded-lg hover:bg-synapsix-surface-2">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Bienvenida ── */}
        <div className="flex items-start justify-between flex-wrap gap-4 animate-fade-in">
          <div>
            <h2 className="text-3xl font-black text-gradient">{greeting(user?.first_name)}</h2>
            <p className="text-synapsix-muted text-sm capitalize mt-1">{dateStr}</p>
          </div>

          {/* Acciones rápidas */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { label: 'Nueva tarea',  icon: CheckSquare, route: '/tareas',      color: '#F39C12' },
              { label: 'Nuevo evento', icon: Calendar,    route: '/calendario',  color: '#2980B9' },
              { label: 'Registrar hora', icon: Clock,     route: '/hoja-horas',  color: '#27AE60' },
            ].map(({ label, icon: Icon, route, color }) => (
              <button
                key={label}
                onClick={() => navigate(route)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-synapsix-border hover:border-synapsix-border-2 bg-synapsix-surface hover:bg-synapsix-surface-2 transition-all text-sm text-synapsix-text-2 hover:text-synapsix-text"
              >
                <Icon className="w-3.5 h-3.5" style={{ color }} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={CheckSquare} label="Tareas Activas" color="#F39C12"
            value={data.task_stats.todo + data.task_stats.in_progress}
            sub={`${data.task_stats.done} completadas`}
            onClick={() => navigate('/tareas')} delay={0}
          />
          <StatCard
            icon={Target} label="Completadas" color="#27AE60"
            value={`${completionRate}%`}
            sub={`${data.task_stats.done} de ${data.task_stats.total}`}
            delay={60}
          />
          <StatCard
            icon={Clock} label="Horas esta semana" color="#2980B9"
            value={data.week_hours.toFixed(1) + 'h'}
            sub={`${(data.week_hours / 5).toFixed(1)}h promedio/día`}
            onClick={() => navigate('/hoja-horas')} delay={120}
          />
          <StatCard
            icon={Users} label="Equipo activo" color="#8E44AD"
            value={data.team_count}
            sub="usuarios en la empresa"
            delay={180}
          />
        </div>

        {/* ── Grid principal ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ─ Mis tareas (2/3) */}
          <div className="lg:col-span-2 space-y-4">

            {/* Progreso general de tareas */}
            <div className="glass rounded-2xl border border-synapsix-border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-synapsix-red" />
                  <h3 className="text-sm font-bold text-synapsix-text">Progreso de Tareas</h3>
                </div>
                <button onClick={() => navigate('/tareas')} className="text-xs text-synapsix-muted hover:text-synapsix-text-2 flex items-center gap-1 transition-colors">
                  Ver todas <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <TaskProgressBar stats={data.task_stats} />
            </div>

            {/* Lista de mis tareas */}
            <div className="glass rounded-2xl border border-synapsix-border p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-synapsix-muted" />
                  <h3 className="text-sm font-bold text-synapsix-text">Mis Tareas Pendientes</h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-synapsix-surface-3 border border-synapsix-border text-synapsix-muted">
                    {tasks.filter(t => t.status !== 'done').length}
                  </span>
                </div>
                <button
                  onClick={() => navigate('/tareas')}
                  className="flex items-center gap-1.5 text-xs btn-primary h-7 px-3"
                >
                  <Plus className="w-3.5 h-3.5" /> Nueva
                </button>
              </div>

              {tasks.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckSquare className="w-10 h-10 text-synapsix-muted opacity-20 mx-auto mb-2" />
                  <p className="text-sm text-synapsix-muted">¡Sin tareas pendientes! 🎉</p>
                  <button onClick={() => navigate('/tareas')} className="mt-3 text-xs btn-secondary">
                    Ir a Tareas
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {tasks.map(task => (
                    <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} />
                  ))}
                </div>
              )}
            </div>

            {/* Horas de la semana */}
            <div className="glass rounded-2xl border border-synapsix-border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-synapsix-text">Horas — Semana actual</h3>
                </div>
                <button onClick={() => navigate('/hoja-horas')} className="text-xs text-synapsix-muted hover:text-synapsix-text-2 flex items-center gap-1 transition-colors">
                  Ver detalle <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <WeekHoursChart hoursByDay={data.hours_by_day} weekStart={data.week_start} />

              <div className="flex items-center justify-between text-xs pt-1 border-t border-synapsix-border">
                <span className="text-synapsix-muted">
                  {new Date(data.week_start + 'T12:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                  {' → '}
                  {new Date(data.week_end + 'T12:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                </span>
                <span className="font-bold text-synapsix-text">{data.week_hours.toFixed(1)}h total</span>
              </div>
            </div>
          </div>

          {/* ─ Agenda del día (1/3) */}
          <div className="space-y-4">

            {/* Hoy */}
            <div className="glass rounded-2xl border border-synapsix-border p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <h3 className="text-sm font-bold text-synapsix-text">Hoy</h3>
                </div>
                <button
                  onClick={() => navigate('/calendario')}
                  className="flex items-center gap-1.5 text-xs btn-primary h-7 px-3"
                >
                  <Plus className="w-3.5 h-3.5" /> Evento
                </button>
              </div>

              {data.today_events.length === 0 ? (
                <div className="py-6 text-center">
                  <Calendar className="w-8 h-8 text-synapsix-muted opacity-20 mx-auto mb-2" />
                  <p className="text-xs text-synapsix-muted">Sin eventos hoy</p>
                </div>
              ) : (
                <div>
                  {data.today_events.map(ev => <EventItem key={ev.id} event={ev} />)}
                </div>
              )}
            </div>

            {/* Próximos */}
            {data.upcoming_events.length > 0 && (
              <div className="glass rounded-2xl border border-synapsix-border p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-synapsix-muted" />
                  <h3 className="text-sm font-bold text-synapsix-text">Próximos 7 días</h3>
                </div>
                <div className="space-y-2">
                  {data.upcoming_events.map(ev => (
                    <div key={ev.id} className="flex items-center gap-3 py-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ev.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-synapsix-text truncate">{ev.title}</p>
                        <p className="text-[10px] text-synapsix-muted">{fmtDate(ev.start_datetime)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate('/calendario')} className="text-xs text-synapsix-muted hover:text-synapsix-text-2 flex items-center gap-1 transition-colors w-full justify-center py-1">
                  Ver calendario completo <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Módulos rápidos */}
            <div className="glass rounded-2xl border border-synapsix-border p-5 space-y-2">
              <h3 className="text-sm font-bold text-synapsix-text mb-3">Ir a módulo</h3>
              {[
                { label: 'Calendario',    route: '/calendario', icon: Calendar,    color: '#2980B9' },
                { label: 'Tareas',        route: '/tareas',     icon: CheckSquare, color: '#F39C12' },
                { label: 'Hoja de Horas', route: '/hoja-horas', icon: Clock,       color: '#27AE60' },
              ].map(({ label, route, icon: Icon, color }) => (
                <button
                  key={route}
                  onClick={() => navigate(route)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-synapsix-surface-2 transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <span className="text-sm font-medium text-synapsix-text-2 group-hover:text-synapsix-text transition-colors flex-1">
                    {label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-synapsix-border-2 group-hover:text-synapsix-muted transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
