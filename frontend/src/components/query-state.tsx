import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";

export function QueryLoading({ message = "Carregando..." }: { message?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-3 p-8">
      <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
      <p role="status" className="text-sm text-muted-foreground">
        {message}
      </p>
    </div>
  );
}

export function QueryError({
  message = "Não foi possível carregar os dados.",
  onRetry,
  isRetrying = false,
}: {
  message?: string;
  onRetry?: () => void | Promise<unknown>;
  isRetrying?: boolean;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 p-8 text-center">
      <p role="alert" className="text-sm text-destructive">
        {message}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={() => void onRetry()} disabled={isRetrying}>
          <RefreshCw className={isRetrying ? "animate-spin" : undefined} />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
