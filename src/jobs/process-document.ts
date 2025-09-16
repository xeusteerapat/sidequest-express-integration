// jobs/ApiBJob.ts
import axios from 'axios';
import { Job } from 'sidequest';
import { connectToDatabase, updateApplicationStatus } from '../db/mongo.js';
import { Application, PaymentResponse } from '../types/index.js';

export class ProcessDocumentJob extends Job {
	async run(
		applicationId: string,
		appData: Application & { paymentResult: PaymentResponse }
	) {
		try {
			await connectToDatabase();
			const response = await axios.post(
				`${process.env.DOCUMENT_SERVICE_URL}/api/document/submit`,
				{
					applicationId,
					templateType: appData.applicationData.type,
					data: {
						...appData,
						transactionId: appData.paymentResult.transactionId,
					},
				},
				{
					timeout: 30000,
					headers: {
						'Content-Type': 'application/json',
					},
				}
			);

			if (response.statusText !== 'OK') throw new Error(`Service B failed`);
			const result = await response.data;
			console.log(`Service B success for applicationId: ${applicationId}`);

			await updateApplicationStatus(applicationId, 'completed');
		} catch (error) {
			console.error(`API call to service-b failed:`, error);
			throw error;
		}

		return { status: 'service-b completed', applicationId };
	}
}
