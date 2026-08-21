export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-panel" aria-label="Secure access">
        <img src="/greecon-logo-placeholder.svg" alt="Greecon" />
        <div>
          <p className="eyebrow">Secure platform access</p>
          <h1>Greecon Platform</h1>
          <p className="muted">Operational access for authorized users of Greecon sites and infrastructure.</p>
        </div>
        <form>
          <label>
            Email
            <input type="email" placeholder="name@greecon.earth" />
          </label>
          <label>
            Password
            <input type="password" placeholder="Password" />
          </label>
          <button type="button">Continue</button>
        </form>
      </section>
    </main>
  );
}
