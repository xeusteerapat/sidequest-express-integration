import { MongoClient, Db, Collection } from 'mongodb';
import { Application } from '../types/index.js';

let client: MongoClient;
let db: Db;

export async function connectToDatabase(): Promise<void> {
	if (!process.env.MONGODB_URI) {
		throw new Error('MONGODB_URI environment variable is not set');
	}

	client = new MongoClient(process.env.MONGODB_URI);
	await client.connect();
	db = client.db('applications');

	console.log('Connected to MongoDB');
}

export function getApplicationsCollection(): Collection<Application> {
	if (!db) {
		throw new Error('Database not connected');
	}
	return db.collection<Application>('applications');
}

export async function closeDatabaseConnection(): Promise<void> {
	if (client) {
		await client.close();
		console.log('MongoDB connection closed');
	}
}

export async function findApplicationById(
	applicationId: string
): Promise<Application | null> {
	const collection = getApplicationsCollection();
	return await collection.findOne({ applicationId });
}

export async function updateApplicationStatus(
	applicationId: string,
	status: Application['status']
): Promise<void> {
	const collection = getApplicationsCollection();
	await collection.updateOne(
		{ applicationId },
		{
			$set: {
				status,
				updatedAt: new Date(),
			},
		}
	);
}

export async function createApplication(
	application: Omit<Application, '_id'>
): Promise<Application> {
	const collection = getApplicationsCollection();
	const result = await collection.insertOne(application as Application);

	const createdApplication = await collection.findOne({
		_id: result.insertedId,
	});
	if (!createdApplication) {
		throw new Error('Failed to create application');
	}

	return createdApplication;
}
