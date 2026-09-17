import { useState } from "react";
import "./App.css";
import { analyzeCode, rescanCode } from "./services/reviewService";

const starterCode = `const userId = req.query.id;
const query = "SELECT * FROM users WHERE id = " + userId;
db.query(query, (error, rows) => {
  res.json(rows);
});`;

const emptySummary = { totalFindings: 0, critical: 0, high: 0, medium: 0, low: 0, suppressed: 0 };

function App() {
  const [developerId, setDeveloperId] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [sourceCode, setSourceCode] = useState(starterCode);
  const [reviewResult, setReviewResult] = useState(null);
  const [selectedFindingId, setSelectedFindingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rescanLoading, setRescanLoading] = useState(false);
  const [error, setError] = useState("");
  const [rescanMessage, setRescanMessage] = useState("");

  const selectedFinding = reviewResult?.findings?.find(
    (finding) => finding.id === selectedFindingId,
  ) || reviewResult?.findings?.[0];

  async function handleAnalyze(event) {
    event.preventDefault();
    if (!developerId.trim() || !sourceCode.trim()) {
      setError(!developerId.trim() ? "Enter a developer ID to continue." : "Paste source code to continue.");
      return;
    }

    setLoading(true);
    setError("");
    setRescanMessage("");
    try {
      const result = await analyzeCode(developerId.trim(), language, sourceCode);
      setReviewResult(result);
      setSelectedFindingId(result.findings?.[0]?.id || null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRescan() {
    if (!reviewResult?.reviewId || !sourceCode.trim()) return;
    setRescanLoading(true);
    setError("");
    setRescanMessage("");
    try {
      const result = await rescanCode(reviewResult.reviewId, sourceCode);
      setRescanMessage(`Rescan complete: ${result.resolved?.length || 0} resolved, ${result.remaining?.length || 0} remaining.`);
      if (result.summary || result.findings) {
        setReviewResult((current) => ({ ...current, ...result }));
        if (result.findings) setSelectedFindingId(result.findings[0]?.id || null);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setRescanLoading(false);
    }
  }

  const summary = reviewResult?.summary || emptySummary;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark">CL</div>
        <div>
          <p className="eyebrow">CODE REVIEW INTELLIGENCE</p>
          <h1>CodeLens <span>AI</span></h1>
        </div>
        <div className="topbar-status"><span /> Evidence-backed review</div>
      </header>

      <main className="workspace">
        <section className="intro">
          <div>
            <p className="eyebrow accent">DEVELOPER WORKSPACE</p>
            <h2>Find the signal<br /><em>in your code.</em></h2>
            <p className="intro-copy">Combine static evidence, deterministic severity, and developer history in one focused review.</p>
          </div>
          {reviewResult && <div className="review-chip"><span>REVIEW</span>{reviewResult.reviewId}</div>}
        </section>

        <section className="input-panel">
          <form onSubmit={handleAnalyze}>
            <div className="form-row">
              <label>Developer ID<input value={developerId} onChange={(event) => setDeveloperId(event.target.value)} placeholder="e.g. DEV001" /></label>
              <label>Language<select value={language} onChange={(event) => setLanguage(event.target.value)}><option value="javascript">JavaScript</option><option value="typescript">TypeScript</option></select></label>
            </div>
            <label className="code-label">Source code <span>{sourceCode.split("\n").length} lines</span><textarea value={sourceCode} onChange={(event) => setSourceCode(event.target.value)} spellCheck="false" /></label>
            <div className="form-actions"><p>Analysis is performed by the connected backend. Your source is never executed.</p><button className="primary-button" type="submit" disabled={loading}>{loading ? "Analyzing..." : "Analyze code"}<span>→</span></button></div>
          </form>
          {loading && <div className="loading-bar" />}
          {error && <div className="alert error-message">{error}</div>}
        </section>

        {reviewResult && (
          <div className="results-area">
            <section className="summary-section">
              <div className="section-heading"><div><p className="eyebrow accent">ANALYSIS COMPLETE</p><h2>Review overview</h2></div><span className="language-tag">{language === "javascript" ? "JS" : "TS"} / {language}</span></div>
              <div className="summary-grid">
                <div className="summary-total"><strong>{summary.totalFindings}</strong><span>Total findings</span></div>
                {[['critical', 'Critical'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low'], ['suppressed', 'Suppressed']].map(([key, label]) => <div className={`summary-stat ${key}`} key={key}><strong>{summary[key] || 0}</strong><span>{label}</span></div>)}
              </div>
            </section>

            <div className="results-grid">
              <div className="results-main">
                <section className="result-section">
                  <div className="section-heading compact"><div><p className="eyebrow">EVIDENCE LED</p><h2>Findings <span className="count">{reviewResult.findings?.length || 0}</span></h2></div></div>
                  <div className="finding-list">
                    {(reviewResult.findings || []).map((finding) => <button className={`finding-row ${selectedFinding?.id === finding.id ? "selected" : ""}`} key={finding.id} onClick={() => setSelectedFindingId(finding.id)} type="button"><span className={`severity-dot ${finding.severity?.toLowerCase()}`} /><span className="finding-copy"><strong>{finding.title}</strong><small>{finding.category} · {finding.file || "source"}:{finding.line || "?"}</small></span><span className={`severity-badge ${finding.severity?.toLowerCase()}`}>{finding.severity || "UNRATED"}</span><span className="row-arrow">›</span></button>)}
                    {!reviewResult.findings?.length && <div className="empty-state">No findings were returned for this review.</div>}
                  </div>
                </section>

                {selectedFinding && <section className="detail-panel"><div className="detail-header"><div><p className="eyebrow accent">{selectedFinding.id} / FINDING DETAIL</p><h2>{selectedFinding.title}</h2></div><span className={`severity-badge ${selectedFinding.severity?.toLowerCase()}`}>{selectedFinding.severity}</span></div><div className="detail-meta"><span>{selectedFinding.category}</span><span>{selectedFinding.confidence} confidence</span><span>{selectedFinding.file || "source"}, line {selectedFinding.line || "?"}</span></div><div className="evidence-block"><p className="eyebrow">EVIDENCE</p><code>{selectedFinding.evidence || "No evidence supplied"}</code></div><div className="detail-columns"><div><h3>Why it matters</h3><p>{selectedFinding.impact || selectedFinding.rootCause || "No explanation supplied."}</p></div><div><h3>Suggested fix</h3><p>{selectedFinding.suggestedFix || selectedFinding.recommendation || "No recommendation supplied."}</p></div></div></section>}
              </div>

              <aside className="side-stack">
                <InfoSection title="Risk groups" eyebrow="CORRELATED RISKS" items={reviewResult.riskGroups} empty="No correlated risk groups." renderItem={(group) => <><strong>{group.title}</strong><p>{group.explanation || group.description}</p><small>{(group.findingIds || []).join(" · ")}</small></>} />
                <InfoSection title="Repeated patterns" eyebrow="DEVELOPER MEMORY" items={reviewResult.repeatedPatterns} empty="No repeated patterns returned." renderItem={(pattern) => <><strong>{pattern.type || pattern.pattern}</strong><p>{pattern.description || pattern.reason}</p><small>{pattern.occurrences || pattern.count || 0} occurrences</small></>} />
                <InfoSection title="Skill gaps" eyebrow="TARGETED GROWTH" items={reviewResult.skillGaps} empty="No skill gaps returned." renderItem={(gap) => <><strong>{gap.skill}</strong><p>{gap.reason}</p><small>{gap.recommendation}</small></>} />
              </aside>
            </div>

            <section className="rescan-panel"><div><p className="eyebrow accent">VERIFICATION LOOP</p><h2>Re-scan the corrected code</h2><p>Update the source above, then verify which findings were resolved.</p></div><button className="secondary-button" type="button" onClick={handleRescan} disabled={rescanLoading}>{rescanLoading ? "Scanning..." : "Run rescan"}<span>↻</span></button></section>
            {rescanMessage && <div className="alert success-message">{rescanMessage}</div>}
          </div>
        )}
      </main>
    </div>
  );
}

function InfoSection({ title, eyebrow, items, empty, renderItem }) {
  return <section className="info-section"><div className="section-heading compact"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div></div>{items?.length ? items.map((item, index) => <article className="info-item" key={item.id || item.type || index}>{renderItem(item)}</article>) : <p className="muted">{empty}</p>}</section>;
}

export default App;
