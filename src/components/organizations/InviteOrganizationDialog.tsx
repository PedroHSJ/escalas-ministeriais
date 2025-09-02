import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface InviteOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizacaoId: string;
  onInvited?: () => void;
}

export function InviteOrganizationDialog({ open, onOpenChange, organizacaoId, onInvited }: InviteOrganizationDialogProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInvite = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/convites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, organizacaoId })
      });
      if (!res.ok) throw new Error("Erro ao enviar convite");
      setEmail("");
      onOpenChange(false);
      onInvited?.();
    } catch (e: any) {
      setError(e.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar para organização</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            type="email"
            placeholder="E-mail do convidado"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={loading}
          />
          {error && <div className="text-red-500 text-sm">{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleInvite} disabled={loading || !email}>
            {loading ? "Enviando..." : "Enviar convite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
