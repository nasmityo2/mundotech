'use client';

import { useParams } from 'next/navigation';
import ProductForm from '@/components/admin/ProductForm';
import { useProducts } from '@/context/ProductContext';

const EditProductPage = () => {
  const params = useParams();
  const id = params?.id;
  const { getProductById } = useProducts();

  if (!id) return <div className="py-10 text-center text-gray-400">Cargando...</div>;

  const productToEdit = getProductById(Array.isArray(id) ? id[0] : id);

  if (!productToEdit) {
    return <div className="py-10 text-center text-gray-400">Producto no encontrado</div>;
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl sm:text-2xl font-bold text-navy">Editar producto</h1>
      <ProductForm productToEdit={productToEdit} />
    </div>
  );
};

export default EditProductPage;
