"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Box, Button, Callout, Container, Heading, Text } from "@radix-ui/themes";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the component tree,
 * logs those errors, and displays a fallback UI instead of crashing the app.
 * 
 * Usage:
 * <ErrorBoundary fallback={<CustomFallback />}>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    // Log to error reporting service (e.g., Sentry, LogRocket)
    // You can integrate your preferred error tracking here
  }

  public reset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Container size="2" style={{ padding: "24px" }}>
          <Callout.Root color="red" role="alert">
            <Callout.Content>
              <Heading size="5" mb="2">
                Something went wrong
              </Heading>
              <Text size="2" as="p" mb="3">
                {this.state.error?.message || "An unexpected error occurred"}
              </Text>
              <Box style={{ marginTop: "16px" }}>
                <Button onClick={this.reset} variant="solid">
                  Try again
                </Button>
              </Box>
            </Callout.Content>
          </Callout.Root>
        </Container>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-Order Component wrapper for ErrorBoundary
 * 
 * Usage:
 * const ProtectedComponent = withErrorBoundary(YourComponent);
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  ErrorFallback?: React.ComponentType<{ error: Error | null; reset: () => void }>,
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary
        fallback={
          ErrorFallback ? (
            <ErrorFallback error={null} reset={() => {}} />
          ) : undefined
        }
      >
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
