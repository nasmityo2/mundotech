'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, X } from 'lucide-react';
import Image from 'next/image';
import { useProducts, Product } from '../../context/ProductContext';

interface ProductFormProps {
  productToEdit?: Product;
}

const ProductForm = ({ productToEdit }: ProductFormProps) => {
  const router = useRouter();
  const { addProduct, updateProduct } = useProducts();
  const [product, setProduct] = useState<Partial<Product>>(productToEdit || {
    name: '',
    description: '',
    price: 0,
    stock: 0,
    category: '',
  });
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    if (productToEdit) {
      setProduct(productToEdit);
      if (productToEdit.images) {
        setImagePreviews(productToEdit.images);
      }
    }
  }, [productToEdit]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const productData = {
      ...product,
      price: parseFloat(String(product.price)) || 0,
      stock: parseInt(String(product.stock), 10) || 0,
      image: imagePreviews[0] || product.image || '/placeholder.png', // Asigna la primera imagen de la preview
      images: imagePreviews,
    };

    if (productToEdit) {
      updateProduct({ ...productData, id: productToEdit.id } as Product);
    } else {
      addProduct(productData as Omit<Product, 'id'>);
    }

    alert('¡Producto guardado con éxito!');
    router.push('/admin/products');
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{productToEdit ? 'Editar Producto' : 'Añadir Nuevo Producto'}</h1>
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-sm space-y-6">
        <div>
          <label htmlFor="name" className="block font-semibold mb-1">Nombre del Producto</label>
          <input type="text" name="name" id="name" value={product.name || ''} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" required />
        </div>
        <div>
          <label htmlFor="description" className="block font-semibold mb-1">Descripción</label>
          <textarea name="description" id="description" value={product.description || ''} onChange={handleChange} rows={4} className="w-full p-3 border border-gray-300 rounded-lg"></textarea>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="price" className="block font-semibold mb-1">Precio (USD)</label>
            <input type="number" name="price" id="price" value={product.price || ''} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" required />
          </div>
          <div>
            <label htmlFor="stock" className="block font-semibold mb-1">Stock</label>
            <input type="number" name="stock" id="stock" value={product.stock || ''} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" required />
          </div>
          <div>
            <label htmlFor="category" className="block font-semibold mb-1">Categoría</label>
            <select name="category" id="category" value={product.category || ''} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" required>
              <option value="">Seleccionar...</option>
              <option value="Telefonos">Teléfonos</option>
              <option value="Relojes">Relojes</option>
              <option value="Laptops">Laptops</option>
              {/* ... más categorías */}
            </select>
          </div>
        </div>
        <div>
          <label className="block font-semibold mb-1">Imágenes</label>
          <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {imagePreviews.map((src, index) => (
              <div key={index} className="relative group">
                <Image src={src} alt={`Preview ${index + 1}`} width={150} height={150} className="rounded-lg object-cover w-full h-full" />
                <button 
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <label htmlFor="image-upload" className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
              <UploadCloud size={32} className="text-gray-400" />
              <span className="mt-2 text-sm text-gray-600">Añadir</span>
              <input id="image-upload" type="file" multiple onChange={handleImageChange} className="hidden" />
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-4">
          <button 
            type="button" 
            onClick={() => router.push('/admin/products')}
            className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 cursor-pointer"
          >
            Cancelar
          </button>
          <button type="submit" className="bg-brand-yellow border border-yellow-400 text-navy px-6 py-2 font-black uppercase tracking-wide text-sm hover:bg-yellow-300 cursor-pointer">Guardar Producto</button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
