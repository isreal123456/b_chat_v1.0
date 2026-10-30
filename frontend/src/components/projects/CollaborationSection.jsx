import { useEffect, useState } from "react";
import { Check, Handshake, Send, UserMinus, X } from "lucide-react";
import { Link } from "react-router-dom";

import Avatar from "../ui/Avatar";
import { useAuth } from "../../providers/AuthProvider";
import {
  acceptCollaborationRequest,
  cancelCollaborationRequest,
  fetchProjectCollaborationRequests,
  fetchSentCollaborationRequests,
  getMediaUrl,
  rejectCollaborationRequest,
  removeProjectCollaborator,
  sendCollaborationRequest,
} from "../../lib/api";

function CollaboratorRow({ person, projectId, canRemove, onChanged, onError }) {
  const [working, setWorking] = useState(false);

  const remove = async () => {
    setWorking(true);
    try {
      await removeProjectCollaborator(projectId, person.id);
      onChanged();
    } catch (requestError) {
      onError(requestError.message || "Could not update collaborators.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="list-row collab-person">
      <Link to={`/profile/${person.username}`} aria-label={`${person.name}'s profile`}>
        <Avatar name={person.name} src={person.avatar_url ? getMediaUrl(person.avatar_url) : ""} size={38} />
      </Link>
      <div className="list-row__body">
        <p className="list-row__title">
          <Link to={`/profile/${person.username}`}>{person.name}</Link>
        </p>
        <p className="list-row__meta">
          @{person.username}
          {person.headline ? ` · ${person.headline}` : ""}
        </p>
      </div>
      {canRemove && (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={remove}
          disabled={working}
        >
          <UserMinus size={14} aria-hidden="true" />
          {working ? "Removing…" : "Remove"}
        </button>
      )}
    </div>
  );
}

export default function CollaborationSection({ project, onRefresh }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(project.is_owner);
  const [workingId, setWorkingId] = useState(null);
  const [error, setError] = useState("");
  const [composing, setComposing] = useState(false);
  const [form, setForm] = useState({ role: "", message: "" });
  const [sending, setSending] = useState(false);
  const [myRequestId, setMyRequestId] = useState(null);

  useEffect(() => {
    if (!project.is_owner) return undefined;
    let active = true;
    fetchProjectCollaborationRequests(project.id)
      .then((data) => {
        if (active) setRequests(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Could not load collaboration requests.");
      })
      .finally(() => {
        if (active) setRequestsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [project.id, project.is_owner, project.collaborator_count]);

  useEffect(() => {
    if (project.is_owner || project.collaboration_status !== "pending") return undefined;
    let active = true;
    fetchSentCollaborationRequests()
      .then((data) => {
        const match = data.find((item) => item.project.id === project.id);
        if (active) setMyRequestId(match ? match.id : null);
      })
      .catch(() => {
        if (active) setMyRequestId(null);
      });
    return () => {
      active = false;
    };
  }, [project.id, project.is_owner, project.collaboration_status]);

  const collaborators = Array.isArray(project.collaborators) ? project.collaborators : [];
  const status = project.collaboration_status;

  const resolveRequest = async (requestId, action) => {
    setError("");
    setWorkingId(requestId);
    try {
      if (action === "accept") {
        await acceptCollaborationRequest(project.id, requestId);
      } else {
        await rejectCollaborationRequest(project.id, requestId);
      }
      setRequests((current) => current.filter((item) => item.id !== requestId));
      onRefresh();
    } catch (requestError) {
      setError(requestError.message || "Could not update the request.");
    } finally {
      setWorkingId(null);
    }
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    setError("");
    setSending(true);
    try {
      await sendCollaborationRequest(project.id, {
        role: form.role.trim(),
        message: form.message.trim(),
      });
      setComposing(false);
      setForm({ role: "", message: "" });
      onRefresh();
    } catch (requestError) {
      setError(requestError.message || "Could not send your request.");
    } finally {
      setSending(false);
    }
  };

  const withdrawRequest = async () => {
    if (!myRequestId) return;
    setError("");
    setWorkingId(myRequestId);
    try {
      await cancelCollaborationRequest(project.id, myRequestId);
      setMyRequestId(null);
      onRefresh();
    } catch (requestError) {
      setError(requestError.message || "Could not withdraw your request.");
    } finally {
      setWorkingId(null);
    }
  };

  const leaveProject = async () => {
    if (!user) return;
    setError("");
    setWorkingId(user.id);
    try {
      await removeProjectCollaborator(project.id, user.id);
      onRefresh();
    } catch (requestError) {
      setError(requestError.message || "Could not leave this project.");
    } finally {
      setWorkingId(null);
    }
  };

  const canAsk = !project.is_owner && status === "none" && project.looking_for_collaborators;
  const showSection =
    project.is_owner ||
    status === "pending" ||
    status === "accepted" ||
    canAsk ||
    collaborators.length > 0;

  if (!showSection) return null;

  return (
    <section className="card project-detail__section collab-panel">
      <div className="collab-panel__head">
        <div>
          <h2>Build together</h2>
          <p className="muted collab-panel__sub">
            {project.is_owner
              ? "Review builders who want to join, and manage your collaborators."
              : "Collaborators share the credit and the momentum on this project."}
          </p>
        </div>
        {project.looking_for_collaborators && (
          <span className="badge badge--outline">
            <Handshake size={11} aria-hidden="true" />
            Open
          </span>
        )}
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}

      {project.is_owner && (
        <div className="collab-block">
          <p className="section-label">
            <span>Requests</span>
            <span>{requestsLoading ? "…" : requests.length}</span>
          </p>
          {requestsLoading ? (
            <div className="skeleton" style={{ height: 52, borderRadius: 12 }} />
          ) : requests.length === 0 ? (
            <p className="muted collab-empty">
              No pending requests right now.
              {!project.looking_for_collaborators && " Turn on “looking for collaborators” to receive requests."}
            </p>
          ) : (
            <div className="collab-list">
              {requests.map((request) => (
                <div key={request.id} className="collab-request">
                  <Link to={`/profile/${request.user.username}`}>
                    <Avatar
                      name={request.user.name}
                      src={request.user.avatar_url ? getMediaUrl(request.user.avatar_url) : ""}
                      size={38}
                    />
                  </Link>
                  <div className="collab-request__body">
                    <p className="list-row__title">
                      <Link to={`/profile/${request.user.username}`}>{request.user.name}</Link>
                      {request.role && <span className="chip chip--sm">{request.role}</span>}
                    </p>
                    <p className="list-row__meta">@{request.user.username}</p>
                    {request.message && <p className="collab-request__message">{request.message}</p>}
                  </div>
                  <div className="collab-request__actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => resolveRequest(request.id, "accept")}
                      disabled={workingId === request.id}
                    >
                      <Check size={14} aria-hidden="true" />
                      Accept
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => resolveRequest(request.id, "reject")}
                      disabled={workingId === request.id}
                    >
                      <X size={14} aria-hidden="true" />
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!project.is_owner && status === "pending" && (
        <div className="collab-status">
          <span className="badge badge--accent badge--dot">Request pending</span>
          <p className="muted">Your request is with the owner. You can withdraw it while it waits.</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={withdrawRequest}
            disabled={!myRequestId || workingId === myRequestId}
          >
            <X size={14} aria-hidden="true" />
            Withdraw request
          </button>
        </div>
      )}

      {!project.is_owner && status === "accepted" && (
        <div className="collab-status">
          <span className="badge badge--accent badge--dot">You’re collaborating</span>
          <p className="muted">You’re part of this build. Leave any time.</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={leaveProject}
            disabled={!user || workingId === user.id}
          >
            <UserMinus size={14} aria-hidden="true" />
            Leave project
          </button>
        </div>
      )}

      {canAsk && (
        <div className="collab-cta">
          {composing ? (
            <form className="stack collab-form" onSubmit={submitRequest}>
              <div className="field">
                <label className="label" htmlFor="collab-role">What role fits you?</label>
                <input
                  className="input"
                  id="collab-role"
                  value={form.role}
                  onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                  placeholder="Frontend, design, DevOps…"
                  maxLength={60}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="collab-message">Pitch</label>
                <textarea
                  className="input textarea"
                  id="collab-message"
                  rows={3}
                  value={form.message}
                  onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                  placeholder="Share what you’d bring and what you’d like to work on."
                  maxLength={300}
                />
              </div>
              <div className="row" style={{ gap: "0.5rem" }}>
                <button className="btn btn-primary btn-sm" type="submit" disabled={sending}>
                  <Send size={14} aria-hidden="true" />
                  {sending ? "Sending…" : "Send request"}
                </button>
                <button className="btn btn-secondary btn-sm" type="button" onClick={() => setComposing(false)} disabled={sending}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="collab-cta__intro">
              <div>
                <p className="collab-cta__title">Want to build this together?</p>
                <p className="muted">Send a short pitch to the owner and share the credit.</p>
              </div>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setComposing(true)}>
                <Handshake size={15} aria-hidden="true" />
                Ask to collaborate
              </button>
            </div>
          )}
        </div>
      )}

      <div className="collab-block">
        <p className="section-label">
          <span>Collaborators</span>
          <span>{collaborators.length}</span>
        </p>
        {collaborators.length === 0 ? (
          <p className="muted collab-empty">No collaborators yet.</p>
        ) : (
          <div className="collab-list">
            {collaborators.map((person) => (
              <CollaboratorRow
                key={person.id}
                person={person}
                projectId={project.id}
                canRemove={project.is_owner}
                onChanged={onRefresh}
                onError={setError}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
