'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import {
  Home,
  Receipt,
  Plane,
  CheckSquare,
  Settings,
  Phone,
  LogOut,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLogout } from '@/features/auth';

export function Sidebar() {
  const pathname = usePathname();
  const logout = useLogout();

  // Extract workspace ID from current pathname
  const workspaceId = useMemo(() => {
    const match = pathname.match(/\/workspaces\/([^\/]+)/);
    return match ? match[1] : 'demo-workspace';
  }, [pathname]);

  const navigation = useMemo(() => [
    { name: 'Home', href: `/workspaces/${workspaceId}`, icon: Home },
    { name: 'Expenses', href: `/workspaces/${workspaceId}/expenses`, icon: Receipt },
    { name: 'Trips', href: `/workspaces/${workspaceId}/trips`, icon: Plane },
    { name: 'Approvals', href: `/workspaces/${workspaceId}/approvals`, icon: CheckSquare },
    { name: 'Settings', href: `/workspaces/${workspaceId}/settings`, icon: Settings },
    { name: 'Support', href: `/workspaces/${workspaceId}/support`, icon: Phone },
  ], [workspaceId]);

  const handleLogout = () => {
    logout.mutate();
  };

  return (
    <div className="flex h-screen w-64 flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <svg
            className="h-5 w-5 text-primary-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <span className="text-lg font-bold text-sidebar-foreground">
          Expensio
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="border-t border-border p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-sidebar-foreground/5 transition-colors">
              <Avatar>
                <AvatarImage src="/avatar-placeholder.jpg" alt="User" />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  JC
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden text-left">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  Janice Chandler
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  janice@company.com
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
