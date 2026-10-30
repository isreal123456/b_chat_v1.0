import { Link } from "react-router-dom";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";

import AuthLayout from "../../components/auth/AuthLayout";

const points = [
  "One identity for your work and your network",
  "Projects, feedback, and collaboration in one place",
  "Private messaging once you connect",
];

export default function AuthPage() {
  return (
    <AuthLayout
      title="Choose your way in"
      subtitle="TickMe keeps your professional identity and your build crew together."
      points={points}
    >
      <div className="auth__choice">
        <Link className="auth__choice-link" to="/login">
          <span className="auth__choice-icon" aria-hidden="true"><LogIn size={18} /></span>
          <span className="auth__choice-copy">
            <strong>Log in</strong>
            <span>Continue where you left off</span>
          </span>
          <ArrowRight size={17} aria-hidden="true" className="muted" />
        </Link>

        <Link className="auth__choice-link" to="/register">
          <span className="auth__choice-icon" aria-hidden="true"><UserPlus size={18} /></span>
          <span className="auth__choice-copy">
            <strong>Create an account</strong>
            <span>Set up your professional profile</span>
          </span>
          <ArrowRight size={17} aria-hidden="true" className="muted" />
        </Link>
      </div>
    </AuthLayout>
  );
}
