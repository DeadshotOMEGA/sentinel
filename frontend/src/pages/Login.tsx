import { useState } from 'react';
import { Card, CardHeader, CardBody, Button, Input, Checkbox } from '../components/ui/heroui-polyfills';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid username or password';
      setError(message.includes('401') || message.includes('unauthorized')
        ? 'Invalid username or password'
        : message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col gap-1 px-6 pt-6">
          <h1 className="text-2xl font-bold text-primary">Sentinel</h1>
          <p className="text-sm text-gray-600">
            HMCS Chippawa Attendance System
          </p>
        </CardHeader>
        <CardBody className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger">
                {error}
              </div>
            )}
            <Input
              label="Username"
              value={username}
              onValueChange={setUsername}
              isRequired
              autoFocus
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onValueChange={setPassword}
              isRequired
            />
            <Checkbox isSelected={remember} onValueChange={setRemember}>
              Remember me
            </Checkbox>
            <Button
              type="submit"
              color="primary"
              isDisabled={isLoading}
              className="mt-2"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
