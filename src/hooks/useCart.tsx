import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  async function loadProduct(productId: number) {
    try {
      const response = await api.get(`products/${productId}`);
      return { ...response.data, amount: 0 };
    } catch (e: any) {
      toast.error("Erro na adição do produto");
    }
  }

  async function loadStock(productId: number) {
    try {
      const response = await api.get(`stock/${productId}`);
      return response.data;
    } catch (e: any) {
      toast.error("Erro na alteração de quantidade do produto");
    }
  }

  const addProduct = async (productId: number) => {
    try {
      const product: Product = await loadProduct(productId);

      const stock: Stock = await loadStock(productId);

      const cartItem = cart.find((item) => item.id === productId);

      const newAmount = (cartItem?.amount || 0) + 1;

      if (stock.amount < newAmount) {
        throw new Error("Quantidade solicitada fora de estoque");
      }

      const newCartItems = [
        ...cart.filter((product) => product.id !== productId),
        { ...product, amount: newAmount },
      ];

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCartItems));

      setCart(newCartItems);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.findIndex((item) => item.id === productId);

      if (productIndex === -1) {
        throw new Error("Erro na remoção do produto");
      }

      const newCartItems = [
        ...cart.filter((product) => product.id !== productId),
      ];

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCartItems));

      setCart(newCartItems);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      await loadProduct(productId);

      const stock: Stock = await loadStock(productId);

      if (stock.amount < amount || amount < 1) {
        throw new Error("Quantidade solicitada fora de estoque");
      }

      const newCartItems = [
        ...cart.map((item) => {
          if (item.id === productId) {
            item.amount = amount;
          }
          return item;
        }),
      ];

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCartItems));

      setCart(newCartItems);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
