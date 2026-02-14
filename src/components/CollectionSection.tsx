import { useState } from "react";
import ProductCard from "./ProductCard";
import product1 from "@/assets/product-1.jpg";
import product2 from "@/assets/product-2.jpg";
import product3 from "@/assets/product-3.jpg";
import product4 from "@/assets/product-4.jpg";
import product5 from "@/assets/product-5.jpg";
import product6 from "@/assets/product-6.jpg";
import product7 from "@/assets/product-7.jpg";
import product8 from "@/assets/product-8.jpg";
import product9 from "@/assets/product-9.jpg";
import product10 from "@/assets/product-10.jpg";
import product11 from "@/assets/product-11.jpg";
import product12 from "@/assets/product-12.jpg";

const categories = ["All", "Men", "Women", "Best Sellers", "Featured", "New Arrival"];

type Category = "Men" | "Women" | "Best Sellers" | "Featured" | "New Arrival";

const products = [
  { id: 1, image: product1, name: "Vintage Mist Sheer Top", price: 899, rating: 5, categories: ["Women", "Featured"] as Category[] },
  { id: 2, image: product2, name: "High Rise Chill Jeans", price: 1299, rating: 5, categories: ["Women", "Best Sellers"] as Category[] },
  { id: 3, image: product3, name: "Sandstone Edge Crop", price: 599, rating: 5, categories: ["Women", "New Arrival"] as Category[] },
  { id: 4, image: product4, name: "Black Tshirt", price: 399, rating: 5, categories: ["Men", "Best Sellers"] as Category[] },
  { id: 5, image: product5, name: "Navy Formal Blazer", price: 2499, rating: 5, categories: ["Men", "Featured"] as Category[] },
  { id: 6, image: product6, name: "Grey Comfort Hoodie", price: 999, rating: 4, categories: ["Men", "Best Sellers"] as Category[] },
  { id: 7, image: product7, name: "White Polo Tee", price: 699, rating: 4, categories: ["Men", "New Arrival"] as Category[] },
  { id: 8, image: product8, name: "Classic Denim Jeans", price: 1499, rating: 5, categories: ["Men", "Best Sellers"] as Category[] },
  { id: 9, image: product9, name: "Red Cocktail Dress", price: 1899, rating: 5, categories: ["Women", "Featured"] as Category[] },
  { id: 10, image: product10, name: "Floral Summer Blouse", price: 799, rating: 4, categories: ["Women", "New Arrival"] as Category[] },
  { id: 11, image: product11, name: "Black Leather Jacket", price: 2999, rating: 5, categories: ["Women", "Best Sellers"] as Category[] },
  { id: 12, image: product12, name: "Olive Cargo Pants", price: 1199, rating: 4, categories: ["Men", "New Arrival"] as Category[] },
];

const CollectionSection = () => {
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredProducts = activeCategory === "All"
    ? products
    : products.filter((p) => p.categories.includes(activeCategory as Category));

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
          {filteredProducts.map((product) => (
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
