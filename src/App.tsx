/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Info,
  Loader2,
  Plus,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { IMAGE_CATEGORIES, InspectionFormData, InspectionImage } from './types';

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm ${className}`}>
    {children}
  </div>
);

const Label = ({ children, required = false }: { children: React.ReactNode; required?: boolean }) => (
  <label className="mb-1.5 block text-sm font-medium text-neutral-700">
    {children}
    {required && <span className="ml-1 text-red-500">*</span>}
  </label>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-neutral-900 outline-none transition-all placeholder:text-neutral-400 focus:border-transparent focus:ring-2 focus:ring-neutral-900"
  />
);

const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className="min-h-[100px] w-full resize-y rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-neutral-900 outline-none transition-all placeholder:text-neutral-400 focus:border-transparent focus:ring-2 focus:ring-neutral-900"
  />
);

const Select = ({ options, ...props }: { options: string[] } & React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className="w-full cursor-pointer appearance-none rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-neutral-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-neutral-900"
  >
    <option value="" disabled>
      Select category
    </option>
    {options.map((option) => (
      <option key={option} value={option}>
        {option}
      </option>
    ))}
  </select>
);

const Button = ({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  ...props
}: {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const variants = {
    primary: 'bg-neutral-900 text-white hover:bg-neutral-800 disabled:bg-neutral-300',
    secondary: 'border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50',
    danger: 'border border-red-100 bg-red-50 text-red-600 hover:bg-red-100',
    ghost: 'bg-transparent text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900',
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 font-medium transition-all disabled:cursor-not-allowed ${variants[variant]}`}
    >
      {loading && <Loader2 size={18} className="animate-spin" />}
      {children}
    </button>
  );
};

const INSPECTORS = ['พี่ก้อย', 'พี่ยุ', 'KP', 'Ma', 'KK'];

type Status = 'idle' | 'checking' | 'no-task' | 'submitting' | 'success' | 'error';

type TaskCheckResponse = {
  ok: boolean;
  taskFound?: boolean;
  taskOpen?: boolean;
  reason?: string;
  inquiryId?: string;
  roomId?: string;
  leaseId?: string;
  taskStage?: string;
  taskStatus?: string;
  assignedTo?: string;
};

function getTaskErrorMessage(reason?: string) {
  switch (reason) {
    case 'MISSING_TASK_ID':
      return 'Missing task ID in the link.';
    case 'MISSING_TOKEN':
      return 'Missing inspection token in the link.';
    case 'TOKEN_MISMATCH':
      return 'This inspection link is invalid or has the wrong token.';
    case 'TASK_CLOSED':
      return 'This inspection task is already closed.';
    case 'TASK_NOT_FOUND':
      return 'Inspection task not found.';
    default:
      return 'This inspection task is not available.';
  }
}

export default function App() {
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || '';

  const [formData, setFormData] = useState<InspectionFormData>({
    taskId: searchParams.get('taskId') || '',
    inquiryId: searchParams.get('inquiryId') || '',
    roomId: searchParams.get('roomId') || '',
    leaseId: searchParams.get('leaseId') || '',
    token: searchParams.get('token') || '',
    inspectionDate: new Date().toISOString().split('T')[0],
    inspectionTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    inspectorName: '',
    roomCondition: '',
    images: [],
  });

  const [status, setStatus] = useState<Status>('checking');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verifyTask = async () => {
      setErrorMessage('');

      if (!formData.taskId || !formData.token) {
        setStatus('no-task');
        setErrorMessage(getTaskErrorMessage(!formData.taskId ? 'MISSING_TASK_ID' : 'MISSING_TOKEN'));
        return;
      }

      if (!APPS_SCRIPT_URL) {
        console.warn('GOOGLE_APPS_SCRIPT_URL is not configured. Skipping verification for demo.');
        setStatus('idle');
        return;
      }

      try {
        const query = new URLSearchParams({
          action: 'checkTask',
          taskId: formData.taskId,
          token: formData.token,
        });
        const response = await fetch(`${APPS_SCRIPT_URL}?${query.toString()}`);
        const data: TaskCheckResponse = await response.json();

        if (data.ok && data.taskOpen) {
          setFormData((prev) => ({
            ...prev,
            inquiryId: prev.inquiryId || data.inquiryId || '',
            roomId: prev.roomId || data.roomId || '',
            leaseId: prev.leaseId || data.leaseId || '',
          }));
          setStatus('idle');
          return;
        }

        setStatus('no-task');
        setErrorMessage(getTaskErrorMessage(data.reason));
      } catch (err) {
        console.error('Verification Error:', err);
        setStatus('no-task');
        setErrorMessage('Unable to verify this inspection task right now.');
      }
    };

    verifyTask();
  }, [formData.taskId, formData.token, APPS_SCRIPT_URL]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const selectedFiles = Array.from(files) as File[];
    const newImages: InspectionImage[] = selectedFiles.map((file) => ({
      id: Math.random().toString(36).slice(2, 11),
      url: URL.createObjectURL(file),
      category: IMAGE_CATEGORIES[IMAGE_CATEGORIES.length - 1] || 'Other',
      caption: '',
      file,
    }));

    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...newImages],
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((image) => image.id !== id),
    }));
  };

  const updateImageMetadata = (id: string, field: 'category' | 'caption', value: string) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.map((image) => (image.id === id ? { ...image, [field]: value } : image)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const processedImages = await Promise.all(
        formData.images.map(async (image) => {
          if (!image.file) {
            return { category: image.category, caption: image.caption, url: image.url };
          }

          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () =>
              resolve({
                category: image.category,
                caption: image.caption,
                base64: reader.result?.toString().split(',')[1],
                mimeType: image.file?.type,
              });
            reader.readAsDataURL(image.file as File);
          });
        }),
      );

      const payload = {
        ...formData,
        images: processedImages,
        submittedAt: new Date().toISOString(),
      };

      if (APPS_SCRIPT_URL) {
        await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        console.log('No APPS_SCRIPT_URL configured. Payload:', payload);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit inspection data.');
    }
  };

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 p-6">
        <Loader2 size={40} className="mb-4 animate-spin text-neutral-400" />
        <p className="font-medium text-neutral-500">Checking inspection task...</p>
      </div>
    );
  }

  if (status === 'no-task') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-10 text-center shadow-sm"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
            <Info size={40} />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-neutral-900">Inspection task unavailable</h1>
          <p className="mb-8 text-neutral-600">
            The inspection task could not be opened from this link. Check the task ID and token, or reopen the task in the backend.
          </p>
          <div className="mb-6 rounded-lg bg-neutral-50 p-4 text-left">
            <p className="mb-2 text-[10px] uppercase tracking-widest text-neutral-400">Request</p>
            <p className="break-all text-xs font-mono text-neutral-500">Task ID: {formData.taskId || 'missing'}</p>
          </div>
          {errorMessage && (
            <div className="mb-8 rounded-lg border border-red-100 bg-red-50 p-4 text-left text-sm text-red-600">
              {errorMessage}
            </div>
          )}
          <Button variant="secondary" onClick={() => window.location.reload()} className="w-full">
            Try verification again
          </Button>
        </motion.div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-neutral-900">Inspection submitted</h1>
          <p className="mb-8 text-neutral-600">
            Inspection data for room {formData.roomId || '-'} has been sent successfully.
          </p>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Start a new inspection
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900 selection:bg-neutral-200">
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-neutral-900">
              <ClipboardCheck size={18} className="text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Inspection Pro</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            Renewal inspection
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 pb-24">
        <form onSubmit={handleSubmit} className="space-y-8">
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Info size={18} className="text-neutral-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Task summary</h2>
            </div>
            <Card className="p-6">
              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-widest text-neutral-500">Task ID</p>
                  <p className="text-sm font-mono text-neutral-900">{formData.taskId || 'Missing'}</p>
                </div>
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-widest text-neutral-500">Room ID</p>
                  <p className="font-medium text-neutral-900">{formData.roomId || 'Missing'}</p>
                </div>
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-widest text-neutral-500">Lease ID</p>
                  <p className="text-sm font-mono text-neutral-900">{formData.leaseId || 'Missing'}</p>
                </div>
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-widest text-neutral-500">Inquiry ID</p>
                  <p className="text-sm font-mono text-neutral-900">{formData.inquiryId || 'Missing'}</p>
                </div>
              </div>
            </Card>
          </section>

          <section className="space-y-4">
            <div className="mb-2 flex items-center gap-2">
              <User size={18} className="text-neutral-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Inspector details</h2>
            </div>
            <Card className="space-y-6 p-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <Label required>Inspector name</Label>
                  <Select
                    required
                    options={INSPECTORS}
                    value={formData.inspectorName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, inspectorName: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label required>Date</Label>
                    <Input
                      required
                      type="date"
                      value={formData.inspectionDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, inspectionDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label required>Time</Label>
                    <Input
                      required
                      type="time"
                      value={formData.inspectionTime}
                      onChange={(e) => setFormData((prev) => ({ ...prev, inspectionTime: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </section>

          <section className="space-y-4">
            <div className="mb-2 flex items-center gap-2">
              <FileText size={18} className="text-neutral-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Room condition</h2>
            </div>
            <Card className="space-y-6 p-6">
              <div>
                <Label>Overall room condition</Label>
                <Textarea
                  placeholder="Describe the room condition, issues found, and anything that should be included in the final summary."
                  value={formData.roomCondition}
                  onChange={(e) => setFormData((prev) => ({ ...prev, roomCondition: e.target.value }))}
                />
              </div>
            </Card>
          </section>

          <section className="space-y-4">
            <div className="mb-2 flex items-center gap-2">
              <Camera size={18} className="text-neutral-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Inspection photos</h2>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 bg-white p-12 transition-all hover:border-neutral-300 hover:bg-neutral-50"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 transition-transform group-hover:scale-110">
                <Plus size={24} className="text-neutral-400" />
              </div>
              <p className="font-medium text-neutral-900">Upload inspection photos</p>
              <p className="mt-1 text-sm text-neutral-500">Tap to select files from this device.</p>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence>
                {formData.images.map((image) => (
                  <motion.div
                    key={image.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <Card className="flex flex-col gap-4 p-4 md:flex-row">
                      <div className="h-48 w-full flex-shrink-0 overflow-hidden rounded-lg bg-neutral-100 md:h-32 md:w-48">
                        <img src={image.url} alt="Preview" className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-grow space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-grow">
                            <Label>Category</Label>
                            <Select
                              options={IMAGE_CATEGORIES}
                              value={image.category}
                              onChange={(e) => updateImageMetadata(image.id, 'category', e.target.value)}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeImage(image.id)}
                            className="mt-6 rounded-lg p-2 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div>
                          <Label>Caption / note</Label>
                          <Input
                            placeholder="Add a short note for this photo."
                            value={image.caption}
                            onChange={(e) => updateImageMetadata(image.id, 'caption', e.target.value)}
                          />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>

          {status === 'error' && (
            <div className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600">
              <X size={18} />
              {errorMessage}
            </div>
          )}

          <div className="pt-4">
            <Button type="submit" loading={status === 'submitting'} className="w-full py-4 text-lg">
              Submit inspection
              <ChevronRight size={20} />
            </Button>
            <p className="mt-4 text-center text-xs text-neutral-400">
              Submitting this form confirms the inspection details are ready to be recorded.
            </p>
          </div>
        </form>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t border-neutral-200 bg-white p-4 md:hidden">
        <div className="text-xs text-neutral-500">
          <p className="font-semibold text-neutral-900">Room {formData.roomId || '?'}</p>
          <p>{formData.images.length} photo(s) attached</p>
        </div>
        <Button
          onClick={() => document.querySelector('form')?.requestSubmit()}
          loading={status === 'submitting'}
          className="px-4 py-2 text-sm"
        >
          Submit
        </Button>
      </div>
    </div>
  );
}
