import LegalPage from "../../components/legal/LegalPage";

const sections = [
  {
    id: "acceptance",
    title: "Accepting these terms",
    paragraphs: [
      "These Terms of Service are an agreement between you and the TickMe team that governs your use of TickMe.",
      "By creating an account, accessing the service, or publishing content, you confirm that you have read and agree to these terms and to our Privacy Policy. If you do not agree, do not use TickMe.",
    ],
  },
  {
    id: "eligibility",
    title: "Who can use TickMe",
    paragraphs: [
      "You must be at least 13 years old to use TickMe. If the laws where you live require a higher age for online services, you must meet that age.",
      "If you use TickMe on behalf of an organisation, you confirm that you have authority to accept these terms for that organisation.",
    ],
  },
  {
    id: "accounts",
    title: "Your account",
    paragraphs: [
      "You agree to provide accurate account information, keep your password confidential, and accept responsibility for activity that happens under your account.",
      "You may not impersonate another person, misrepresent your affiliation, or create accounts to evade a suspension or other enforcement decision.",
      "Tell us promptly if you believe your account has been compromised.",
    ],
  },
  {
    id: "content",
    title: "Your content",
    paragraphs: [
      "You keep ownership of the content you publish, including posts, comments, project details, and profile information.",
      "You grant TickMe a worldwide, non-exclusive, royalty-free licence to host, store, reproduce, display, and distribute your content solely to operate, improve, and promote the service. This licence ends when your content is deleted, except for copies retained in backups, moderation records, or as required by law.",
      "You confirm that you have the rights needed to publish your content and that it does not infringe another person's intellectual property, privacy, or other rights.",
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    paragraphs: ["You are responsible for how you use TickMe. You may not:"],
    items: [
      "harass, threaten, or encourage harm against another person;",
      "publish hateful, sexually exploitative, or fraudulent content;",
      "spam, scrape, or automate access in a way that disrupts the service or other members;",
      "attempt to access accounts, systems, or data you are not authorised to access;",
      "upload malware or interfere with the operation, security, or integrity of TickMe;",
      "use TickMe to violate applicable law or the rights of others.",
    ],
  },
  {
    id: "collaboration",
    title: "Projects and collaboration",
    paragraphs: [
      "TickMe helps members discover projects and request collaboration. TickMe is not a party to any agreement you make with another member and does not guarantee the quality, safety, or outcome of a collaboration.",
      "Agree on ownership, payment, confidentiality, and deadlines directly with your collaborators. Use your own judgement before sharing sensitive information or access to systems.",
    ],
  },
  {
    id: "moderation",
    title: "Moderation and enforcement",
    paragraphs: [
      "Members can report users, posts, comments, and projects. Moderators review reports and may label, hide, remove, or restore content, and may suspend or delete accounts.",
      "Moderation decisions may be recorded in our audit log and may result in a notification explaining the outcome. Removals are intended to be reversible where appropriate.",
      "We may suspend or terminate access when these terms are violated, when required by law, or to protect members and the service.",
    ],
  },
  {
    id: "third-parties",
    title: "Third-party services and links",
    paragraphs: [
      "TickMe may link to repositories, demos, or other websites. Those services have their own terms and privacy practices, and we are not responsible for their content or availability.",
    ],
  },
  {
    id: "termination",
    title: "Ending your use",
    paragraphs: [
      "You may stop using TickMe at any time. Account deletion removes your profile, posts, comments, projects, messages, reports, and social connections, subject to backups and records we must keep.",
      "If we terminate your access, you may not create a new account to evade the decision without our permission.",
    ],
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    paragraphs: [
      "TickMe is provided on an \"as available\" basis. To the extent permitted by law, we disclaim warranties of merchantability, fitness for a particular purpose, and non-infringement.",
      "We do not guarantee that the service will be uninterrupted, error-free, or that content published by members is accurate.",
    ],
  },
  {
    id: "liability",
    title: "Limitation of liability",
    paragraphs: [
      "To the extent permitted by law, TickMe and its team will not be liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits, data, or goodwill arising from your use of the service.",
      "Nothing in these terms limits liability that cannot be limited under applicable law, including liability for fraud or intentional misconduct.",
    ],
  },
  {
    id: "changes",
    title: "Changes to these terms",
    paragraphs: [
      "We may update these terms as TickMe evolves. When we make material changes, we will update the version and effective date on this page and provide notice through the service where appropriate.",
      "If you continue using TickMe after updated terms take effect, you agree to the updated terms.",
    ],
  },
  {
    id: "law",
    title: "Governing law",
    paragraphs: [
      "These terms are governed by the laws applicable in the jurisdiction where the TickMe operator is established, without regard to conflict-of-law rules. Nothing here prevents you from relying on mandatory consumer protections in your country of residence.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      intro="These terms explain the rules for using TickMe, the rights you keep in your work, and how moderation and enforcement work."
      sections={sections}
    />
  );
}
