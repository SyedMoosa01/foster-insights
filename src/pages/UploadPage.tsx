import { useState, type ChangeEvent } from "react";
import type { AppModel, UploadFiles } from "../types";
import { processUploadedFiles } from "../api/analyticsApi";

const descriptions = {
  child: "Child IDs, removal and discharge dates, age, and removal county",
  placement: "Placement dates, counties, resource type, provider ID, and placement length",
  provider: "Provider IDs, license dates, county, engagement days, and accepted ages",
} as const;

type Kind = keyof typeof descriptions;

interface UploadPageProps {
  applyModel: (model: AppModel) => void;
  restore: () => Promise<void>;
}

export function UploadPage({ applyModel, restore }: UploadPageProps) {
  const [files, setFiles] = useState<UploadFiles>({});
  const [status, setStatus] = useState<Record<Kind, string>>({
    child: "No file selected",
    placement: "No file selected",
    provider: "No file selected",
  });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (kind: Kind, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFiles((current) => ({ ...current, [kind]: file }));
    setStatus((current) => ({ ...current, [kind]: `${file.name} ready` }));
    setError(null);
  };

  const process = async () => {
    if (!files.child || !files.placement || !files.provider) {
      setError("Upload all three CSV files before processing.");
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const model = await processUploadedFiles({
        child: files.child,
        placement: files.placement,
        provider: files.provider,
      });
      applyModel(model);
    } catch (processingError) {
      setError(processingError instanceof Error ? processingError.message : "Unable to process files.");
    } finally {
      setProcessing(false);
    }
  };

  const card = (kind: Kind, title: string) => (
    <div className="upload-card" key={kind}>
      <h3>{title}</h3>
      <p className="muted">{descriptions[kind]}</p>
      <input type="file" accept=".csv,text/csv" onChange={(event) => handleFile(kind, event)} />
      <div className="preview">{status[kind]}</div>
    </div>
  );

  return (
    <>
      <div className="hero">
        <div>
          <h1>Upload updated CSV datasets</h1>
          <p>
  This prototype currently processes data from uploaded CSV files. The
  Python analytics service validates the files, calculates shared metrics
  once, and returns a normalized model used across the application.
</p>

        </div>
        <button className="btn" type="button" disabled={processing} onClick={() => void restore()}>
          Restore provided sample files
        </button>
      </div>

      <div className="notice">Files are sent only to the local analytics API configured for this project.</div>
      {error && <div className="error-box">{error}</div>}

      <div className="grid upload-grid">
        {card("child", "Child-level CSV")}
        {card("placement", "Placement-level CSV")}
        {card("provider", "Provider-level CSV")}
      </div>

      <div className="section actions">
        <button className="btn primary" type="button" disabled={processing} onClick={() => void process()}>
          {processing ? "Processing…" : "Process and update dashboard"}
        </button>
      </div>
      <br />
<p>
  As discussed in the email, given time constraint, Database was not set up. In a production version, uploaded data could be stored in a secure
  database and the dashboards could load directly from that database.
  This would improve performance, strengthen access control, reduce repeated
  file processing, and support larger datasets and regular data updates.
</p>
    </>
  );
}
