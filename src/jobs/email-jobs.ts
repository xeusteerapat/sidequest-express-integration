import { Job, Sidequest } from 'sidequest';
import { ProcessPaymentJob } from './process-payment.js';
import { Application } from '../types/index.js';

export class EmailJob extends Job {
	async run(applicationId: string, appData: Application) {
		console.log(`Sending email for applicationId: ${applicationId}`);

		await Sidequest.build(ProcessPaymentJob)
			.maxAttempts(3)
			.enqueue(applicationId, appData);

		return { status: 'email sent', applicationId };
	}
}
