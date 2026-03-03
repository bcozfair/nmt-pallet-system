
type ToastType = 'success' | 'error' | 'info';

export const toast = {
  success: (message: string) => dispatch('success', message),
  error: (message: string) => dispatch('error', message),
  info: (message: string) => dispatch('info', message),
};

const dispatch = (type: ToastType, message: string) => {
  const event = new CustomEvent('nmt-toast', { detail: { type, message } });
  window.dispatchEvent(event);
};
