'use client';

import { useEffect, useState, useRef } from 'react';
import { OrderStatus } from '@/lib/definitions';

const validStatuses: OrderStatus[] = ['Pendiente', 'En Proceso', 'Enviado', 'Entregado', 'Cancelado'];

export const StatusUpdateMenu = ({
  onUpdate,
  isBulk = false,
  currentStatus,
  allowedOnly,
}: {
  onUpdate: (status: OrderStatus) => void;
  isBulk?: boolean;
  currentStatus?: OrderStatus;
  /** Si se define, solo se muestran estos estados (ej. solo Cancelado durante verificación Binance). */
  allowedOnly?: OrderStatus[];
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const options = allowedOnly?.length ? allowedOnly : validStatuses;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (status: OrderStatus) => {
    onUpdate(status);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button onClick={() => setIsOpen(!isOpen)} className={`inline-flex items-center border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-navy/30 ${isBulk ? '' : 'w-full justify-center'}`}>
        {isBulk ? 'Actualizar Estado' : (currentStatus ? 'Cambiar Estado' : 'Establecer Estado')}
        <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
      </button>
      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
          <div className="py-1">
            {options.map((status) => (
              <button key={status} onClick={() => handleSelect(status)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                {status}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};