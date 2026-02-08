import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from './ui/button';
import { LogIn, LogOut } from 'lucide-react';

export default function LoginButton() {
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  const isAuthenticated = !!identity;
  const disabled = loginStatus === 'logging-in';

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
    } else {
      try {
        await login();
      } catch (error: any) {
        console.error('Login error:', error);
        if (error.message === 'User is already authenticated') {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  return (
    <Button 
      onClick={handleAuth} 
      disabled={disabled} 
      variant={isAuthenticated ? 'outline' : 'default'}
      size="sm"
      className="text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4"
    >
      {loginStatus === 'logging-in' ? (
        <span className="hidden sm:inline">Logging in...</span>
      ) : isAuthenticated ? (
        <>
          <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
          <span className="hidden sm:inline">Logout</span>
        </>
      ) : (
        <>
          <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
          <span className="hidden sm:inline">Login</span>
        </>
      )}
    </Button>
  );
}
