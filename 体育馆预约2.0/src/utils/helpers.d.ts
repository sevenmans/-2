declare module '@/utils/helpers' {
  export function formatDate(date?: string | Date, format?: string): string;
  export function formatDateTime(datetime?: string | Date, format?: string): string;
  export function formatTime(dateInput?: string | Date, format?: string): string;
  export function safeDateParse(dateInput?: string | Date): Date | null;
  export function formatPrice(price: number): string;
  export function maskPhone(phone: string): string;
  export function debounce(func: Function, wait: number): Function;
  export function throttle(func: Function, limit: number): Function;
  export function generateId(): string;
  export function deepClone<T>(obj: T): T;
  export function validatePhone(phone: string): boolean;
  export function validateEmail(email: string): boolean;
  export function getFileExtension(filename: string): string;
  export function formatFileSize(bytes: number): string;
}