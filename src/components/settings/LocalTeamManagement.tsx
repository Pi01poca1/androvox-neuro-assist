import { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  getClinicUsers,
  createUser,
  deleteUser,
  type LocalUser,
} from '@/lib/localDb';

export function LocalTeamManagement() {
  const { profile, clinicId } = useAuth();
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<LocalUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // New secretary form
  const [secretaryName, setSecretaryName] = useState('');
  const [secretaryEmail, setSecretaryEmail] = useState('');
  const [secretaryPassword, setSecretaryPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadTeamMembers = async () => {
    if (!clinicId) return;
    setIsLoading(true);
    try {
      const users = await getClinicUsers(clinicId);
      setTeamMembers(users);
    } catch (error) {
      console.error('Error loading team:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTeamMembers();
  }, [clinicId]);

  const handleCreateSecretary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId || !secretaryName || !secretaryEmail || !secretaryPassword) return;

    if (secretaryPassword.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter no mínimo 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      await createUser(
        secretaryEmail.toLowerCase().trim(),
        secretaryPassword,
        secretaryName,
        'secretario',
        clinicId
      );
      
      toast({
        title: 'Secretário cadastrado!',
        description: `${secretaryName} foi adicionado à equipe.`,
      });
      
      setSecretaryName('');
      setSecretaryEmail('');
      setSecretaryPassword('');
      setIsDialogOpen(false);
      loadTeamMembers();
    } catch (error) {
      const err = error as Error;
      toast({
        title: 'Erro ao cadastrar',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteMember = async (member: LocalUser) => {
    try {
      await deleteUser(member.id);
      toast({
        title: 'Membro removido',
        description: `${member.full_name} foi removido da equipe.`,
      });
      loadTeamMembers();
    } catch (error) {
      toast({
        title: 'Erro ao remover',
        description: 'Não foi possível remover o membro.',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'profissional') {
      return <Badge variant="default">Profissional</Badge>;
    }
    return <Badge variant="secondary">Secretário</Badge>;
  };

  const currentUserId = profile?.id;

  return (
    <div className="space-y-6">
      {/* Team Members Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Equipe do Consultório
              </CardTitle>
              <CardDescription>
                Gerencie os membros da sua equipe local
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Novo Secretário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreateSecretary}>
                  <DialogHeader>
                    <DialogTitle>Cadastrar Secretário</DialogTitle>
                    <DialogDescription>
                      Crie uma conta de secretário para acesso ao sistema.
                      O secretário poderá cadastrar pacientes e agendar consultas.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome Completo</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Nome do secretário"
                        value={secretaryName}
                        onChange={(e) => setSecretaryName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@exemplo.com"
                        value={secretaryEmail}
                        onChange={(e) => setSecretaryEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={secretaryPassword}
                        onChange={(e) => setSecretaryPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? 'Cadastrando...' : 'Cadastrar'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : teamMembers.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum membro encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.full_name}
                      {member.id === currentUserId && (
                        <Badge variant="outline" className="ml-2 text-xs">Você</Badge>
                      )}
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{getRoleBadge(member.role)}</TableCell>
                    <TableCell>
                      {format(new Date(member.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      {member.role === 'secretario' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                Remover Secretário?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover <strong>{member.full_name}</strong> da equipe?
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteMember(member)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Separator className="my-6" />

          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <p className="font-medium mb-2">ℹ️ Sobre a Equipe Local:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Secretários podem cadastrar pacientes e agendar consultas</li>
              <li>Secretários NÃO têm acesso aos dados clínicos das sessões</li>
              <li>Use os Pacotes de Sincronização para compartilhar dados entre computadores</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
