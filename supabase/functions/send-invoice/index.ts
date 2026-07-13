// Supabase Edge Function to dynamically send emails using tenant custom SMTP settings
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
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
    const { invoiceId, recipientEmail } = await req.json()
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error("Authorization header is missing.")
    }

    // 1. Initialize Supabase client using user auth token to respect RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // 2. Fetch authenticated user details
    const { data: { user }, error: authErr } = await supabaseClient.auth.getUser()
    if (authErr || !user) throw new Error("Utilisateur non authentifié.")

    // 3. Fetch user profile to get tenant_id
    const { data: profile, error: profileErr } = await supabaseClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile) {
      throw new Error("Profil utilisateur introuvable ou aucun tenant associé.")
    }

    const tenantId = profile.tenant_id

    // 4. Retrieve custom SMTP settings for this tenant
    const { data: smtpSettings, error: smtpErr } = await supabaseClient
      .from('tenant_smtp_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (smtpErr || !smtpSettings) {
      throw new Error("Aucun serveur SMTP personnalisé configuré pour votre entreprise.")
    }

    // 5. Create dynamic nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: smtpSettings.smtp_host,
      port: smtpSettings.smtp_port,
      secure: smtpSettings.smtp_port === 465, // true for port 465, false for 587 or others
      auth: {
        user: smtpSettings.smtp_user,
        pass: smtpSettings.smtp_password // Decryption can be done here if encryption is set up
      }
    })

    // 6. Send the email on behalf of the tenant
    const info = await transporter.sendMail({
      from: `"${smtpSettings.sender_email}" <${smtpSettings.smtp_user}>`,
      to: recipientEmail,
      subject: `Facture officielle n° ${invoiceId}`,
      text: `Bonjour,\n\nVeuillez trouver ci-joint votre facture officielle.\n\nCordialement,\nL'équipe de gestion commerciale.`,
      // You can append PDF file attachments here from Supabase Storage bucket if desired
    })

    console.log(`✉️ Email sent successfully: ${info.messageId}`)

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("❌ Email send failure:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
