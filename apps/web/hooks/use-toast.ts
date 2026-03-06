import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

export function useToast() {
  const toast = ({ title, description, variant = 'default', duration = 3000 }: ToastOptions) => {
    const message = title || description || '';
    const desc = title && description ? description : undefined;

    if (variant === 'destructive') {
      sonnerToast.error(message, {
        description: desc,
        duration,
      });
    } else if (variant === 'success') {
      sonnerToast.success(message, {
        description: desc,
        duration,
      });
    } else {
      sonnerToast(message, {
        description: desc,
        duration,
      });
    }
  };

  return { toast };
}
