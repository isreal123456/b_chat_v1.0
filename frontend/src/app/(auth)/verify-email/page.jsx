import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2, MailWarning } from "lucide-react";

import AuthLayout from "../../../components/auth/AuthLayout";
import { useAuth } from "../../../providers/AuthProvider";
import { toAppPath } from "../../../lib/api";

const points = [
  "A verified email protects your account",
  "Recovery works the moment you need it",
  "One click and you are back to building",
];

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const { verifyEmail, resendVerification, isAuthenticated } = useAuth();
  const [status, setStatus] = useState(token ? "verifying" : "missing");
  const [message, setMessage] = useState("");
  const [devLink, setDevLink] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    verifyEmail(token)
      .then(() => {
        if (active) setStatus("success");
      })
      .catch((error) => {
        if (active) {
          setStatus("error");
          setMessage(error.message || "We could not verify this link.");
        }
      });
    return () => {
      active = false;
    };
  }, [token, verifyEmail]);

  const handleResend = async () => {
    setSending(true);
    setMessage("");
    try {
      const result = await resendVerification();
      setDevLink(result.verification_url || "");
      setMessage(result.verification_url ? "New link generated below." : result.message);
    } catch (error) {
      setMessage(error.message || "Could not resend the verification email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthLayout
      title={status === "success" ? "Email verified" : "Verify your email"}
      subtitle="Confirm the address on your TickMe account to unlock recovery and account security."
      points={points}
      footer={
        <>
          Need to sign in? <Link to="/login">Log in</Link>
        </>
      }
    >
      <div className={`auth-state auth-state--${status === "success" ? "success" : status === "verifying" ? "pending" : "error"}`}>
        <span className="auth-state__icon" aria-hidden="true">
          {status === "verifying" && <Loader2 size={26} className="spin" />}
          {status === "success" && <CheckCircle2 size={26} />}
          {status === "error" && <AlertCircle size={26} />}
          {status === "missing" && <MailWarning size={26} />}
        </span>
        <div>
          <p className="auth-state__title">
            {status === "verifying" && "Checking your link…"}
            {status === "success" && "You are all set."}
            {status === "error" && "That link did not work."}
            {status === "missing" && "No verification token found."}
          </p>
          <p className="auth-state__copy">
            {status === "verifying" && "This only takes a moment."}
            {status === "success" && "Your email is confirmed. You can continue to TickMe."}
            {status === "error" && (message || "The link may have expired. Request a new one below.")}
            {status === "missing" && "Open the link from your verification email, or request a new one."}
          </p>
        </div>
      </div>

      {message && status !== "error" && (
        <p className="alert alert--success" role="status" style={{ marginTop: "1rem" }}>{message}</p>
      )}

      {devLink && (
        <p className="auth__note" style={{ marginTop: "0.75rem" }}>
          Development mode: <Link to={toAppPath(devLink)}>open the verification link</Link>
        </p>
      )}

      <div className="auth__form" style={{ marginTop: "1.4rem" }}>
        {status === "success" ? (
          <Link className="btn btn-primary btn-lg" to={isAuthenticated ? "/home" : "/login"}>
            {isAuthenticated ? "Continue to TickMe" : "Go to login"}
          </Link>
        ) : (
          <>
            {isAuthenticated && (
              <button type="button" className="btn btn-primary btn-lg" onClick={handleResend} disabled={sending}>
                {sending ? "Sending…" : "Send a new link"}
              </button>
            )}
            <p className="auth__note">
              Verification links expire after 24 hours.
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
