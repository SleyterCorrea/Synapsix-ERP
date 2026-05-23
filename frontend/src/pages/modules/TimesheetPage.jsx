/**
 * SYNAPSIX ERP — TimesheetPage (Hoja de Horas)
 * Registro de horas por semana. Grid Lun-Dom con entradas de tiempo.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, ChevronLeft, ChevronRight, Plus, Trash2,
         Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import api from '@api/axios'
import useTenantStore from '@store/tenantStore'

const DAY_NAMES = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']

// Obtiene el lunes de la semana de una fecha
function getMonday(d = new Date()) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - (day === 0 ? 6 : day - 1)
  return new Date(date.setDate(diff))
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function fmt(date) {
  const pad = n => String(n).padStart(2,'0')
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`
}

function fmtShort(date) {
  return date.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function TimesheetPage() {
  const navigate = useNavigate()
  const { primaryColor } = useTenantStore()
  const today = new Date()

  const [weekStart, setWeekStart] = useState(getMonday(today))
  const [entries, setEntries]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState({})
  const [success, setSuccess]     = useState(null)

  // Los 7 días de la semana activa
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekEnd  = weekDays[6]

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/core/timesheets/?week_start=${fmt(weekStart)}&week_end=${fmt(weekEnd)}`)
      setEntries(Array.isArray(res.data) ? res.data : res.data.results || [])
    } catch { setEntries([]) }
    finally { setLoading(false) }
  }, [weekStart])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const prevWeek = () => setWeekStart(d => addDays(d, -7))
  const nextWeek = () => setWeekStart(d => addDays(d, 7))
  const goToday  = () => setWeekStart(getMonday(today))

  const isCurrentWeek = fmt(weekStart) === fmt(getMonday(today))

  // Entradas de un día específico
  const getEntriesForDay = (date) => entries.filter(e => e.date === fmt(date))

  // Total de horas en la semana
  const totalHours = entries.reduce((sum, e) => sum + parseFloat(e.hours || 0), 0)

  // Agrega entrada local temporal para la UI
  const [newEntry, setNewEntry] = useState({ date: fmt(today), hours: '', description: '' })

  const handleAdd = async (date) => {
    const entry = { ...newEntry, date: fmt(date) }
    if (!entry.description.trim() || !entry.hours) return
    setSaving(s => ({ ...s, [fmt(date)]: true }))
    try {
      const res = await api.post('/core/timesheets/', {
        date: entry.date,
        hours: parseFloat(entry.hours),
        description: entry.description.trim(),
      })
      setEntries(prev => [...prev, res.data])
      setNewEntry(n => ({ ...n, hours: '', description: '' }))
      setSuccess('Entrada registrada')
      setTimeout(() => setSuccess(null), 2000)
    } catch(e) {
      console.error(e)
    } finally {
      setSaving(s => ({ ...s, [fmt(date)]: false }))
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/core/timesheets/${id}/`)
      setEntries(prev => prev.filter(e => e.id !== id))
    } catch {}
  }

  return (
    <div className="min-h-screen bg-synapsix-dark">
      {/* Header */}
      <header className="border-b border-synapsix-border glass sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <button onClick={()=>navigate('/launchpad')} className="text-synapsix-muted hover:text-synapsix-text-2 transition-colors"><ArrowLeft className="w-5 h-5"/></button>
          <Clock className="w-5 h-5" style={{color:primaryColor}}/>
          <h1 className="text-base font-bold text-synapsix-text flex-1">Hoja de Horas</h1>
          {success&&(
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 animate-fade-in">
              <CheckCircle className="w-3.5 h-3.5"/>{success}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Navegación de semana */}
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={prevWeek} className="w-9 h-9 rounded-xl border border-synapsix-border hover:bg-synapsix-surface-2 flex items-center justify-center text-synapsix-muted transition-colors">
            <ChevronLeft className="w-4 h-4"/>
          </button>
          <div className="text-center">
            <p className="text-base font-bold text-synapsix-text">
              {weekStart.toLocaleDateString('es',{day:'numeric',month:'long'})} — {weekEnd.toLocaleDateString('es',{day:'numeric',month:'long',year:'numeric'})}
            </p>
            {isCurrentWeek&&<p className="text-xs text-synapsix-muted">Semana actual</p>}
          </div>
          <button onClick={nextWeek} className="w-9 h-9 rounded-xl border border-synapsix-border hover:bg-synapsix-surface-2 flex items-center justify-center text-synapsix-muted transition-colors">
            <ChevronRight className="w-4 h-4"/>
          </button>
          {!isCurrentWeek&&(
            <button onClick={goToday} className="text-xs text-synapsix-muted border border-synapsix-border rounded-lg px-3 py-1.5 hover:bg-synapsix-surface-2 transition-colors">
              Esta semana
            </button>
          )}

          {/* Total horas */}
          <div className="ml-auto glass rounded-xl px-5 py-2 flex items-center gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-synapsix-text">{totalHours.toFixed(1)}</p>
              <p className="text-[10px] text-synapsix-muted uppercase tracking-wider">horas</p>
            </div>
            <div className="w-px h-8 bg-synapsix-border"/>
            <div className="text-center">
              <p className="text-sm font-semibold text-synapsix-text-2">{(totalHours/7).toFixed(1)}</p>
              <p className="text-[10px] text-synapsix-muted uppercase tracking-wider">por día</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-synapsix-muted animate-spin"/></div>
        ) : (
          <div className="grid gap-3">
            {weekDays.map((day, i) => {
              const dayStr = fmt(day)
              const dayEntries = getEntriesForDay(day)
              const dayTotal = dayEntries.reduce((s,e)=>s+parseFloat(e.hours||0),0)
              const isToday = dayStr === fmt(today)
              const isWeekend = i >= 5
              const isSavingDay = saving[dayStr]

              return (
                <div key={dayStr}
                  className={clsx(
                    'glass rounded-2xl border overflow-hidden transition-all',
                    isToday ? 'border-synapsix-red/40' : 'border-synapsix-border',
                    isWeekend && 'opacity-70'
                  )}
                >
                  {/* Header del día */}
                  <div className={clsx(
                    'px-4 py-3 flex items-center justify-between border-b border-synapsix-border',
                    isToday ? 'bg-synapsix-red/5' : 'bg-synapsix-surface-2'
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        'w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold',
                        isToday ? 'text-white' : 'text-synapsix-muted bg-synapsix-surface-3'
                      )} style={isToday ? {backgroundColor: primaryColor} : {}}>
                        {day.getDate()}
                      </div>
                      <div>
                        <p className={clsx('text-sm font-semibold', isToday ? 'text-synapsix-text' : 'text-synapsix-text-2')}>
                          {DAY_NAMES[i]}
                        </p>
                        <p className="text-xs text-synapsix-muted">
                          {day.toLocaleDateString('es',{day:'numeric',month:'short'})}
                        </p>
                      </div>
                    </div>
                    {dayTotal > 0 && (
                      <div className="flex items-center gap-1.5 text-sm font-bold" style={{color:primaryColor}}>
                        <Clock className="w-3.5 h-3.5"/>{dayTotal.toFixed(1)}h
                      </div>
                    )}
                  </div>

                  {/* Entradas del día */}
                  <div className="p-4 space-y-2">
                    {dayEntries.map(entry => (
                      <div key={entry.id} className="flex items-center gap-3 group bg-synapsix-surface-2 rounded-xl px-3 py-2">
                        <div className="w-12 text-center flex-shrink-0">
                          <span className="text-sm font-bold text-synapsix-text">{parseFloat(entry.hours).toFixed(1)}</span>
                          <span className="text-[10px] text-synapsix-muted block">h</span>
                        </div>
                        <p className="flex-1 text-sm text-synapsix-text-2 truncate">{entry.description}</p>
                        {entry.task_title && (
                          <span className="text-[10px] text-synapsix-muted bg-synapsix-surface-3 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                            {entry.task_title}
                          </span>
                        )}
                        <button onClick={()=>handleDelete(entry.id)}
                          className="opacity-0 group-hover:opacity-100 text-synapsix-muted hover:text-red-400 transition-all">
                          <Trash2 className="w-3.5 h-3.5"/>
                        </button>
                      </div>
                    ))}

                    {/* Formulario de nueva entrada */}
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="number" min="0.5" max="24" step="0.5"
                        placeholder="h"
                        value={newEntry.date === dayStr ? newEntry.hours : ''}
                        onChange={e => setNewEntry({date: dayStr, hours: e.target.value, description: newEntry.date===dayStr?newEntry.description:''})}
                        onClick={() => setNewEntry(n => ({...n, date: dayStr}))}
                        className="input-field w-16 text-sm text-center flex-shrink-0"
                      />
                      <input
                        type="text"
                        placeholder="¿Qué trabajaste hoy?"
                        value={newEntry.date === dayStr ? newEntry.description : ''}
                        onChange={e => setNewEntry({date: dayStr, hours: newEntry.date===dayStr?newEntry.hours:'', description: e.target.value})}
                        onClick={() => setNewEntry(n => ({...n, date: dayStr}))}
                        onKeyDown={e => e.key==='Enter' && handleAdd(day)}
                        className="input-field flex-1 text-sm"
                      />
                      <button
                        onClick={() => handleAdd(day)}
                        disabled={isSavingDay || !newEntry.hours || !newEntry.description || newEntry.date!==dayStr}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-3 transition-colors disabled:opacity-30"
                      >
                        {isSavingDay ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
