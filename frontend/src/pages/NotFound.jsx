import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-canvas px-4 text-center">
      <p className="text-5xl">🍽️</p>
      <h1 className="text-xl font-semibold text-neutral-900">Page not found</h1>
      <p className="text-sm text-neutral-500">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/" className="btn-primary mt-2">
        Go home
      </Link>
    </div>
  );
}
