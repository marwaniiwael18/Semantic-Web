import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ConfirmContext = createContext(null);

export const ConfirmProvider = ({ children }) => {
  const [queue, setQueue] = useState([]);

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      const id = Date.now() + Math.random();
      setQueue((q) => [...q, { id, message, options, resolve }]);
    });
  }, []);

  const handleResolve = useCallback((id, value) => {
    setQueue((q) => {
      const item = q.find((x) => x.id === id);
      if (item) item.resolve(value);
      return q.filter((x) => x.id !== id);
    });
  }, []);

  const api = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={api}>
      {children}
      {queue.map((q) => (
        <div key={q.id} className="confirm-modal-overlay">
          <div className="confirm-modal" role="dialog" aria-modal="true">
            <div className="confirm-message">{q.message}</div>
            <div className="confirm-actions">
              <button className="btn btn-secondary" onClick={() => handleResolve(q.id, false)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleResolve(q.id, true)}>Confirm</button>
            </div>
          </div>
        </div>
      ))}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx.confirm;
};

export default ConfirmProvider;
