'use client';

import { useParams } from 'next/navigation';
import AdminDashboard from '../../../../../components/admin/AdminDashboard';
import ProductForm from '../../../../../components/admin/ProductForm';
import { useProducts } from '../../../../../context/ProductContext';

const EditProductPage = () => {
  const params = useParams();
  const { id } = params;
  const { getProductById } = useProducts();

  // El ID puede no estar disponible en el primer render
  if (!id) {
    return <div>Cargando...</div>;
  }

  const productToEdit = getProductById(Number(id));

  if (!productToEdit) {
    return <div>Producto no encontrado</div>;
  }

  return (
    <AdminDashboard>
      <ProductForm productToEdit={productToEdit} />
    </AdminDashboard>
  );
};

export default EditProductPage;
