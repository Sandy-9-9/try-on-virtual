import { useState } from "react";
import { CreditCard, Check } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, getCartTotal, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      setOrderPlaced(true);
      clearCart();
      toast.success("Order placed successfully!");
    }, 2000);
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-lg text-center">
            <div className="bg-card rounded-lg border border-border p-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-4">Order Confirmed!</h1>
              <p className="text-muted-foreground mb-8">
                Thank you for your purchase. Your order has been placed successfully.
              </p>
              <Link to="/">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (cartItems.length === 0) {
    navigate("/cart");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-foreground mb-8">Checkout</h1>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Payment Form */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-xl font-bold text-card-foreground mb-6 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Details
              </h2>

              <form onSubmit={handlePayment} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="John" required />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Doe" required />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="john@example.com" required />
                </div>

                <div>
                  <Label htmlFor="address">Shipping Address</Label>
                  <Input id="address" placeholder="123 Main Street" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input id="city" placeholder="Mumbai" required />
                  </div>
                  <div>
                    <Label htmlFor="pincode">PIN Code</Label>
                    <Input id="pincode" placeholder="400001" required />
                  </div>
                </div>

                <div className="border-t border-border pt-4 mt-6">
                  <h3 className="font-semibold mb-4">Card Information</h3>
                  
                  <div>
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input id="cardNumber" placeholder="1234 5678 9012 3456" required />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="expiry">Expiry Date</Label>
                      <Input id="expiry" placeholder="MM/YY" required />
                    </div>
                    <div>
                      <Label htmlFor="cvv">CVV</Label>
                      <Input id="cvv" type="password" placeholder="***" required />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-6"
                >
                  {isProcessing ? "Processing..." : `Pay ₹${getCartTotal()}/-`}
                </Button>
              </form>
            </div>

            {/* Order Summary */}
            <div className="bg-card rounded-lg border border-border p-6 h-fit">
              <h2 className="text-xl font-bold text-card-foreground mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-20 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-card-foreground">{item.name}</p>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-semibold">₹{item.price * item.quantity}/-</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>₹{getCartTotal()}/-</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-card-foreground pt-2">
                  <span>Total</span>
                  <span>₹{getCartTotal()}/-</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Checkout;
