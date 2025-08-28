import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function useLogoutWithRedirect() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const logoutAndRedirect = () => {
    logout();
    navigate('/'); // Redirect to landing page
  };

  return logoutAndRedirect;
}
