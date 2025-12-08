// Base URL for the API.
// In production (Firebase Hosting), we want to point to the Cloud Function.
// In development, we point to localhost.
const isProduction = import.meta.env.PROD || window.location.hostname !== 'localhost';
const API_BASE_URL = isProduction
    ? 'https://southamerica-east1-pdv-mastergit-64616629.cloudfunctions.net/api'
    : 'http://localhost:3001/api';

console.log('🔌 API Service initialized with URL:', API_BASE_URL);

/**
 * Uploads the digital certificate and its password to the server.
 * @param certificateFile The .pfx file to upload.
 * @param certificatePassword The password for the certificate.
 * @returns A promise that resolves with the server's response.
 */
export const uploadCertificate = async (certificateFile: File, certificatePassword: string): Promise<any> => {
    const formData = new FormData();
    formData.append('certificateFile', certificateFile);
    formData.append('certificatePassword', certificatePassword);

    // Note: Authentication headers would be needed in a real-world scenario.
    // const token = getAuthToken(); // Assuming a function to get the auth token

    try {
        const response = await fetch(`${API_BASE_URL}/settings/certificate`, {
            method: 'POST',
            body: formData,
            // headers: {
            //   'Authorization': `Bearer ${token}`
            // }
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error || 'Falha no upload do certificado.');
        }

        return responseData;
    } catch (error) {
        console.error('Error uploading certificate:', error);
        throw error; // Re-throw to be handled by the calling component
    }
};

/**
 * Uploads the company logo to the server.
 * @param logoFile The image file to upload.
 * @returns A promise that resolves with the server's response, containing the path to the new logo.
 */
export const uploadLogo = async (logoFile: File): Promise<{ message: string, path: string }> => {
    const formData = new FormData();
    formData.append('logoFile', logoFile); // 'logoFile' must match the multer config on the backend

    try {
        const response = await fetch(`${API_BASE_URL}/settings/logo`, {
            method: 'POST',
            body: formData,
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error || 'Falha no upload da logo.');
        }

        return responseData;
    } catch (error) {
        console.error('Error uploading logo:', error);
        throw error;
    }
};

// We can create a generic apiService object to hold all API functions.
export const apiService = {
    uploadCertificate,
    uploadLogo,
};
