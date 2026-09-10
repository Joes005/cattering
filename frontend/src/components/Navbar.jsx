import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="navbar">
      <div className="nav-inner">
        <Link to="/" className="nav-logo">
          🍽 Plated<span>.</span>
        </Link>
        <div className="nav-links">
          <Link to="/vendors">Find Caterers</Link>
          {user?.role === 'organizer' && <Link to="/dashboard">My Events</Link>}
          {user?.role === 'vendor' && <Link to="/vendor-dashboard">Vendor Dashboard</Link>}
          {user && <Link to="/messages">Messages</Link>}
          {user && <Link to="/account">{user.name.split(' ')[0]}</Link>}
          {!user && <Link to="/login">Log in</Link>}
          {!user && (
            <Link to="/signup" className="btn btn-primary">
              Sign up
            </Link>
          )}
          {user && (
            <button className="btn btn-outline" onClick={handleLogout}>
              Log out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
