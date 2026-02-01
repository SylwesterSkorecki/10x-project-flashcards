import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountSettingsProps {
  userEmail: string;
  createdAt?: string;
}

export function AccountSettings({ userEmail, createdAt }: AccountSettingsProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleteError(null);

    if (!deletePassword) {
      setDeleteError("Wpisz hasło aby potwierdzić usunięcie konta");
      return;
    }

    setDeleting(true);

    try {
      // TODO: Implement actual account deletion
      // 1. Validate password by re-authenticating
      // const { error: authError } = await supabaseClient.auth.signInWithPassword({
      //   email: userEmail,
      //   password: deletePassword
      // });

      // if (authError) {
      //   setDeleteError("Nieprawidłowe hasło");
      //   return;
      // }

      // 2. Call DELETE /api/account endpoint
      // const response = await fetch('/api/account', {
      //   method: 'DELETE',
      //   headers: {
      //     'Authorization': `Bearer ${token}`
      //   }
      // });

      // if (!response.ok) {
      //   throw new Error('Failed to delete account');
      // }

      // 3. Sign out and redirect
      // await supabaseClient.auth.signOut();
      // window.location.href = '/auth/login?message=account_deleted';

      console.log("Account deletion requested");
    } catch (error: any) {
      setDeleteError("Wystąpił błąd podczas usuwania konta. Spróbuj ponownie.");
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Niedostępne";
    return new Date(dateString).toLocaleDateString("pl-PL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Ustawienia konta</h1>
        <p className="text-muted-foreground">Zarządzaj swoim kontem i danymi osobowymi</p>
      </div>

      <div className="space-y-6">
        {/* Account Information */}
        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Informacje o koncie</h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={userEmail} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Twój adres email nie może być zmieniony</p>
            </div>

            {createdAt && (
              <div className="space-y-2">
                <Label>Data utworzenia konta</Label>
                <Input value={formatDate(createdAt)} disabled className="bg-muted" />
              </div>
            )}
          </div>
        </div>

        {/* Change Password */}
        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Zmiana hasła</h2>
          <p className="text-sm text-muted-foreground">Aby zmienić hasło, skorzystaj z opcji resetowania hasła</p>
          <Button variant="outline" asChild>
            <a href="/auth/forgot-password">Zresetuj hasło</a>
          </Button>
        </div>

        {/* Danger Zone */}
        <div className="border border-destructive/50 rounded-lg p-6 space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-destructive">Strefa niebezpieczna</h2>
            <p className="text-sm text-muted-foreground">
              Działania w tej sekcji są nieodwracalne. Postępuj ostrożnie.
            </p>
          </div>

          <div className="pt-2">
            <Button variant="destructive" onClick={() => setShowDeleteModal(true)} className="gap-2">
              <Trash2 className="size-4" />
              Usuń konto
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={showDeleteModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowDeleteModal(false);
            setDeletePassword("");
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-5" />
              Usuń konto na stałe
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>
                <strong>Ta operacja jest nieodwracalna.</strong> Wszystkie Twoje fiszki i dane zostaną trwale usunięte.
              </p>
              <p>Czy na pewno chcesz kontynuować?</p>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {deleteError && (
              <div role="alert" className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="size-4 flex-shrink-0" />
                  {deleteError}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="delete-password">
                Wpisz swoje hasło aby potwierdzić
                <span className="text-destructive ml-1" aria-label="wymagane">
                  *
                </span>
              </Label>
              <Input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(e) => {
                  setDeletePassword(e.target.value);
                  if (deleteError) setDeleteError(null);
                }}
                placeholder="Twoje hasło"
                disabled={deleting}
                className={cn(deleteError && "border-destructive focus-visible:ring-destructive")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setDeletePassword("");
                setDeleteError(null);
              }}
              disabled={deleting}
            >
              Anuluj
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting || !deletePassword}>
              {deleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Usuwanie...
                </>
              ) : (
                "Usuń konto na stałe"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
