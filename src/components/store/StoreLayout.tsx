import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";
import { AuthDialog } from "./AuthDialog";

export function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
      <AuthDialog />
    </div>
  );
}
