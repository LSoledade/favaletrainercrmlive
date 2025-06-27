import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, RouteComponentProps } from "wouter";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>; // Consider using RouteComponentProps if your components expect router props
}

export default function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  // useAuth now returns { session, user (SupabaseUser), profile (custom User) }
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      // The Route wrapper here might be redundant if you just want to show a loader globally
      // or handle loading state within Layout. For now, keeping structure similar.
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If there's no active session, redirect to auth page.
  // Supabase's user object is part of the session.
  if (!session) {
    return (
      <Route path={path}>
        {() => <Redirect to="/auth" />}
      </Route>
    );
  }

  return (
    <Route path={path}>
      {(params) => <Component {...params} />}
    </Route>
  );
}
