import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import product1 from "@/assets/product-1.jpg";
import product2 from "@/assets/product-2.jpg";
import product3 from "@/assets/product-3.jpg";
import product4 from "@/assets/product-4.jpg";

const allProducts = [
  { id: 1, image: product1, name: "Vintage Mist Sheer Top", price: 899, rating: 5 },
  { id: 2, image: product2, name: "High Rise Chill Jeans", price: 1299, rating: 5 },
  { id: 3, image: product3, name: "Sandstone Edge Crop", price: 599, rating: 5 },
  { id: 4, image: product4, name: "Black Tshirt", price: 399, rating: 5 },
];

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  const filteredProducts = allProducts.filter((product) =>
    product.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Search Results
          </h1>
          <p className="text-muted-foreground mb-8">
            {filteredProducts.length} result(s) for "{query}"
          </p>

          {filteredProducts.length > 0 ? (
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
          ) : (
            <div className="text-center py-16">
              <p className="text-xl text-muted-foreground">
                No products found matching your search.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Search;
