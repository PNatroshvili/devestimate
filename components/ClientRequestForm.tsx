"use client";

import { Check, Layers3, Languages, Send, ShieldCheck, Smartphone, Store, Globe, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { analyzeClientRequest, type ClientProjectType } from "../lib/requestAnalysis";
import { submitClientRequest } from "../lib/clientRequests";
import { CLIENT_COPY, type ClientLanguage } from "../lib/clientCopy";

function Logo() {
  return (
    <span className="skup-logo" aria-label="SKUP Studio">
      <img src="/skup-mark.svg" alt="" />
      <span><b>SKUP</b><small>Studio</small></span>
    </span>
  );
}

const projectTypes: ClientProjectType[] = ["Web", "Mobile", "WordPress", "Hybrid"];
const flagOptions = ["Authentication", "Payments", "Admin panel", "Notifications", "External API", "SEO / Analytics"] as const;

export default function ClientRequestForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [language, setLanguage] = useState<ClientLanguage>("ka");
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
  const [budgetCurrency, setBudgetCurrency] = useState<"GEL" | "USD" | "EUR">("GEL");
  const [flags, setFlags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("skup-client-language");
      if (saved === "ka" || saved === "en") setLanguage(saved);
    } catch {}
  }, []);

  const t = CLIENT_COPY[language];
  const setClientLanguage = (next: ClientLanguage) => {
    setLanguage(next);
    try { window.localStorage.setItem("skup-client-language", next); } catch {}
  };

  const features = useMemo(
    () => featuresText.split(/\n|,/).map((item) => item.trim()).filter(Boolean).filter((item, index, items) => items.indexOf(item) === index),
    [featuresText],
  );

  const toggleFlag = (flag: string) => setFlags((current) => current.includes(flag) ? current.filter((item) => item !== flag) : [...current, flag]);

  const submit = async () => {
    setError("");
    if (!token) { setError(t.tokenError); return; }
    if (!projectName.trim() || !clientName.trim() || !email.trim() || !description.trim()) { setError(t.requiredError); return; }

    setLoading(true);
    try {
      const analysis = { ...analyzeClientRequest(type, description, features, flags), source: "rules" as const };
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
        budgetCurrency,
        flags,
        notes: notes.trim(),
        analysis,
      });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : (language === "ka" ? "მოთხოვნის გაგზავნა ვერ მოხერხდა. გთხოვთ, კვლავ სცადოთ." : "Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <main className="client-shell" lang={language}>
        <section className="client-success">
          <Logo />
          <div className="client-success-icon"><Check /></div>
          <small>{t.sent}</small>
          <h1>{t.thank}, {clientName.split(" ")[0] || (language === "ka" ? "მოგესალმებით" : "there")}.</h1>
          <p>{t.sentText}</p>
          <div className="client-success-note"><Sparkles /><span>{t.received}</span></div>
        </section>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="client-shell" lang={language}>
        <section className="client-error-card"><Logo /><h1>{t.invalid}</h1><p>{t.invalidText}</p></section>
      </main>
    );
  }

  return (
    <main className="client-shell" lang={language}>
      <div className="client-container">
        <header className="client-header">
          <Logo />
          <div className="client-header-actions">
            <div className="client-language">
              <Languages />
              <button type="button" className={language === "ka" ? "active" : ""} onClick={() => setClientLanguage("ka")}>ქარ</button>
              <button type="button" className={language === "en" ? "active" : ""} onClick={() => setClientLanguage("en")}>ENG</button>
            </div>
            <div className="client-private"><ShieldCheck /> {t.secure}</div>
          </div>
        </header>

        <div className="client-form-head">
          <div><small>{t.request}</small><h1>{t.heroTitle}</h1><p>{t.heroText}</p></div>
          
        </div>

        <div className="client-steps">
          <div className="active"><b>1</b><span>{language === "ka" ? "ძირითადი ინფორმაცია" : "Basic information"}</span></div>
          <i />
          <div><b>2</b><span>{language === "ka" ? "ტექნიკური მოთხოვნები" : "Technical requirements"}</span></div>
          <i />
          <div><b>3</b><span>{language === "ka" ? "დამატებითი ინფორმაცია" : "Additional details"}</span></div>
        </div>

        <section className="client-card">
          <div className="client-card-head"><div><h2>{t.about}</h2><p>{t.aboutText}</p></div><span>01</span></div>
          <div className="client-two">
            <label>{t.name} <b>*</b><input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder={t.fullName} /></label>
            <label>{t.company}<input value={company} onChange={(e) => setCompany(e.target.value)} placeholder={t.companyName} /></label>
          </div>
          <div className="client-two">
            <label>{t.email} <b>*</b><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder={t.emailPlaceholder} /></label>
            <label>{t.phone}<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+995 ..." /></label>
          </div>
        </section>

        <section className="client-card">
          <div className="client-card-head"><div><h2>{t.projectBasics}</h2><p>{t.projectBasicsText}</p></div><span>02</span></div>
          <label>{t.projectName} <b>*</b><input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder={t.projectNamePlaceholder} /></label>
          <div className="client-field-title">{t.building} <b>*</b></div>
          <div className="client-type-grid">
            {projectTypes.map((id) => {
              const Icon = id === "Web" ? Globe : id === "Mobile" ? Smartphone : id === "WordPress" ? Store : Layers3;
              const [title, description] = t.types[id];
              return <button key={id} type="button" className={"client-type " + (type === id ? "selected" : "")} onClick={() => setType(id)}><Icon /><div><strong>{title}</strong><small>{description}</small></div>{type === id && <Check className="client-type-check" />}</button>;
            })}
          </div>
          <label>{t.description} <b>*</b><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={8} placeholder={t.descriptionPlaceholder} /></label>
        </section>

        <section className="client-card">
          <div className="client-card-head"><div><h2>{t.features}</h2><p>{t.featuresText}</p></div><span>03</span></div>
          <label>{t.mainFeatures}<textarea value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} rows={6} placeholder={t.featurePlaceholder} /></label>
          <div className="client-field-title">{t.scope}</div>
          <div className="client-check-grid">
            {flagOptions.map((flag) => <button key={flag} type="button" className={"client-check " + (flags.includes(flag) ? "checked" : "")} onClick={() => toggleFlag(flag)}><span>{flags.includes(flag) ? <Check /> : null}</span>{t.flags[flag]}</button>)}
          </div>
        </section>

        <section className="client-card">
          <div className="client-card-head"><div><h2>{t.timing}</h2><p>{t.timingText}</p></div><span>04</span></div>
          <div className="client-two">
            <label>{t.deadline}<input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></label>
            <label>{t.budget} <span className="optional">({t.optional})</span><input type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder={t.optional} /></label>
          </div>
          <label>{t.other}<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder={t.otherPlaceholder} /></label>
        </section>

        {error && <div className="client-form-error">{error}</div>}

        <div className="client-submit-bar">
          <div><strong>{t.ready}</strong><span>{t.readyText}</span></div>
          <button className="primary client-submit" onClick={submit} disabled={loading}>{loading ? t.sending : t.send} <Send /></button>
        </div>

        <footer className="client-footer"><span>{t.footer1}</span><span>{t.footer2}</span></footer>
      </div>
    </main>
  );
}
