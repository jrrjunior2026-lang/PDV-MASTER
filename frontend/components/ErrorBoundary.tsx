import React, { ReactNode } from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

// Componente padrão de fallback
const DefaultErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
    error,
    resetErrorBoundary
}) => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            <h1 className="text-2xl font-bold text-slate-800 mb-4">
                Ops! Algo deu errado
            </h1>

            <p className="text-slate-600 mb-6">
                Ocorreu um erro inesperado na aplicação. Nossa equipe técnica foi notificada.
            </p>

            <div className="space-y-3">
                <button
                    onClick={resetErrorBoundary}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition font-medium"
                >
                    <RefreshCw size={18} />
                    Tentar Novamente
                </button>

                <button
                    onClick={() => window.location.href = '/'}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium"
                >
                    <Home size={18} />
                    Voltar ao Início
                </button>
            </div>

            {process.env.NODE_ENV === 'development' && error && (
                <details className="mt-6 text-left">
                    <summary className="cursor-pointer text-sm font-medium text-slate-500 hover:text-slate-700">
                        Detalhes técnicos (desenvolvimento)
                    </summary>
                    <div className="mt-3 p-4 bg-slate-100 rounded-lg">
                        <pre className="text-xs text-slate-800 whitespace-pre-wrap break-all">
                            {error.toString()}
                            {error.stack}
                        </pre>
                    </div>
                </details>
            )}
        </div>
    </div>
);

// Função de log de erro
const logError = (error: Error, errorInfo: { componentStack: string }) => {
    console.error('Error Boundary caught an error:', error, errorInfo);

    // Aqui você poderia enviar o erro para um serviço de monitoramento
    // Ex: Sentry, LogRocket, etc.
    // Example: Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
};

export const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children, fallback }) => {
    const handleError = (error: Error, errorInfo: { componentStack: string }) => {
        logError(error, errorInfo);
    };

    const handleReset = () => {
        // Lógica adicional de reset se necessário
        console.log('Error boundary reset triggered');
    };

    return (
        <ReactErrorBoundary
            FallbackComponent={fallback ? () => <>{fallback}</> : DefaultErrorFallback}
            onError={handleError}
            onReset={handleReset}
        >
            {children}
        </ReactErrorBoundary>
    );
};
