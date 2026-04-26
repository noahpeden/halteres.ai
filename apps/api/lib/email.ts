import { Resend } from 'resend';

let cached: Resend | null = null;
function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!cached) cached = new Resend(key);
  return cached;
}

const FROM = process.env.RESEND_FROM ?? 'Halteres <hello@halteres.ai>';

interface SendInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendInput): Promise<void> {
  const c = client();
  if (!c) {
    console.warn('RESEND_API_KEY missing — skipping email', { to, subject });
    return;
  }
  await c.emails.send({ from: FROM, to, subject, html, text });
}

const wrapper = (body: string) => `
<!doctype html><html><body style="font-family:ui-sans-serif,system-ui;background:#0b0b0e;color:#f4f4f5;margin:0;padding:32px">
  <div style="max-width:560px;margin:0 auto;background:#0a0a0a;border:1px solid #27272a;border-radius:12px;padding:32px">
    <div style="font-weight:700;font-size:18px;margin-bottom:24px">Halteres</div>
    ${body}
    <hr style="border:none;border-top:1px solid #27272a;margin:32px 0"/>
    <div style="color:#71717a;font-size:12px">Halteres · <a href="https://halteres.ai" style="color:#a1a1aa">halteres.ai</a></div>
  </div>
</body></html>`;

export const emails = {
  welcome: (to: string) =>
    sendEmail({
      to,
      subject: 'Welcome to Halteres',
      html: wrapper(`
        <div style="font-size:20px;font-weight:600;margin-bottom:12px">You&rsquo;re in.</div>
        <p>Halteres builds personalized training programs that learn from every workout you log.</p>
        <p>Three steps to start:</p>
        <ol>
          <li>Tell us your goals + equipment (1 minute)</li>
          <li>Describe a program you want — methodology, weeks, days/week</li>
          <li>Tap any workout to expand the full plan</li>
        </ol>
        <p style="margin-top:24px"><a href="https://halteres.ai/onboarding" style="background:#f97316;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">Get started</a></p>
      `),
    }),

  deletionConfirmed: (to: string) =>
    sendEmail({
      to,
      subject: 'Your Halteres account is deleted',
      html: wrapper(`
        <div style="font-size:20px;font-weight:600;margin-bottom:12px">Account deleted</div>
        <p>We&rsquo;ve removed your profile, programs, workouts, logs, and embeddings. Any active Stripe subscription has been cancelled.</p>
        <p>If this was a mistake, you can sign up again any time.</p>
      `),
    }),

  receipt: (to: string, amountUsd: number, period: string) =>
    sendEmail({
      to,
      subject: 'Halteres Pro receipt',
      html: wrapper(`
        <div style="font-size:20px;font-weight:600;margin-bottom:12px">Payment received</div>
        <p><strong>$${amountUsd.toFixed(2)}</strong> for the period ending ${period}.</p>
        <p>Manage your subscription at <a href="https://halteres.ai/billing" style="color:#f97316">halteres.ai/billing</a>.</p>
      `),
    }),

  coachInvite: (to: string, athleteEmail: string, acceptUrl: string) =>
    sendEmail({
      to,
      subject: `${athleteEmail} invited you to coach them`,
      html: wrapper(`
        <div style="font-size:20px;font-weight:600;margin-bottom:12px">You&rsquo;ve been invited</div>
        <p><strong>${athleteEmail}</strong> wants you to view their training programs and logs on Halteres.</p>
        <p style="margin-top:24px"><a href="${acceptUrl}" style="background:#f97316;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">Accept invite</a></p>
        <p style="color:#71717a;font-size:13px">This link expires in 7 days.</p>
      `),
    }),
};
