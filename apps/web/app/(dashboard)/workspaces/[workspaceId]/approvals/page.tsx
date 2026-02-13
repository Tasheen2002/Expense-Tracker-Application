'use client';

import { useState } from 'react';
import { Eye, Check, X, Filter, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ApprovalModal } from '@/components/approvals/approval-modal';
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
  avatar?: string;
}

const mockApprovals: Approval[] = [
  {
    id: '1',
    owner: 'Samson Zap',
    role: 'Engineer',
    category: 'Travel',
    amount: 780.0,
    frequency: 'Once',
    description: "Travel to client's HQ for pitch presentation.",
    project: 'Client Design',
    team: 'Websites',
  },
  {
    id: '2',
    owner: 'Jessica Bowers',
    role: 'Designer',
    category: 'Travel',
    amount: 430.0,
    frequency: 'Once',
    description: 'Conference attendance and networking.',
    project: 'Brand Refresh',
    team: 'Marketing',
  },
  {
    id: '3',
    owner: 'John Wilson',
    role: 'Account Executive',
    category: 'Food',
    amount: 95.5,
    frequency: 'Monthly',
    description: 'Team lunch for project kickoff.',
    project: 'Q4 Campaign',
    team: 'Sales',
  },
  {
    id: '4',
    owner: 'Hannah Gomez',
    role: 'Product Manager',
    category: 'Travel',
    amount: 560.0,
    frequency: 'Monthly',
    description: 'Client site visit and requirements gathering.',
    project: 'Product Roadmap',
    team: 'Product',
  },
  {
    id: '5',
    owner: 'Laura Polis',
    role: 'Designer',
    category: 'Software',
    amount: 120.0,
    frequency: 'Bi-Monthly',
    description: 'Design tool subscription renewal.',
    project: 'Design System',
    team: 'Design',
  },
  {
    id: '6',
    owner: 'Barbara Jones',
    role: 'Strategist',
    category: 'Software',
    amount: 275.75,
    frequency: 'Bi-Monthly',
    description: 'Analytics platform subscription.',
    project: 'Data Insights',
    team: 'Strategy',
  },
  {
    id: '7',
    owner: 'Zach Moss',
    role: 'Engineer',
    category: 'Travel',
    amount: 30.0,
    frequency: 'Monthly',
    description: 'Commute reimbursement.',
    project: 'Infrastructure',
    team: 'Engineering',
  },
];

const categoryColors: Record<string, string> = {
  Travel: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Food: 'bg-red-500/10 text-red-500 border-red-500/20',
  Software: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
};

export default function ApprovalsPage() {
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(
    null
  );
  const [showModal, setShowModal] = useState(false);

  const handleView = (approval: Approval) => {
    setSelectedApproval(approval);
    setShowModal(true);
  };

  const handleApprove = () => {
    console.log('Approved:', selectedApproval?.id);
    // TODO: API call to approve
  };

  const handleDecline = () => {
    console.log('Declined:', selectedApproval?.id);
    // TODO: API call to decline
  };

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Approvals</h1>
          <p className="text-muted-foreground">
            Review and approve pending expense requests
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" className="gap-2">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Approvals Table */}
      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="border-b text-left text-sm font-medium text-muted-foreground">
              <th className="px-4 py-3">OWNER</th>
              <th className="px-4 py-3">CATEGORY</th>
              <th className="px-4 py-3">AMOUNT</th>
              <th className="px-4 py-3">FREQUENCY</th>
              <th className="px-4 py-3">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {mockApprovals.map((approval) => (
              <tr
                key={approval.id}
                className="border-b last:border-0 transition-colors hover:bg-muted/50"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={approval.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {approval.owner
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{approval.owner}</p>
                      <p className="text-sm text-muted-foreground">
                        {approval.role}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <Badge
                    className={
                      categoryColors[approval.category] ||
                      'bg-gray-500/10 text-gray-500'
                    }
                  >
                    {approval.category}
                  </Badge>
                </td>
                <td className="px-4 py-4 font-medium">
                  {formatCurrency(approval.amount, 'EUR')}
                </td>
                <td className="px-4 py-4 text-sm text-muted-foreground">
                  {approval.frequency}
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleView(approval)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-green-500 hover:bg-green-500/10 hover:text-green-500"
                      onClick={() => {
                        setSelectedApproval(approval);
                        handleApprove();
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-500 hover:bg-red-500/10 hover:text-red-500"
                      onClick={() => {
                        setSelectedApproval(approval);
                        handleDecline();
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Approval Modal */}
      <ApprovalModal
        approval={selectedApproval}
        open={showModal}
        onOpenChange={setShowModal}
        onApprove={handleApprove}
        onDecline={handleDecline}
      />
    </div>
  );
}
