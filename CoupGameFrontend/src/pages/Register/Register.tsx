import React, { useState } from 'react';
import useAuth from '@hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Container, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const Register: React.FC = () => {
  const { t } = useTranslation(['auth', 'common']);
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (form.password !== form.confirmPassword) {
      setError(t('auth:register.error.passwordMismatch'));
      return;
    }
    
    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      navigate('/login');
    } catch (err: any) {
      if (err.response?.data?.message === 'Username already exists') {
        setError(t('auth:register.error.userExists'));
      } else {
        setError(t('common:error.generic'));
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container className="my-5">
      <h2>{t('auth:register.title')}</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form onSubmit={handleSubmit}>
        <Form.Group controlId="username" className="mb-3">
          <Form.Label>{t('auth:register.username')}</Form.Label>
          <Form.Control 
            type="text" 
            name="username" 
            value={form.username} 
            onChange={handleChange} 
            required 
          />
        </Form.Group>
        <Form.Group controlId="email" className="mb-3">
          <Form.Label>{t('auth:register.email')}</Form.Label>
          <Form.Control 
            type="email" 
            name="email" 
            value={form.email} 
            onChange={handleChange} 
            required 
          />
        </Form.Group>
        <Form.Group controlId="password" className="mb-3">
          <Form.Label>{t('auth:register.password')}</Form.Label>
          <Form.Control 
            type="password" 
            name="password" 
            value={form.password} 
            onChange={handleChange} 
            required 
          />
        </Form.Group>
        <Form.Group controlId="confirmPassword" className="mb-3">
          <Form.Label>{t('auth:register.confirmPassword')}</Form.Label>
          <Form.Control 
            type="password" 
            name="confirmPassword" 
            value={form.confirmPassword} 
            onChange={handleChange} 
            required 
          />
        </Form.Group>
        <Button variant="primary" type="submit" disabled={loading}>
          {loading ? (
            <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
          ) : (
            t('auth:register.submit')
          )}
        </Button>
      </Form>
    </Container>
  );
};

export default Register;
