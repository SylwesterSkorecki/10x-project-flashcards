import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, FileText, Loader2 } from "lucide-react";

interface NavigationProps {
  isAuthenticated: boolean;
  userEmail?: string;
}

export function Navigation({ isAuthenticated, userEmail }: NavigationProps) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      // TODO: Implement actual logout logic with Supabase
      // await supabaseClient.auth.signOut();
      // window.location.href = '/auth/login?message=logged_out';
      
      console.log("Logout initiated");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoggingOut(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <nav className="border-b bg-background">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="text-xl font-bold">
            SmartFlash
          </a>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <a href="/auth/login">Zaloguj się</a>
            </Button>
            <Button asChild>
              <a href="/auth/register">Zarejestruj się</a>
            </Button>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <a href="/" className="text-xl font-bold">
          SmartFlash
        </a>
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild className="hidden sm:flex">
            <a href="/generate">Generuj fiszki</a>
          </Button>
          
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowMenu(!showMenu)}
              className="gap-2"
            >
              <span className="hidden sm:inline">{userEmail}</span>
              <span className="sm:hidden">Menu</span>
            </Button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-popover border z-50">
                  <div className="py-1" role="menu">
                    <div className="px-4 py-2 text-sm text-muted-foreground border-b">
                      {userEmail}
                    </div>
                    
                    <a
                      href="/generate"
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
                      role="menuitem"
                    >
                      <FileText className="size-4" />
                      Generuj fiszki
                    </a>
                    
                    <a
                      href="/account/settings"
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
                      role="menuitem"
                    >
                      <Settings className="size-4" />
                      Ustawienia konta
                    </a>
                    
                    <div className="border-t my-1" />
                    
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent w-full text-left text-destructive"
                      role="menuitem"
                    >
                      {loggingOut ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Wylogowywanie...
                        </>
                      ) : (
                        <>
                          <LogOut className="size-4" />
                          Wyloguj się
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
