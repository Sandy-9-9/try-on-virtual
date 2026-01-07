import { Star, Heart, ShoppingCart, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface ProductCardProps {
  id: number;
  image: string;
  name: string;
  price: number;
  rating?: number;
  hasSale?: boolean;
}

const ProductCard = ({ id, image, name, price, rating = 5, hasSale = true }: ProductCardProps) => {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist, wishlistItems } = useWishlist();
  const { user } = useAuth();
  const navigate = useNavigate();

  const inWishlist = isInWishlist(id);
  const wishlistItem = wishlistItems.find(item => item.product_id === id);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Please login to add items to cart");
      navigate("/login");
      return;
    }
    await addToCart({ product_id: id, product_name: name, product_price: price, product_image: image });
    toast.success(`${name} added to cart!`);
  };

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Please login to add items to wishlist");
      navigate("/login");
      return;
    }
    if (inWishlist && wishlistItem) {
      await removeFromWishlist(wishlistItem.id);
      toast.info(`${name} removed from wishlist`);
    } else {
      await addToWishlist({ product_id: id, product_name: name, product_price: price, product_image: image });
      toast.success(`${name} added to wishlist!`);
    }
  };

  return (
    <div className="group relative bg-card rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
      {/* Sale Badge */}
      {hasSale && (
        <span className="absolute top-3 right-3 z-10 bg-pink text-accent-foreground text-xs font-medium px-3 py-1 rounded-full">
          sale
        </span>
      )}

      {/* Image with overlay icons */}
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        <div onClick={handleAddToCart} className="cursor-pointer">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Hover Action Icons */}
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
          {/* Add to Cart */}
          <button
            onClick={handleAddToCart}
            className="p-3 bg-background rounded-full shadow-lg hover:bg-primary hover:text-primary-foreground transition-colors"
            title="Add to Cart"
          >
            <ShoppingCart className="h-5 w-5" />
          </button>

          {/* Wishlist */}
          <button
            onClick={handleWishlistToggle}
            className={`p-3 rounded-full shadow-lg transition-colors ${
              inWishlist
                ? "bg-pink text-accent-foreground"
                : "bg-background hover:bg-pink hover:text-accent-foreground"
            }`}
            title={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
          >
            <Heart className={`h-5 w-5 ${inWishlist ? "fill-current" : ""}`} />
          </button>

          {/* Try-On */}
          <Link
            to="/try-on"
            onClick={(e) => e.stopPropagation()}
            className="p-3 bg-background rounded-full shadow-lg hover:bg-purple hover:text-primary-foreground transition-colors"
            title="Virtual Try-On"
          >
            <Sparkles className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 text-center">
        {/* Rating */}
        <div className="flex items-center justify-center gap-1 mb-2">
          {[...Array(rating)].map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-pink text-pink" />
          ))}
        </div>

        {/* Name */}
        <h3 className="font-medium text-card-foreground mb-1">{name}</h3>

        {/* Price */}
        <p className="text-lg font-bold text-card-foreground mb-3">{price}/-</p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={handleAddToCart}
            className="flex-1 py-2 px-3 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
          >
            Add to Cart
          </button>
          <Link
            to="/try-on"
            className="py-2 px-3 border border-primary text-primary text-sm font-medium rounded-md hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            Try-On
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
