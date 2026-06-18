/**
 * Servicio para envío de correos electrónicos a través de la API de Vercel/Brevo
 */

export const sendWelcomeEmail = async (userEmail, fullName, password, emailConfig, scheduledTime) => {
    const config = emailConfig || {
        subject: '🚀 ¡Bienvenido a Mente Activa! Tus credenciales de acceso',
        body: 'Te damos la bienvenida a Mente Activa, la plataforma líder para la creación de materiales pedagógicos dinámicos.\n\nEstamos muy felices de tenerte con nosotros.',
        footer: 'Este es un correo automático, por favor no respondas a este mensaje.'
    };

    try {
        const response = await fetch('/api/sendWelcomeEmail', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userEmail,
                fullName,
                password,
                emailConfig: config,
                scheduledTime
            }),
        });

        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        console.error("Error en el servicio de email (serverless):", error);
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
