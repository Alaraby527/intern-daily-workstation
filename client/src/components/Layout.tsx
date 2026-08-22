import { Outlet } from "react-router-dom";
import { IdentityProvider } from '@client/src/store/identity-context';

const Layout = () => {
  return (
    <div className="min-h-screen w-full bg-background text-foreground font-sans">
      <IdentityProvider>
        <main className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6 md:py-10">
          <Outlet />
        </main>
      </IdentityProvider>
    </div>
  );
};

export default Layout;
