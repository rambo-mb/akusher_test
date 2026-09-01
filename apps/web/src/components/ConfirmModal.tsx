import { useLang } from "../i18n.js";

export function ConfirmModal(props: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useLang();
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 320, padding: 24, textAlign: "center", margin: 0 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>{props.title}</h2>
        <p style={{ color: "var(--tg-hint)", fontSize: 14, marginBottom: 24 }}>{props.message}</p>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="ghost" style={{ flex: 1, margin: 0, padding: "10px" }} onClick={props.onCancel}>
            {t("confirm.cancel")}
          </button>
          <button
            className="primary"
            style={{ flex: 1, margin: 0, padding: "10px", background: "var(--red)" }}
            onClick={props.onConfirm}
          >
            {t("confirm.exit")}
          </button>
        </div>
      </div>
    </div>
  );
}
