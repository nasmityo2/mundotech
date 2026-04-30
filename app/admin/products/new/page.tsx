'use client';

import ProductForm from '@/components/admin/ProductForm';

const NewProductPage = () => {
  return (
    <div className="space-y-3">
      <h1 className="text-xl sm:text-2xl font-bold text-navy">Nuevo producto</h1>
      <ProductForm />
    </div>
  );
};

export default NewProductPage;
