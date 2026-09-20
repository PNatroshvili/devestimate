"use client";

import { Check, ChevronRight, Layers3, Send, ShieldCheck, Smartphone, Store, Globe, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { analyzeClientRequest, type ClientProjectType } from "../lib/requestAnalysis";
import { submitClientRequest } from "../lib/clientRequests";

const types: { id: ClientProjectType; title: string; description: string; icon: typeof Globe }[] = [
  { id: "Web", title: "Web application", description: "SaaS, website, portal, platform", icon: Globe },
  { id: "Mobile", title: "Mobile app", description: "iOS, Android or cross-platform", icon: Smartphone },
  { id: "WordPress", title: "WordPress", description: "Business, content or ecommerce site", icon: Store },
  { id: "Hybrid", title: "Web + mobile", description: "Multiple platforms in one product", icon: Layers3 },
];

const flagOptions = [
  "Authentication",
  "Payments",
  "Admin panel",
  "Notifications",
  "External API",
  "SEO / Analytics",
];

export default function ClientRequestForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<ClientProjectType>("Web");
  const [description, setDescription] = useState("");
  const [featuresText, setFeaturesText] = useState("");
  const [deadline, setDeadline] = useState("");
  const [budget, setBudget] = useState("");
  const [flags, setFlags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const features = useMemo(
    () => featuresText.split(/\n|,/).map((item) => item.trim()).filter(Boolean).filter((item, index, items) => items.indexOf(item) === index),
    [featuresText],
  );

  const toggleFlag = (flag: string) => {
    setFlags((current) => current.includes(flag) ? current.filter((item) => item !== flag) : [...current, flag]);
  };

  const submit = async () => {
    setError("");
    if (!token) {
      setError("This link is missing its request token.");
      return;
    }
    if (!projectName.trim() || !clientName.trim() || !email.trim() || !description.trim()) {
      setError("Please fill in the required fields.");
      return;
    }

    setLoading(true);
    try {
      const analysis = analyzeClientRequest(type, description, features, flags);
      await submitClientRequest(token, {
        projectName: projectName.trim(),
        clientName: clientName.trim(),
        company: company.trim(),
        email: email.trim(),
        phone: phone.trim(),
        type,
        description: description.trim(),
        features,
        deadline,
        budget,
        flags,
        notes: notes.trim(),
        analysis,
      });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <main className="client-shell">
        <section className="client-success">
          <div className="client-success-icon"><Check /></div>
          <small>REQUEST SENT</small>
          <h1>Thank you, {clientName.split(" ")[0] || "there"}.</h1>
          <p>Your project brief has been received. We will review the requirements and get back to you.</p>
          <div className="client-success-note"><Sparkles /><span>The information you submitted is now in the project estimation workspace.</span></div>
        </section>
      </main>
    );
  }

  if (!token) {
    return <main className="client-shell"><section className="client-error-card"><h1>Invalid request link</h1><p>Please ask the sender to generate a new project request link.</p></section></main>;
  }

  return (
    <main className="client-shell">
      <div className="client-container">
        <header className="client-header">
          <div className="client-brand"><b>D</b><span>DevEstimate</span></div>
          <div className="client-private"><ShieldCheck /> Secure project intake</div>
        </header>

        <section className="client-hero">
          <small>PROJECT REQUEST</small>
          <h1>Tell us what you want to build.</h1>
          <p>Share the project details below. This gives the development team enough context to understand the scope and prepare the technical plan.</p>
          <div className="client-no-price"><Sparkles /><span>This form does not show project pricing or estimates.</span></div>
        </section>

        <section className="client-card">
          <div className="client-card-head"><div><h2>About you</h2><p>Who should we contact about this project?</p></div><span>01</span></div>
          <div className="client-two">
            <label>Your name <b>*</b><input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Your full name" /></label>
            <label>Company / organization<input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" /></label>
          </div>
          <div className="client-two">
            <label>Email <b>*</b><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" /></label>
            <label>Phone<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+995 ..." /></label>
          </div>
        </section>

        <section className="client-card">
          <div className="client-card-head"><div><h2>Project basics</h2><p>Give us the high-level direction first.</p></div><span>02</span></div>
          <label>Project name <b>*</b><input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Hotel booking platform" /></label>
          <div className="client-field-title">What are you building? <b>*</b></div>
          <div className="client-type-grid">
            {types.map(({ id, title, description: hint, icon: Icon }) => (
              <button key={id} type="button" className={"client-type " + (type === id ? "selected" : "")} onClick={() => setType(id)}>
                <Icon />
                <div><strong>{title}</strong><small>{hint}</small></div>
                {type === id && <Check className="client-type-check" />}
              </button>
            ))}
          </div>
          <label>Project description <b>*</b><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={8} placeholder="Describe the goal, target users, the problem it solves, how it should work, and anything already agreed..." /></label>
        </section>

        <section className="client-card">
          <div className="client-card-head"><div><h2>Features & integrations</h2><p>List known requirements. One feature per line works best.</p></div><span>03</span></div>
          <label>Main features<textarea value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} rows={6} placeholder={"User registration\nProduct catalog\nBooking calendar\nAdmin dashboard"} /></label>
          <div className="client-field-title">Known scope items</div>
          <div className="client-check-grid">
            {flagOptions.map((flag) => (
              <button key={flag} type="button" className={"client-check " + (flags.includes(flag) ? "checked" : "")} onClick={() => toggleFlag(flag)}>
                <span>{flags.includes(flag) ? <Check /> : null}</span>{flag}
              </button>
            ))}
          </div>
        </section>

        <section className="client-card">
          <div className="client-card-head"><div><h2>Timing & context</h2><p>Anything that affects planning or delivery.</p></div><span>04</span></div>
          <div className="client-two">
            <label>Target deadline<input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></label>
            <label>Your planned budget <span className="optional">optional</span><input type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Optional" /></label>
          </div>
          <label>Anything else we should know?<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder="References, competitors, preferred technology, existing systems, constraints, notes..." /></label>
        </section>

        {error && <div className="client-form-error">{error}</div>}

        <div className="client-submit-bar">
          <div><strong>Ready to send?</strong><span>Your answers will be reviewed as a project brief.</span></div>
          <button className="primary client-submit" onClick={submit} disabled={loading}>
            {loading ? "Sending..." : "Send request"} <Send />
          </button>
        </div>

        <footer className="client-footer"><span>DevEstimate project intake</span><span>Technical scope • Requirements • Planning</span></footer>
      </div>
    </main>
  );
}
