import express from 'express';
import { Sidequest } from 'sidequest';
import pino from 'pino';
import { faker } from '@faker-js/faker';
import {
	closeDatabaseConnection,
	connectToDatabase,
	createApplication,
	findApplicationById,
} from './db/mongo.js';
import { EmailJob } from './jobs/email-jobs.js';

const logger = pino();

const app = express();
app.use(express.json());

app.post('/api/applications/submit', async (req, res) => {
	try {
		const { applicationType } = req.body;
		logger.info(`Starting submit application with: ${applicationType}`);

		const type = applicationType || 'loan';

		const applicationId = `app-${faker.string.alphanumeric(8)}`;
		const firstName = faker.person.firstName();
		const lastName = faker.person.lastName();
		const email = faker.internet.email({ firstName, lastName });

		const applicationData = {
			applicationId,
			firstName,
			lastName,
			email,
			applicationData: {
				type,
				amount: faker.number.int({ min: 10000, max: 500000 }),
				documents: [
					'id',
					'income_proof',
					...(type === 'mortgage' ? ['property_docs'] : []),
				],
			},
			status: 'pending' as const,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const application = await createApplication(applicationData);

		// Enqueue 1st background job start workflow
		const mailQ = await Sidequest.build(EmailJob)
			.maxAttempts(3)
			.queue('workflow') // queue name
			.enqueue(applicationId, application);

		res.json({
			success: true,
			applicationId,
			workflowId: mailQ.id,
			message: 'Application created and processing started',
			application: {
				applicationId: application.applicationId,
				firstName: application.firstName,
				lastName: application.lastName,
				email: application.email,
				type: application.applicationData.type,
				amount: application.applicationData.amount,
			},
		});
	} catch (error) {
		res.status(500).json({ error: 'Failed to submit' });
	}
});

app.get('/api/applications/status/:applicationId', async (req, res) => {
	try {
		const { applicationId } = req.params;

		const application = await findApplicationById(applicationId);
		if (!application) {
			return res.status(404).send({
				success: false,
				error: 'Application not found',
			});
		}

		return res.json({
			success: true,
			application: {
				applicationId: application.applicationId,
				status: application.status,
				createdAt: application.createdAt,
				updatedAt: application.updatedAt,
			},
		});
	} catch (error) {
		logger.error(error, 'Error getting application status:');

		res.status(500).json({
			success: false,
			error: 'Internal server error',
		});
	}
});

app.get('/:applicationId', async (req, res) => {
	try {
		const { applicationId } = req.params;

		const application = await findApplicationById(applicationId);
		if (!application) {
			return res.status(404).json({
				success: false,
				error: 'Application not found',
			});
		}

		res.json({
			success: true,
			application,
		});
	} catch (error) {
		logger.error(error, 'Error getting application:');

		res.status(500).json({
			success: false,
			error: 'Internal server error',
		});
	}
});

async function startServer() {
	try {
		await connectToDatabase();

		await Sidequest.start({
			backend: {
				driver: '@sidequest/mongo-backend',
				config: process.env.MONGODB_URI as string,
			},
			queues: [{ name: 'default', priority: 10 }],
		});

		app.listen(4000, () => {
			logger.info(`Backend API server running on port 4000`);
			logger.info(`Health check: http://localhost:4000/health`);
		});

		process.on('SIGTERM', async () => {
			logger.info('SIGTERM received, shutting down gracefully');
			await closeDatabaseConnection();
			process.exit(0);
		});

		process.on('SIGINT', async () => {
			logger.info('SIGINT received, shutting down gracefully');
			await closeDatabaseConnection();
			process.exit(0);
		});
	} catch (error) {
		logger.error(error, 'Failed to start server:');
		process.exit(1);
	}
}

startServer();
