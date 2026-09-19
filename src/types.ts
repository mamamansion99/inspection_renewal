/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface InspectionImage {
  id: string;
  url: string;
  category: string;
  caption: string;
  file?: File;
  // Compressed as soon as the photo is picked, while the file handle is still fresh.
  prepared?: Promise<PreparedImage>;
}

export interface PreparedImage {
  base64: string;
  mimeType: string;
  sizeBytes: number;
  fileName: string;
}

export interface InspectionFormData {
  taskId: string;
  inquiryId: string;
  roomId: string;
  leaseId: string;
  token: string;
  inspectionDate: string;
  inspectionTime: string;
  inspectorName: string;
  roomCondition: string;
  images: InspectionImage[];
}

export const IMAGE_CATEGORIES = [
  "ห้องนั่งเล่น",
  "ห้องครัว",
  "ห้องน้ำ",
  "ห้องนอน",
  "ภายนอก",
  "อื่นๆ",
];
