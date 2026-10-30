import { useState } from "react";
import { Link } from "react-router-dom";
import { MailWarning, Sparkles } from "lucide-react";

import { useAuth } from "../../providers/AuthProvider";
import { toAppPath } from "../../lib/api";

export default function SetupBanners() {
  const { user, resendVerification } = useAuth();
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!user) return null;
  if (user.onboarded && user.email_verified) return null;

  const handleResend = async () => {
    setSending(true);
    setFeedback(null);
    try {
      const result = await resendVerification();
      setFeedback({
        message: result.verification_url
          ? "Email sent. SMTP is not configured, so use the development link:"
          : result.message,
        link: result.verification_url || "",
      });
    } catch (error) {
      setFeedback({ message: error.message || "Could not send the verification email." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="setup-banners">
      {!user.onboarded && (
        <div className="setup-banner">
          <span className="setup-banner__icon" aria-hidden="true">
            <Sparkles size={17} />
          </span>
          <div className="setup-banner__copy">
            <strong>Finish your professional profile</strong>
            <span>Add your focus, skills, and links so the right collaborators can find you.</span>
          </div>
          <Link className="btn btn-secondary btn-sm" to="/onboarding">
            Finish setup
          </Link>
        </div>
      )}

      {!user.email_verified && (
        <div className="setup-banner setup-banner--accent">
          <span className="setup-banner__icon" aria-hidden="true">
            <MailWarning size={17} />
          </span>
          <div className="setup-banner__copy">
            <strong>Verify your email</strong>
            <span>Confirm your address to secure your account and enable recovery.</span>
            {feedback?.message && (
              <span className="setup-banner__feedback">
                {feedback.message}
                {feedback.link && (
                  <>
                    {" "}
                    <Link to={toAppPath(feedback.link)}>Open verification link</Link>
                  </>
                )}
              </span>
            )}
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleResend}
            disabled={sending}
          >
            {sending ? "Sending…" : "Resend email"}
          </button>
        </div>
      )}
    </div>
  );
}
