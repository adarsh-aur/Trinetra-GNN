import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-teal-400 mb-4">404</h1>
        <p className="text-xl text-slate-300 mb-8">Page not found</p>
        <Link to="/dashboard" className="bg-teal-500 text-white px-6 py-3 rounded-lg hover:bg-teal-600">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;