import LegalPage from "../../components/legal/LegalPage";

const sections = [
  {
    id: "scope",
    title: "Scope",
    paragraphs: [
      "This Privacy Policy explains what information TickMe collects, how we use it, and the choices you have. It applies to the TickMe website and applications.",
    ],
  },
  {
    id: "provided",
    title: "Information you provide",
    paragraphs: [
      "When you create an account, we collect your name, username, email address, and password. Passwords are stored as one-way hashes, never as plain text.",
      "You may add profile details such as a headline, bio, skills, links, location, and availability. You may also publish posts, comments, project details, collaboration requests, and messages.",
      "When you report content, we collect the reason, any details you provide, and information about the reported item so moderators can review it.",
    ],
  },
  {
    id: "automatic",
    title: "Information collected automatically",
    paragraphs: [
      "We receive technical information needed to operate the service, such as request timestamps, IP-derived security signals, device and browser details, and records of actions taken in the admin console.",
      "We record administrative actions, including moderation decisions and settings changes, in an audit log so the team can review and explain decisions.",
    ],
  },
  {
    id: "use",
    title: "How we use information",
    paragraphs: ["We use information to:"],
    items: [
      "create and secure your account, including email verification and password resets;",
      "provide the feed, profiles, projects, messaging, notifications, and collaboration features;",
      "review reports, enforce our Terms, and keep an audit trail of moderation decisions;",
      "understand aggregate usage so we can improve TickMe;",
      "send service messages and, where you opt in, email notifications;",
      "detect abuse, fraud, and security incidents, and comply with legal obligations.",
    ],
  },
  {
    id: "bases",
    title: "Legal bases",
    paragraphs: [
      "Where data protection law requires a legal basis, we rely on performance of our agreement with you, our legitimate interests in operating and securing TickMe, your consent where we ask for it, and compliance with legal obligations.",
    ],
  },
  {
    id: "sharing",
    title: "Sharing information",
    paragraphs: [
      "Your profile, posts, projects, and comments are visible to other members according to your privacy settings. Private messages are visible to the people in the conversation.",
      "We do not sell personal information. We may share information with service providers who help us host, secure, and operate TickMe, when required by law, or to protect the rights and safety of members.",
      "Moderators and administrators can access account and content information when reviewing reports or enforcing our Terms.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies and local storage",
    paragraphs: [
      "TickMe stores an access token and your theme preference in your browser's local storage. These are used to keep you signed in and to remember how the interface should look, not for advertising.",
      "Clearing site data signs you out and resets local preferences.",
    ],
  },
  {
    id: "retention",
    title: "Retention",
    paragraphs: [
      "We keep account and content information while your account is active. When you delete your account, we remove your profile and associated content, subject to backups and records we must retain for security, moderation, or legal reasons.",
      "Audit log entries may be retained after account deletion to preserve accountability for moderation decisions.",
    ],
  },
  {
    id: "rights",
    title: "Your choices and rights",
    paragraphs: [
      "You can update your profile, manage notification preferences, and delete your account from settings.",
      "Depending on where you live, you may have the right to access, correct, export, restrict, or delete personal information, or to object to certain processing. Send requests to the contact address below and we will respond as required by law.",
    ],
  },
  {
    id: "security",
    title: "Security",
    paragraphs: [
      "We use access controls, hashed passwords, role-based administrative permissions, and audit logging to protect TickMe. No online service is completely secure, so use a strong, unique password and keep it private.",
    ],
  },
  {
    id: "children",
    title: "Children",
    paragraphs: [
      "TickMe is not intended for children under 13. If we learn that an account belongs to a child under 13, we will take steps to remove it.",
    ],
  },
  {
    id: "transfers",
    title: "International transfers",
    paragraphs: [
      "TickMe may process information in countries other than yours. Where required, we use appropriate safeguards for cross-border transfers.",
    ],
  },
  {
    id: "changes",
    title: "Changes to this policy",
    paragraphs: [
      "We may update this policy as the service changes. Material updates will be reflected in the version and effective date on this page, with notice through the service where appropriate.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="This policy explains what TickMe collects, why we collect it, and the control you have over your information."
      sections={sections}
    />
  );
}
