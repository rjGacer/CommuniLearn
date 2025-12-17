import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ModalContext = createContext(null);

export function useModal() {
  return useContext(ModalContext);
}

export function ModalProvider({ children }) {
  const [modal, setModal] = useState(null); // { type: 'alert'|'confirm', message, resolve }

  const showAlert = useCallback((message) => {
    return new Promise((resolve) => {
      setModal({ type: 'alert', message: String(message), resolve });
    });
  }, []);

  const showConfirm = useCallback((message) => {
    return new Promise((resolve) => {
      setModal({ type: 'confirm', message: String(message), resolve });
    });
  }, []);

  useEffect(() => {
    // expose globally for convenience
    window.customAlert = (msg) => showAlert(msg);
    window.customConfirm = (msg) => showConfirm(msg);
    // override native alert to use custom styled modal
    window.alert = (msg) => { showAlert(msg); };
    return () => {
      try { delete window.customAlert; } catch (e) {}
      try { delete window.customConfirm; } catch (e) {}
    };
  }, [showAlert, showConfirm]);

  const handleClose = () => {
    if (!modal) return;
    if (modal.type === 'alert') {
      modal.resolve();
      setModal(null);
    }
  };

  const handleConfirm = (ok) => {
    if (!modal) return;
    modal.resolve(!!ok);
    setModal(null);
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {modal && (
        <div
          className="modal-overlay"
          onClick={() => { if (modal.type === 'alert') handleClose(); }}
          style={{ background: 'transparent', backdropFilter: 'none', WebkitBackdropFilter: 'none' }}
        >
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={ modal.type === 'confirm' ? { position: 'fixed', left: '50%', transform: 'translateX(-50%)', top: '6vh', background: '#fff', color: '#111', maxWidth: 520, padding: '14px 18px', zIndex: 1000 } : { background: '#fff', color: '#111', maxWidth: 520, margin: '0 auto', marginTop: '6vh', padding: '18px 22px' } }
          >
            <h2 className="modal-title" style={{ color: '#111' }}>{modal.type === 'alert' ? 'Notice' : 'Confirmation'}</h2>
            <div className="modal-form" style={{ color: '#111' }}>
              <p style={{ whiteSpace: 'pre-wrap' }}>{modal.message}</p>
            </div>
            <div className="modal-actions">
              {modal.type === 'confirm' ? (
                <>
                  <button className="modal-btn cancel" onClick={() => handleConfirm(false)}>Cancel</button>
                  <button className="modal-btn create" onClick={() => handleConfirm(true)}>OK</button>
                </>
              ) : (
                <button className="modal-btn create" onClick={() => handleClose()}>OK</button>
              )}
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export default ModalProvider;
