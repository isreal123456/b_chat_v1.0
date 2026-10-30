import { useEffect, useState } from "react";
import { Check, Clock3, Handshake, X } from "lucide-react";
import { Link } from "react-router-dom";

import AppShell from "../../components/layout/AppShell";
import ProjectCover from "../../components/projects/ProjectCover";
import {
  acceptCollaborationRequest,
  cancelCollaborationRequest,
  fetchReceivedCollaborationRequests,
  fetchSentCollaborationRequests,
  rejectCollaborationRequest,
} from "../../lib/api";

function RequestRow({ request, type, onAccept, onReject, onCancel, disabled }) {
  const { project, user } = request;
  return (
    <div className="list-row collab-inbox-row">
      <Link className="collab-inbox-cover" to={`/projects/${project.id}`} aria-label={`${project.title} project`}>
        <ProjectCover project={project} />
      </Link>
      <div className="list-row__body">
        <p className="list-row__title">
          <Link to={`/projects/${project.id}`}>{project.title}</Link>
          {request.role && <span className="chip chip--sm">{request.role}</span>}
        </p>
        <p className="list-row__meta">
          {type === "received" ? (
            <>
              <Link to={`/profile/${user.username}`}>{user.name}</Link> wants to build together
            </>
          ) : (
            "Waiting on the project owner"
          )}
        </p>
        {request.message && <p className="collab-request__message">{request.message}</p>}
      </div>
      <div className="list-row__actions">
        {type === "received" ? (
          <>
            <button type="button" className="btn btn-primary btn-sm" disabled={disabled} onClick={() => onAccept(request.id)}>
              <Check size={14} aria-hidden="true" /> Accept
            </button>
            <button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={() => onReject(request.id)}>
              <X size={14} aria-hidden="true" /> Decline
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={() => onCancel(request)}>
            <X size={14} aria-hidden="true" /> Withdraw
          </button>
        )}
      </div>
    </div>
  );
}

export default function CollaborationRequestsPage() {
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetchReceivedCollaborationRequests(), fetchSentCollaborationRequests()])
      .then(([incoming, outgoing]) => {
        if (!active) return;
        setReceived(incoming);
        setSent(outgoing);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Could not load collaboration requests.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const resolve = async (request, action) => {
    setError("");
    setWorkingId(request.id);
    try {
      if (action === "accept") {
        await acceptCollaborationRequest(request.project.id, request.id);
      } else {
        await rejectCollaborationRequest(request.project.id, request.id);
      }
      setReceived((current) => current.filter((item) => item.id !== request.id));
    } catch (requestError) {
      setError(requestError.message || "Could not update the request.");
    } finally {
      setWorkingId(null);
    }
  };

  const withdraw = async (request) => {
    setError("");
    setWorkingId(request.id);
    try {
      await cancelCollaborationRequest(request.project.id, request.id);
      setSent((current) => current.filter((item) => item.id !== request.id));
    } catch (requestError) {
      setError(requestError.message || "Could not withdraw the request.");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <AppShell title="Collaborations" subtitle="Build together">
      <div className="page-enter">
        <header className="page-head">
          <div>
            <p className="eyebrow">Build Together</p>
            <h1 className="page-head__title">Collaboration requests</h1>
            <p className="page-head__sub">Review builders asking to join your projects, and track the requests you sent.</p>
          </div>
          <span className="badge badge--neutral">{received.length + sent.length} open</span>
        </header>

        {error && <div className="alert alert--error" role="alert" style={{ marginBottom: "1rem" }}>{error}</div>}

        <div className="section-label">
          <span><Handshake size={13} aria-hidden="true" /> Waiting for you</span>
          <span>{received.length}</span>
        </div>
        <section className="card list-card">
          {loading ? (
            <div className="list-row"><span className="skeleton" style={{ width: 52, height: 40, borderRadius: 10 }} /><span className="skeleton" style={{ flex: 1, height: 12 }} /></div>
          ) : received.length === 0 ? (
            <div className="list-row">
              <div className="list-row__body">
                <p className="list-row__title">No requests waiting.</p>
                <p className="list-row__meta">When someone asks to collaborate on your project, it will show up here.</p>
              </div>
            </div>
          ) : (
            received.map((request) => (
              <RequestRow
                key={request.id}
                request={request}
                type="received"
                onAccept={() => resolve(request, "accept")}
                onReject={() => resolve(request, "reject")}
                disabled={workingId === request.id}
              />
            ))
          )}
        </section>

        <div className="section-label">
          <span><Clock3 size={13} aria-hidden="true" /> Sent</span>
          <span>{sent.length}</span>
        </div>
        <section className="card list-card">
          {loading ? (
            <div className="list-row"><span className="skeleton" style={{ width: 52, height: 40, borderRadius: 10 }} /><span className="skeleton" style={{ flex: 1, height: 12 }} /></div>
          ) : sent.length === 0 ? (
            <div className="list-row">
              <div className="list-row__body">
                <p className="list-row__title">No outgoing requests.</p>
                <p className="list-row__meta">Browse projects open to collaborators and pitch in.</p>
              </div>
            </div>
          ) : (
            sent.map((request) => (
              <RequestRow
                key={request.id}
                request={request}
                type="sent"
                onCancel={withdraw}
                disabled={workingId === request.id}
              />
            ))
          )}
        </section>
      </div>
    </AppShell>
  );
}
