'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

interface Approval {
  id: string;
  owner: string;
  role: string;
  category: string;
  amount: number;
  frequency: string;
  description: string;
  project: string;
  team: string;
}

interface ApprovalModalProps {
  approval: Approval | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: () => void;
  onDecline: () => void;
}

const categoryColors: Record<string, string> = {
  Travel: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Food: 'bg-red-500/10 text-red-500 border-red-500/20',
  Software: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
};

export function ApprovalModal({
  approval,
  open,
  onOpenChange,
  onApprove,
  onDecline,
}: ApprovalModalProps) {
  if (!approval) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Expense Request
            <Badge variant="warning">Pending</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Amount</p>
              <p className="text-2xl font-bold">
                {formatCurrency(approval.amount, 'EUR')}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Category
              </p>
              <Badge
                className={`mt-1 ${categoryColors[approval.category] || 'bg-gray-500/10 text-gray-500'}`}
              >
                {approval.category}
              </Badge>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Project</p>
            <p className="mt-1 font-medium">{approval.project}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Description
            </p>
            <p className="mt-1 text-sm">{approval.description}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Team</p>
            <p className="mt-1 font-medium">{approval.team}</p>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              onDecline();
              onOpenChange(false);
            }}
          >
            Decline
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onApprove();
              onOpenChange(false);
            }}
          >
            Approve
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
