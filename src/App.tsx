/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  CheckCircle2, 
  ChevronRight, 
  ClipboardCheck, 
  Clock, 
  FileText, 
  Image as ImageIcon, 
  Info, 
  Loader2, 
  Plus, 
  Trash2, 
  User, 
  X 
} from 'lucide-react';
import { IMAGE_CATEGORIES, InspectionFormData, InspectionImage } from './types';

// --- Reusable UI Components ---

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

const Label = ({ children, required = false }: { children: React.ReactNode; required?: boolean }) => (
  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
    {children}
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all outline-none text-neutral-900 placeholder:text-neutral-400"
  />
);

const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all outline-none text-neutral-900 placeholder:text-neutral-400 min-h-[100px] resize-y"
  />
);

const Select = ({ options, ...props }: { options: string[] } & React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all outline-none text-neutral-900 appearance-none cursor-pointer"
  >
    <option value="" disabled>Select category</option>
    {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
    secondary: 'bg-white text-neutral-900 border border-neutral-200 hover:bg-neutral-50',
    danger: 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100',
    ghost: 'bg-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100',
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`px-6 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed ${variants[variant]}`}
    >
      {loading && <Loader2 size={18} className="animate-spin" />}
      {children}
    </button>
  );
};

// --- Main Application Component ---

const INSPECTORS = ["พี่ก้อย", "พี่ยุ", "KP", "Ma", "KK"];

export default function App() {
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || '';

  // Form State
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

  const [status, setStatus] = useState<'idle' | 'checking' | 'no-task' | 'submitting' | 'success' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState('');

  // Verify Task on Mount
  useEffect(() => {
    const verifyTask = async () => {
      if (!formData.taskId || !formData.token) {
        setStatus('no-task');
        return;
      }

      if (!APPS_SCRIPT_URL) {
        console.warn('GOOGLE_APPS_SCRIPT_URL is not configured. Skipping verification for demo.');
        setStatus('idle');
        return;
      }

      try {
        const response = await fetch(`${APPS_SCRIPT_URL}?action=verify&taskId=${formData.taskId}&token=${formData.token}`);
        const data = await response.json();
        
        if (data.exists) {
          setStatus('idle');
        } else {
          setStatus('no-task');
        }
      } catch (err) {
        console.error('Verification Error:', err);
        // Fallback for demo if URL is invalid
        setStatus('idle'); 
      }
    };

    verifyTask();
  }, [formData.taskId, formData.token, APPS_SCRIPT_URL]);

  // Handle Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileList = Array.from(files) as File[];
    const newImages: InspectionImage[] = fileList.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      url: URL.createObjectURL(file),
      category: 'อื่นๆ',
      caption: '',
      file: file
    }));

    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...newImages]
    }));

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (id: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter(img => img.id !== id)
    }));
  };

  const updateImageMetadata = (id: string, field: 'category' | 'caption', value: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map(img => img.id === id ? { ...img, [field]: value } : img)
    }));
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');

    try {
      // 1. Convert images to Base64 for Apps Script submission
      const processedImages = await Promise.all(formData.images.map(async (img) => {
        if (!img.file) return { category: img.category, caption: img.caption, url: img.url };
        
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve({
            category: img.category,
            caption: img.caption,
            base64: reader.result?.toString().split(',')[1],
            mimeType: img.file?.type
          });
          reader.readAsDataURL(img.file as File);
        });
      }));

      const payload = {
        ...formData,
        images: processedImages,
        submittedAt: new Date().toISOString(),
      };

      if (APPS_SCRIPT_URL) {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors', // Apps Script often requires no-cors for simple POST
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        // Note: With no-cors, we can't read the response body, so we assume success if no error thrown
      } else {
        console.log('No APPS_SCRIPT_URL configured. Payload:', payload);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการส่งข้อมูล');
    }
  };

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6">
        <Loader2 size={40} className="text-neutral-400 animate-spin mb-4" />
        <p className="text-neutral-500 font-medium">กำลังตรวจสอบข้อมูลงาน...</p>
      </div>
    );
  }

  if (status === 'no-task') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center bg-white p-10 rounded-2xl border border-neutral-200 shadow-sm"
        >
          <div className="w-20 h-20 bg-neutral-100 text-neutral-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <Info size={40} />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">ยังไม่มีงานตรวจห้อง</h1>
          <p className="text-neutral-600 mb-8">
            ไม่พบข้อมูลงานตรวจห้องสำหรับรหัสนี้ หรือลิงก์อาจจะไม่ถูกต้อง กรุณาตรวจสอบรหัสงานอีกครั้ง
          </p>
          <div className="p-4 bg-neutral-50 rounded-lg text-left mb-8">
            <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">ข้อมูลที่ระบุ</p>
            <p className="text-xs font-mono text-neutral-500 break-all">Task ID: {formData.taskId || 'ไม่มีข้อมูล'}</p>
          </div>
          <div className="space-y-3">
            <Button variant="primary" onClick={() => setStatus('idle')} className="w-full">
              ข้ามไปหน้ากรอกฟอร์ม (เพื่อทดสอบ)
            </Button>
            <Button variant="secondary" onClick={() => window.location.reload()} className="w-full">
              ลองตรวจสอบใหม่อีกครั้ง
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">ส่งข้อมูลการตรวจห้องเรียบร้อยแล้ว</h1>
          <p className="text-neutral-600 mb-8">
            บันทึกข้อมูลการตรวจห้องสำหรับห้อง {formData.roomId} เรียบร้อยแล้ว และส่งข้อมูลไปยังระบบจัดการแล้ว
          </p>
          <Button variant="primary" onClick={() => window.location.reload()}>
            เริ่มการตรวจห้องใหม่
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-neutral-200">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-neutral-900 rounded flex items-center justify-center">
              <ClipboardCheck size={18} className="text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">Inspection Pro</h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            โหมดผู้ดูแลระบบ
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 pb-24">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Summary Card (URL Params) */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Info size={18} className="text-neutral-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">ข้อมูลการตรวจห้อง</h2>
            </div>
            <Card className="bg-neutral-900 text-white border-none p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">รหัสงาน (Task ID)</p>
                  <p className="font-mono text-sm">{formData.taskId || 'ไม่มีข้อมูล'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">หมายเลขห้อง (Room ID)</p>
                  <p className="font-medium">{formData.roomId || 'ไม่มีข้อมูล'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">รหัสสัญญา (Lease ID)</p>
                  <p className="font-mono text-sm">{formData.leaseId || 'ไม่มีข้อมูล'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">รหัสสอบถาม (Inquiry ID)</p>
                  <p className="font-mono text-sm">{formData.inquiryId || 'ไม่มีข้อมูล'}</p>
                </div>
              </div>
            </Card>
          </section>

          {/* Basic Info */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <User size={18} className="text-neutral-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">รายละเอียดผู้ตรวจ</h2>
            </div>
            <Card className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label required>ชื่อผู้ตรวจ</Label>
                  <Select 
                    required
                    options={INSPECTORS}
                    value={formData.inspectorName}
                    onChange={e => setFormData(p => ({ ...p, inspectorName: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label required>วันที่</Label>
                    <Input 
                      required
                      type="date"
                      value={formData.inspectionDate}
                      onChange={e => setFormData(p => ({ ...p, inspectionDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label required>เวลา</Label>
                    <Input 
                      required
                      type="time"
                      value={formData.inspectionTime}
                      onChange={e => setFormData(p => ({ ...p, inspectionTime: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* Room Conditions */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={18} className="text-neutral-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">สภาพห้อง</h2>
            </div>
            <Card className="p-6 space-y-6">
              <div className="space-y-6">
                <div>
                  <Label>รายละเอียดสภาพห้องโดยรวม</Label>
                  <Textarea 
                    placeholder="ระบุรายละเอียดสภาพห้อง ผนัง พื้น เพดาน ระบบไฟ และอื่นๆ..."
                    value={formData.roomCondition}
                    onChange={e => setFormData(p => ({ ...p, roomCondition: e.target.value }))}
                  />
                </div>
              </div>
            </Card>
          </section>

          {/* Image Upload */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Camera size={18} className="text-neutral-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">รูปภาพประกอบ</h2>
            </div>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-200 rounded-xl p-12 flex flex-col items-center justify-center bg-white hover:bg-neutral-50 hover:border-neutral-300 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Plus size={24} className="text-neutral-400" />
              </div>
              <p className="font-medium text-neutral-900">อัปโหลดรูปภาพการตรวจห้อง</p>
              <p className="text-sm text-neutral-500 mt-1">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่</p>
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
                {formData.images.map((img) => (
                  <motion.div
                    key={img.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <Card className="flex flex-col md:flex-row gap-4 p-4">
                      <div className="w-full md:w-48 h-48 md:h-32 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-100">
                        <img src={img.url} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-grow space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-grow">
                            <Label>หมวดหมู่</Label>
                            <Select 
                              options={IMAGE_CATEGORIES}
                              value={img.category}
                              onChange={e => updateImageMetadata(img.id, 'category', e.target.value)}
                            />
                          </div>
                          <button 
                            type="button"
                            onClick={() => removeImage(img.id)}
                            className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-6"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div>
                          <Label>คำอธิบาย / หมายเหตุ</Label>
                          <Input 
                            placeholder="ระบุรายละเอียดสั้นๆ ของรูปภาพนี้..."
                            value={img.caption}
                            onChange={e => updateImageMetadata(img.id, 'caption', e.target.value)}
                          />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>

          {/* Error Message */}
          {status === 'error' && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm flex items-center gap-3">
              <X size={18} />
              {errorMessage}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <Button 
              type="submit" 
              loading={status === 'submitting'} 
              className="w-full py-4 text-lg"
            >
              เสร็จสิ้นการตรวจห้อง
              <ChevronRight size={20} />
            </Button>
            <p className="text-center text-xs text-neutral-400 mt-4">
              การกดส่งข้อมูล ถือเป็นการยืนยันว่าข้อมูลทั้งหมดถูกต้องตามการตรวจสภาพห้องจริง
            </p>
          </div>

        </form>
      </main>

      {/* Mobile Bottom Bar (Optional) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 p-4 flex items-center justify-between z-40">
        <div className="text-xs text-neutral-500">
          <p className="font-semibold text-neutral-900">ห้อง {formData.roomId || '?'}</p>
          <p>เพิ่มรูปแล้ว {formData.images.length} รูป</p>
        </div>
        <Button 
          onClick={() => document.querySelector('form')?.requestSubmit()}
          loading={status === 'submitting'}
          className="py-2 px-4 text-sm"
        >
          ส่งข้อมูล
        </Button>
      </div>
    </div>
  );
}
