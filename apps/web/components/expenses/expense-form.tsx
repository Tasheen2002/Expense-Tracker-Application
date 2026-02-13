'use client';

import { useState } from 'react';
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

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpenseForm({ open, onOpenChange }: ExpenseFormProps) {
  const [files, setFiles] = useState<File[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New expense</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          {/* Left Column - Form Fields */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject*</Label>
              <Input id="subject" placeholder="Enter subject" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="merchant">Merchant*</Label>
              <Input id="merchant" placeholder="Enter merchant name" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Date*</Label>
                <Input id="date" type="date" defaultValue="2025-01-24" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select defaultValue="usd">
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usd">USD</SelectItem>
                    <SelectItem value="eur">EUR</SelectItem>
                    <SelectItem value="gbp">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="total">Total*</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="total"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                />
                <div className="flex items-center gap-2">
                  <Checkbox id="reimbursable" defaultChecked />
                  <Label htmlFor="reimbursable" className="font-normal">
                    Reimbursable
                  </Label>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Category*</Label>
              <Select>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="food">Food & Dining</SelectItem>
                  <SelectItem value="office">Office Supplies</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Airport transfer from downtown hotel"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="employee">Employee*</Label>
              <Input
                id="employee"
                placeholder="Janice Chandler"
                defaultValue="Janice Chandler"
              />
            </div>

            <div className="grid gap-2">
              <Label>Add to report</Label>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox id="yes" defaultChecked />
                  <Label htmlFor="yes" className="font-normal">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="no" />
                  <Label htmlFor="no" className="font-normal">
                    No
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - File Upload */}
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

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="outline">Save draft</Button>
          <Button>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
