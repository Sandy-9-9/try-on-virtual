import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

export interface CartItem {
  id: string;
  product_id: number;
  product_name: string;
  product_price: number;
  product_image: string;
  quantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  loading: boolean;
  addToCart: (item: Omit<CartItem, "id" | "quantity">) => Promise<void>;
  removeFromCart: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getCartTotal: () => number;
  getCartCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch cart items when user changes
  useEffect(() => {
    if (user) {
      fetchCartItems();
    } else {
      setCartItems([]);
    }
  }, [user]);

  const fetchCartItems = async () => {
    if (!user) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from("cart_items")
      .select("*")
      .eq("user_id", user.id);

    if (!error && data) {
      setCartItems(data.map(item => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_price: item.product_price,
        product_image: item.product_image,
        quantity: item.quantity,
      })));
    }
    setLoading(false);
  };

  const addToCart = async (item: Omit<CartItem, "id" | "quantity">) => {
    if (!user) return;

    // Check if item already exists
    const existing = cartItems.find((i) => i.product_id === item.product_id);
    
    if (existing) {
      await updateQuantity(existing.id, existing.quantity + 1);
    } else {
      const { data, error } = await supabase
        .from("cart_items")
        .insert({
          user_id: user.id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_price: item.product_price,
          product_image: item.product_image,
          quantity: 1,
        })
        .select()
        .single();

      if (!error && data) {
        setCartItems((prev) => [...prev, {
          id: data.id,
          product_id: data.product_id,
          product_name: data.product_name,
          product_price: data.product_price,
          product_image: data.product_image,
          quantity: data.quantity,
        }]);
      }
    }
  };

  const removeFromCart = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", id);

    if (!error) {
      setCartItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const updateQuantity = async (id: string, quantity: number) => {
    if (!user) return;

    if (quantity <= 0) {
      await removeFromCart(id);
      return;
    }

    const { error } = await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", id);

    if (!error) {
      setCartItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, quantity } : i))
      );
    }
  };

  const clearCart = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", user.id);

    if (!error) {
      setCartItems([]);
    }
  };

  const getCartTotal = () =>
    cartItems.reduce((sum, item) => sum + item.product_price * item.quantity, 0);

  const getCartCount = () =>
    cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        loading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
