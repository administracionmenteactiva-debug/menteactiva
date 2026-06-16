/**
 * Servicio para envío de correos electrónicos a través de la API de Vercel/Brevo
 */

export const sendWelcomeEmail = async (userEmail, fullName, password, emailConfig, scheduledTime) => {
    const config = emailConfig || {
        subject: '🚀 ¡Bienvenido a EduCrea! Tus credenciales de acceso',
        body: 'Te damos la bienvenida a EduCrea, la plataforma líder para la creación de materiales pedagógicos dinámicos.\n\nEstamos muy felices de tenerte con nosotros.',
        footer: 'Este es un correo automático, por favor no respondas a este mensaje.'
    };

    // Personalización dinámica de etiquetas
    let finalBody = config.body
        .replace(/{nombre}/g, fullName)
        .replace(/{email}/g, userEmail);

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

    try {
        const url = 'https://api.brevo.com/v3/smtp/email';
        
        // Llave de Brevo Integrada para autonomía total
        const BREVO_KEY = import.meta.env.VITE_BREVO_KEY;

        const payload = {
            sender: { name: 'EduCrea Docentes', email: 'educrea.administracion@gmail.com' },
            to: [{ email: userEmail }],
            subject: config.subject,
            htmlContent: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="https://drive.google.com/uc?export=view&id=1b9VDe96VncsFQz_uA6c8vAesMukuyS4V" alt="EduCrea Logo" width="360" style="display: block; margin: 0 auto; border: 0; outline: none; text-decoration: none;" />
                    </div>
                    <h1 style="color: #3b82f6; text-align: center;">¡Hola, ${fullName}!</h1>
                    <p style="font-size: 16px; color: #475569; line-height: 1.6; text-align: center; white-space: pre-line;">
                        ${finalBody}
                    </p>
                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                        <p style="margin: 0; color: #1e293b; font-weight: bold; font-size: 14px;">Tus datos de acceso:</p>
                        <p style="margin: 10px 0 5px 0; color: #64748b; font-size: 13px;">Correo: <span style="color: #0f172a; font-weight: bold;">${userEmail}</span></p>
                        <p style="margin: 0; color: #64748b; font-size: 13px;">Contraseña: <span style="color: #0f172a; font-weight: bold;">${password}</span></p>
                    </div>
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="https://educrea-docentes.vercel.app" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Acceder a EduCrea Docentes</a>
                    </div>
                    <hr style="margin: 30px 0; border: 0; border-top: 1px solid #e2e8f0;" />
                    <p style="font-size: 10px; color: #94a3b8; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
                        ${config.footer}
                    </p>
                    <p style="font-size: 9px; color: #cbd5e1; text-align: center; margin-top: 10px;">
                        EduCrea Internacional - Innovación Pedagógica
                    </p>
                </div>
            `
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': BREVO_KEY,
                'accept': 'application/json'
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        console.error("Error en el servicio de email:", error);
        return { success: false, error };
    }
};

export const sendNotificationEmail = async (to, subject, message) => {
    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to,
                subject,
                htmlContent: `<p>${message}</p>`
            }),
        });
        return await response.json();
    } catch (error) {
        console.error("Error enviando notificación:", error);
        return { success: false };
    }
};
