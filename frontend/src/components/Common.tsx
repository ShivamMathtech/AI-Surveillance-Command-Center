import { Component, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
export function Panel({
  title,
  tools,
  children,
  className = "",
}: {
  title: string;
  tools?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={"panel " + className}>
      <header className="panel-title">
        <h2>{title}</h2>
        <div>{tools}</div>
      </header>
      {children}
    </section>
  );
}
export function StatusBadge({ value }: { value: string }) {
  return <span className={"badge " + value.toLowerCase()}>{value}</span>;
}
export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
}) {
  return (
    <div className="metric">
      <small>{label}</small>
      <strong>{value}</strong>
      <span>{detail}</span>
    </div>
  );
}
export function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal">
          <header>
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close aria-label="Close">
              <X size={18} />
            </Dialog.Close>
          </header>
          <Dialog.Description className="sr-only">
            {title} controls and details
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export class ErrorBoundary extends Component<
  { children: ReactNode; label: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="empty">
        {this.props.label} unavailable. Other panels remain active.
      </div>
    ) : (
      this.props.children
    );
  }
}
export function timeLabel(t: string | null) {
  return t ? new Date(t).toLocaleTimeString("en-GB") : "—";
}
