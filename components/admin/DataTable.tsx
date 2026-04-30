'use client';

import { ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Etiqueta a mostrar en la card móvil. Si se omite usa `header`. Pasa null para esconder en móvil. */
  mobileLabel?: string | null;
  /** Indica que esta columna se renderiza grande como título en la card móvil. */
  primary?: boolean;
  /** Si es true se renderiza como subtítulo (debajo del primary). */
  secondary?: boolean;
  /** No mostrar en móvil pero sí en tabla desktop. */
  hideOnMobile?: boolean;
  /** Solo mostrar en móvil. */
  mobileOnly?: boolean;
  /** Alineación horizontal en tabla desktop. */
  align?: 'left' | 'right' | 'center';
  /** Anchura sugerida en tabla desktop (Tailwind class). */
  width?: string;
  /** Esconder en escritorio (responsive table). */
  hideOnDesktop?: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Render de acciones por fila — botones siempre 44×44 en móvil. */
  actions?: (row: T) => ReactNode;
  /** Selección con checkbox. */
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  emptyState?: ReactNode;
  loading?: boolean;
  /** Acentúa la fila/card según un criterio (warning, danger). */
  rowAccent?: (row: T) => 'default' | 'warning' | 'danger' | 'success';
  /** Indicador a la izquierda de la card móvil (avatar/icono). */
  mobileLeading?: (row: T) => ReactNode;
}

const ALIGN_CLS = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;
const ACCENT_BG: Record<NonNullable<ReturnType<NonNullable<DataTableProps<unknown>['rowAccent']>>>, string> = {
  default: '',
  warning: 'bg-orange-50/50',
  danger:  'bg-red-50/50',
  success: 'bg-green-50/40',
};
const ACCENT_BORDER: Record<NonNullable<ReturnType<NonNullable<DataTableProps<unknown>['rowAccent']>>>, string> = {
  default: 'border-gray-200',
  warning: 'border-orange-200',
  danger:  'border-red-200',
  success: 'border-green-200',
};

export function DataTable<T>({
  data,
  columns,
  rowKey,
  onRowClick,
  actions,
  selectable,
  selectedIds = [],
  onSelectionChange,
  emptyState,
  loading,
  rowAccent,
  mobileLeading,
}: DataTableProps<T>) {
  const desktopColumns = columns.filter(c => !c.hideOnDesktop);
  const mobileColumns = columns.filter(c => !c.hideOnMobile && c.mobileLabel !== null);
  const allSelected = data.length > 0 && selectedIds.length === data.length;

  const toggleAll = () => {
    if (!onSelectionChange) return;
    onSelectionChange(allSelected ? [] : data.map(rowKey));
  };

  const toggleOne = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) onSelectionChange(selectedIds.filter(x => x !== id));
    else onSelectionChange([...selectedIds, id]);
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm divide-y divide-gray-100">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 bg-gray-200 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-200 rounded w-1/2" />
              <div className="h-2 bg-gray-100 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white border border-dashed border-gray-200 rounded-2xl py-12 text-center text-sm text-gray-400">
        {emptyState ?? 'No hay datos para mostrar.'}
      </div>
    );
  }

  return (
    <>
      {/* ─── Mobile: cards apiladas ─── */}
      <ul className="md:hidden space-y-3">
        {data.map(row => {
          const id = rowKey(row);
          const accent = rowAccent?.(row) ?? 'default';
          const primary = mobileColumns.find(c => c.primary);
          const secondary = mobileColumns.find(c => c.secondary);
          const others = mobileColumns.filter(c => !c.primary && !c.secondary);

          const interactive = Boolean(onRowClick);
          const Wrapper = interactive ? 'button' : ('div' as const);

          return (
            <li key={id}>
              <Wrapper
                type={interactive ? 'button' : undefined}
                onClick={interactive ? () => onRowClick?.(row) : undefined}
                className={`w-full text-left bg-white border rounded-2xl shadow-sm p-3.5 ${ACCENT_BORDER[accent]} ${ACCENT_BG[accent]} ${
                  interactive ? 'active:bg-gray-50' : ''
                } ${selectedIds.includes(id) ? 'ring-2 ring-brand-yellow' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {selectable && (
                    <label className="flex-shrink-0 inline-flex items-center" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(id)}
                        onChange={() => toggleOne(id)}
                        className="w-5 h-5 rounded border-gray-300 text-navy focus:ring-navy"
                      />
                    </label>
                  )}

                  {mobileLeading && (
                    <div className="flex-shrink-0">{mobileLeading(row)}</div>
                  )}

                  <div className="flex-1 min-w-0">
                    {primary && (
                      <div className="font-semibold text-navy text-[15px] leading-tight truncate">
                        {primary.cell(row)}
                      </div>
                    )}
                    {secondary && (
                      <div className="text-[12px] text-gray-500 mt-0.5 truncate">
                        {secondary.cell(row)}
                      </div>
                    )}
                  </div>

                  {actions && (
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      {actions(row)}
                    </div>
                  )}
                </div>

                {others.length > 0 && (
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 pt-3 border-t border-gray-100">
                    {others.map(col => (
                      <div key={col.key} className="min-w-0">
                        <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 truncate">
                          {col.mobileLabel ?? col.header}
                        </dt>
                        <dd className="text-[13px] text-gray-700 mt-0.5 truncate">{col.cell(row)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </Wrapper>
            </li>
          );
        })}
      </ul>

      {/* ─── Desktop: tabla densa ─── */}
      <div className="hidden md:block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {selectable && (
                  <th className="px-4 py-3 w-12">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded border-gray-300 text-navy focus:ring-navy"
                    />
                  </th>
                )}
                {desktopColumns.map(col => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                      col.align ? ALIGN_CLS[col.align] : 'text-left'
                    } ${col.width ?? ''}`}
                  >
                    {col.header}
                  </th>
                ))}
                {actions && <th className="px-4 py-3 w-24" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map(row => {
                const id = rowKey(row);
                const accent = rowAccent?.(row) ?? 'default';
                return (
                  <tr
                    key={id}
                    className={`${ACCENT_BG[accent]} ${
                      onRowClick ? 'cursor-pointer hover:bg-blue-50/40' : 'hover:bg-gray-50/50'
                    } ${selectedIds.includes(id) ? 'bg-amber-50/40' : ''} transition-colors`}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {selectable && (
                      <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(id)}
                          onChange={() => toggleOne(id)}
                          className="w-4 h-4 rounded border-gray-300 text-navy focus:ring-navy"
                        />
                      </td>
                    )}
                    {desktopColumns.map(col => (
                      <td
                        key={col.key}
                        className={`px-4 py-2.5 ${col.align ? ALIGN_CLS[col.align] : ''}`}
                      >
                        {col.cell(row)}
                      </td>
                    ))}
                    {actions && (
                      <td className="px-4 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1">{actions(row)}</div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default DataTable;
