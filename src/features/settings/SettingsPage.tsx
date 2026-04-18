
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '@/lib/storage';
import { usersApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { Lock, Github, CheckCircle, Loader2, Link2, FolderTree } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function SettingsPage() {
    const navigate = useNavigate();
    const [token, setToken] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [groupId, setGroupId] = useState('');
    const [loading, setLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const savedToken = storage.getToken();
        const savedUrl = storage.getUrl();
        const savedGroupId = storage.getGroupId();

        setBaseUrl(savedUrl);
        setGroupId(savedGroupId);

        if (savedToken) {
            setToken(savedToken);
            setIsConnected(true);
        }
    }, []);

    const handleSave = async () => {
        if (!token.trim() || !baseUrl.trim()) return;

        setLoading(true);
        try {
            storage.setUrl(baseUrl);
            storage.setGroupId(groupId || '52');
            storage.setToken(token);

            // Verify token works
            const isValid = await usersApi.checkConnection();

            if (isValid) {
                setIsConnected(true);
                toast.success('Successfully connected to GitLab');
                navigate('/');
            } else {
                throw new Error('Invalid Token');
            }
        } catch (error) {
            toast.error('Failed to connect. Please check your token.');
            storage.removeToken();
            setIsConnected(false);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        storage.removeToken();
        setToken('');
        setIsConnected(false);
        toast.info('Disconnected from GitLab');
    };

    return (
        <div className="flex flex-col min-h-screen bg-background">
            {/* We can wrap this in DashboardLayout if we want the sidebar, but for initial setup it might be better standalone. 
            However, consistency is good. Let's use a standalone centered layout for simplicity or consistency? 
            Given this is 'Settings', it usually lives inside the app layout.
        */}
            <DashboardLayout>
                <div className="flex items-center justify-center p-6 min-h-[80vh]">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Github className="w-5 h-5" />
                                GitLab Configuration
                            </CardTitle>
                            <CardDescription>
                                Enter your GitLab Personal Access Token to fetch your project data.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg border">
                                    <span className="text-sm font-medium">Status</span>
                                    {isConnected ? (
                                        <span className="flex items-center text-green-500 text-sm font-medium">
                                            <CheckCircle className="w-4 h-4 mr-1" /> Connected
                                        </span>
                                    ) : (
                                        <span className="flex items-center text-muted-foreground text-sm">
                                            Not Connected
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Personal Access Token
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="password"
                                        placeholder="glpat-..."
                                        className="pl-9"
                                        value={token}
                                        onChange={(e) => setToken(e.target.value)}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Create a token with <code>read_api</code> scope in User Settings &gt; Access Tokens.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    GitLab Base URL
                                </label>
                                <div className="relative">
                                    <Link2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="url"
                                        placeholder="https://gitlab.example.com"
                                        className="pl-9"
                                        value={baseUrl}
                                        onChange={(e) => setBaseUrl(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Group ID
                                </label>
                                <div className="relative">
                                    <FolderTree className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="52"
                                        className="pl-9"
                                        value={groupId}
                                        onChange={(e) => setGroupId(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            {isConnected && (
                                <Button variant="destructive" onClick={handleLogout} type="button">
                                    Disconnect
                                </Button>
                            )}
                            <Button onClick={handleSave} disabled={loading || !token.trim() || !baseUrl.trim()} className={isConnected ? "ml-auto" : "w-full"}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isConnected ? 'Update Token' : 'Connect GitLab'}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </DashboardLayout>
        </div>
    );
}
