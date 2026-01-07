import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { useCart } from "@/context/CartContext";

const Cart = () => {
  const { cartItems, removeFromCart, updateQuantity, getCartTotal, clearCart } = useCart();

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 text-center">
            <ShoppingBag className="h-24 w-24 mx-auto text-muted-foreground mb-6" />
            <h1 className="text-3xl font-bold text-foreground mb-4">Your Cart is Empty</h1>
            <p className="text-muted-foreground mb-8">
              Looks like you haven't added anything to your cart yet.
            </p>
            <Link to="/">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-foreground mb-8">Shopping Cart</h1>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-4 bg-card rounded-lg border border-border"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-24 h-32 object-cover rounded-md"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-card-foreground">{item.name}</h3>
                    <p className="text-lg font-bold text-primary mt-1">₹{item.price}/-</p>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-3 mt-4">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 rounded-md border border-border hover:bg-muted transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="font-medium w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 rounded-md border border-border hover:bg-muted transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-2 h-fit text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="bg-card rounded-lg border border-border p-6 h-fit">
              <h2 className="text-xl font-bold text-card-foreground mb-4">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>₹{getCartTotal()}/-</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between text-lg font-bold text-card-foreground">
                  <span>Total</span>
                  <span>₹{getCartTotal()}/-</span>
                </div>
              </div>

              <Link to="/checkout">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mb-3">
                  Proceed to Checkout
                </Button>
              </Link>
              
              <Button
                variant="outline"
                onClick={clearCart}
                className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                Clear Cart
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Cart;
