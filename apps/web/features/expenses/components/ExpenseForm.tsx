'use client';

import { useState, useEffect } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useCreateExpense, useUpdateExpense, useCategories } from '../hooks/useExpenses';
import type { Expense, CreateExpenseDTO } from '@/types';
import { PaymentMethod } from '@/types';

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  expense?: Expense;
  mode?: 'create' | 'edit';
}

export function ExpenseForm({
  open,
  onOpenChange,
  workspaceId,
  expense,
  mode = 'create'
}: ExpenseFormProps) {
  const [formData, setFormData] = useState<Partial<CreateExpenseDTO>>({
    title: '',
    amount: 0,
    currency: 'USD',
    description: '',
    merchant: '',
    isReimbursable: true,
    categoryId: '',
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: PaymentMethod.CREDIT_CARD,
  });
  const [files, setFiles] = useState<File[]>([]);

  const createExpense = useCreateExpense(workspaceId);
  const updateExpense = useUpdateExpense(workspaceId, expense?.id || '');
  const { data: categoriesResponse } = useCategories(workspaceId);

  // Handle both array and object with items array
  const categories = Array.isArray(categoriesResponse?.data)
    ? categoriesResponse.data
    : categoriesResponse?.data?.items || [];

  // Populate form if editing or reset if creating
  useEffect(() => {
    if (open) {
      if (expense && mode === 'edit') {
        setFormData({
          title: expense.title,
          amount: parseFloat(expense.amount),
          currency: expense.currency,
          description: expense.description || '',
          merchant: expense.merchant || '',
          isReimbursable: expense.isReimbursable,
          categoryId: expense.categoryId || '',
          expenseDate: expense.expenseDate.split('T')[0],
          paymentMethod: expense.paymentMethod,
        });
      } else if (mode === 'create') {
        // Reset form when opening in create mode
        setFormData({
          title: '',
          amount: 0,
          currency: 'USD',
          description: '',
          merchant: '',
          isReimbursable: true,
          categoryId: '',
          expenseDate: new Date().toISOString().split('T')[0],
          paymentMethod: PaymentMethod.CREDIT_CARD,
        });
      }
    }
  }, [open, expense, mode]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: CreateExpenseDTO = {
      title: formData.title || '',
      amount: Number(formData.amount),
      currency: formData.currency || 'USD',
      description: formData.description || '',
      merchant: formData.merchant || '',
      isReimbursable: formData.isReimbursable ?? true,
      categoryId: formData.categoryId || '',
      expenseDate: formData.expenseDate || new Date().toISOString().split('T')[0],
      paymentMethod: formData.paymentMethod || PaymentMethod.CREDIT_CARD,
    };

    if (mode === 'create') {
      await createExpense.mutateAsync(data);
    } else {
      await updateExpense.mutateAsync(data);
    }

    // Reset form and close
    setFormData({
      title: '',
      amount: 0,
      currency: 'USD',
      description: '',
      merchant: '',
      isReimbursable: true,
      categoryId: '',
      expenseDate: new Date().toISOString().split('T')[0],
      paymentMethod: PaymentMethod.CREDIT_CARD,
    });
    setFiles([]);
    onOpenChange(false);
  };

  const handleChange = (field: keyof CreateExpenseDTO, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'New expense' : 'Edit expense'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            {/* Form Fields */}
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title*</Label>
                <Input
                  id="title"
                  placeholder="Enter expense title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="merchant">Merchant</Label>
                <Input
                  id="merchant"
                  placeholder="Enter merchant name"
                  value={formData.merchant}
                  onChange={(e) => handleChange('merchant', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="expenseDate">Date*</Label>
                  <Input
                    id="expenseDate"
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => handleChange('expenseDate', e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => handleChange('currency', value)}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="amount">Amount*</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => handleChange('amount', e.target.value)}
                    required
                    className="flex-1"
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="reimbursable"
                      checked={formData.isReimbursable}
                      onCheckedChange={(checked) =>
                        handleChange('isReimbursable', checked)
                      }
                    />
                    <Label htmlFor="reimbursable" className="font-normal">
                      Reimbursable
                    </Label>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="paymentMethod">Payment Method*</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => handleChange('paymentMethod', value as PaymentMethod)}
                >
                  <SelectTrigger id="paymentMethod">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PaymentMethod.CASH}>Cash</SelectItem>
                    <SelectItem value={PaymentMethod.CREDIT_CARD}>Credit Card</SelectItem>
                    <SelectItem value={PaymentMethod.DEBIT_CARD}>Debit Card</SelectItem>
                    <SelectItem value={PaymentMethod.BANK_TRANSFER}>Bank Transfer</SelectItem>
                    <SelectItem value={PaymentMethod.CHECK}>Check</SelectItem>
                    <SelectItem value={PaymentMethod.DIGITAL_WALLET}>Digital Wallet</SelectItem>
                    <SelectItem value={PaymentMethod.OTHER}>Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="categoryId">Category</Label>
                <Select
                  value={formData.categoryId || ''}
                  onValueChange={(value) => handleChange('categoryId', value)}
                >
                  <SelectTrigger id="categoryId">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {categories.map((category) => (
                      <SelectItem key={category.categoryId} value={category.categoryId}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Add a description for this expense"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            {/* File Upload */}
            <div className="grid gap-2">
              <Label>Invoice attachments</Label>
              <div className="rounded-lg border-2 border-dashed border-border bg-muted/20 p-8">
                <div className="flex flex-col items-center justify-center gap-2 text-center">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Upload an invoice</p>
                    <p className="text-xs text-muted-foreground">
                      Drag and drop or click to browse
                    </p>
                  </div>
                  <Input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    className="hidden"
                    id="file-upload"
                    onChange={handleFileUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      document.getElementById('file-upload')?.click()
                    }
                  >
                    Browse files
                  </Button>
                </div>
              </div>

              {/* Uploaded Files */}
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border bg-card p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded bg-muted p-2">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createExpense.isPending || updateExpense.isPending}
            >
              {createExpense.isPending || updateExpense.isPending
                ? 'Saving...'
                : mode === 'create'
                ? 'Create expense'
                : 'Update expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
