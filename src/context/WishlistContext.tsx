import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

export interface WishlistItem {
  id: string;
  product_id: number;
  product_name: string;
  product_price: number;
  product_image: string;
}

interface WishlistContextType {
  wishlistItems: WishlistItem[];
  loading: boolean;
  addToWishlist: (item: Omit<WishlistItem, "id">) => Promise<void>;
  removeFromWishlist: (id: string) => Promise<void>;
  isInWishlist: (productId: number) => boolean;
  getWishlistCount: () => number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch wishlist items when user changes
  useEffect(() => {
    if (user) {
      fetchWishlistItems();
    } else {
      setWishlistItems([]);
    }
  }, [user]);

  const fetchWishlistItems = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("wishlist_items")
      .select("*")
      .eq("user_id", user.id);

    if (!error && data) {
      setWishlistItems(data.map(item => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_price: item.product_price,
        product_image: item.product_image,
      })));
    }
    setLoading(false);
  };

  const addToWishlist = async (item: Omit<WishlistItem, "id">) => {
    if (!user) return;

    // Check if already in wishlist
    if (isInWishlist(item.product_id)) return;

    const { data, error } = await supabase
      .from("wishlist_items")
      .insert({
        user_id: user.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_price: item.product_price,
        product_image: item.product_image,
      })
      .select()
      .single();

    if (!error && data) {
      setWishlistItems((prev) => [...prev, {
        id: data.id,
        product_id: data.product_id,
        product_name: data.product_name,
        product_price: data.product_price,
        product_image: data.product_image,
      }]);
    }
  };

  const removeFromWishlist = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("wishlist_items")
      .delete()
      .eq("id", id);

    if (!error) {
      setWishlistItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const isInWishlist = (productId: number) =>
    wishlistItems.some((i) => i.product_id === productId);

  const getWishlistCount = () => wishlistItems.length;

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        loading,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        getWishlistCount,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used within WishlistProvider");
  return context;
};
