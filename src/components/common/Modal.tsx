import { useEffect, useId, type CSSProperties, type ReactNode } from "react";
import "../../styles/modal.css";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  width?: string;
}

export function Modal({ open, title, description, children, onClose, width = "720px" }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="app-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="app-modal" style={{ "--modal-width": width } as CSSProperties} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="app-modal-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p className="muted">{description}</p>}
          </div>
          <button type="button" className="app-modal-close" aria-label="Close" onClick={onClose}>×</button>
        </header>
        <div className="app-modal-body">{children}</div>
      </section>
    </div>
  );
}
