import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  createSessionAttachment, 
  deleteAttachment,
  generateUUID,
  type LocalSessionAttachment,
} from '@/lib/localDb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Upload, X, File, Loader2, FileText, Image as ImageIcon } from 'lucide-react';

interface SessionAttachmentsProps {
  sessionId: string;
  attachments: LocalSessionAttachment[];
  onUpdate?: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

export function SessionAttachments({ sessionId, attachments, onUpdate }: SessionAttachmentsProps) {
  const { user, clinicId } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [localAttachments, setLocalAttachments] = useState<LocalSessionAttachment[]>(attachments);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    if (!clinicId || !user) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    
    for (const file of Array.from(files)) {
      // Validate file
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({
          title: 'Tipo de arquivo não permitido',
          description: 'Use PDF ou imagens (JPG, PNG, WEBP).',
          variant: 'destructive',
        });
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'Arquivo muito grande',
          description: 'Tamanho máximo: 10MB.',
          variant: 'destructive',
        });
        continue;
      }

      try {
        // Read file as ArrayBuffer for local storage
        const fileData = await file.arrayBuffer();
        const filePath = `local/${sessionId}/${generateUUID()}_${file.name}`;
        
        const attachment = await createSessionAttachment({
          session_id: sessionId,
          clinic_id: clinicId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          file_data: fileData,
          uploaded_by: user.id,
        });

        setLocalAttachments(prev => [...prev, attachment]);
        
        toast({
          title: 'Arquivo anexado',
          description: `${file.name} foi anexado com sucesso.`,
        });
      } catch (error) {
        toast({
          title: 'Erro ao anexar arquivo',
          description: error instanceof Error ? error.message : 'Erro desconhecido',
          variant: 'destructive',
        });
      }
    }
    
    setUploading(false);
    event.target.value = ''; // Reset input
    onUpdate?.();
  };

  const handleDelete = async (attachment: LocalSessionAttachment) => {
    setIsDeleting(attachment.id);
    try {
      await deleteAttachment(attachment.id);
      setLocalAttachments(prev => prev.filter(a => a.id !== attachment.id));
      
      toast({
        title: 'Arquivo removido',
        description: `${attachment.file_name} foi removido.`,
      });
      onUpdate?.();
    } catch (error) {
      toast({
        title: 'Erro ao remover arquivo',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const downloadFile = (attachment: LocalSessionAttachment) => {
    try {
      if (!attachment.file_data) {
        toast({
          title: 'Erro',
          description: 'Dados do arquivo não encontrados',
          variant: 'destructive',
        });
        return;
      }

      // Create download link from stored ArrayBuffer
      const blob = new Blob([attachment.file_data], { type: attachment.file_type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: 'Erro ao baixar arquivo',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    if (fileType === 'application/pdf') return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div>
        <input
          type="file"
          id="file-upload"
          className="hidden"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        <label htmlFor="file-upload">
          <Button asChild variant="outline" disabled={uploading}>
            <span className="cursor-pointer">
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Anexar Arquivos
                </>
              )}
            </span>
          </Button>
        </label>
        <p className="text-xs text-muted-foreground mt-2">
          PDF ou imagens (JPG, PNG, WEBP) até 10MB
        </p>
      </div>

      {/* Attachments List */}
      {localAttachments && localAttachments.length > 0 && (
        <div className="space-y-2">
          {localAttachments.map((attachment) => (
            <Card key={attachment.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-muted-foreground">
                      {getFileIcon(attachment.file_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{attachment.file_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(attachment.file_size)} •{' '}
                        {new Date(attachment.uploaded_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadFile(attachment)}
                    >
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(attachment)}
                      disabled={isDeleting === attachment.id}
                    >
                      {isDeleting === attachment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(!localAttachments || localAttachments.length === 0) && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhum arquivo anexado
        </p>
      )}
    </div>
  );
}
