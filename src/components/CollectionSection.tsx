import { useState } from "react";
import ProductCard from "./ProductCard";
import product1 from "@/assets/product-1.jpg";
import product2 from "@/assets/product-2.jpg";
import product3 from "@/assets/product-3.jpg";
import product4 from "@/assets/product-4.jpg";

const categories = ["All", "Men", "Women", "Best Sellers", "Featured", "New Arrival"];

const products = [
  { id: 1, image: product1, name: "Vintage Mist Sheer Top", price: 899, rating: 5 },
  { id: 2, image: product2, name: "High Rise Chill Jeans", price: 1299, rating: 5 },
  { id: 3, image: product3, name: "Sandstone Edge Crop", price: 599, rating: 5 },
  { id: 4, image: product4, name: "Black Tshirt", price: 399, rating: 5 },
];

const CollectionSection = () => {
  const [activeCategory, setActiveCategory] = useState("All");

  return (
    <section id="collection" className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Category Filter */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === category
                  ? "bg-pink text-accent-foreground"
                  : "bg-background text-foreground border border-border hover:border-primary"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              image={product.image}
              name={product.name}
              price={product.price}
              rating={product.rating}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CollectionSection;
