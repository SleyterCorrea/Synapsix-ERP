/**
 * SYNAPSIX ERP — PermissionMatrix Component
 * Tabla de permisos por módulo, por rol.
 * Inspirada en funcionalidad Odoo, diseño propio.
 */
import clsx from 'clsx'

const ACCESS_LEVELS = [
  { value: 'none',  label: 'Sin acceso',    color: 'text-synapsix-muted-2' },
  { value: 'read',  label: 'Lector',         color: 'text-blue-400' },
  { value: 'write', label: 'Usuario',         color: 'text-emerald-400' },
  { value: 'admin', label: 'Administrador',   color: 'text-synapsix-red-light' },
]

export default function PermissionMatrix({ modules = [], permissions = {}, onChange, readOnly = false }) {
  // permissions: { [moduleSlug]: 'none' | 'read' | 'write' | 'admin' }

  const handleChange = (moduleSlug, level) => {
    if (readOnly) return
    onChange?.({ ...permissions, [moduleSlug]: level })
  }

  if (!modules.length) {
    return (
      <div className="text-center py-8 text-synapsix-muted text-sm">
        No hay módulos registrados.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-synapsix-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-synapsix-border bg-synapsix-surface-2">
            <th className="text-left px-4 py-3 text-synapsix-muted text-xs uppercase tracking-wider font-semibold w-48">
              Módulo
            </th>
            {ACCESS_LEVELS.map((lvl) => (
              <th key={lvl.value} className="text-center px-3 py-3 text-xs uppercase tracking-wider font-semibold">
                <span className={lvl.color}>{lvl.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-synapsix-border">
          {modules.map((module, idx) => {
            const current = permissions[module.slug] || 'none'
            return (
              <tr
                key={module.slug}
                className={clsx(
                  'transition-colors',
                  idx % 2 === 0 ? 'bg-synapsix-surface' : 'bg-synapsix-surface-2/50',
                  !readOnly && 'hover:bg-synapsix-surface-3'
                )}
              >
                {/* Módulo info */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ backgroundColor: `${module.color}20`, color: module.color }}
                    >
                      {module.name[0]}
                    </div>
                    <div>
                      <p className="text-synapsix-text font-medium text-xs">{module.name}</p>
                      {!module.is_active && (
                        <p className="text-synapsix-muted-2 text-[10px]">Próximamente</p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Radio buttons por nivel */}
                {ACCESS_LEVELS.map((lvl) => {
                  const isSelected = current === lvl.value
                  return (
                    <td key={lvl.value} className="text-center px-3 py-3">
                      <button
                        onClick={() => handleChange(module.slug, lvl.value)}
                        disabled={readOnly}
                        className={clsx(
                          'w-5 h-5 rounded-full border-2 mx-auto flex items-center justify-center transition-all duration-150',
                          isSelected
                            ? lvl.value === 'admin'
                              ? 'border-synapsix-red bg-synapsix-red'
                              : lvl.value === 'write'
                                ? 'border-emerald-500 bg-emerald-500'
                                : lvl.value === 'read'
                                  ? 'border-blue-500 bg-blue-500'
                                  : 'border-synapsix-muted-2 bg-synapsix-muted-2'
                            : 'border-synapsix-border hover:border-synapsix-border-2',
                          readOnly && 'cursor-default'
                        )}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </button>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
