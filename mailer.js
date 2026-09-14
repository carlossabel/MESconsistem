// Envio de e-mail de notificação por SMTP (nodemailer).
//
// Configure por variáveis de ambiente:
//   SMTP_HOST      ex.: smtp.gmail.com
//   SMTP_PORT      587 (STARTTLS, padrão) ou 465 (SSL)
//   SMTP_SECURE    "true" apenas se usar a porta 465
//   SMTP_USER      conta de envio (ex.: notificacoes@consistem.com.br)
//   SMTP_PASS      senha de app dessa conta
//   MAIL_FROM      remetente exibido (padrão: SMTP_USER)
//   MAIL_TO        destinatários, separados por vírgula
//                  (padrão: arthur.diefenthaler@consistem.com.br, carlos@consistem.com.br)
//
// Se SMTP_HOST/SMTP_USER não estiverem definidos, o envio é ignorado
// (o levantamento continua sendo salvo normalmente).

const nodemailer = require("nodemailer");

const DEST_PADRAO = "arthur.diefenthaler@consistem.com.br, carlos@consistem.com.br";

function getTransport() {
  // Modo de teste: não envia, apenas devolve a mensagem montada.
  if (process.env.SMTP_JSON === "true") return nodemailer.createTransport({ jsonTransport: true });
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function destinatarios() {
  return process.env.MAIL_TO || DEST_PADRAO;
}

function isConfigured() {
  return !!getTransport();
}

async function enviar({ subject, html, text, attachments }) {
  const t = getTransport();
  if (!t) return { skipped: true };
  const info = await t.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER || DEST_PADRAO,
    to: destinatarios(),
    subject: subject,
    html: html,
    text: text,
    attachments: attachments || [],
  });
  return { skipped: false, info };
}

module.exports = { enviar, isConfigured, destinatarios };
