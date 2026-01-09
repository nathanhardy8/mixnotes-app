export interface EmailRequest {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

export const emailService = {
    async sendEmail(req: EmailRequest): Promise<boolean> {
        console.log('--- EMAIL MOCK ---');
        console.log(`To: ${req.to}`);
        console.log(`Subject: ${req.subject}`);
        console.log(`Body: ${req.text}`);
        console.log('------------------');
        return true;
    },

    async sendApprovalNotification(producerEmail: string, clientName: string, projectName: string) {
        return this.sendEmail({
            to: producerEmail,
            subject: `Action Required: ${clientName} approved ${projectName}`,
            text: `${clientName} has approved the final mix for project ${projectName}. Log in to view details.`
        });
    },

    async sendReminder(clientEmail: string, projectName: string, link: string) {
        return this.sendEmail({
            to: clientEmail,
            subject: `Reminder: Feedback needed for ${projectName}`,
            text: `Hi,\n\nPlease review the latest mix for ${projectName} here:\n${link}\n\nThanks!`
        });
    }
};
