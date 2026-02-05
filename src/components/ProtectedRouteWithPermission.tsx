 import { ReactNode } from 'react';
 import { Navigate } from 'react-router-dom';
 import { useAuth } from '@/hooks/useAuth';
 import { usePermissions } from '@/hooks/usePermissions';
 import { Loader2 } from 'lucide-react';
 import type { Permission } from '@/types/roles';
 
 interface ProtectedRouteWithPermissionProps {
   children: ReactNode;
   requiredPermission?: keyof Permission;
   redirectTo?: string;
 }
 
 export function ProtectedRouteWithPermission({ 
   children, 
   requiredPermission,
   redirectTo = '/dashboard'
 }: ProtectedRouteWithPermissionProps) {
   const { user, loading } = useAuth();
   const permissions = usePermissions();
 
   if (loading) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-background">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
     );
   }
 
   if (!user) {
     return <Navigate to="/auth/login" replace />;
   }
 
   // Check if specific permission is required and if user has it
   if (requiredPermission && !permissions[requiredPermission]) {
     return <Navigate to={redirectTo} replace />;
   }
 
   return <>{children}</>;
 }