export interface Application {
	applicationId: string;
	firstName: string;
	lastName: string;
	email: string;
	applicationData: {
		type: string;
		amount: number;
		documents: string[];
	};
	status: 'pending' | 'processing' | 'completed' | 'failed';
	createdAt: Date;
	updatedAt: Date;
}

export interface PaymentRequest {
	applicationId: string;
	amount: number;
	customerEmail: string;
}

export interface DocumentRequest {
	applicationId: string;
	templateType: string;
	data: Record<string, any>;
}

export interface PaymentResponse {
	success: boolean;
	transactionId?: string;
	error?: string;
}
