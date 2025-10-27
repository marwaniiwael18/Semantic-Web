import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const add = useCallback((type, message, timeout = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, message }]);
    if (timeout > 0) {
      setTimeout(() => remove(id), timeout);
    }
    return id;
  }, [remove]);

  const api = {
    success: (msg, timeout) => add('success', msg, timeout),
    error: (msg, timeout) => add('error', msg, timeout),
    info: (msg, timeout) => add('info', msg, timeout),
    remove,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-wrapper" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`} onClick={() => remove(t.id)}>
            <div className="toast-message">{t.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

export default ToastProvider;
