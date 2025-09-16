// jobs/ApiAJob.ts
import { Job, Sidequest } from 'sidequest';
import { Application, PaymentResponse } from '../types/index.js';
import { ProcessDocumentJob } from './process-document.js';

export class ProcessPaymentJob extends Job {
	async run(applicationId: string, appData: Application) {
		try {
			const response = await fetch(
				`${process.env.PAYMENT_SERVICE_URL}/api/payment/submit`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						applicationId,
						amount: appData.applicationData.amount,
						customerEmail: appData.email,
					}),
				}
			);

			if (!response.ok) throw new Error(`Service A failed: ${response.status}`);

			function isPaymentResponse(data: any): data is PaymentResponse {
				return typeof data === 'object' && data !== null && 'success' in data;
			}

			const result = await response.json();

			if (!isPaymentResponse(result)) {
				throw new Error('Invalid payment response');
			}

			console.log(
				`Service A success for applicationId: ${applicationId}`,
				result
			);

			await Sidequest.build(ProcessDocumentJob)
				.maxAttempts(5)
				.enqueue(applicationId, {
					...appData,
					paymentResult: {
						...result,
					},
				});

			return { status: 'service-a completed', applicationId };
		} catch (error) {
			console.error(`API call to service-a failed:`, error);
			throw error;
		}
	}
}
