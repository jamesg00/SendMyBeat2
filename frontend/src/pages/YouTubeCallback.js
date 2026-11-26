import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API } from '@/App';
import { toast } from 'sonner';
import { setAuthToken } from '@/lib/auth';

// Google sends people back here for two things: linking YouTube to the account they're signed
// into, and "Continue with Google" sign-in. Sign-in states start with this prefix.
export const GOOGLE_SIGNIN_STATE_PREFIX = 'signin.';

const YouTubeCallback = ({ isAuthenticated, setIsAuthenticated }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const handled = useRef(false);
  const state = searchParams.get('state') || '';
  const isSignIn = state.startsWith(GOOGLE_SIGNIN_STATE_PREFIX);

  useEffect(() => {
    if (handled.current) return;  // a code works once; don't send it twice
    handled.current = true;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    const signIn = async () => {
      if (error || !code) {
        toast.error('Google sign-in cancelled');
        navigate('/', { replace: true });
        return;
      }
      try {
        const response = await axios.post(`${API}/auth/google`, { code, state });
        setAuthToken(response.data.access_token);
        setIsAuthenticated?.(true);
        toast.success(`Welcome, ${response.data.user?.username || 'producer'}!`);
        navigate('/dashboard', { replace: true });
      } catch (err) {
        const detail = err.response?.data?.detail;
        toast.error(typeof detail === 'string' ? detail : 'Google sign-in failed');
        navigate('/', { replace: true });
      }
    };

    const connectYouTube = async () => {
      if (!isAuthenticated) {
        navigate('/', { replace: true });
        return;
      }
      if (error || !code) {
        toast.error('YouTube connection cancelled');
        navigate('/dashboard');
        return;
      }
      try {
        const formData = new FormData();
        formData.append('code', code);
        // The one-time state from /youtube/auth-url; the server checks it was issued to you.
        formData.append('state', state);
        const response = await axios.post(`${API}/youtube/connect`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success(`YouTube connected: ${response.data.email}`);
      } catch (err) {
        toast.error('Failed to connect YouTube account');
      }
      navigate('/dashboard');
    };

    if (isSignIn) signIn();
    else connectYouTube();
  }, [searchParams, navigate, isAuthenticated, isSignIn, setIsAuthenticated, state]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--c-bg)" }}>
      <div className="text-center">
        <div className="app-boot-bar mx-auto mb-4"><i /></div>
        <p className="smb-t2">{isSignIn ? 'Signing you in with Google...' : 'Connecting your YouTube account...'}</p>
      </div>
    </div>
  );
};

export default YouTubeCallback;
