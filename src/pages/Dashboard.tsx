import { formatDateFR } from "@/lib/date-utils";
import { useQuery } from "@tanstack/react-query";
import { getWorkers, getDocuments, DOCUMENT_TYPES } from "@/lib/supabase-helpers";
import { Users, FileText, LogOut, AlertTriangle, FilePlus } from "lucide-react";
import { Link } from "react-router-dom";

const statCards = [
  { key: "contract", icon: FilePlus, color: "bg-primary" },
  { key: "bon_sortie", icon: LogOut, color: "bg-warning" },
  { key: "avertissement", icon: AlertTriangle, color: "bg-destructive" },
] as const;

export default function Dashboard() {
  const { data: workers } = useQuery({ queryKey: ["workers"], queryFn: getWorkers });
  const { data: documents } = useQuery({ queryKey: ["documents"], queryFn: getDocuments });

  const docCounts = documents?.reduce((acc, doc) => {
    acc[doc.document_type] = (acc[doc.document_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">Vue d'ensemble de votre gestion documentaire</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card rounded-xl p-5 border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-info/10">
              <Users className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold">{workers?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Employés</p>
            </div>
          </div>
        </div>
        {statCards.map(({ key, icon: Icon, color }) => (
          <div key={key} className="bg-card rounded-xl p-5 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${color}/10`}>
                <Icon className={`w-5 h-5 ${color.replace("bg-", "text-")}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{docCounts[key] ?? 0}</p>
                <p className="text-xs text-muted-foreground">{DOCUMENT_TYPES[key].label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/workers" className="p-4 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-all text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
              <span className="text-sm font-medium">Gérer employés</span>
            </Link>
            <Link to="/generate/contract" className="p-4 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-all text-center">
              <FilePlus className="w-6 h-6 mx-auto mb-2 text-primary" />
              <span className="text-sm font-medium">Nouveau contrat</span>
            </Link>
            <Link to="/generate/bon_sortie" className="p-4 rounded-lg border hover:border-warning/50 hover:bg-warning/5 transition-all text-center">
              <LogOut className="w-6 h-6 mx-auto mb-2 text-warning" />
              <span className="text-sm font-medium">Bon de sortie</span>
            </Link>
            <Link to="/generate/avertissement" className="p-4 rounded-lg border hover:border-destructive/50 hover:bg-destructive/5 transition-all text-center">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-destructive" />
              <span className="text-sm font-medium">Avertissement</span>
            </Link>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">Documents récents</h2>
          {documents && documents.length > 0 ? (
            <div className="space-y-3">
              {documents.slice(0, 5).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {DOCUMENT_TYPES[doc.document_type as keyof typeof DOCUMENT_TYPES]?.label} • {formatDateFR(doc.created_at)}
                    </p>
                  </div>
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun document créé</p>
          )}
        </div>
      </div>
    </div>
  );
}
