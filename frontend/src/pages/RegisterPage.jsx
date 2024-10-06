import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { register } from '../store/actions/authActions';
import '../assets/styles/RegisterPage.css'; // Import the RegisterPage styles

const RegisterPage = () => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '', 
  });
  const [error, setError] = useState('');


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await dispatch(register(formData));
      console.log(response);
      if (response.message === 'User registered successfully') {
        setFormData({ username: '', password: '', email: '' });
        window.location.href = '/';
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
  };

  return (
    <div className="register-container py-5">
      <div className="register-card shadow">
        <h2 className="mb-4">Register</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit} className="register-form">
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
          <div className="form-group mb-3">
            <label htmlFor="email">Email</label>
            <input 
              type="email" 
              name="email" 
              id="email"
              value={formData.email} 
              onChange={handleChange} 
              placeholder="Enter your email" 
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
          <button type="submit" className="btn btn-primary w-100">Register</button>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;