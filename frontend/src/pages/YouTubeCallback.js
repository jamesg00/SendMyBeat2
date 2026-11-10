import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API } from '@/App';
import { toast } from 'sonner';

const YouTubeCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        toast.error('YouTube connection cancelled');
        navigate('/dashboard');
        return;
      }

      if (code) {
        try {
          const formData = new FormData();
          formData.append('code', code);
          // The one-time state from /youtube/auth-url; the server checks it was issued to you.
          formData.append('state', searchParams.get('state') || '');
          
          const response = await axios.post(`${API}/youtube/connect`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          toast.success(`YouTube connected: ${response.data.email}`);
          navigate('/dashboard');
        } catch (error) {
          toast.error('Failed to connect YouTube account');
          navigate('/dashboard');
        }
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="s-app" style={{ alignItems: "center", justifyContent: "center", gap: 14 }}>
      <span className="s-spinner" role="status" aria-label="Loading" />
      <p className="s-body">Connecting your YouTube account…</p>
    </div>
  );
};

export default YouTubeCallback;