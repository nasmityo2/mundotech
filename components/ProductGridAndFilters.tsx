'use client';

import { useProducts } from '../context/ProductContext';
import ProductCard from './ProductCard';
import CategoryNav from './CategoryNav';
import { motion } from 'framer-motion';
import ProductCardSkeleton from './ProductCardSkeleton';
import ProductFilters from './ProductFilters';

const ProductGridAndFilters = () => {
  const { filteredAndSortedProducts, loading } = useProducts();

  return (
    <>
      <CategoryNav />
      <div id="products" className="pt-8">
        <ProductFilters />
      </div>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.1 } }
        }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-8 mt-8"
      >
        {loading ? (
          Array.from({ length: 8 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))
        ) : (
          filteredAndSortedProducts.map(product => (
            <motion.div
              key={product.id}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))
        )}
      </motion.div>
    </>
  );
};

export default ProductGridAndFilters;