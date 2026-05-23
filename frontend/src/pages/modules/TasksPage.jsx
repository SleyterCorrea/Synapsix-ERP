/**
 * SYNAPSIX ERP — TasksPage (Kanban)
 * Tablero con columnas: Por hacer / En progreso / Completado.
 * Drag & drop entre columnas, crear y eliminar tareas.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, X, CheckSquare, Loader2, AlertCircle, Trash2,
         Flag, Calendar, User, MoreVertical, GripVertical } from 'lucide-react'
import clsx from 'clsx'
import api from '@api/axios'
import useTenantStore from '@store/tenantStore'

const COLUMNS = [
  { id: 'todo',        label: 'Por hacer',    color: '#7F8C8D', bgClass: 'bg-slate-500/10 border-slate-500/20' },
  { id: 'in_progress', label: 'En progreso',  color: '#F39C12', bgClass: 'bg-amber-500/10 border-amber-500/20' },
  { id: 'done',        label: 'Completado',   color: '#27AE60', bgClass: 'bg-emerald-500/10 border-emerald-500/20' },
]

const PRIORITY_MAP = {
  low:    { label: 'Baja',    color: '#27AE60' },
  medium: { label: 'Media',   color: '#F39C12' },
  high:   { label: 'Alta',    color: '#E67E22' },
  urgent: { label: 'Urgente', color: '#C0392B' },
}

function TaskModal({ task, defaultStatus, onClose, onSave, onDelete }) {
  const isEdit = !!task
  const [form, setForm] = useState(task || {
    title: '', description: '', status: defaultStatus || 'todo',
    priority: 'medium', due_date: '', assigned_to_id: null,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const handleSave = async () => {
    if (!form.title.trim()) { setError('El título es requerido'); return }
    setLoading(true); setError(null)
    try {
      const payload = { ...form, assigned_to_id: form.assigned_to_id || null }
      if (isEdit) { const r = await api.patch(`/core/tasks/${task.id}/`, payload); onSave(r.data, true) }
      else { const r = await api.post('/core/tasks/', payload); onSave(r.data, false) }
      onClose()
    } catch(e) { setError(e.response?.data?.detail || JSON.stringify(e.response?.data) || 'Error al guardar.') }
    finally { setLoading(false) }
  }

  const handleDelete = async () => {
    setLoading(true)
    try { await api.delete(`/core/tasks/${task.id}/`); onDelete(task.id); onClose() }
    catch { setError('Error al eliminar.') } finally { setLoading(false) }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose}/>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4" onClick={e=>e.stopPropagation()}>
        <div className="bg-synapsix-surface border border-synapsix-border rounded-2xl shadow-spotlight overflow-hidden">
          <div className="px-5 py-4 border-b border-synapsix-border flex items-center justify-between">
            <span className="text-sm font-bold text-synapsix-text">{isEdit?'Editar tarea':'Nueva tarea'}</span>
            <button onClick={onClose}><X className="w-4 h-4 text-synapsix-muted"/></button>
          </div>
          <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
            {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0"/>{error}</p>}

            <div className="space-y-1.5">
              <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Título *</label>
              <input autoFocus value={form.title} onChange={e=>set('title',e.target.value)} className="input-field" placeholder="Nombre de la tarea..."/>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Descripción</label>
              <textarea value={form.description} onChange={e=>set('description',e.target.value)} rows={2} className="input-field resize-none" placeholder="Detalles de la tarea..."/>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Estado</label>
                <select value={form.status} onChange={e=>set('status',e.target.value)}
                  className="input-field text-sm">
                  {COLUMNS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Prioridad</label>
                <select value={form.priority} onChange={e=>set('priority',e.target.value)}
                  className="input-field text-sm">
                  {Object.entries(PRIORITY_MAP).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium flex items-center gap-1"><Calendar className="w-3 h-3"/>Fecha límite</label>
              <input type="date" value={form.due_date||''} onChange={e=>set('due_date',e.target.value||null)} className="input-field text-sm"/>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-synapsix-border flex items-center gap-2">
            {isEdit&&<button onClick={handleDelete} disabled={loading} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-3 py-2 rounded-xl hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5"/>Eliminar</button>}
            <div className="flex-1"/>
            <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
            <button onClick={handleSave} disabled={loading} className="btn-primary text-sm gap-2">
              {loading?<Loader2 className="w-4 h-4 animate-spin"/>:<CheckSquare className="w-4 h-4"/>}
              {loading?'Guardando...':(isEdit?'Actualizar':'Crear')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Tarjeta de Tarea ─────────────────────────────────────────────────────────
function TaskCard({ task, onEdit, onDragStart, onDragEnd }) {
  const p = PRIORITY_MAP[task.priority] || PRIORITY_MAP.medium
  const isOverdue = task.due_date && !task.status==='done' && new Date(task.due_date) < new Date()
  return (
    <div
      draggable
      onDragStart={e=>{ e.dataTransfer.setData('taskId',task.id); onDragStart(task.id) }}
      onDragEnd={onDragEnd}
      onClick={()=>onEdit(task)}
      className="glass rounded-xl p-3 cursor-pointer hover:bg-synapsix-surface-2 transition-all duration-200 group select-none border border-synapsix-border hover:border-synapsix-border-2 active:scale-95"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-3.5 h-3.5 text-synapsix-border-2 group-hover:text-synapsix-muted mt-0.5 flex-shrink-0 cursor-grab"/>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-synapsix-text leading-snug">{task.title}</p>
          {task.description&&<p className="text-xs text-synapsix-muted mt-0.5 line-clamp-2">{task.description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border"
          style={{color:p.color, borderColor:`${p.color}40`, backgroundColor:`${p.color}15`}}>
          <Flag className="w-2.5 h-2.5"/>{p.label}
        </span>
        {task.due_date&&(
          <span className={clsx('flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full',
            isOverdue?'text-red-400 bg-red-500/10':'text-synapsix-muted bg-synapsix-surface-3')}>
            <Calendar className="w-2.5 h-2.5"/>
            {new Date(task.due_date+'T12:00').toLocaleDateString('es',{day:'numeric',month:'short'})}
          </span>
        )}
        {task.assigned_to_name&&(
          <span className="flex items-center gap-1 text-[10px] text-synapsix-muted ml-auto">
            <User className="w-2.5 h-2.5"/>{task.assigned_to_name.split(' ')[0]}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── TASKS PAGE ───────────────────────────────────────────────────────────────
export default function TasksPage() {
  const navigate = useNavigate()
  const { primaryColor } = useTenantStore()
  const [tasks, setTasks]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(null) // { type: 'create'|'edit', task?, status? }
  const [dragOver, setDragOver]     = useState(null)
  const [dragging, setDragging]     = useState(null)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/core/tasks/')
      setTasks(Array.isArray(res.data) ? res.data : res.data.results || [])
    } catch { setTasks([]) } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const tasksByStatus = (status) => tasks.filter(t => t.status === status)

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    setDragOver(null); setDragging(null)
    if (!taskId) return
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === targetStatus) return
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? {...t, status: targetStatus} : t))
    try { await api.patch(`/core/tasks/${taskId}/`, { status: targetStatus }) }
    catch { setTasks(prev => prev.map(t => t.id === taskId ? {...t, status: task.status} : t)) }
  }

  const handleSave = (task, isEdit) => {
    if (isEdit) setTasks(p=>p.map(t=>t.id===task.id?task:t))
    else setTasks(p=>[task,...p])
  }

  const handleDelete = (id) => setTasks(p=>p.filter(t=>t.id!==id))

  return (
    <div className="min-h-screen bg-synapsix-dark">
      <header className="border-b border-synapsix-border glass sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <button onClick={()=>navigate('/launchpad')} className="text-synapsix-muted hover:text-synapsix-text-2 transition-colors"><ArrowLeft className="w-5 h-5"/></button>
          <CheckSquare className="w-5 h-5" style={{color:primaryColor}}/>
          <h1 className="text-base font-bold text-synapsix-text flex-1">Tareas</h1>
          <div className="flex items-center gap-2 text-xs text-synapsix-muted">
            <span className="px-2 py-1 bg-synapsix-surface-2 rounded-lg">{tasks.length} total</span>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-synapsix-muted animate-spin"/></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {COLUMNS.map(col => {
              const colTasks = tasksByStatus(col.id)
              const isOver = dragOver === col.id
              return (
                <div key={col.id}
                  onDragOver={e=>{e.preventDefault();setDragOver(col.id)}}
                  onDragLeave={()=>setDragOver(null)}
                  onDrop={e=>handleDrop(e,col.id)}
                  className={clsx('rounded-2xl border p-4 flex flex-col gap-3 min-h-[400px] transition-all duration-200',
                    col.bgClass, isOver&&'ring-2 ring-synapsix-red/30 scale-[1.01]')}
                >
                  {/* Header columna */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:col.color}}/>
                      <span className="text-sm font-bold text-synapsix-text">{col.label}</span>
                      <span className="text-xs text-synapsix-muted bg-synapsix-surface-3 px-1.5 py-0.5 rounded-full">
                        {colTasks.length}
                      </span>
                    </div>
                    <button onClick={()=>setModal({type:'create', status:col.id})}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-2 transition-colors">
                      <Plus className="w-4 h-4"/>
                    </button>
                  </div>

                  {/* Tarjetas */}
                  <div className="flex flex-col gap-2 flex-1">
                    {colTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={t=>setModal({type:'edit', task:t})}
                        onDragStart={id=>setDragging(id)}
                        onDragEnd={()=>{setDragging(null);setDragOver(null)}}
                      />
                    ))}
                    {colTasks.length===0&&(
                      <div className="flex-1 flex items-center justify-center text-synapsix-muted-2 text-xs text-center py-8 border-2 border-dashed border-synapsix-border rounded-xl">
                        {isOver ? '✦ Soltar aquí' : 'Sin tareas'}
                      </div>
                    )}
                  </div>

                  {/* Agregar rápido */}
                  <button onClick={()=>setModal({type:'create', status:col.id})}
                    className="flex items-center gap-2 text-xs text-synapsix-muted hover:text-synapsix-text-2 p-2 rounded-xl hover:bg-synapsix-surface-2 transition-colors">
                    <Plus className="w-3.5 h-3.5"/> Agregar tarea
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {modal?.type==='create'&&(
        <TaskModal defaultStatus={modal.status} onClose={()=>setModal(null)} onSave={handleSave} onDelete={handleDelete}/>
      )}
      {modal?.type==='edit'&&(
        <TaskModal task={modal.task} onClose={()=>setModal(null)} onSave={handleSave} onDelete={handleDelete}/>
      )}
    </div>
  )
}
