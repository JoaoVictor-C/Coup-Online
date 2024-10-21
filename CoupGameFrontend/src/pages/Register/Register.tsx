import React, { useState } from 'react';
import useAuth from '@hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Container, Form, Button, Alert } from 'react-bootstrap';

const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(form.username, form.email, form.password);
      setSuccess('Registration successful! You can now log in.');
      setError(null);
      // Optionally, redirect to login
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      setSuccess(null);
    }
  };
  
  return (
    <Container className="my-5">
      <div className="register-card shadow p-4">
        <h2>Register</h2>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="username" className="mb-3">
            <Form.Label>Username</Form.Label>
            <Form.Control 
              type="text" 
              name="username" 
              value={form.username} 
              onChange={handleChange} 
              required 
            />
          </Form.Group>
          <Form.Group controlId="email" className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control 
              type="email" 
              name="email" 
              value={form.email} 
              onChange={handleChange} 
              required 
            />
          </Form.Group>
          <Form.Group controlId="password" className="mb-3">
            <Form.Label>Password</Form.Label>
            <Form.Control 
              type="password" 
              name="password" 
              value={form.password} 
              onChange={handleChange} 
              required 
            />
          </Form.Group>
          <Button variant="primary" type="submit">Register</Button>
        </Form>
      </div>
    </Container>
  );
};

export default Register;
