'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, PlusCircle, Edit, Trash2, X } from 'lucide-react';
import { useProducts } from '../../context/ProductContext';
import { formatCurrency } from '../../lib/utils';

const ProductList = () => {
  const { products } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');

  const handleDelete = (productId: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      // Aquí iría la llamada a deleteProduct(productId) del contexto
      console.log('Eliminar producto', productId);
    }
  };

  const filteredProducts = products.filter(product => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      return true;
    }

    const searchTerms = query.split(' ').filter(term => term);

    const productText = `
      ${product.id}
      ${product.name.toLowerCase()}
      ${product.category.toLowerCase()}
      ${product.description ? product.description.toLowerCase() : ''}
    `;

    return searchTerms.every(term => productText.includes(term));
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Productos</h1>
        <Link href="/admin/products/new">
          <button className="bg-brand-yellow border border-yellow-400 text-navy px-4 py-2 flex items-center gap-2 font-black uppercase text-xs tracking-wide hover:bg-yellow-300 cursor-pointer">
            <PlusCircle size={20} />
            Añadir Producto
          </button>
        </Link>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="relative mb-4">
          <input 
            type="text"
            placeholder="Buscar por ID, nombre, categoría..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full p-3 pl-10 border border-gray-200 bg-gray-50 focus:ring-1 focus:ring-navy/30 focus:border-navy focus:outline-none"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {searchQuery ? (
              <button onClick={() => setSearchQuery('')} className="cursor-pointer" aria-label="Limpiar búsqueda">
                <X size={20} />
              </button>
            ) : (
              <Search size={20} />
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-4 font-semibold">Imagen</th>
                <th className="p-4 font-semibold">Nombre</th>
                <th className="p-4 font-semibold">Categoría</th>
                <th className="p-4 font-semibold">Precio</th>
                <th className="p-4 font-semibold">Stock</th>
                <th className="p-4 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map(product => (
                  <tr key={product.id} className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="p-4">
                      <Image src={product.image} alt={product.name} width={50} height={50} className="rounded-md object-contain" />
                    </td>
                    <td className="p-4 font-medium">{product.name}</td>
                    <td className="p-4 text-gray-600">{product.category}</td>
                    <td className="p-4 font-mono">{formatCurrency(product.price)}</td>
                    <td className={`p-4 font-semibold ${
                        product.stock < 10 ? 'text-red-500' : 'text-green-600'
                      }`}>
                      {product.stock}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-3">
                        <Link href={`/admin/products/edit/${product.id}`}>
                          <button className="text-navy hover:opacity-70 cursor-pointer" aria-label="Editar"><Edit size={18} /></button>
                        </Link>
                        <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-800 cursor-pointer"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    No se encontraron productos que coincidan con tu búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductList;
