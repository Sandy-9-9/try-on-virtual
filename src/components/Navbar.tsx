import { ShoppingCart, Heart, Search, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const location = useLocation();
  
  const navLinks = [
    { name: "HOME", path: "/" },
    { name: "COLLECTION", path: "/#collection" },
    { name: "SPECIALS", path: "/#specials" },
    { name: "BLOGS", path: "/#blogs" },
    { name: "ABOUT US", path: "/#about" },
    { name: "POPULAR", path: "/#popular" },
    { name: "VIRTUAL TRY-ON", path: "/try-on" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-foreground" />
            <span className="text-xl font-bold tracking-wider text-foreground">ATTIRE</span>
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
          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-muted rounded-full transition-colors">
              <ShoppingCart className="h-5 w-5 text-foreground" />
              <span className="absolute -top-1 -right-1 bg-pink text-accent-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                5
              </span>
            </button>
            <button className="relative p-2 hover:bg-muted rounded-full transition-colors">
              <Heart className="h-5 w-5 text-foreground" />
              <span className="absolute -top-1 -right-1 bg-pink text-accent-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                2
              </span>
            </button>
            <button className="p-2 hover:bg-muted rounded-full transition-colors">
              <Search className="h-5 w-5 text-foreground" />
            </button>
            <Link to="/login" className="p-2 hover:bg-muted rounded-full transition-colors">
              <User className="h-5 w-5 text-foreground" />
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
