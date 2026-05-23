/**
 * SYNAPSIX ERP — CalendarPage
 * Vista mensual con eventos. Crear, editar y eliminar.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, X, MapPin, Clock, Calendar, Loader2, AlertCircle, ArrowLeft, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import api from '@api/axios'
import useTenantStore from '@store/tenantStore'

const DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const EVENT_COLORS = ['#2980B9','#C0392B','#27AE60','#D35400','#8E44AD','#16A085','#F39C12','#7F8C8D']

function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push({ date: new Date(year, month, -firstDay + i + 1), current: false })
  for (let d = 1; d <= daysInMonth; d++) days.push({ date: new Date(year, month, d), current: true })
  while (days.length < 42) days.push({ date: new Date(year, month + 1, days.length - firstDay - daysInMonth + 1), current: false })
  return days
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function fmtDatetimeLocal(d = new Date()) {
  const pad = n => String(n).padStart(2,'0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function EventModal({ selectedDate, event, onClose, onSave, onDelete }) {
  const isEdit = !!event
  const base = selectedDate || new Date()
  const [form, setForm] = useState(event || {
    title: '', description: '', location: '',
    start_datetime: fmtDatetimeLocal(base),
    end_datetime: fmtDatetimeLocal(new Date(base.getTime() + 3600000)),
    all_day: false, color: '#2980B9',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const handleSave = async () => {
    if (!form.title.trim()) { setError('El título es requerido'); return }
    setLoading(true); setError(null)
    try {
      if (isEdit) { const r = await api.patch(`/core/events/${event.id}/`, form); onSave(r.data, true) }
      else { const r = await api.post('/core/events/', form); onSave(r.data, false) }
      onClose()
    } catch(e) { setError(e.response?.data?.detail || 'Error al guardar.') }
    finally { setLoading(false) }
  }

  const handleDelete = async () => {
    setLoading(true)
    try { await api.delete(`/core/events/${event.id}/`); onDelete(event.id); onClose() }
    catch { setError('Error al eliminar.') } finally { setLoading(false) }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4" onClick={e=>e.stopPropagation()}>
        <div className="bg-synapsix-surface border border-synapsix-border rounded-2xl shadow-spotlight overflow-hidden">
          <div className="px-5 py-4 border-b border-synapsix-border flex items-center justify-between" style={{borderLeftColor:form.color,borderLeftWidth:3}}>
            <span className="text-sm font-bold text-synapsix-text">{isEdit?'Editar evento':'Nuevo evento'}</span>
            <button onClick={onClose}><X className="w-4 h-4 text-synapsix-muted"/></button>
          </div>
          <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
            {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5"/>{error}</p>}
            <div className="space-y-1.5">
              <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Título *</label>
              <input autoFocus value={form.title} onChange={e=>set('title',e.target.value)} className="input-field" placeholder="Reunión de equipo..."/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Inicio</label>
                <input type={form.all_day?'date':'datetime-local'} value={form.start_datetime} onChange={e=>set('start_datetime',e.target.value)} className="input-field text-xs"/>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Fin</label>
                <input type={form.all_day?'date':'datetime-local'} value={form.end_datetime} onChange={e=>set('end_datetime',e.target.value)} className="input-field text-xs"/>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.all_day} onChange={e=>set('all_day',e.target.checked)} className="w-4 h-4 rounded"/>
              <span className="text-xs text-synapsix-text-2">Todo el día</span>
            </label>
            <div className="space-y-1.5">
              <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Lugar</label>
              <input value={form.location} onChange={e=>set('location',e.target.value)} className="input-field" placeholder="Sala de reuniones..."/>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Descripción</label>
              <textarea value={form.description} onChange={e=>set('description',e.target.value)} rows={2} className="input-field resize-none" placeholder="Detalles..."/>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Color</label>
              <div className="flex gap-2 flex-wrap">
                {EVENT_COLORS.map(c=>(
                  <button key={c} type="button" onClick={()=>set('color',c)}
                    className="w-7 h-7 rounded-lg transition-transform hover:scale-110 border-2"
                    style={{backgroundColor:c, borderColor:form.color===c?'white':'transparent', outline:form.color===c?`2px solid ${c}`:'none', outlineOffset:2}}/>
                ))}
              </div>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-synapsix-border flex items-center gap-2">
            {isEdit && <button onClick={handleDelete} disabled={loading} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-3 py-2 rounded-xl hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5"/>Eliminar</button>}
            <div className="flex-1"/>
            <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
            <button onClick={handleSave} disabled={loading} className="btn-primary text-sm gap-2">
              {loading?<Loader2 className="w-4 h-4 animate-spin"/>:<Calendar className="w-4 h-4"/>}
              {loading?'Guardando...':(isEdit?'Actualizar':'Crear')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default function CalendarPage() {
  const navigate = useNavigate()
  const { primaryColor } = useTenantStore()
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [events, setEvents]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [modalDate, setModalDate] = useState(null)
  const [editEvent, setEditEvent] = useState(null)

  const days = buildCalendarDays(year, month)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/core/events/?year=${year}&month=${month+1}`)
      setEvents(Array.isArray(res.data) ? res.data : res.data.results || [])
    } catch { setEvents([]) } finally { setLoading(false) }
  }, [year, month])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const prevMonth = () => month===0 ? (setMonth(11),setYear(y=>y-1)) : setMonth(m=>m-1)
  const nextMonth = () => month===11 ? (setMonth(0),setYear(y=>y+1)) : setMonth(m=>m+1)
  const getEventsForDay = (d) => events.filter(e => isSameDay(new Date(e.start_datetime), d))
  const handleSave = (ev, isEdit) => isEdit ? setEvents(p=>p.map(e=>e.id===ev.id?ev:e)) : setEvents(p=>[...p,ev])
  const handleDelete = (id) => setEvents(p=>p.filter(e=>e.id!==id))

  return (
    <div className="min-h-screen bg-synapsix-dark">
      <header className="border-b border-synapsix-border glass sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <button onClick={()=>navigate('/launchpad')} className="text-synapsix-muted hover:text-synapsix-text-2 transition-colors"><ArrowLeft className="w-5 h-5"/></button>
          <Calendar className="w-5 h-5" style={{color:primaryColor}}/>
          <h1 className="text-base font-bold text-synapsix-text flex-1">Calendario</h1>
          <button onClick={()=>setModalDate(today)} className="btn-primary gap-2 h-9 text-sm"><Plus className="w-4 h-4"/>Nuevo evento</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Nav */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={prevMonth} className="w-9 h-9 rounded-xl border border-synapsix-border hover:bg-synapsix-surface-2 flex items-center justify-center text-synapsix-muted transition-colors"><ChevronLeft className="w-4 h-4"/></button>
          <h2 className="text-xl font-bold text-synapsix-text min-w-[200px] text-center">{MONTHS[month]} {year}</h2>
          <button onClick={nextMonth} className="w-9 h-9 rounded-xl border border-synapsix-border hover:bg-synapsix-surface-2 flex items-center justify-center text-synapsix-muted transition-colors"><ChevronRight className="w-4 h-4"/></button>
          <button onClick={()=>{setYear(today.getFullYear());setMonth(today.getMonth())}} className="text-xs text-synapsix-muted border border-synapsix-border rounded-lg px-3 py-1.5 hover:bg-synapsix-surface-2 transition-colors">Hoy</button>
          {loading && <Loader2 className="w-4 h-4 text-synapsix-muted animate-spin"/>}
        </div>

        {/* Header de días */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d=><div key={d} className="text-center text-xs font-semibold text-synapsix-muted uppercase tracking-wider py-2">{d}</div>)}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 border-l border-t border-synapsix-border rounded-2xl overflow-hidden">
          {days.map(({date,current},i) => {
            const isToday = isSameDay(date,today)
            const dayEvts = getEventsForDay(date)
            return (
              <div key={i} onClick={()=>setModalDate(date)}
                className={clsx('min-h-[90px] p-2 border-r border-b border-synapsix-border cursor-pointer hover:bg-synapsix-surface-2 transition-colors',
                  !current&&'bg-synapsix-surface/30', current&&'bg-synapsix-surface')}>
                <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold mb-1',
                  isToday?'text-white':current?'text-synapsix-text-2':'text-synapsix-muted-2')}
                  style={isToday?{backgroundColor:primaryColor}:{}}>
                  {date.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayEvts.slice(0,3).map(ev=>(
                    <div key={ev.id} onClick={e=>{e.stopPropagation();setEditEvent(ev)}}
                      className="text-[10px] px-1.5 py-0.5 rounded-md truncate text-white font-medium cursor-pointer hover:opacity-80 transition-opacity"
                      style={{backgroundColor:ev.color}} title={ev.title}>{ev.title}</div>
                  ))}
                  {dayEvts.length>3&&<div className="text-[10px] text-synapsix-muted px-1.5">+{dayEvts.length-3} más</div>}
                </div>
              </div>
            )
          })}
        </div>

        {/* Lista de eventos del mes */}
        {events.length>0&&(
          <div className="mt-6 space-y-2">
            <h3 className="text-sm font-semibold text-synapsix-text-2 uppercase tracking-wider mb-3">Eventos de {MONTHS[month]}</h3>
            {events.map(ev=>(
              <div key={ev.id} onClick={()=>setEditEvent(ev)}
                className="flex items-center gap-3 glass rounded-xl px-4 py-3 cursor-pointer hover:bg-synapsix-surface-2 transition-colors">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{backgroundColor:ev.color}}/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-synapsix-text">{ev.title}</p>
                  {ev.location&&<p className="text-xs text-synapsix-muted flex items-center gap-1"><MapPin className="w-3 h-3"/>{ev.location}</p>}
                </div>
                <span className="text-xs text-synapsix-muted flex-shrink-0">
                  {new Date(ev.start_datetime).toLocaleDateString('es',{day:'numeric',month:'short'})}
                  {' · '}{ev.all_day?'Todo el día':new Date(ev.start_datetime).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>

      {modalDate&&!editEvent&&<EventModal selectedDate={modalDate} onClose={()=>setModalDate(null)} onSave={handleSave} onDelete={handleDelete}/>}
      {editEvent&&<EventModal event={editEvent} onClose={()=>setEditEvent(null)} onSave={handleSave} onDelete={handleDelete}/>}
    </div>
  )
}
