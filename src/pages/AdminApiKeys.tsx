import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, KeyRound, Trash2, Plus } from "lucide-react";

const PROJECT_URL = "https://xtkzwmepptbpuutepkum.supabase.co";
const ENDPOINT = `${PROJECT_URL}/functions/v1/external-api`;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `rhk_${hex}`;
}

export default function AdminApiKeys() {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["api_keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (label: string) => {
      const key = generateKey();
      const key_hash = await sha256Hex(key);
      const key_prefix = key.slice(0, 12);
      const { error } = await supabase.from("api_keys").insert({ label, key_hash, key_prefix });
      if (error) throw error;
      return key;
    },
    onSuccess: (key) => {
      setCreatedKey(key);
      setLabel("");
      qc.invalidateQueries({ queryKey: ["api_keys"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("api_keys")
        .update({ active: false, revoked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Clé révoquée");
      qc.invalidateQueries({ queryKey: ["api_keys"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Clé supprimée");
      qc.invalidateQueries({ queryKey: ["api_keys"] });
    },
  });

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast.success("Copié");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <KeyRound className="w-6 h-6" /> Clés API externes
        </h1>
        <p className="text-muted-foreground">
          Clés statiques pour appeler l'API depuis un backend externe. Elles n'expirent jamais.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Créer une nouvelle clé</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 items-end">
          <div className="flex-1">
            <Label>Libellé</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex: Backend production, Script import..."
            />
          </div>
          <Button onClick={() => createMutation.mutate(label)} disabled={!label || createMutation.isPending}>
            <Plus className="w-4 h-4 mr-2" /> Générer
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clés existantes</CardTitle>
          <CardDescription>Seul le préfixe est affiché — la clé complète n'est visible qu'au moment de la création.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <p className="text-muted-foreground">Chargement...</p>}
          {keys.map((k: any) => (
            <div key={k.id} className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <div className="font-medium">{k.label}</div>
                <div className="text-xs text-muted-foreground font-mono">{k.key_prefix}…</div>
                <div className="text-xs text-muted-foreground">
                  Créée le {new Date(k.created_at).toLocaleDateString()}
                  {k.last_used_at && ` · Dernière utilisation: ${new Date(k.last_used_at).toLocaleString()}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {k.active && !k.revoked_at ? (
                  <Badge className="bg-green-600">Active</Badge>
                ) : (
                  <Badge variant="destructive">Révoquée</Badge>
                )}
                {k.active && !k.revoked_at && (
                  <Button size="sm" variant="outline" onClick={() => revokeMutation.mutate(k.id)}>
                    Révoquer
                  </Button>
                )}
                <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(k.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {!isLoading && keys.length === 0 && (
            <p className="text-muted-foreground text-sm">Aucune clé pour l'instant.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comment utiliser depuis un backend externe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p><strong>Endpoint :</strong></p>
          <div className="flex items-center gap-2">
            <code className="bg-muted px-2 py-1 rounded text-xs flex-1 break-all">{ENDPOINT}</code>
            <Button size="icon" variant="ghost" onClick={() => copy(ENDPOINT)}><Copy className="w-4 h-4" /></Button>
          </div>
          <p><strong>Headers :</strong></p>
          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">{`Authorization: Bearer <VOTRE_CLE_API>
Content-Type: application/json`}</pre>
          <p><strong>Exemples de body (POST) :</strong></p>
          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">{`// Lire des employés
{ "table": "workers", "action": "select", "limit": 50 }

// Filtrer
{ "table": "documents", "action": "select", "filters": { "type": "contract" } }

// Insérer
{ "table": "absences", "action": "insert", "data": { "worker_id": "...", "date": "2026-06-20", "observation": "Maladie" } }

// Mettre à jour
{ "table": "workers", "action": "update", "filters": { "id": "..." }, "data": { "phone": "0600000000" } }

// Supprimer
{ "table": "documents", "action": "delete", "filters": { "id": "..." } }`}</pre>
          <p className="text-muted-foreground">
            Tables autorisées : <code>workers, documents, absences, conges, acompte_transactions</code>.
            La clé ne change jamais et ne nécessite aucun refresh.
          </p>
        </CardContent>
      </Card>

      <Dialog open={!!createdKey} onOpenChange={(o) => !o && setCreatedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Votre nouvelle clé API</DialogTitle>
            <DialogDescription className="text-destructive font-medium">
              ⚠️ Copiez-la maintenant — elle ne sera plus jamais affichée.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <code className="bg-muted p-3 rounded text-xs flex-1 break-all">{createdKey}</code>
            <Button size="icon" onClick={() => createdKey && copy(createdKey)}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedKey(null)}>J'ai copié la clé</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
