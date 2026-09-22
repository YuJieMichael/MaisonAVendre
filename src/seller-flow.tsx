import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  FileText,
  Handshake,
  House,
  ImagePlus,
  Info,
  ShieldCheck,
  Video,
  X,
} from "lucide-react";
import { sellerCopy, type Language } from "./seller-copy";
import { useProject, type Details, type Plan } from "./project";

const dateToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export function SellerFlow({ lang }: { lang: Language }) {
  const d = sellerCopy[lang];
  const [step, setStep] = useState(location.hash === "#vendre/edit" ? 1 : 0);
  const {
    plan,
    setPlan,
    form,
    setForm,
    photos,
    setPhotos,
    setCompleted,
    setSample,
  } = useProject();
  const [photoError, setPhotoError] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
    headingRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [step]);
  const update = (key: keyof Details, value: string | boolean) =>
    setForm((p) => ({ ...p, [key]: value }));
  const choose = (value: Plan) => {
    setPlan(value);
    setStep(1);
  };
  const next = (event: FormEvent) => {
    event.preventDefault();
    setStep((s) => s + 1);
  };
  const input = (
    key: keyof Details,
    label: string,
    type = "text",
    required = true,
    extra = {},
  ) => (
    <label className="field">
      <span>
        {label}
        {required && " *"}
      </span>
      <input
        name={key}
        type={type}
        required={required}
        value={String(form[key])}
        onChange={(e) => update(key, e.target.value)}
        {...extra}
      />
    </label>
  );
  const select = (key: keyof Details, label: string, options: string[]) => (
    <label className="field">
      <span>{label} *</span>
      <select
        name={key}
        value={String(form[key])}
        onChange={(e) => update(key, e.target.value)}
      >
        {options.map((s, i) => (
          <option key={i} value={String(i)}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );
  const planItems = plan === "with" ? d.withItems : d.withoutItems;
  const price = {
    fr: "Tarif à confirmer",
    en: "Pricing to be confirmed",
    zh: "价格待定",
  }[lang];
  const propertyType = d.types[Number(form.type)];
  const appointmentDate = form.date
    ? new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : `${lang}-CA`, {
        dateStyle: "long",
      }).format(new Date(`${form.date}T12:00:00`))
    : "";
  const actions = (label = d.next) => (
    <div className="flow-actions">
      <button
        className="outline"
        type="button"
        onClick={() => setStep((s) => s - 1)}
      >
        <ArrowLeft />
        {d.previous}
      </button>
      <button type="submit">
        {label}
        <ArrowRight />
      </button>
    </div>
  );

  return (
    <div className="sell-page">
      <div className="sell-shell">
        <a className="back-link" href="#top">
          <ArrowLeft />
          {d.back}
        </a>
        <div className="sell-heading">
          <p className="eyebrow">{d.eyebrow}</p>
          <h1 ref={step === 0 ? headingRef : undefined} tabIndex={-1}>
            {d.title}
          </h1>
          <p>{d.intro}</p>
        </div>
        <ol className="flow-steps" aria-label={d.eyebrow}>
          {d.steps.map((s, i) => (
            <li
              key={i}
              className={step > i ? "completed" : step === i ? "current" : ""}
              aria-current={step === i ? "step" : undefined}
            >
              <span>{step > i ? <Check /> : `0${i + 1}`}</span>
              <strong>{s}</strong>
            </li>
          ))}
        </ol>
        <p className="demo-banner">
          <Info aria-hidden="true" />
          {d.demo}
        </p>
        {step === 0 && (
          <>
            <div className="plan-grid">
              <article className="plan-card broker-plan">
                <div className="plan-top">
                  <span className="plan-icon">
                    <Handshake />
                  </span>
                  <span className="plan-tag">{d.withTag}</span>
                </div>
                <h2>{d.with}</h2>
                <p>{d.withText}</p>
                <ul className="check-list">
                  {d.withItems.map((s) => (
                    <li key={s}>
                      <CheckCircle2 />
                      {s}
                    </li>
                  ))}
                </ul>
                <div className="plan-price">
                  <strong>{d.agreed}</strong>
                  <p>{d.agreedNote}</p>
                </div>
                <button onClick={() => choose("with")}>
                  {d.chooseWith}
                  <ArrowRight />
                </button>
              </article>
              <article className="plan-card self-plan">
                <div className="plan-top">
                  <span className="plan-icon">
                    <Camera />
                  </span>
                  <span className="plan-tag">{d.withoutTag}</span>
                </div>
                <h2>{d.without}</h2>
                <p>{d.withoutText}</p>
                <ul className="check-list">
                  {d.withoutItems.map((s, i) => {
                    const Icon = [Camera, Video, BadgeCheck, FileText][i];
                    return (
                      <li key={s}>
                        <Icon />
                        {s}
                      </li>
                    );
                  })}
                </ul>
                <div className="plan-price">
                  <div className="price-pending">{price}</div>
                  <p>{d.fixed}</p>
                </div>
                <button onClick={() => choose("without")}>
                  {d.chooseWithout}
                  <ArrowRight />
                </button>
              </article>
            </div>
            <p className="service-boundary">
              <ShieldCheck />
              {d.boundary}
            </p>
          </>
        )}
        {step > 0 && step < 4 && (
          <div className="flow-layout">
            <div className="flow-panel">
              <div className="panel-heading">
                <span className="panel-icon">
                  {step === 1 ? (
                    <House />
                  ) : step === 2 ? (
                    <CalendarDays />
                  ) : (
                    <CheckCircle2 />
                  )}
                </span>
                <h2 ref={headingRef} tabIndex={-1}>
                  {step === 1
                    ? d.propertyTitle
                    : step === 2
                      ? d.appointmentTitle
                      : d.reviewTitle}
                </h2>
                <p>
                  {step === 1
                    ? d.propertyText
                    : step === 2
                      ? d.appointmentText
                      : d.reviewText}
                </p>
              </div>
              {step === 1 && (
                <form onSubmit={next}>
                  <p className="required-note">{d.required}</p>
                  <div className="field-grid">
                    <div className="full-field">
                      {input("address", d.address, "text", true, {
                        autoComplete: "street-address",
                        maxLength: 200,
                        pattern: ".*\\S.*",
                      })}
                    </div>
                    {input("city", d.city, "text", true, {
                      autoComplete: "address-level2",
                      maxLength: 100,
                      pattern: ".*\\S.*",
                    })}
                    {input("postal", d.postal, "text", true, {
                      autoComplete: "postal-code",
                      pattern:
                        "[ABCEGHJ-NPRSTVXYabceghj-nprstvxy][0-9][ABCEGHJ-NPRSTV-Zabceghj-nprstv-z] ?[0-9][ABCEGHJ-NPRSTV-Zabceghj-nprstv-z][0-9]",
                      title: d.invalidPostal,
                      maxLength: 7,
                    })}
                    {select("type", d.type, d.types)}
                    {input("price", d.price, "number", false, {
                      min: 1,
                      max: 9999999999,
                      step: 1,
                    })}
                    {select("broker", d.broker, d.brokerOptions)}
                    {select("timeline", d.timeline, d.timelines)}
                  </div>
                  <div className="photo-field">
                    <label htmlFor="property-photos">
                      <ImagePlus />
                      <strong>{d.photos}</strong>
                      <span>{d.photoHelp}</span>
                    </label>
                    <input
                      id="property-photos"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      aria-describedby="photo-help"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        const valid =
                          photos.length + files.length <= 8 &&
                          files.every(
                            (f) =>
                              [
                                "image/jpeg",
                                "image/png",
                                "image/webp",
                              ].includes(f.type) && f.size <= 10 * 1024 * 1024,
                          );
                        setPhotoError(!valid);
                        if (valid)
                          setPhotos((p) => [
                            ...p,
                            ...files.map((file) => ({
                              file,
                              url: URL.createObjectURL(file),
                            })),
                          ]);
                        e.target.value = "";
                      }}
                    />
                    <p id="photo-help" className="sr-only">
                      {d.photoHelp}
                    </p>
                  </div>
                  {photoError && (
                    <p className="error-message" role="alert">
                      {d.photoError}
                    </p>
                  )}
                  {photos.length > 0 && (
                    <div className="photo-grid">
                      {photos.map((photo, i) => (
                        <figure key={photo.url}>
                          <img
                            src={photo.url}
                            alt={photo.file.name}
                            onError={() => setPhotoError(true)}
                          />
                          <button
                            type="button"
                            aria-label={`${d.remove} ${photo.file.name}`}
                            onClick={() => {
                              URL.revokeObjectURL(photo.url);
                              setPhotos((p) => p.filter((_, n) => n !== i));
                              setPhotoError(false);
                            }}
                          >
                            <X />
                          </button>
                          <figcaption>{photo.file.name}</figcaption>
                        </figure>
                      ))}
                    </div>
                  )}
                  {actions()}
                </form>
              )}
              {step === 2 && (
                <form onSubmit={next}>
                  <p className="required-note">{d.required}</p>
                  <div className="field-grid">
                    {input("name", d.name, "text", true, {
                      autoComplete: "name",
                      maxLength: 100,
                      pattern: ".*\\S.*",
                    })}
                    {input("email", d.email, "email", true, {
                      autoComplete: "email",
                      maxLength: 200,
                    })}
                    {input("phone", d.phone, "tel", true, {
                      autoComplete: "tel",
                      minLength: 7,
                      maxLength: 30,
                      pattern: "[+0-9\\(\\) .\\-]{7,30}",
                    })}
                    <label className="field">
                      <span>{d.language} *</span>
                      <select
                        name="language"
                        value={form.language}
                        onChange={(e) => update("language", e.target.value)}
                      >
                        <option value="fr">Français</option>
                        <option value="en">English</option>
                        <option value="zh">中文</option>
                      </select>
                    </label>
                    {input("date", d.date, "date", true, { min: dateToday() })}
                    {select("time", d.time, d.times)}
                    <label className="field full-field">
                      <span>{d.notes}</span>
                      <textarea
                        name="notes"
                        rows={3}
                        maxLength={2000}
                        value={form.notes}
                        onChange={(e) => update("notes", e.target.value)}
                      />
                    </label>
                  </div>
                  <label className="consent">
                    <input
                      type="checkbox"
                      required
                      checked={form.consent}
                      onChange={(e) => update("consent", e.target.checked)}
                    />
                    <span>{d.consent}</span>
                  </label>
                  {actions(d.review)}
                </form>
              )}
              {step === 3 && (
                <>
                  <div className="review-sections">
                    <ReviewBlock
                      title={d.property}
                      edit={d.edit}
                      onEdit={() => setStep(1)}
                    >
                      <strong>{form.address}</strong>
                      <p>
                        {form.city}, {form.postal.toUpperCase()}
                      </p>
                      <p>
                        {propertyType} · {d.timelines[Number(form.timeline)]}
                      </p>
                      <p>
                        {d.broker}: {d.brokerOptions[Number(form.broker)]}
                      </p>
                      {form.price && (
                        <p>
                          {d.price}:{" "}
                          {new Intl.NumberFormat(
                            lang === "zh" ? "zh-CN" : `${lang}-CA`,
                            {
                              style: "currency",
                              currency: "CAD",
                              maximumFractionDigits: 0,
                            },
                          ).format(Number(form.price))}
                        </p>
                      )}
                      <p>
                        {photos.length} {d.photosCount}
                      </p>
                    </ReviewBlock>
                    <ReviewBlock
                      title={d.contact}
                      edit={d.edit}
                      onEdit={() => setStep(2)}
                    >
                      <strong>{form.name}</strong>
                      <p>{form.email}</p>
                      <p>{form.phone}</p>
                    </ReviewBlock>
                    <ReviewBlock
                      title={d.appointment}
                      edit={d.edit}
                      onEdit={() => setStep(2)}
                    >
                      <strong>
                        {appointmentDate} · {d.times[Number(form.time)]}
                      </strong>
                      <p>
                        {
                          { fr: "Français", en: "English", zh: "中文" }[
                            form.language
                          ]
                        }
                      </p>
                      {form.notes && <p className="notes-text">{form.notes}</p>}
                    </ReviewBlock>
                  </div>
                  <p className="payment-note">
                    <ShieldCheck />
                    {d.noCharge}
                  </p>
                  <div className="flow-actions">
                    <button className="outline" onClick={() => setStep(2)}>
                      <ArrowLeft />
                      {d.previous}
                    </button>
                    <button
                      onClick={() => {
                        setCompleted(true);
                        setSample(false);
                        location.hash = "dashboard";
                      }}
                    >
                      {
                        {
                          fr: "Ouvrir mon espace vendeur",
                          en: "Open my dashboard",
                          zh: "进入卖家工作台",
                        }[lang]
                      }
                      <ArrowRight />
                    </button>
                  </div>
                </>
              )}
            </div>
            <aside className="flow-summary">
              <span className="eyebrow">{d.service}</span>
              <h3>{d[plan]}</h3>
              <p>{plan === "with" ? d.withText : d.withoutText}</p>
              <h4>
                {plan === "with"
                  ? d.included
                  : {
                      fr: "Services disponibles à la carte",
                      en: "Available optional services",
                      zh: "可按需选择的服务",
                    }[lang]}
              </h4>
              <ul className="check-list">
                {planItems.map((s) => (
                  <li key={s}>
                    <Check />
                    {s}
                  </li>
                ))}
              </ul>
              <div className="summary-price">
                {plan === "without" ? (
                  <>
                    <strong>{price}</strong>
                  </>
                ) : (
                  <strong>{d.agreed}</strong>
                )}
              </div>
              <button
                className="text-button"
                type="button"
                onClick={() => setStep(0)}
              >
                {d.edit}
                <ArrowRight />
              </button>
              {plan === "without" && (
                <p className="summary-boundary">{d.boundary}</p>
              )}
            </aside>
          </div>
        )}
        {step === 4 && (
          <div className="done-panel">
            <span className="done-icon">
              <CheckCircle2 />
            </span>
            <h2 ref={headingRef} tabIndex={-1}>
              {d.doneTitle}
            </h2>
            <p>{d.doneText}</p>
            <a href="#top" className="primary-link">
              {d.again}
              <ArrowRight />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewBlock({
  title,
  edit,
  onEdit,
  children,
}: {
  title: string;
  edit: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <section className="review-block">
      <div>
        <h3>{title}</h3>
        <button type="button" className="text-button" onClick={onEdit}>
          {edit}
        </button>
      </div>
      {children}
    </section>
  );
}
