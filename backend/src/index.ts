import * as functions from 'firebase-functions/v1';
import { app } from './server.js';
import { initDB } from './config/database.js';
import { Request, Response } from 'express';

// A flag to ensure we only initialize the DB once per instance.
let dbInitialized = false;

const initializeDatabase = async () => {
    if (!dbInitialized) {
        try {
            await initDB();
            dbInitialized = true;
            console.log('Database connected successfully for Firebase Function.');
        } catch (e) {
            console.error('Database connection failed for Firebase Function:', e);
            // If the database is critical, you might want to throw the error
            // to prevent the function from handling requests.
            throw new functions.https.HttpsError('internal', 'Could not connect to database.');
        }
    }
};

// Create the main API function.
// The 'api' name here will be part of the URL, e.g., .../api
// Using 'southamerica-east1' (São Paulo) as the region.
export const api = functions.region('southamerica-east1').https.onRequest(async (request: Request, response: Response) => {
    // Ensure the database is initialized before handling any request.
    await initializeDatabase();
    // Pass the request to the Express app.
    return app(request, response);
});
