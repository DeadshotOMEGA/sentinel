import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Avatar } from './ui/heroui-polyfills';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header
      className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6"
      role="banner"
    >
      <h1 id="page-title" className="text-xl font-semibold text-gray-900">{title}</h1>

      <div className="flex items-center gap-4">
        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <Button variant="light" className="flex items-center gap-2" aria-label="User menu">
              <Avatar
                name={user ? `${user.firstName} ${user.lastName}` : "User"}
                size="sm"
                className="bg-primary text-white"
              />
              <span className="hidden sm:inline">{user?.firstName}</span>
            </Button>
          </DropdownTrigger>
          <DropdownMenu aria-label="User actions">
            <DropdownItem key="profile" className="h-14 gap-2">
              <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </DropdownItem>
            <DropdownItem key="logout" color="danger" onPress={handleLogout}>
              Sign Out
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </header>
  );
}
