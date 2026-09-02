import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 rounded-xl border border-destructive/30 bg-destructive/5 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground">Ocurrió un inconveniente visual en este módulo</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              La sección encontró un error inesperado de renderizado. El resto del sistema y el menú de navegación siguen estando 100% operativos.
            </p>
          </div>
          {this.state.error && (
            <pre className="text-xs bg-background/80 p-3 rounded border border-border text-destructive font-mono max-w-xl overflow-x-auto text-left">
              {this.state.error.toString()}
            </pre>
          )}
          <Button onClick={this.handleReset} className="gap-2 bg-primary text-primary-foreground">
            <RefreshCw className="h-4 w-4" /> Recargar Módulo
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
