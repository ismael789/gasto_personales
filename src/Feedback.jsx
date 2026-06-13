export function Toast({ message, type = "success", onClose }) {
  if (!message) return null;

  const styles = type === "error"
    ? "border-red-100 bg-red-50 text-red-700"
    : type === "warning"
      ? "border-amber-100 bg-amber-50 text-amber-800"
      : "border-[#d8e3dc] bg-[#edf5ef] text-[#206a5d]";

  return (
    <div className={`fixed right-4 top-4 z-50 flex max-w-sm items-start gap-3 rounded-2xl border p-4 text-sm font-bold shadow-2xl shadow-emerald-950/10 ${styles}`}>
      <span className="leading-6">{message}</span>
      <button type="button" onClick={onClose} className="ml-auto rounded-full px-2 text-lg leading-5 opacity-70 hover:opacity-100">
        x
      </button>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  tone = "danger",
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const confirmClass = tone === "danger" ? "danger-button" : "primary-button";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#17201c]/35 p-4 backdrop-blur-sm">
      <div className="panel w-full max-w-md rounded-[24px] p-6">
        <h2 className="text-2xl font-black text-[#17201c]">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-[#66756f]">{message}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="secondary-button">
            {cancelText}
          </button>
          <button type="button" onClick={onConfirm} className={confirmClass}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
