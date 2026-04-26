import { reactive } from 'vue';

export type ToastType = 'success' | 'error' | '';

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

export const toastState = reactive<ToastState>({
  message: '',
  type: '',
  visible: false,
});

let timer: ReturnType<typeof setTimeout> | null = null;

export function showToast(message: string, type: ToastType = '', duration = 3000): void {
  toastState.message = message;
  toastState.type = type;
  toastState.visible = true;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    toastState.visible = false;
  }, duration);
}
