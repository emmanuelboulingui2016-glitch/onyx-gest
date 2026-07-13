// Supabase Edge Function to send welcome email with tenant_id using centralized Gmail SMTP settings
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import nodemailer from "npm:nodemailer"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight options
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { tenantId, email } = await req.json()
    if (!tenantId || !email) {
      throw new Error("Les paramètres tenantId et email sont requis.")
    }

    // 1. Get SMTP credentials from environment variables
    const smtpUser = Deno.env.get('SMTP_USER') || 'codefactory241@gmail.com'
    const smtpPass = Deno.env.get('SMTP_PASS')

    if (!smtpPass) {
      throw new Error("Le mot de passe d'application GMail (SMTP_PASS) n'est pas configuré dans les Secrets de Supabase.")
    }

    // 2. Configure transporter using Gmail SMTP
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    })

    // 3. Send email containing the tenant_id
    const info = await transporter.sendMail({
      from: `"Onyx Gest" <${smtpUser}>`,
      to: email,
      subject: `Clé d'activation de votre espace commercial Onyx Gest`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #00B0FF; text-align: center;">Bienvenue sur Onyx Gest</h2>
          <p>Bonjour,</p>
          <p>Félicitations ! Votre compte commercial a été créé avec succès.</p>
          <p>Voici votre clé d'activation unique (tenant_id) indispensable pour finaliser la configuration de votre espace de travail :</p>
          <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-family: monospace; font-size: 1.2rem; font-weight: bold; border-radius: 6px; letter-spacing: 1px; color: #333; margin: 20px 0;">
            ${tenantId}
          </div>
          <p>Veuillez copier et coller ce code dans votre formulaire d'activation pour finaliser votre onboarding.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 0.8rem; color: #666; text-align: center;">
            Cet e-mail automatique a été envoyé par Onyx Gest. Propulsé par 241 Code Factory.
          </p>
        </div>
      `
    })

    console.log(`✉️ Welcome email sent successfully: ${info.messageId}`)

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("❌ Failed to send welcome email:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
