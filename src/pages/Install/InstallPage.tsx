 import { useState, useEffect } from 'react';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { 
   Download, 
   Smartphone, 
   Monitor, 
   CheckCircle2, 
   Wifi, 
   WifiOff,
   ArrowLeft,
   Chrome,
   Apple
 } from 'lucide-react';
 import { useNavigate } from 'react-router-dom';
 
 interface BeforeInstallPromptEvent extends Event {
   prompt: () => Promise<void>;
   userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
 }
 
 export default function InstallPage() {
   const navigate = useNavigate();
   const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
   const [isInstalled, setIsInstalled] = useState(false);
   const [isOnline, setIsOnline] = useState(navigator.onLine);
   const [isIOS, setIsIOS] = useState(false);
 
   useEffect(() => {
     // Detectar iOS
     const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
     setIsIOS(iOS);
 
     // Verificar se já está instalado
     if (window.matchMedia('(display-mode: standalone)').matches) {
       setIsInstalled(true);
     }
 
     const handler = (e: Event) => {
       e.preventDefault();
       setDeferredPrompt(e as BeforeInstallPromptEvent);
     };
 
     const onlineHandler = () => setIsOnline(true);
     const offlineHandler = () => setIsOnline(false);
 
     window.addEventListener('beforeinstallprompt', handler);
     window.addEventListener('online', onlineHandler);
     window.addEventListener('offline', offlineHandler);
 
     return () => {
       window.removeEventListener('beforeinstallprompt', handler);
       window.removeEventListener('online', onlineHandler);
       window.removeEventListener('offline', offlineHandler);
     };
   }, []);
 
   const handleInstall = async () => {
     if (!deferredPrompt) return;
 
     deferredPrompt.prompt();
     const { outcome } = await deferredPrompt.userChoice;
 
     if (outcome === 'accepted') {
       setDeferredPrompt(null);
       setIsInstalled(true);
     }
   };
 
   return (
     <div className="min-h-screen bg-background p-4 md:p-8">
       <div className="max-w-2xl mx-auto space-y-6">
         <Button
           variant="ghost"
           size="sm"
           onClick={() => navigate(-1)}
           className="text-muted-foreground hover:text-foreground"
         >
           <ArrowLeft className="h-4 w-4 mr-1" />
           Voltar
         </Button>
 
         <div className="text-center space-y-2">
           <img 
             src="/pwa-192x192.png" 
             alt="Androvox Assist" 
             className="w-20 h-20 mx-auto rounded-2xl shadow-lg"
           />
           <h1 className="text-2xl font-bold">Androvox Assist</h1>
           <p className="text-muted-foreground">
             Sistema de gestão clínica 100% offline
           </p>
         </div>
 
         {/* Status */}
         <div className="flex justify-center gap-4">
           <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
             isOnline ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
           }`}>
             {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
             {isOnline ? 'Online' : 'Offline'}
           </div>
           {isInstalled && (
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-primary/10 text-primary">
               <CheckCircle2 className="h-4 w-4" />
               Instalado
             </div>
           )}
         </div>
 
         {/* Card de Instalação */}
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Smartphone className="h-5 w-5 text-primary" />
               Instalar no seu Dispositivo
             </CardTitle>
             <CardDescription>
               Instale o aplicativo para usar offline em qualquer computador
             </CardDescription>
           </CardHeader>
           <CardContent className="space-y-6">
             {isInstalled ? (
               <div className="text-center py-4">
                 <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-3" />
                 <p className="font-medium">Aplicativo já instalado!</p>
                 <p className="text-sm text-muted-foreground">
                   Você pode usar o Androvox Assist 100% offline.
                 </p>
               </div>
             ) : isIOS ? (
               <div className="space-y-4">
                 <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                   <Apple className="h-6 w-6 text-muted-foreground mt-0.5" />
                   <div>
                     <p className="font-medium">Instalação no iOS/macOS</p>
                     <ol className="text-sm text-muted-foreground mt-2 space-y-2">
                       <li>1. Toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta)</li>
                       <li>2. Role e toque em <strong>"Adicionar à Tela de Início"</strong></li>
                       <li>3. Confirme tocando em <strong>"Adicionar"</strong></li>
                     </ol>
                   </div>
                 </div>
               </div>
             ) : deferredPrompt ? (
               <Button onClick={handleInstall} className="w-full" size="lg">
                 <Download className="h-5 w-5 mr-2" />
                 Instalar Androvox Assist
               </Button>
             ) : (
               <div className="space-y-4">
                 <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                   <Chrome className="h-6 w-6 text-muted-foreground mt-0.5" />
                   <div>
                     <p className="font-medium">Instalação no Chrome/Edge</p>
                     <ol className="text-sm text-muted-foreground mt-2 space-y-2">
                       <li>1. Clique no ícone de <strong>instalação</strong> na barra de endereços (⊕)</li>
                       <li>2. Ou vá em <strong>Menu (⋮) → Instalar aplicativo</strong></li>
                       <li>3. Confirme clicando em <strong>"Instalar"</strong></li>
                     </ol>
                   </div>
                 </div>
               </div>
             )}
           </CardContent>
         </Card>
 
         {/* Benefícios */}
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Monitor className="h-5 w-5 text-primary" />
               Benefícios do Aplicativo
             </CardTitle>
           </CardHeader>
           <CardContent>
             <ul className="space-y-3">
               <li className="flex items-start gap-3">
                 <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                 <div>
                   <p className="font-medium">100% Offline</p>
                   <p className="text-sm text-muted-foreground">
                     Funciona sem internet. Todos os dados ficam no seu computador.
                   </p>
                 </div>
               </li>
               <li className="flex items-start gap-3">
                 <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                 <div>
                   <p className="font-medium">Acesso Rápido</p>
                   <p className="text-sm text-muted-foreground">
                     Ícone na área de trabalho ou dock para acesso instantâneo.
                   </p>
                 </div>
               </li>
               <li className="flex items-start gap-3">
                 <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                 <div>
                   <p className="font-medium">Privacidade Total</p>
                   <p className="text-sm text-muted-foreground">
                     Dados clínicos armazenados localmente com segurança.
                   </p>
                 </div>
               </li>
               <li className="flex items-start gap-3">
                 <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                 <div>
                   <p className="font-medium">Atualizações Automáticas</p>
                   <p className="text-sm text-muted-foreground">
                     Quando conectado, recebe melhorias automaticamente.
                   </p>
                 </div>
               </li>
             </ul>
           </CardContent>
         </Card>
 
         {/* Instruções */}
         <Card>
           <CardHeader>
             <CardTitle>Como Funciona</CardTitle>
           </CardHeader>
           <CardContent className="prose prose-sm max-w-none text-muted-foreground">
             <p>
               O Androvox Assist é um <strong>Progressive Web App (PWA)</strong>, uma tecnologia 
               moderna que permite instalar sites como aplicativos nativos.
             </p>
             <p>
               Após a instalação, o aplicativo funciona <strong>100% offline</strong>. 
               Todos os seus dados de pacientes e sessões são armazenados localmente 
               no navegador usando IndexedDB, uma tecnologia segura de armazenamento.
             </p>
             <p>
               <strong>Recomendação:</strong> Faça backups regulares através das 
               Configurações para garantir a segurança dos seus dados clínicos.
             </p>
           </CardContent>
         </Card>
       </div>
     </div>
   );
 }