export const TOAST_EVENT = 'dam-toast';

export function toast({ type = 'info', message }) {
  if (!message) return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { type, message } }));
}

toast.success = (message) => toast({ type: 'success', message });
toast.error = (message) => toast({ type: 'error', message });
toast.info = (message) => toast({ type: 'info', message });
