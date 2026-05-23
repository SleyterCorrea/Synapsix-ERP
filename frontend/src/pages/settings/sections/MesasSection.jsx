/**
 * SYNAPSIX ERP — MesasSection
 * Configuración de mesas del restaurante dentro de Settings.
 * CRUD completo: crear, editar, cambiar estado, eliminar.
 */
import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit3, Trash2, Loader2, Save, X, ChevronDown, Utensils } from 'lucide-react'
import clsx from 'clsx'
import api from '@api/axios'

const ESTADO_OPTS = [
  { value: 'libre',     label: 'Libre',          color: '#27AE60' },
  { value: 'ocupada',   label: 'Ocupada',         color: '#C0392B' },
  { value: 'reservada', label: 'Reservada',       color: '#F39C12' },
  { value: 'limpieza',  label: 'En Limpieza',     color: '#2980B9' },
]

const EMPTY = { numero: '', nombre: '', capacidad: '4', zona: 'Principal', estado: 'libre' }

function MesaForm({ mesa, onSave, onCancel, loading }) {
  const [form, setForm] = useState(mesa ? {
    numero: mesa.numero, nombre: mesa.nombre || '',
    capacidad: mesa.capacidad, zona: mesa.zona || 'Principal', estado: mesa.estado,
  } : { ...EMPTY })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="glass rounded-2xl border border-synapsix-border p-5 space-y-4">
      <p className="text-sm font-bold text-synapsix-text">{mesa ? `Editar Mesa ${mesa.numero}` : 'Nueva Mesa'}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Número *</label>
          <input type="number" min="1" value={form.numero} onChange={e => set('numero', e.target.value)}
            className="input-field text-center font-black text-lg" placeholder="1" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Nombre</label>
          <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
            className="input-field" placeholder="VIP, Terraza..." />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Capacidad</label>
          <input type="number" min="1" max="50" value={form.capacidad} onChange={e => set('capacidad', e.target.value)}
            className="input-field text-center" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Zona</label>
          <input value={form.zona} onChange={e => set('zona', e.target.value)}
            className="input-field" placeholder="Principal" />
        </div>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <button onClick={onCancel} className="btn-secondary text-sm gap-1.5"><X className="w-4 h-4" />Cancelar</button>
        <button onClick={() => onSave(form)} disabled={loading || !form.numero}
          className="btn-primary text-sm gap-1.5">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {mesa ? 'Actualizar' : 'Crear Mesa'}
        </button>
      </div>
    </div>
  )
}

export default function MesasSection() {
  const [mesas, setMesas]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editMesa, setEditMesa] = useState(null)

  const fetchMesas = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/restaurante/mesas/')
      setMesas(Array.isArray(res.data) ? res.data : res.data.results || [])
    } catch { setError('No se pudieron cargar las mesas.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchMesas() }, [fetchMesas])

  const handleCreate = async (form) => {
    setSaving(true); setError(null)
    try {
      const res = await api.post('/restaurante/mesas/', form)
      setMesas(prev => [...prev, res.data].sort((a,b) => a.numero - b.numero))
      setShowForm(false)
    } catch(e) { setError(JSON.stringify(e.response?.data) || 'Error al crear.') }
    finally { setSaving(false) }
  }

  const handleUpdate = async (form) => {
    setSaving(true); setError(null)
    try {
      const res = await api.patch(`/restaurante/mesas/${editMesa.id}/`, form)
      setMesas(prev => prev.map(m => m.id === editMesa.id ? res.data : m))
      setEditMesa(null)
    } catch(e) { setError(JSON.stringify(e.response?.data) || 'Error al actualizar.') }
    finally { setSaving(false) }
  }

  const handleEstado = async (mesa, estado) => {
    try {
      const res = await api.patch(`/restaurante/mesas/${mesa.id}/`, { estado })
      setMesas(prev => prev.map(m => m.id === mesa.id ? res.data : m))
    } catch { setError('Error al cambiar estado.') }
  }

  const handleDelete = async (mesa) => {
    if (!confirm(`¿Desactivar la Mesa ${mesa.numero}?`)) return
    try {
      await api.patch(`/restaurante/mesas/${mesa.id}/`, { is_active: false })
      setMesas(prev => prev.filter(m => m.id !== mesa.id))
    } catch { setError('Error al eliminar.') }
  }

  const zonas = [...new Set(mesas.map(m => m.zona || 'Principal'))]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-synapsix-text flex items-center gap-2">
            <Utensils className="w-5 h-5 text-synapsix-muted" /> Mesas del Restaurante
          </h2>
          <p className="text-sm text-synapsix-muted mt-0.5">Configura el layout de tu restaurante</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditMesa(null) }} className="btn-primary gap-2 text-sm">
          <Plus className="w-4 h-4" /> Nueva Mesa
        </button>
      </div>

      {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}

      {(showForm && !editMesa) && (
        <MesaForm onSave={handleCreate} onCancel={() => setShowForm(false)} loading={saving} />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-synapsix-muted animate-spin" /></div>
      ) : mesas.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <Utensils className="w-12 h-12 text-synapsix-muted opacity-20 mx-auto" />
          <p className="text-synapsix-muted">Sin mesas configuradas</p>
          <button onClick={() => setShowForm(true)} className="btn-primary gap-2"><Plus className="w-4 h-4" />Crear primera mesa</button>
        </div>
      ) : (
        <div className="space-y-6">
          {zonas.map(zona => (
            <div key={zona}>
              <p className="text-xs text-synapsix-muted uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                <span className="w-6 h-px bg-synapsix-border inline-block" />
                {zona}
                <span className="w-full h-px bg-synapsix-border inline-block" />
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {mesas.filter(m => (m.zona || 'Principal') === zona).map(mesa => {
                  const estadoCfg = ESTADO_OPTS.find(e => e.value === mesa.estado) || ESTADO_OPTS[0]
                  return (
                    <div key={mesa.id} className={clsx(
                      'glass rounded-2xl border p-4 space-y-3 transition-all',
                      editMesa?.id === mesa.id ? 'border-synapsix-border-2 ring-1 ring-synapsix-border-2' : 'border-synapsix-border'
                    )}>
                      {editMesa?.id === mesa.id ? (
                        <MesaForm mesa={editMesa} onSave={handleUpdate} onCancel={() => setEditMesa(null)} loading={saving} />
                      ) : (
                        <>
                          <div className="flex items-start justify-between">
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg"
                              style={{ backgroundColor: `${estadoCfg.color}18`, color: estadoCfg.color, border: `1.5px solid ${estadoCfg.color}30` }}>
                              {mesa.numero}
                            </div>
                            <div className="flex gap-1">
                              <button onClick={() => setEditMesa(mesa)} className="w-7 h-7 rounded-lg flex items-center justify-center text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-2 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDelete(mesa)} className="w-7 h-7 rounded-lg flex items-center justify-center text-synapsix-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                          {mesa.nombre && <p className="text-sm font-semibold text-synapsix-text">{mesa.nombre}</p>}
                          <p className="text-xs text-synapsix-muted">{mesa.capacidad} personas</p>
                          <select value={mesa.estado} onChange={e => handleEstado(mesa, e.target.value)}
                            className="w-full text-xs rounded-xl border border-synapsix-border bg-synapsix-surface-2 px-2 py-1.5 outline-none cursor-pointer font-semibold"
                            style={{ color: estadoCfg.color }}>
                            {ESTADO_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
