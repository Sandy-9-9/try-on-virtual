import { Star } from "lucide-react";
import { Link } from "react-router-dom";

interface ProductCardProps {
  image: string;
  name: string;
  price: number;
  rating?: number;
  hasSale?: boolean;
}

const ProductCard = ({ image, name, price, rating = 5, hasSale = true }: ProductCardProps) => {
  return (
    <div className="group relative bg-card rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
      {/* Sale Badge */}
      {hasSale && (
        <span className="absolute top-3 right-3 z-10 bg-pink text-accent-foreground text-xs font-medium px-3 py-1 rounded-full">
          sale
        </span>
      )}

      {/* Image */}
      <div className="aspect-[3/4] overflow-hidden bg-muted">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
        />
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

        {/* Try-On Button */}
        <Link
          to="/try-on"
          className="inline-block text-sm font-semibold text-card-foreground hover:text-primary transition-colors underline underline-offset-4"
        >
          Try-On Now
        </Link>
      </div>
    </div>
  );
};

export default ProductCard;
