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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Connecting YouTube account...</p>
      </div>
    </div>
  );
};

export default YouTubeCallback;