import { useState } from "react";
import { ShoppingCart, Heart, Search, User, X, Sparkles } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { Input } from "@/components/ui/input";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { getCartCount } = useCart();
  const { getWishlistCount } = useWishlist();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const navLinks = [
    { name: "HOME", path: "/" },
    { name: "COLLECTION", path: "/#collection" },
    { name: "SPECIALS", path: "/#specials" },
    { name: "BLOGS", path: "/#blogs" },
    { name: "ABOUT US", path: "/#about" },
    { name: "POPULAR", path: "/#popular" },
    { name: "VIRTUAL TRY-ON", path: "/try-on" },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-foreground" />
            <span className="text-xl font-bold tracking-wider text-foreground">FitFusion</span>
          </Link>

          {/* Navigation Links */}
          <ul className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <li key={link.name}>
                <Link
                  to={link.path}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    location.pathname === link.path ? "text-primary" : "text-foreground"
                  }`}
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>

          {/* Icons */}
          <div className="flex items-center gap-2">
            {/* Search */}
            {searchOpen ? (
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-40 md:w-64 h-9"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery("");
                  }}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-foreground" />
                </button>
              </form>
            ) : (
              <>
                <Link to="/try-on" className="p-2 hover:bg-muted rounded-full transition-colors" title="Virtual Try-On">
                  <Sparkles className="h-5 w-5 text-foreground" />
                </Link>
                <Link to="/cart" className="relative p-2 hover:bg-muted rounded-full transition-colors">
                  <ShoppingCart className="h-5 w-5 text-foreground" />
                  {getCartCount() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-pink text-accent-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                      {getCartCount()}
                    </span>
                  )}
                </Link>
                <Link to="/wishlist" className="relative p-2 hover:bg-muted rounded-full transition-colors">
                  <Heart className="h-5 w-5 text-foreground" />
                  {getWishlistCount() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-pink text-accent-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                      {getWishlistCount()}
                    </span>
                  )}
                </Link>
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <Search className="h-5 w-5 text-foreground" />
                </button>
                <Link to="/login" className="p-2 hover:bg-muted rounded-full transition-colors">
                  <User className="h-5 w-5 text-foreground" />
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
