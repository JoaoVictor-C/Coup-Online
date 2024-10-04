import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../store/actions/authActions';
import { Navigate, Link } from 'react-router-dom';
import '../assets/styles/LoginPage.css'; // Import the LoginPage styles

const LoginPage = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, error } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(login(formData.username, formData.password));
  };

  if (isAuthenticated) {
    return <Navigate to="/profile" />;
  }

  return (
    <div className="login-container py-5">
      <div className="login-card shadow">
        <h2 className="mb-4">Login</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group mb-3">
            <label htmlFor="username">Username</label>
            <input 
              type="text" 
              name="username" 
              id="username"
              value={formData.username} 
              onChange={handleChange} 
              placeholder="Enter your username" 
              required 
              className="form-control border"
            />
          </div>
          <div className="form-group mb-4">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              name="password" 
              id="password"
              value={formData.password} 
              onChange={handleChange} 
              placeholder="Enter your password" 
              required 
              className="form-control border"
            />
          </div>
          <button type="submit" className="btn btn-primary w-100">Login</button>
        </form>
        <p className="mt-3 text-center">
          Don&apos;t have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;