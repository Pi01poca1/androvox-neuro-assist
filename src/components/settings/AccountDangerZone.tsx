import { useState } from 'react';
import { AlertTriangle, Trash2, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { deleteUser, getLocalDB } from '@/lib/localDb';

export function AccountDangerZone() {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!profile?.id) return;
    
    setIsDeleting(true);
    try {
      await deleteUser(profile.id);
      await signOut();
      toast({
        title: 'Conta excluída',
        description: 'Sua conta foi removida do sistema.',
      });
      navigate('/auth/login');
    } catch (error) {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a conta.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetSystem = async () => {
    setIsResetting(true);
    try {
      // Get all object store names and clear them
      const db = await getLocalDB();
      const storeNames = Array.from(db.objectStoreNames);
      
      // Close the database first
      db.close();
      
      // Delete the entire database
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase('androvox-local-db');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to delete database'));
        request.onblocked = () => {
          console.warn('Database deletion blocked');
          resolve(); // Continue anyway
        };
      });

      // Clear local storage
      localStorage.clear();
      sessionStorage.clear();

      toast({
        title: 'Sistema resetado',
        description: 'Todos os dados foram apagados. A página será recarregada.',
      });

      // Reload the page after a short delay
      setTimeout(() => {
        window.location.href = '/auth/register';
      }, 1500);
    } catch (error) {
      console.error('Error resetting system:', error);
      toast({
        title: 'Erro ao resetar',
        description: 'Não foi possível limpar o sistema. Tente recarregar a página.',
        variant: 'destructive',
      });
      setIsResetting(false);
    }
  };

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Zona de Perigo
        </CardTitle>
        <CardDescription>
          Ações irreversíveis. Tenha certeza antes de prosseguir.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Delete Own Account */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Trash2 className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium">Excluir Minha Conta</h4>
              <p className="text-sm text-muted-foreground">
                Remove permanentemente sua conta e desconecta do sistema.
                Os dados do consultório (pacientes, sessões) permanecem para outros usuários.
              </p>
            </div>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Minha Conta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Excluir sua conta?
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>
                    Esta ação é <strong>irreversível</strong>. Sua conta será permanentemente excluída.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="delete-confirm">
                      Digite <strong>EXCLUIR</strong> para confirmar:
                    </Label>
                    <Input
                      id="delete-confirm"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      placeholder="EXCLUIR"
                    />
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmation !== 'EXCLUIR' || isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Excluindo...' : 'Excluir Conta'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Separator />

        {/* Reset Entire System */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Database className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium">Limpar Todo o Sistema</h4>
              <p className="text-sm text-muted-foreground">
                Remove <strong>TODOS</strong> os dados do sistema: usuários, pacientes, sessões, 
                configurações. Útil para recomeçar do zero ou limpar dados de teste.
              </p>
            </div>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Database className="h-4 w-4 mr-2" />
                Limpar Todo o Sistema
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  ATENÇÃO: Apagar TODOS os dados?
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p className="text-destructive font-medium">
                    Esta ação é EXTREMAMENTE DESTRUTIVA e IRREVERSÍVEL!
                  </p>
                  <p>
                    Serão apagados permanentemente:
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Todos os usuários (profissionais e secretários)</li>
                    <li>Todos os pacientes e seus dados</li>
                    <li>Todas as sessões e anexos</li>
                    <li>Todas as configurações do consultório</li>
                  </ul>
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="reset-confirm">
                      Digite <strong>APAGAR TUDO</strong> para confirmar:
                    </Label>
                    <Input
                      id="reset-confirm"
                      value={resetConfirmation}
                      onChange={(e) => setResetConfirmation(e.target.value)}
                      placeholder="APAGAR TUDO"
                    />
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setResetConfirmation('')}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleResetSystem}
                  disabled={resetConfirmation !== 'APAGAR TUDO' || isResetting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isResetting ? 'Apagando...' : 'Apagar Tudo'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
