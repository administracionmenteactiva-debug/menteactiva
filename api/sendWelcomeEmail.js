export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { userEmail, fullName, password, emailConfig, scheduledTime } = req.body;
    
    if (!userEmail) {
        return res.status(400).json({ error: 'Missing userEmail' });
    }

    const config = emailConfig || {
        subject: '🚀 ¡Bienvenido a Mente Activa! Tus credenciales de acceso',
        body: 'Te damos la bienvenida a Mente Activa, la plataforma líder para la creación de materiales pedagógicos dinámicos.\n\nEstamos muy felices de tenerte con nosotros.',
        footer: 'Este es un correo automático, por favor no respondas a este mensaje.'
    };

    let finalBody = config.body
        .replace(/{nombre}/g, fullName || 'Docente')
        .replace(/{email}/g, userEmail);
        
    let finalGreeting = (config.greeting || '¡Hola, {nombre}!')
        .replace(/{nombre}/g, fullName || 'Docente');

    if (scheduledTime) {
        const formattedDate = new Date(scheduledTime).toLocaleString('es-PE', { 
            timeZone: 'America/Lima',
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        finalBody = finalBody.replace('{agenda}', formattedDate);
    }

    const BREVO_KEY = process.env.BREVO_KEY || process.env.VITE_BREVO_KEY;
    if (!BREVO_KEY) {
        return res.status(500).json({ error: 'Server misconfiguration: missing BREVO_KEY or VITE_BREVO_KEY' });
    }

    const payload = {
        sender: { name: 'Mente Activa', email: 'educrea.administracion@gmail.com' },
        to: [{ email: userEmail }],
        subject: config.subject,
        htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <div style="text-align: center; margin-bottom: 25px;">
                    <img src="https://menteactiva-peru.vercel.app/logo_mail.png" alt="Mente Activa Logo" height="110" style="display: block; margin: 0 auto 10px auto; border: 0; outline: none; text-decoration: none;" />
                    <div style="margin-top: 5px; font-family: system-ui, -apple-system, sans-serif; line-height: 1;">
                        <span style="font-size: 28px; font-weight: 900; letter-spacing: -1px; color: #1e293b; margin-right: 4px;">MENTE</span>
                        <span style="font-size: 28px; font-weight: 900; letter-spacing: -1px; color: #d97706;">ACTIVA</span>
                    </div>
                    <div style="font-size: 10px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #64748b; margin-top: 6px; font-family: system-ui, -apple-system, sans-serif;">
                        Conéctalos con su mente.
                    </div>
                </div>
                <h1 style="color: #3b82f6; text-align: center;">${finalGreeting}</h1>
                <p style="font-size: 16px; color: #475569; line-height: 1.6; text-align: center; white-space: pre-line;">
                    ${finalBody}
                </p>
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                    <p style="margin: 0; color: #1e293b; font-weight: bold; font-size: 14px;">Tus datos de acceso:</p>
                    <p style="margin: 10px 0 5px 0; color: #64748b; font-size: 13px;">Correo: <span style="color: #0f172a; font-weight: bold;">${userEmail}</span></p>
                    <p style="margin: 0; color: #64748b; font-size: 13px;">Contraseña: <span style="color: #0f172a; font-weight: bold;">${password || '***'}</span></p>
                </div>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${config.buttonUrl || 'https://menteactiva-peru.vercel.app/'}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">${config.buttonText || 'Acceder a Mente Activa'}</a>
                </div>
                <hr style="margin: 30px 0; border: 0; border-top: 1px solid #e2e8f0;" />
                <p style="font-size: 10px; color: #94a3b8; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
                    ${config.footer}
                </p>
                <p style="font-size: 9px; color: #cbd5e1; text-align: center; margin-top: 10px;">
                    Mente Activa - Innovación Pedagógica
                </p>
            </div>
        `
    };

    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': BREVO_KEY,
                'accept': 'application/json'
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (response.ok) {
            return res.status(200).json({ success: true, data });
        } else {
            return res.status(response.status).json({ success: false, error: data });
        }
    } catch (error) {
        console.error("Error sending email via Brevo:", error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
}
