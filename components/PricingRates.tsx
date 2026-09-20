"use client";

import { ArrowLeft, Check, CircleDollarSign, Save, RotateCcw, Info } from "lucide-react";
import { useState } from "react";
import { DEFAULT_RATES, PricingRates as PricingRatesType } from "../lib/pricing";

type Rates = {
  web: number; mobile: number; wordpress: number; hybrid: number;
  design: number; maintenance: number; minimum: number;
  complexity: number; urgency: number; vat: number; discount: number;
};

const defaults: Rates = DEFAULT_RATES;
  web: 45, mobile: 50, wordpress: 35, hybrid: 55,
  design: 40, maintenance: 20, minimum: 500,
  complexity: 1, urgency: 1.2, vat: 0, discount: 0,
};

export default function PricingRates({ onBack }: { onBack: () => void }) {
  const [rates, setRates] = useState<Rates>(defaults);
  const [saved, setSaved] = useState(false);
  const update = (key: keyof Rates, value: string) => {
    setSaved(false);
    setRates(r => ({ ...r, [key]: Number(value) || 0 }));
  };
  const reset = () => { setRates(defaults); window.localStorage.setItem("devestimate-pricing-rates", JSON.stringify(defaults)); setSaved(false); };
  const sampleHours = 80;
  const beforeAdjustments = sampleHours * rates.web;
  const adjusted = beforeAdjustments * rates.complexity * rates.urgency;
  const afterDiscount = adjusted * (1 - rates.discount / 100);
  const total = Math.max(rates.minimum, afterDiscount * (1 + rates.vat / 100));

  return <section className="content rates-page">
    <header><div className="np-header-spacer" /><div className="np-save">{saved ? "Settings saved" : "Pricing engine settings"}</div></header>
    <div className="rates-top">
      <button className="back-link" onClick={onBack}><ArrowLeft /> Back to dashboard</button>
      <small>PRICING & RATES</small><h1>Your estimation rules</h1>
      <p>These values control the commercial side of every future estimate.</p>
    </div>
    <div className="rates-layout">
      <div className="rates-main">
        <div className="np-card">
          <div className="np-card-head"><div><h2>Hourly rates</h2><p>Set your default rate for each project type.</p></div><span>01</span></div>
          <div className="rate-grid">
            <MoneyField label="Web applications" value={rates.web} onChange={v => update("web",v)} />
            <MoneyField label="Mobile applications" value={rates.mobile} onChange={v => update("mobile",v)} />
            <MoneyField label="WordPress" value={rates.wordpress} onChange={v => update("wordpress",v)} />
            <MoneyField label="Hybrid projects" value={rates.hybrid} onChange={v => update("hybrid",v)} />
            <MoneyField label="UI / UX design" value={rates.design} onChange={v => update("design",v)} />
            <MoneyField label="Maintenance" value={rates.maintenance} onChange={v => update("maintenance",v)} />
          </div>
        </div>
        <div className="np-card">
          <div className="np-card-head"><div><h2>Commercial rules</h2><p>Adjust the base calculation before the final price is shown.</p></div><span>02</span></div>
          <div className="rate-grid">
            <NumberField label="Minimum project price" suffix="$" value={rates.minimum} onChange={v => update("minimum",v)} />
            <NumberField label="Complexity multiplier" suffix="×" step="0.05" value={rates.complexity} onChange={v => update("complexity",v)} />
            <NumberField label="Urgency multiplier" suffix="×" step="0.05" value={rates.urgency} onChange={v => update("urgency",v)} />
            <NumberField label="VAT / tax" suffix="%" step="1" value={rates.vat} onChange={v => update("vat",v)} />
            <NumberField label="Default discount" suffix="%" step="1" value={rates.discount} onChange={v => update("discount",v)} />
          </div>
        </div>
        <div className="np-card">
          <div className="np-card-head"><div><h2>Estimation formula</h2><p>The calculation pipeline used by the estimator.</p></div><span>03</span></div>
          <div className="formula"><span>Estimated hours</span><b>×</b><span>Project rate</span><b>×</b><span>Complexity</span><b>×</b><span>Urgency</span><b>−</b><span>Discount</span><b>+</b><span>VAT</span></div>
          <div className="formula-note"><Info /> Minimum project price is applied after the calculated amount.</div>
        </div>
        <div className="rates-actions">
          <button className="secondary" onClick={reset}><RotateCcw /> Reset defaults</button>
          <button className="primary" onClick={() => { window.localStorage.setItem("devestimate-pricing-rates", JSON.stringify(rates)); setSaved(true); }}><Save /> Save pricing rules</button>
        </div>
      </div>
      <aside className="rates-side">
        <div className="np-side-card preview-card"><div className="side-icon"><CircleDollarSign /></div><h3>Live price preview</h3><p>Example: 80-hour Web project using your current settings.</p>
          <div className="price-preview"><div><span>Base</span><strong>{"$" + beforeAdjustments.toLocaleString()}</strong></div><div><span>After multipliers</span><strong>{"$" + Math.round(adjusted).toLocaleString()}</strong></div><div><span>Final price</span><strong>{"$" + Math.round(total).toLocaleString()}</strong></div></div>
          <div className="preview-checks"><span><Check /> {"Minimum: $" + rates.minimum}</span><span><Check /> {"Complexity: ×" + rates.complexity}</span><span><Check /> {"Urgency: ×" + rates.urgency}</span><span><Check /> {"VAT: " + rates.vat + "%"}</span></div>
        </div>
        <div className="np-side-card muted"><span>RECOMMENDED NEXT</span><h3>Package pricing</h3><p>After rates are saved, Basic / Standard / Premium packages can be calculated automatically from the same estimate.</p></div>
      </aside>
    </div>
  </section>;
}

function MoneyField({label,value,onChange}:{label:string;value:number;onChange:(v:string)=>void}) {
  return <label className="rate-field">{label}<div><span>$</span><input type="number" min="0" value={value} onChange={e=>onChange(e.target.value)}/><em>/ hour</em></div></label>;
}
function NumberField({label,value,onChange,suffix,step="1"}:{label:string;value:number;onChange:(v:string)=>void;suffix:string;step?:string}) {
  return <label className="rate-field">{label}<div><input type="number" min="0" step={step} value={value} onChange={e=>onChange(e.target.value)}/><em>{suffix}</em></div></label>;
}
